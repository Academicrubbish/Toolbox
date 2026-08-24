'use strict'
const axios = require('axios')
const { verifySession } = require('kb-auth')
const { cosine } = require('kb-vector')
const { mergeHybridResults } = require('./search-utils')

/**
 * 语义搜索云函数（知识库第二期）
 * 混合检索：语义通道（embedding + 余弦相似度）+ 关键词通道（正则匹配），
 * 关键词命中在前（保持既有习惯、兜住精确词），语义命中去重后按相似度排在后面。
 * 降级：embedding 接口失败时只返回关键词结果，并带 degraded: true 标记。
 *
 * 与现有 searchRecord 的差异（安全问题 P3/P4 修复）：
 * 关键词通道不再全表扫描 summarize，只读取该 openid 记录关联的总结内容。
 */

const AI_FUNCTION = 'embedding_search'
const AI_MODEL = 'embedding-3'
const EMBEDDING_URL = 'https://open.bigmodel.cn/api/paas/v4/embeddings'
const DIMENSIONS = 512
// 语义通道返回的笔记数上限（方案 §4.5.3）
const SEMANTIC_TOP_K = 10
// 相关笔记推荐数量与阈值（第三期）
// 阈值说明：实测无关中文文本余弦约 0.50、同主题笔记 0.65+，取 0.55 过滤噪声（不达标可调）
const RELATED_TOP_K = 5
const RELATED_THRESHOLD = 0.55
// 云函数单次 get 上限 1000，分页拉取
const PAGE_LIMIT = 1000
// 向量行数安全上限（超出只计算前面的行，当前量级远达不到）
const MAX_VECTOR_ROWS = 10000
// 搜索词向量化超时：搜索路径要快，超时即降级为关键词搜索
const EMBED_TIMEOUT = 10000

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY
const KB_SESSION_SECRET = process.env.KB_SESSION_SECRET

exports.main = async (event, context) => {
	let openid
	try {
		openid = verifySession(event && event.sessionToken, KB_SESSION_SECRET).openid
	} catch (err) {
		return { code: -401, message: err.message || '登录凭证无效', data: [], total: 0 }
	}

	// 第三期：相关笔记推荐模式，与搜索模式共用向量与余弦逻辑
	if (event && event.mode === 'byRecord') {
		return relatedByRecord(event, openid)
	}

	const { keyword = '', pageNum = 1, pageSize = 10 } = event
	const kw = String(keyword).trim()
	if (!kw) {
		return { code: -1, message: '搜索关键词不能为空', data: [], total: 0 }
	}

	const db = uniCloud.database()
	const _ = db.command
	const skip = (pageNum - 1) * pageSize
	const limit = pageSize

	try {
		// 1. 两通道并行：关键词通道永不出错；语义通道内部兜错返回 null（降级）
		const [keywordResult, semanticResult] = await Promise.all([
			keywordChannel(db, _, openid, kw),
			semanticChannel(db, openid, kw)
		])
		const degraded = semanticResult === null

		// 2. 融合：关键词命中在前（时间倒序），语义命中去重后按相似度在后
		const keywordIds = keywordResult.ids
		const merged = mergeHybridResults(keywordIds, semanticResult ? semanticResult.hits : [])
		const { orderedIds, hitMap, semanticExtras } = merged

		// 3. 分页后拉取完整记录（数据库层再次按 openid 收窄）
		const pageIds = orderedIds.slice(skip, skip + limit)
		if (pageIds.length === 0) {
			return { code: 0, message: '查询成功', data: [], total: 0, degraded, keywordCount: keywordIds.length, semanticCount: semanticExtras.length }
		}

		const records = await fetchAll(() => db.collection('daily_record')
			.where({ _id: _.in(pageIds), createBy: openid }))
		const recordById = {}
		records.forEach(r => { recordById[r._id] = r })

		// 4. 按 orderedIds 顺序重排（in 查询不保序）
		const pageRecords = pageIds
			.map(id => recordById[id])
			.filter(Boolean)
			.map(r => Object.assign(r, hitMap[r._id]))

		// 5. 关联总结内容（列表摘要展示用）
		await attachSummarizeContent(db, _, pageRecords)

		return {
			code: 0,
			message: '查询成功',
			data: pageRecords,
			total: orderedIds.length,
			degraded,
			keywordCount: keywordIds.length,
			semanticCount: semanticExtras.length
		}
	} catch (err) {
		console.error('[semanticSearch] 搜索失败：', err.message)
		return { code: -1, message: '搜索失败：' + (err.message || '未知错误'), data: [], total: 0 }
	}
}

/**
 * 相关笔记推荐（mode='byRecord'）：取指定笔记的向量，与本人其余笔记算相似度，
 * 笔记间相似度 = 各切片两两余弦的最大值，阈值过滤后取 top K
 * 边界处理：笔记无向量（新保存未向量化）返回空；候选不足 2 篇（笔记总数 < 3）返回空
 * @param {Object} event { openid, sourceId, topK? }
 * @returns {Promise<Object>} { code, data: 记录数组（带 relatedScore、summarizeContent） }
 */
async function relatedByRecord(event, openid) {
	const { sourceId, topK } = event
	if (!sourceId) {
		return { code: -1, message: 'sourceId不能为空', data: [] }
	}

	const db = uniCloud.database()
	const _ = db.command

	try {
		// 1. 目标笔记的向量（数据库层按 openid 过滤，只能对本人笔记做推荐）
		const targetRes = await db.collection('note_embedding')
			.where({ source_id: sourceId, create_by: openid })
			.field({ vector: true })
			.limit(50)
			.get()
		const targetVectors = (targetRes.result || targetRes).data || []
		if (targetVectors.length === 0) {
			// 新笔记向量尚未生成：静默返回空，前端隐藏区块
			return { code: 0, message: 'success', data: [], reason: 'no-vector' }
		}

		// 2. 本人全部向量，排除自身
		const allRows = await fetchAll(() => db.collection('note_embedding')
			.where({ create_by: openid })
			.field({ source_id: true, vector: true }), MAX_VECTOR_ROWS)
		const rows = allRows.filter(r => r.source_id !== sourceId)

		// 3. 每对笔记取切片间最大余弦作为相似度
		const best = new Map()
		for (const row of rows) {
			let score = 0
			for (const tv of targetVectors) {
				const s = cosine(tv.vector, row.vector)
				if (s > score) score = s
			}
			const prev = best.get(row.source_id)
			if (!prev || score > prev.score) {
				best.set(row.source_id, { source_id: row.source_id, score })
			}
		}

		// 4. 候选笔记不足 2 篇（笔记总数 < 3）时不出推荐，避免凑数
		if (best.size < 2) {
			return { code: 0, message: 'success', data: [], reason: 'too-few' }
		}

		const hits = Array.from(best.values())
			.filter(h => h.score >= RELATED_THRESHOLD)
			.sort((a, b) => b.score - a.score)
			.slice(0, topK || RELATED_TOP_K)
		if (hits.length === 0) {
			return { code: 0, message: 'success', data: [], reason: 'below-threshold' }
		}

		// 5. 补全记录信息（数据库层再次按 openid 收窄）
		// 注意：daily_record 的归属字段是 createBy（驼峰），向量集合 note_embedding 才是 create_by
		const hitIds = hits.map(h => h.source_id)
		const scoreById = {}
		hits.forEach(h => { scoreById[h.source_id] = h.score })
		const records = await fetchAll(() => db.collection('daily_record')
			.where({ _id: _.in(hitIds), createBy: openid }))
		const recordById = {}
		records.forEach(r => { recordById[r._id] = r })
		const pageRecords = hitIds
			.map(id => recordById[id])
			.filter(Boolean)
			.map(r => Object.assign(r, { relatedScore: scoreById[r._id] }))

		await attachSummarizeContent(db, _, pageRecords)

		return { code: 0, message: 'success', data: pageRecords, total: pageRecords.length }
	} catch (err) {
		console.error('[semanticSearch] 相关笔记查询失败：', err.message)
		return { code: -1, message: '查询失败：' + (err.message || '未知错误'), data: [] }
	}
}

/**
 * 关键词通道：标题/时间/正文正则匹配（数据库层按 openid 过滤，只读本人数据）
 * @returns {Promise<{ids: string[]}>} 命中记录 ID（按 createTime 倒序）
 */
async function keywordChannel(db, _, openid, kw) {
	const filterRegex = new RegExp(escapeRegex(kw), 'i')

	const records = await fetchAll(() => db.collection('daily_record')
		.where({ createBy: openid })
		.field({ title: true, createTime: true, summarizeId: true })
		.orderBy('createTime', 'desc'))

	const ids = []
	const idSet = new Set()
	const summarizeIds = []
	records.forEach(r => {
		if ((r.title && filterRegex.test(r.title)) || (r.createTime && filterRegex.test(r.createTime))) {
			if (!idSet.has(r._id)) { ids.push(r._id); idSet.add(r._id) }
		}
		if (r.summarizeId) summarizeIds.push(r.summarizeId)
	})

	// 只查本人记录关联的总结（修复 searchRecord 全表扫描的数据暴露面）
	if (summarizeIds.length > 0) {
		const sums = await fetchAll(() => db.collection('summarize')
			.where({ _id: _.in(summarizeIds) })
			.field({ content: true }))
		const matchedSumIds = new Set(
			sums.filter(s => s.content && filterRegex.test(s.content)).map(s => s._id)
		)
		if (matchedSumIds.size > 0) {
			records.forEach(r => {
				if (r.summarizeId && matchedSumIds.has(r.summarizeId) && !idSet.has(r._id)) {
					ids.push(r._id); idSet.add(r._id)
				}
			})
		}
	}

	return { ids }
}

/**
 * 语义通道：搜索词向量化 → 拉本人全部向量 → 余弦相似度 → 每笔记取最高分 → top K
 * 任何异常返回 null（触发降级），绝不影响关键词通道
 * @returns {Promise<{hits: Array<{source_id, score, digest}>}|null>}
 */
async function semanticChannel(db, openid, kw) {
	if (!ZHIPU_API_KEY) {
		console.error('[semanticSearch] 缺少 ZHIPU_API_KEY 环境变量，语义通道降级')
		return null
	}
	try {
		const callStart = Date.now()
		const res = await axios.post(
			EMBEDDING_URL,
			{ model: AI_MODEL, input: [kw], dimensions: DIMENSIONS },
			{ headers: { 'Authorization': `Bearer ${ZHIPU_API_KEY}`, 'Content-Type': 'application/json' }, timeout: EMBED_TIMEOUT }
		)
		const queryVector = res.data.data[0].embedding
		recordAiCall(db, openid, res.data.usage, Date.now() - callStart, 'success', '')

		const rows = await fetchAll(() => db.collection('note_embedding')
			.where({ create_by: openid })
			.field({ source_id: true, digest: true, vector: true }), MAX_VECTOR_ROWS)

		// 每笔记取最高分切片
		const best = new Map()
		for (const row of rows) {
			const score = cosine(queryVector, row.vector)
			const prev = best.get(row.source_id)
			if (!prev || score > prev.score) {
				best.set(row.source_id, { source_id: row.source_id, score, digest: row.digest || '' })
			}
		}

		const hits = Array.from(best.values())
			.sort((a, b) => b.score - a.score)
			.slice(0, SEMANTIC_TOP_K)
		return { hits }
	} catch (err) {
		console.error('[semanticSearch] 语义通道降级：', err.message)
		recordAiCall(db, openid, null, null, 'error', err.message)
		return null
	}
}

/**
 * 分页拉取全量数据（云函数单次 get 上限 1000 条）
 * @param {Function} queryFactory 返回全新查询对象的工厂（每页重建，避免链式状态污染）
 * @param {number} maxRows 行数上限
 * @returns {Promise<Array>}
 */
async function fetchAll(queryFactory, maxRows = Infinity) {
	const rows = []
	let cursor = 0
	while (rows.length < maxRows) {
		const res = await queryFactory().skip(cursor).limit(PAGE_LIMIT).get()
		const data = (res.result || res).data || []
		rows.push(...data)
		if (data.length < PAGE_LIMIT) break
		cursor += data.length
	}
	return rows
}

/** 转义正则特殊字符（与 searchRecord 保持一致的转义规则） */
function escapeRegex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 批量把总结内容合并进记录（summarizeContent 字段，列表摘要展示用）
 */
async function attachSummarizeContent(db, _, records) {
	const summarizeIds = records.map(r => r.summarizeId).filter(id => id && id !== '')
	const summarizeMap = {}
	if (summarizeIds.length > 0) {
		const sums = await fetchAll(() => db.collection('summarize')
			.where({ _id: _.in(summarizeIds) })
			.field({ content: true }))
		sums.forEach(s => { summarizeMap[s._id] = s.content || '' })
	}
	records.forEach(r => {
		r.summarizeContent = summarizeMap[r.summarizeId] || ''
	})
}

/**
 * 记录一次搜索词向量化调用到 ai_call_logs（function=embedding_search，与笔记向量化区分观测）
 * 监控写入异常静默忽略，不影响搜索主流程
 */
async function recordAiCall(db, openid, usage, durationMs, status, errorMsg) {
	try {
		await db.collection('ai_call_logs').add({
			function: AI_FUNCTION,
			model: AI_MODEL,
			openid: openid || '',
			user_name: '',
			prompt_tokens: usage ? (usage.prompt_tokens || null) : null,
			completion_tokens: usage ? (usage.completion_tokens || null) : null,
			total_tokens: usage && typeof usage.total_tokens === 'number' ? usage.total_tokens : null,
			duration_ms: durationMs,
			status: status,
			error_msg: errorMsg || '',
			batch_id: '',
			create_time: Date.now()
		})
	} catch (e) {
		console.error('[semanticSearch] 监控写入失败，已忽略：', e.message)
	}
}
