import store from '@/store';
import { withAuth } from '@/utils/api-auth.js';

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
			recordId: data.recordId
		}
	}).then(res => {
		if (res.result && res.result.code === 0) {
			return res.result;
		}
		return Promise.reject(new Error(res.result?.message || '提交失败'));
	});
}, store);

/**
 * 查询学习结果列表（通过 record_id 定位，无需 create_by 过滤）
 * @param {string} recordId 关联的记录ID
 */
export const getLearnResultList = function(data) {
	const db = uniCloud.database();

	return db.collection('ai_learn_logs')
		.where({
			record_id: data.recordId
		})
		.orderBy('create_time desc')
		.limit(50)
		.get()
		.then(res => {
			return {
				result: {
					data: res.result?.data || []
				}
			};
		});
};

/**
 * 查询学习结果详情
 * @param {string} logId ai_learn_logs 记录ID
 */
export const getLearnResultDetail = function(logId) {
	const db = uniCloud.database();
	return db.collection('ai_learn_logs').doc(logId).get();
};

/**
 * 批量查询记录是否有成功的AI学习结果
 * @param {Array<string>} recordIds 记录ID数组
 * @returns {Object} 以 recordId 为 key，值为 { hasAiNote: boolean, aiNoteCount: number }
 */
export const batchQueryAiResults = function(recordIds) {
	if (!recordIds || recordIds.length === 0) {
		return Promise.resolve({});
	}

	const db = uniCloud.database();

	return db.collection('ai_learn_logs')
		.where({
			record_id: db.command.in(recordIds),
			status: 'success'
		})
		.field({ record_id: true, _id: true })
		.limit(200)
		.get()
		.then(res => {
			const result = {};
			const list = res.result?.data || [];

			list.forEach(item => {
				const rid = item.record_id;
				if (!result[rid]) {
					result[rid] = { hasAiNote: true, aiNoteCount: 0 };
				}
				result[rid].aiNoteCount++;
			});

			return result;
		});
};

/**
 * 查询某记录的成功AI学习结果数量
 * @param {string} recordId 记录ID
 * @returns {Object} { hasAiResult: boolean, aiResultCount: number, hasPending: boolean }
 */
/**
 * 获取当前用户所有 AI 辅导历史（跨记录，按 batch_id 分组）
 * @param {Object} data { pageNo, pageSize }
 * @returns {Promise<{data: Array}>} 分组后的 batch 数组
 */
export const getAiLearnHistory = function(data) {
	const db = uniCloud.database();
	const dbCmd = db.command;
	const { pageNo = 1, pageSize = 10 } = data;
	const skip = (pageNo - 1) * pageSize;
	const openid = store.state.user.openid;

	return db.collection('ai_learn_logs')
		.where({
			create_by: openid,
			status: dbCmd.in(['success', 'pending'])
		})
		.orderBy('create_time', 'desc')
		.skip(skip)
		.limit(pageSize)
		.get()
		.then(res => {
			const logs = res.result?.data || [];
			if (logs.length === 0) return { data: [] };

			// 批量查询记录标题
			const recordIds = [...new Set(logs.map(l => l.record_id).filter(Boolean))];
			return db.collection('daily_record')
				.where({ _id: dbCmd.in(recordIds) })
				.field({ _id: true, title: true })
				.limit(100)
				.get()
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
 * 级联删除：删除某记录关联的所有 AI 日志 + 任务队列
 * @param {string} recordId 记录ID
 */
export const deleteAiLogsByRecordId = function(recordId) {
	if (!recordId) return Promise.resolve();

	const db = uniCloud.database();
	const dbCmd = db.command;

	// 1. 查出该记录关联的所有 AI 日志 ID 和 batch_id
	return db.collection('ai_learn_logs')
		.where({ record_id: recordId })
		.field({ _id: true, batch_id: true })
		.limit(200)
		.get()
		.then(res => {
			const logs = res.result?.data || [];
			if (logs.length === 0) return { deleted: 0 };

			const logIds = logs.map(l => l._id);
			const batchIds = [...new Set(logs.map(l => l.batch_id).filter(Boolean))];

			// 2. 删除 AI 日志
			const deleteLogs = db.collection('ai_learn_logs')
				.where({ _id: dbCmd.in(logIds) })
				.remove();

			// 3. 删除关联的任务队列
			const deleteQueue = batchIds.length > 0
				? db.collection('ai_task_queue')
					.where({ batch_id: dbCmd.in(batchIds) })
					.remove()
				: Promise.resolve();

			return Promise.all([deleteLogs, deleteQueue]).then(() => ({
				deleted: logIds.length
			}));
		});
};

export const getAiResultCount = function(recordId) {
	const db = uniCloud.database();

	return db.collection('ai_learn_logs')
		.where({
			record_id: recordId,
			status: db.command.in(['success', 'pending'])
		})
		.field({ _id: true, status: true })
		.limit(100)
		.get()
		.then(res => {
			const list = res.result?.data || [];
			let successCount = 0;
			let hasPending = false;
			list.forEach(item => {
				if (item.status === 'success') successCount++;
				if (item.status === 'pending') hasPending = true;
			});
			return {
				hasAiResult: successCount > 0,
				aiResultCount: successCount,
				hasPending: hasPending
			};
		});
};
