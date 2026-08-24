'use strict'
const axios = require('axios')
const crypto = require('crypto')
const { chunkNote } = require('kb-vector')
const { nextFailureState } = require('./task-state')

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
const MAX_RETRY_COUNT = 3

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
			.update({ status: 'pending', claim_token: '', update_time: now, error_msg: '' })

		// 1. 认领一批 pending 任务（先到 processing，防止并发重复消费）
		const taskRes = await db.collection('embed_task_queue')
			.where({ status: 'pending' })
			.orderBy('create_time', 'asc')
			.limit(TASK_BATCH_SIZE)
			.get()
		const candidates = (taskRes.result || taskRes).data || []
		if (candidates.length === 0) {
			return { code: 0, message: '无待处理任务' }
		}

		const claimToken = `${now}_${crypto.randomBytes(8).toString('hex')}`
		const candidateIds = candidates.map(t => t._id)
		await db.collection('embed_task_queue')
			.where({ _id: _.in(candidateIds), status: 'pending' })
			.update({ status: 'processing', claim_token: claimToken, update_time: now })

		// 只处理本实例实际认领成功的任务。并发实例即使读到同一批候选，也拿不到相同 claim_token。
		const claimedRes = await db.collection('embed_task_queue')
			.where({ status: 'processing', claim_token: claimToken })
			.limit(TASK_BATCH_SIZE)
			.get()
		const tasks = (claimedRes.result || claimedRes).data || []
		if (tasks.length === 0) {
			return { code: 0, message: '任务已被其他实例认领' }
		}

		// 2. 按笔记去重：同笔记多次编辑只处理一次，天然取到最新内容
		const tasksBySource = {}
		tasks.forEach(t => {
			if (!tasksBySource[t.source_id]) tasksBySource[t.source_id] = []
			tasksBySource[t.source_id].push(t)
		})
		const sourceIds = Object.keys(tasksBySource)

		// 3. 批量拉取笔记标题与正文（实时拉取而非快照，保证向量为保存时最新内容）
		const { recordMap, contentMap } = await loadNotes(db, sourceIds)

		// 4. 逐笔记向量化，单篇失败不影响其他
		// 若本轮中途异常，未结算任务会停留在 processing，由步骤 0 的残留恢复机制重置重试
		const stats = { ok: 0, fail: 0, skip: 0 }
		for (const sourceId of sourceIds) {
			const sourceTasks = tasksBySource[sourceId]
			const owner = sourceTasks[0].create_by || ''
			try {
				const result = await embedOneNote(db, sourceId, owner, recordMap[sourceId], contentMap)
				if (result.retry) {
					await resetTasks(db, sourceTasks, claimToken, result.retry)
					stats.skip++
					continue
				}
				stats[result.skip ? 'skip' : 'ok']++
				if (result.skip) console.log('[processEmbedding] 跳过', sourceId, '：', result.skip)
				await markTasks(db, sourceTasks.map(t => t._id), claimToken, 'done', '')
			} catch (err) {
				console.error('[processEmbedding] 笔记向量化失败', sourceId, '：', err.message)
				stats.fail++
				await retryOrFailTasks(db, sourceTasks, claimToken, err.message || '向量化失败')
				await recordAiCall(db, {
					openid: owner,
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
async function embedOneNote(db, sourceId, owner, record, contentMap) {
	if (!record) {
		if (owner) await db.collection('note_embedding').where({ source_id: sourceId, create_by: owner }).remove()
		return { skip: '笔记已删除' }
	}
	if (!owner || record.createBy !== owner) {
		throw new Error('任务归属与笔记归属不一致')
	}

	const title = record.title || ''
	const content = record.summarizeId ? (contentMap[record.summarizeId] || '') : ''
	const chunks = chunkNote(title, content)
	if (chunks.length === 0) return { skip: '内容为空' }
	const sourceHash = hashChunks(chunks)

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

	// API 调用期间用户可能编辑或删除笔记；落库前重新读取并比较实际内容。
	const latest = await loadNotes(db, [sourceId])
	const latestRecord = latest.recordMap[sourceId]
	if (!latestRecord || latestRecord.createBy !== owner) {
		await db.collection('note_embedding').where({ source_id: sourceId, create_by: owner }).remove()
		return { skip: '笔记已删除' }
	}
	const latestContent = latestRecord.summarizeId ? (latest.contentMap[latestRecord.summarizeId] || '') : ''
	if (hashChunks(chunkNote(latestRecord.title || '', latestContent)) !== sourceHash) {
		return { retry: '笔记内容已更新，重新排队' }
	}

	// 幂等写入：先删旧向量，保证一篇笔记任何时刻只有一套向量
	const now = Date.now()
	await db.collection('note_embedding').where({ source_id: sourceId, create_by: owner }).remove()
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

function hashChunks(chunks) {
	return crypto.createHash('sha256').update(JSON.stringify(chunks)).digest('hex')
}

/**
 * 批量更新任务状态
 * @param {Object} db 数据库实例
 * @param {Array<string>} ids 任务 ID 列表
 * @param {string} status 目标状态
 * @param {string} errorMsg 失败原因（成功时为空）
 */
async function markTasks(db, ids, claimToken, status, errorMsg) {
	await db.collection('embed_task_queue')
		.where({ _id: db.command.in(ids), status: 'processing', claim_token: claimToken })
		.update({ status, claim_token: '', error_msg: errorMsg || '', update_time: Date.now() })
}

async function resetTasks(db, tasks, claimToken, reason) {
	await markTasks(db, tasks.map(t => t._id), claimToken, 'pending', reason)
}

async function retryOrFailTasks(db, tasks, claimToken, errorMsg) {
	for (const task of tasks) {
		const next = nextFailureState(task.retry_count, MAX_RETRY_COUNT)
		await db.collection('embed_task_queue')
			.where({ _id: task._id, status: 'processing', claim_token: claimToken })
			.update({
				status: next.status,
				claim_token: '',
				retry_count: next.retryCount,
				error_msg: errorMsg,
				update_time: Date.now()
			})
	}
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
