'use strict'

// ========== 告警阈值（可按需调整） ==========
/** 单用户单日 token 上限 */
const DAILY_TOKEN_THRESHOLD = 100000
/** 单用户单日调用次数上限 */
const DAILY_COUNT_THRESHOLD = 50
/** 近 1 小时失败率上限（0~1） */
const ERROR_RATE_THRESHOLD = 0.3
/** 失败率统计最小样本数，避免少量样本误报 */
const ERROR_RATE_MIN_SAMPLE = 5

const ONE_DAY = 86400000
const ONE_HOUR = 3600000
const BJ_OFFSET = 8 * 3600 * 1000

exports.main = async (event, context) => {
	const db = uniCloud.database()
	const dbCmd = db.command
	const agg = dbCmd.aggregate
	const now = Date.now()
	// 北京时间当天 0 点对应的 UTC 时间戳
	const dayStart = Math.floor((now + BJ_OFFSET) / ONE_DAY) * ONE_DAY - BJ_OFFSET
	const oneHourAgo = now - ONE_HOUR

	let alertCount = 0
	// 1. 单用户今日累计消耗 / 调用次数检查
	alertCount += await checkDailyQuota(db, dbCmd, agg, dayStart)
	// 2. 近 1 小时全局失败率检查
	alertCount += await checkErrorRate(db, dbCmd, agg, oneHourAgo)

	return { code: 0, message: '检查完成', data: { alerts: alertCount } }
}

/**
 * 检查单用户今日 token / 调用次数是否超阈值，超限则写 daily_quota 告警
 * @returns {Promise<number>} 本次产生的告警数
 */
async function checkDailyQuota(db, dbCmd, agg, dayStart) {
	const res = await db.collection('ai_call_logs').aggregate()
		.match({ create_time: dbCmd.gte(dayStart), openid: dbCmd.neq('') })
		.group({
			_id: '$openid',
			userName: agg.first('$user_name'),
			totalTokens: agg.sum('$total_tokens'),
			count: agg.sum(1)
		})
		.end()

	const rows = pickData(res)
	let count = 0
	for (const row of rows) {
		const overToken = row.totalTokens && row.totalTokens > DAILY_TOKEN_THRESHOLD
		const overCount = row.count && row.count > DAILY_COUNT_THRESHOLD
		if (!overToken && !overCount) continue

		// 当日已告警则跳过，避免重复
		const existRes = await db.collection('ai_alerts').where({
			rule: 'daily_quota',
			openid: row._id,
			create_time: dbCmd.gte(dayStart)
		}).limit(1).get()
		if (pickData(existRes).length > 0) continue

		const reasons = []
		if (overToken) reasons.push(`token ${row.totalTokens}/${DAILY_TOKEN_THRESHOLD}`)
		if (overCount) reasons.push(`调用 ${row.count}/${DAILY_COUNT_THRESHOLD} 次`)

		await raiseAlert(db, {
			rule: 'daily_quota',
			level: 'critical',
			openid: row._id,
			user_name: row.userName || '',
			function: '',
			metric_value: overToken ? row.totalTokens : row.count,
			threshold: overToken ? DAILY_TOKEN_THRESHOLD : DAILY_COUNT_THRESHOLD,
			message: `用户今日消耗异常：${reasons.join('，')}`
		})
		count++
	}
	return count
}

/**
 * 检查近 1 小时全局失败率是否超阈值
 * @returns {Promise<number>} 本次产生的告警数
 */
async function checkErrorRate(db, dbCmd, agg, oneHourAgo) {
	const res = await db.collection('ai_call_logs').aggregate()
		.match({ create_time: dbCmd.gte(oneHourAgo) })
		.group({ _id: '$status', count: agg.sum(1) })
		.end()

	const rows = pickData(res)
	let success = 0
	let error = 0
	rows.forEach(r => {
		if (r._id === 'success') success = r.count
		else if (r._id === 'error') error = r.count
	})
	const total = success + error
	if (total < ERROR_RATE_MIN_SAMPLE) return 0

	const errorRate = error / total
	if (errorRate <= ERROR_RATE_THRESHOLD) return 0

	// 近 1 小时已告警则跳过，避免重复
	const existRes = await db.collection('ai_alerts').where({
		rule: 'error_rate',
		create_time: dbCmd.gte(oneHourAgo)
	}).limit(1).get()
	if (pickData(existRes).length > 0) return 0

	await raiseAlert(db, {
		rule: 'error_rate',
		level: 'critical',
		openid: '',
		user_name: '',
		function: '',
		metric_value: Math.round(errorRate * 100),
		threshold: Math.round(ERROR_RATE_THRESHOLD * 100),
		message: `近 1 小时 AI 调用失败率 ${Math.round(errorRate * 100)}% (${error}/${total})`
	})
	return 1
}

/**
 * 写入一条告警记录到 ai_alerts 并打印日志
 * 预留 notifyAlert() 钩子，未来可接入 webhook / 订阅消息推送
 * @param {Object} db 数据库实例
 * @param {Object} alert 告警内容（不含 create_time）
 */
async function raiseAlert(db, alert) {
	try {
		await db.collection('ai_alerts').add({
			...alert,
			create_time: Date.now()
		})
		console.warn(`[AI告警] ${alert.rule}: ${alert.message}`)
		// 预留钩子：未来接入企业微信/钉钉机器人或订阅消息推送
		// notifyAlert(alert)
	} catch (e) {
		console.error('[raiseAlert] 写入告警失败：', e.message)
	}
}

/**
 * 兼容云端/本地两种返回结构，统一取出数据数组
 * @param {Object} res 数据库操作返回
 * @returns {Array} 数据数组
 */
function pickData(res) {
	if (!res) return []
	if (res.result && res.result.data) return res.result.data
	if (res.data) return res.data
	return []
}
