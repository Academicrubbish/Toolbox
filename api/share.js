import store from '@/store';
import { withAuth } from '@/utils/api-auth.js';

/**
 * 生成文章分享链接
 * @param {string} recordId 记录ID
 * @param {string} expireType 有效期类型：1h / 1d / 1w / 1y / forever
 * @param {string} shareType 分享类型：record / ai_learn
 * @param {string} logId AI 学习结果 ID（shareType 为 ai_learn 时必填）
 */
export const callGenerateShareLink = withAuth(function(data) {
	const user = store.state.user;
	return uniCloud.callFunction({
		name: 'generateShareLink',
		data: {
			recordId: data.recordId,
			expireType: data.expireType,
			shareType: data.shareType || 'record',
			logId: data.logId || '',
			openid: user.openid
		}
	}).then(res => {
		if (res.result && res.result.code === 0) {
			return res.result;
		}
		return Promise.reject(new Error(res.result?.message || '生成失败'));
	});
}, store);
