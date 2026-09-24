import store from '@/store';
import { withAuth } from '@/utils/api-auth.js';

// 与 noteRequest 一致：会话过期时清空本地登录态，下次 withAuth 调用重新弹出登录。
function invalidateExpiredSession(result) {
  if (!result || result.code !== -401) return
  store.commit('SET_IS_GUEST', true)
  store.commit('SET_OPENID', '')
  store.commit('SET_SESSION_TOKEN', '')
}

// AI 辅导日志统一走云函数鉴权（ai_learn_logs / ai_task_queue 已禁止客户端直连）
function aiLogRequest(action, data = {}) {
  return uniCloud.callFunction({
    name: 'aiLogService',
    data: { action, data, sessionToken: store.state.user.sessionToken || '' }
  }).then(response => {
    const result = response.result || {}
    invalidateExpiredSession(result)
    if (result.code !== 0) throw new Error(result.message || 'AI 日志操作失败')
    return result
  })
}

/**
 * 调用AI辅导生成（写入pending记录+任务队列，定时触发器异步处理）
 * @param {string} content 笔记内容
 * @param {string} recordId 记录ID
 */
export const callGenerateLearnNote = withAuth(function(data) {
	return uniCloud.callFunction({
		name: 'generateLearnNote',
		data: {
			content: data.content,
			recordId: data.recordId,
			sessionToken: store.state.user.sessionToken
		}
	}).then(res => {
		if (res.result && res.result.code === 0) {
			return res.result;
		}
		return Promise.reject(new Error(res.result?.message || '提交失败'));
	});
}, store);

/**
 * 查询学习结果列表（服务端按记录可见性过滤：本人或公共示例记录）
 * @param {Object} data { recordId }
 */
export const getLearnResultList = function(data) {
	return aiLogRequest('listByRecord', { recordId: data.recordId }).then(result => {
		return {
			result: {
				data: result.data || []
			}
		};
	});
};

/**
 * 查询学习结果详情
 * @param {string} logId ai_learn_logs 记录ID
 */
export const getLearnResultDetail = function(logId) {
	return aiLogRequest('getDetail', { logId }).then(result => {
		// 保持旧 clientDB doc().get() 的 { result: { data: [] } } 形状
		return { result: { data: result.data ? [result.data] : [] } };
	});
};

/**
 * 批量查询记录是否有成功的AI学习结果（仅统计当前用户可见的记录）
 * @param {Array<string>} recordIds 记录ID数组
 * @returns {Object} 以 recordId 为 key，值为 { hasAiNote: boolean, aiNoteCount: number }
 */
export const batchQueryAiResults = function(recordIds) {
	if (!recordIds || recordIds.length === 0) {
		return Promise.resolve({});
	}

	return aiLogRequest('batchHasResults', { recordIds }).then(result => {
		const batchResult = {};
		const list = result.data || [];

		list.forEach(item => {
			const rid = item.record_id;
			if (!batchResult[rid]) {
				batchResult[rid] = { hasAiNote: true, aiNoteCount: 0 };
			}
			batchResult[rid].aiNoteCount++;
		});

		return batchResult;
	});
};

/**
 * 获取当前用户所有 AI 辅导历史（跨记录，按 batch_id 分组）
 * @param {Object} data { pageNo, pageSize }
 * @returns {Promise<{data: Array}>} 分组后的 batch 数组
 */
export const getAiLearnHistory = function(data) {
	const { pageNo = 1, pageSize = 10 } = data;

	return aiLogRequest('history', { pageNo, pageSize }).then(result => {
		const logs = result.data || [];
		if (logs.length === 0) return { data: [] };

		// 批量查询记录标题
		const recordIds = [...new Set(logs.map(l => l.record_id).filter(Boolean))];
		return uniCloud.callFunction({
			name: 'noteService',
			data: { action: 'getRecordTitles', data: { ids: recordIds }, sessionToken: store.state.user.sessionToken }
		})
			.then(recRes => {
				const recordMap = {};
				(recRes.result?.data || []).forEach(r => {
					recordMap[r._id] = r.title || '未命名记录';
				});

				// 按 batch_id 分组，配对 note + exercise
				const groupMap = {};
				const groupOrder = [];
				logs.forEach(log => {
					const bid = log.batch_id || log._id;
					if (!groupMap[bid]) {
						groupMap[bid] = {
							batchId: bid,
							recordId: log.record_id,
							recordTitle: recordMap[log.record_id] || '未命名记录',
							createTime: log.create_time,
							note: null,
							exercise: null,
							hasPending: false
						};
						groupOrder.push(bid);
					}
					const g = groupMap[bid];
					if (log.type === 'note') g.note = log;
					if (log.type === 'exercise') g.exercise = log;
					if (log.status === 'pending') g.hasPending = true;
				});
				return { data: groupOrder.map(bid => groupMap[bid]) };
			});
	});
};

/**
 * 级联删除：删除本人创建的该记录 AI 日志 + 关联任务队列（需登录）
 * @param {string} recordId 记录ID
 */
export const deleteAiLogsByRecordId = function(recordId) {
	if (!recordId) return Promise.resolve();

	return aiLogRequest('deleteByRecord', { recordId }).then(result => result.data || { deleted: 0 });
};
