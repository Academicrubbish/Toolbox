import store from '@/store';
import { withAuth } from '@/utils/api-auth.js';

/**
 * 调用AI辅导生成（异步，立即返回）
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
 * 查询学习结果列表
 * @param {string} recordId 关联的记录ID
 */
export const getLearnResultList = withAuth(function(data) {
	const db = uniCloud.database();
	const user = store.state.user;

	return db.collection('ai_learn_logs')
		.where({
			record_id: data.recordId,
			create_by: user.openid
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
}, store);

/**
 * 查询学习结果详情
 * @param {string} logId ai_learn_logs 记录ID
 */
export const getLearnResultDetail = function(logId) {
	const db = uniCloud.database();
	return db.collection('ai_learn_logs').doc(logId).get();
};
