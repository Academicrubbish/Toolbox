import store from '@/store';
import { withAuth } from '@/utils/api-auth.js';

/** 调用 OCR 识别云函数 */
export const callProcessOcr = withAuth(function(data) {
	return uniCloud.callFunction({
		name: 'processOcr',
		data: { imageUrls: data.imageUrls, source: data.source || 'depart' }
	}).then(res => {
		if (res.result && res.result.code === 0) return res.result
		return Promise.reject(new Error(res.result?.message || '识别失败'))
	})
}, store);

/** 调用链接解析云函数 */
export const callParseWechatArticle = withAuth(function(data) {
	return uniCloud.callFunction({
		name: 'parseWechatArticle',
		data: { url: data.url }
	}).then(res => {
		if (res.result && res.result.code === 0) return res.result
		return Promise.reject(new Error(res.result?.message || '解析失败'))
	})
}, store);
