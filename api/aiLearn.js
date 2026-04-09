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
