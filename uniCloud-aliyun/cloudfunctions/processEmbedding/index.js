'use strict'
const axios = require('axios')

// ========== 常量 ==========
const AI_FUNCTION = 'embedding'
const AI_MODEL = 'embedding-3'
const EMBEDDING_URL = 'https://open.bigmodel.cn/api/paas/v4/embeddings'
const DIMENSIONS = 512
// 每次触发消费的任务数上限（同一笔记多条任务会先去重）
const TASK_BATCH_SIZE = 20
// 消费中断恢复：processing 状态超过该时长的任务视为残留，重置回 pending
const STUCK_RESET_MS = 10 * 60 * 1000
// 单笔记全部切片一次请求的超时
const API_TIMEOUT = 60000

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY

exports.main = async (event, context) => {
	if (!ZHIPU_API_KEY) {
		console.error('[processEmbedding] 缺少 ZHIPU_API_KEY 环境变量')
		return { code: -1, message: '向量化服务配置缺失' }
	}

	const db = uniCloud.database()
	const _ = db.command
	const now = Date.now()

	try {
		// 0. 恢复残留任务：上次运行被超时杀死时，processing 任务会卡死，重置回队列
		await db.collection('embed_task_queue')
			.where({ status: 'processing', update_time: _.lt(now - STUCK_RESET_MS) })
			.update({ status: 'pending', update_time: now, error_msg: '' })

		// 1. 认领一批 pending 任务（先到 processing，防止并发重复消费）
		const taskRes = await db.collection('embed_task_queue')
			.where({ status: 'pending' })
			.orderBy('create_time asc')
			.limit(TASK_BATCH_SIZE)
			.get()
		const tasks = (taskRes.result || taskRes).data || []
		if (tasks.length === 0) {
			return { code: 0, message: '无待处理任务' }
		}

		const claimedIds = tasks.map(t => t._id)
		await db.collection('embed_task_queue')
			.where({ _id: _.in(claimedIds), status: 'pending' })
			.update({ status: 'processing', update_time: now })

		// 2. 按笔记去重：同笔记多次编辑只处理一次，天然取到最新内容
		const taskIdsBySource = {}
		tasks.forEach(t => {
			if (!taskIdsBySource[t.source_id]) taskIdsBySource[t.source_id] = []
			taskIdsBySource[t.source_id].push(t._id)
		})
		const sourceIds = Object.keys(taskIdsBySource)

		// 3. 批量拉取笔记标题与正文（实时拉取而非快照，保证向量为保存时最新内容）
		const { recordMap, contentMap } = await loadNotes(db, sourceIds)

		// 4. 逐笔记向量化，单篇失败不影响其他
		// 若本轮中途异常，未结算任务会停留在 processing，由步骤 0 的残留恢复机制重置重试
		const stats = { ok: 0, fail: 0, skip: 0 }
		for (const sourceId of sourceIds) {
			const ids = taskIdsBySource[sourceId]
			try {
				const result = await embedOneNote(db, sourceId, recordMap[sourceId], contentMap)
				stats[result.skip ? 'skip' : 'ok']++
				if (result.skip) console.log('[processEmbedding] 跳过', sourceId, '：', result.skip)
				await markTasks(db, ids, 'done', '')
			} catch (err) {
				console.error('[processEmbedding] 笔记向量化失败', sourceId, '：', err.message)
				stats.fail++
				await markTasks(db, ids, 'failed', err.message || '向量化失败')
				await recordAiCall(db, {
					openid: recordMap[sourceId] ? recordMap[sourceId].createBy : '',
					usage: null, durationMs: null, status: 'error', errorMsg: err.message
				})
			}
		}

		console.log('[processEmbedding] 本轮完成：', JSON.stringify(stats))
		return { code: 0, message: '处理完成', data: { total: sourceIds.length, ...stats } }
	} catch (err) {
		console.error('[processEmbedding] 执行异常：', err.message)
		return { code: -1, message: '任务处理异常：' + err.message }
	}
}

/**
 * 批量加载笔记标题与正文
 * 标题在 daily_record，正文在 summarize（通过 summarizeId 关联）
 * @param {Object} db 数据库实例
 * @param {Array<string>} sourceIds 笔记 ID 列表
 * @returns {Promise<{recordMap: Object, contentMap: Object}>} recordMap[id]=记录行，contentMap[summarizeId]=正文
 */
async function loadNotes(db, sourceIds) {
	const _ = db.command
	const recRes = await db.collection('daily_record')
		.where({ _id: _.in(sourceIds) })
		.field({ title: true, summarizeId: true, createBy: true })
		.get()
	const records = (recRes.result || recRes).data || []

	const recordMap = {}
	const contentMap = {}
	const summarizeIds = []
	records.forEach(r => {
		recordMap[r._id] = r
		if (r.summarizeId) {
			summarizeIds.push(r.summarizeId)
			contentMap[r.summarizeId] = ''
		}
	})

	if (summarizeIds.length > 0) {
		const sumRes = await db.collection('summarize')
			.where({ _id: _.in(summarizeIds) })
			.field({ content: true })
			.get()
		const sumList = (sumRes.result || sumRes).data || []
		sumList.forEach(s => {
			contentMap[s._id] = s.content || ''
		})
	}

	return { recordMap, contentMap }
}

/**
 * 对单篇笔记做切片、向量化并落库（幂等：先删该笔记旧向量再写入）
 * 笔记已被删除时返回 { skip } 而非报错
 * @param {Object} db 数据库实例
 * @param {string} sourceId 笔记 ID
 * @param {Object|undefined} record 笔记录（不存在表示已删除）
 * @param {Object} contentMap summarizeId → 正文映射
 * @returns {Promise<{ok: true, chunks: number}|{skip: string}>}
 */
async function embedOneNote(db, sourceId, record, contentMap) {
	if (!record) return { skip: '笔记已删除' }

	const title = record.title || ''
	const content = record.summarizeId ? (contentMap[record.summarizeId] || '') : ''
	const chunks = chunkNote(title, content)
	if (chunks.length === 0) return { skip: '内容为空' }

	const callStart = Date.now()
	const res = await axios.post(
		EMBEDDING_URL,
		{ model: AI_MODEL, input: chunks, dimensions: DIMENSIONS },
		{
			headers: {
				'Authorization': `Bearer ${ZHIPU_API_KEY}`,
				'Content-Type': 'application/json'
			},
			timeout: API_TIMEOUT
		}
	)

	const data = res.data.data || []
	const vectors = data.sort((a, b) => a.index - b.index).map(d => d.embedding)
	if (vectors.length !== chunks.length) {
		throw new Error(`向量条数(${vectors.length})与切片数(${chunks.length})不一致`)
	}

	// 幂等写入：先删旧向量，保证一篇笔记任何时刻只有一套向量
	const now = Date.now()
	await db.collection('note_embedding').where({ source_id: sourceId }).remove()
	await db.collection('note_embedding').add(chunks.map((chunk, i) => ({
		source_type: 'record',
		source_id: sourceId,
		chunk_index: i,
		digest: chunk.slice(0, 50),
		vector: vectors[i],
		create_by: record.createBy || '',
		create_time: now
	})))

	await recordAiCall(db, {
		openid: record.createBy || '',
		usage: res.data.usage,
		durationMs: Date.now() - callStart,
		status: 'success'
	})

	return { ok: true, chunks: chunks.length }
}

/**
 * 笔记切片（知识库方案 §4.5.1，v1 从简）
 * 短笔记整篇一个向量；长笔记按二级标题切段，标题拼进每段提高召回；
 * 超长段落再按换行细切，避免静默截断丢内容
 * @param {string} title 笔记标题
 * @param {string} content 笔记正文（Markdown）
 * @returns {Array<string>} 切片数组
 */
function chunkNote(title, content) {
	const text = `${title || ''}\n${content || ''}`.trim()
	if (!text) return []
	if (text.length <= 1000) return [text]

	const sections = String(content || '').split(/\n(?=##\s)/)
	const chunks = []
	sections.forEach(section => {
		const piece = `${title}\n${section}`.trim()
		splitLongPiece(piece, 1500).forEach(p => chunks.push(p))
	})
	return chunks
}

/**
 * 将超长文本按换行边界切成不超过 maxSize 的片段，单行超长时硬切
 * @param {string} piece 待切文本
 * @param {number} maxSize 单片段最大长度
 * @returns {Array<string>}
 */
function splitLongPiece(piece, maxSize) {
	if (piece.length <= maxSize) return [piece]

	const parts = []
	let buf = ''
	for (let line of piece.split('\n')) {
		while (line.length > maxSize) {
			parts.push(line.slice(0, maxSize))
			line = line.slice(maxSize)
		}
		if (!line) continue
		if (buf && buf.length + 1 + line.length > maxSize) {
			parts.push(buf)
			buf = line
		} else {
			buf = buf ? `${buf}\n${line}` : line
		}
	}
	if (buf) parts.push(buf)
	return parts
}

/**
 * 批量更新任务状态
 * @param {Object} db 数据库实例
 * @param {Array<string>} ids 任务 ID 列表
 * @param {string} status 目标状态
 * @param {string} errorMsg 失败原因（成功时为空）
 */
async function markTasks(db, ids, status, errorMsg) {
	await db.collection('embed_task_queue')
		.where({ _id: db.command.in(ids) })
		.update({ status, error_msg: errorMsg || '', update_time: Date.now() })
}

/**
 * 记录一次 embedding 调用到 ai_call_logs（复用现有监控体系，admin 页可观测）
 * 监控写入异常静默忽略，不影响业务主流程
 * @param {Object} db 数据库实例
 * @param {Object} params { openid, usage, durationMs, status, errorMsg }
 */
async function recordAiCall(db, params) {
	try {
		const { openid, usage, durationMs, status, errorMsg } = params
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
		console.error('[processEmbedding] 监控写入失败，已忽略：', e.message)
	}
}
