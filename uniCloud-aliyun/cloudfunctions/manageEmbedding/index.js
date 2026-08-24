'use strict'

const { verifySession } = require('kb-auth')

const KB_SESSION_SECRET = process.env.KB_SESSION_SECRET

exports.main = async (event, context) => {
	let openid
	try {
		openid = verifySession(event && event.sessionToken, KB_SESSION_SECRET).openid
	} catch (err) {
		return { code: -401, message: err.message || '登录凭证无效' }
	}

	const action = event && event.action
	const db = uniCloud.database()
	try {
		if (action === 'enqueue') {
			return await enqueue(db, openid, event.sourceId, event.summarizeId)
		}
		if (action === 'deleteIndex') {
			return await deleteIndex(db, openid, event.sourceId)
		}
		return { code: -1, message: '不支持的操作' }
	} catch (err) {
		console.error('[manageEmbedding] 操作失败：', err.message)
		return { code: -1, message: '向量索引操作失败' }
	}
}

async function enqueue(db, openid, sourceId, summarizeId) {
	const record = await findOwnedRecord(db, openid, sourceId, summarizeId)
	if (!record) {
		return { code: -404, message: '笔记不存在或无权操作' }
	}

	const _ = db.command
	const existingRes = await db.collection('embed_task_queue')
		.where({
			source_id: record._id,
			create_by: openid,
			status: _.in(['pending', 'processing'])
		})
		.field({ _id: true })
		.limit(1)
		.get()
	const existing = (existingRes.result || existingRes).data || []
	if (existing.length > 0) {
		return { code: 0, message: '任务已在队列中', data: { sourceId: record._id, deduplicated: true } }
	}

	const now = Date.now()
	await db.collection('embed_task_queue').add({
		source_id: record._id,
		create_by: openid,
		source_version: record.updateTime || '',
		status: 'pending',
		error_msg: '',
		claim_token: '',
		retry_count: 0,
		create_time: now,
		update_time: now
	})
	return { code: 0, message: '已投递', data: { sourceId: record._id, deduplicated: false } }
}

async function findOwnedRecord(db, openid, sourceId, summarizeId) {
	let query
	if (sourceId) {
		query = db.collection('daily_record').where({ _id: sourceId, createBy: openid })
	} else if (summarizeId) {
		query = db.collection('daily_record').where({ summarizeId, createBy: openid })
	} else {
		return null
	}
	const res = await query
		.field({ title: true, summarizeId: true, updateTime: true, createBy: true })
		.limit(1)
		.get()
	return ((res.result || res).data || [])[0] || null
}

async function deleteIndex(db, openid, sourceId) {
	if (!sourceId) return { code: -1, message: 'sourceId 不能为空' }
	const _ = db.command
	await Promise.all([
		db.collection('note_embedding')
			.where({ source_id: sourceId, create_by: openid })
			.remove(),
		db.collection('embed_task_queue')
			.where({
				source_id: sourceId,
				create_by: openid,
				status: _.in(['pending', 'processing'])
			})
			.update({
				status: 'cancelled',
				claim_token: '',
				error_msg: '笔记已删除',
				update_time: Date.now()
			})
	])
	return { code: 0, message: '索引已清理' }
}
