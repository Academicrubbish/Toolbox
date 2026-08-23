'use strict'

/**
 * 知识库第一期：存量笔记向量回填（一次性工具，手动触发）
 *
 * 只负责分页扫描 daily_record 并向 embed_task_queue 投递任务，
 * 实际向量化统一由 processEmbedding 定时消费完成（单一执行路径，幂等由消费端保证）。
 * 因此本函数不调用 AI 接口、不需要 ZHIPU_API_KEY。
 *
 * 查重跳过：已生成向量、或队列中已有未完成任务的笔记不再投递，可随时断点重跑。
 *
 * 控制台手动调用方式（uniCloud 控制台 → 云函数 → 运行）：
 *   回填：{ "action": "backfill", "pageSize": 50, "pages": 10 }
 *   对账：{ "action": "stats" }
 */

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100
// 单次调用时间预算（毫秒），留余量防止触碰云函数 120s 超时
const TIME_BUDGET_MS = 100000

exports.main = async (event, context) => {
	const db = uniCloud.database()
	const _ = db.command
	const action = (event && event.action) || 'backfill'

	try {
		if (action === 'stats') {
			return { code: 0, message: 'success', data: await collectStats(db, _) }
		}
		if (action !== 'backfill') {
			return { code: -1, message: `未知 action：${action}（支持 backfill / stats）` }
		}

		const pageSize = clampInt(event.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
		const maxPages = clampInt(event.pages, 1, 50)
		const start = Date.now()

		let page = 0
		let scanned = 0
		let enqueued = 0
		let skipped = 0
		let hasMore = true

		while (page < maxPages && hasMore && Date.now() - start < TIME_BUDGET_MS) {
			page++
			const recRes = await db.collection('daily_record')
				.orderBy('_id asc')
				.skip((page - 1) * pageSize)
				.limit(pageSize)
				.get()
			const records = (recRes.result || recRes).data || []
			if (records.length === 0) break
			if (records.length < pageSize) hasMore = false
			scanned += records.length

			const result = await enqueuePage(db, _, records)
			enqueued += result.enqueued
			skipped += result.skipped
		}

		return {
			code: 0,
			message: `扫描 ${scanned} 篇：新投递 ${enqueued}，跳过 ${skipped}${hasMore ? '（还有剩余，请再次运行）' : '（已全部扫完）'}`,
			data: { scanned, enqueued, skipped, hasMore, pages: page }
		}
	} catch (err) {
		console.error('[backfillEmbedding] 执行失败：', err.message)
		return { code: -1, message: '回填失败：' + err.message }
	}
}

/**
 * 处理一页笔记：查重后投递向量化任务
 * @param {Object} db 数据库实例
 * @param {Object} _ db.command
 * @param {Array} records 本页 daily_record 记录
 * @returns {Promise<{enqueued: number, skipped: number}>}
 */
async function enqueuePage(db, _, records) {
	const ids = records.map(r => r._id)

	// 查重 1：已有向量的笔记（只取 source_id 字段，避免拉取大体积 vector）
	const vecRes = await db.collection('note_embedding')
		.where({ source_id: _.in(ids) })
		.field({ source_id: true })
		.limit(1000)
		.get()
	const vectorized = new Set(((vecRes.result || vecRes).data || []).map(d => d.source_id))

	// 查重 2：队列中已有未完成任务（防止重跑时重复投递）
	const taskRes = await db.collection('embed_task_queue')
		.where({ source_id: _.in(ids), status: _.in(['pending', 'processing']) })
		.field({ source_id: true })
		.limit(1000)
		.get()
	const queued = new Set(((taskRes.result || taskRes).data || []).map(d => d.source_id))

	const now = Date.now()
	const newTasks = records
		.filter(r => !vectorized.has(r._id) && !queued.has(r._id))
		.map(r => ({
			source_id: r._id,
			content: '',
			status: 'pending',
			error_msg: '',
			create_time: now,
			update_time: now
		}))

	if (newTasks.length > 0) {
		await db.collection('embed_task_queue').add(newTasks)
	}
	return { enqueued: newTasks.length, skipped: records.length - newTasks.length }
}

/**
 * 对账统计（T1-7 验收用）
 * 注意：云函数单次 get 上限 1000 条，故计数用 count()、去重用分页遍历
 * @param {Object} db 数据库实例
 * @param {Object} _ db.command
 * @returns {Promise<Object>} 存量数、已向量化数、覆盖率、队列各状态条数
 */
async function collectStats(db, _) {
	const recCount = await db.collection('daily_record').count()
	const total = (recCount.result || recCount).total || 0

	// 分页去重统计已向量化笔记数
	const seen = new Set()
	let rowCursor = 0
	while (rowCursor < 100000) {
		const res = await db.collection('note_embedding')
			.field({ source_id: true })
			.skip(rowCursor)
			.limit(1000)
			.get()
		const rows = (res.result || res).data || []
		if (rows.length === 0) break
		rows.forEach(d => seen.add(d.source_id))
		rowCursor += rows.length
	}
	const vectorized = seen.size

	const queue = {}
	for (const status of ['pending', 'processing', 'done', 'failed']) {
		const res = await db.collection('embed_task_queue').where({ status }).count()
		queue[status] = (res.result || res).total || 0
	}

	let tips = '全覆盖 ✓'
	if (queue.pending + queue.processing > 0) tips = '队列尚未消费完，稍等几个触发周期后重查'
	else if (vectorized < total) tips = '覆盖不全，请再次运行 backfill 补投递'

	return { records: total, vectorizedSources: vectorized, coverage: `${vectorized}/${total}`, queue, tips }
}

/**
 * 取整数参数并夹在 [fallback, max] 区间内
 * @param {*} value 入参
 * @param {number} fallback 默认值
 * @param {number} max 上限
 * @returns {number}
 */
function clampInt(value, fallback, max) {
	const n = parseInt(value, 10)
	if (Number.isNaN(n) || n < 1) return fallback
	return Math.min(n, max)
}
