'use strict'

/**
 * 归类智谱 API 调用错误，区分处理策略：
 * - quota：HTTP 429 且错误码 1113（余额不足/无资源包）或 1308（用量上限），重试无意义，直接熔断
 * - rate：HTTP 429 且错误码 1302（频率限制）或 1305（平台过载）及未知 429，回队退避、不计重试次数
 * - error：其他错误，走既有三次熔断重试
 * 智谱把具体错误码放在响应体 error.code 中，须记录而非只看 HTTP 状态码。
 * @param {Object} err axios 抛出的错误对象
 * @returns {{kind: 'quota'|'rate'|'error', message: string}}
 */
function classifyApiError(err) {
	const status = err && err.response && err.response.status
	const apiError = err && err.response && err.response.data && err.response.data.error
	const code = apiError && apiError.code
	if (status === 429) {
		if (String(code) === '1113' || String(code) === '1308') {
			return { kind: 'quota', message: `智谱余额不足或额度用尽（${code || '429'}）：请充值后把 failed 任务改回 pending 重跑` }
		}
		return { kind: 'rate', message: `智谱限流或过载（${code || '429'}），已退避等待下轮自动重试` }
	}
	const detail = status
		? `HTTP ${status}${apiError && apiError.message ? '：' + apiError.message : ''}`
		: (err && err.message) || '未知错误'
	return { kind: 'error', message: detail }
}

module.exports = { classifyApiError }
