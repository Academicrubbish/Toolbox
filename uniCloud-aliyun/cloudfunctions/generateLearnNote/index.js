'use strict'
const { verifySession } = require('kb-auth')

exports.main = async (event, context) => {
	const { content, recordId } = event

	if (!content || content.trim() === '') {
		return { code: -1, message: '笔记内容不能为空' }
	}

	let openid
	try { openid = verifySession(event.sessionToken, process.env.KB_SESSION_SECRET).openid }
	catch (err) { return { code: -401, message: '登录已过期，请重新登录' } }
	const db = uniCloud.database()
	// 与 noteService 的可读规则一致：本人笔记或公共示例（createBy 为空串）均可辅导；
	// 不带 recordId 的直接提交（旧版契约）不受归属校验限制。
	if (recordId) {
		const recordRes = await db.collection('daily_record').where({ _id: recordId }).limit(1).get()
		const record = (recordRes.data || recordRes.result?.data || [])[0]
		if (!record || (record.createBy !== openid && record.createBy !== '')) {
			return { code: -403, message: '笔记不存在或无权操作' }
		}
	}
	const now = Date.now()

	try {
		// 生成 batch_id（同一批次关联笔记和练习）
		const batchId = now + '_' + Math.random().toString(36).substring(2, 8)

		// 1. 创建两条学习结果记录：笔记 + 练习
		const noteLogRes = await db.collection('ai_learn_logs').add({
			record_id: recordId || '',
			source_content: content,
			ai_result: '',
			type: 'note',
			batch_id: batchId,
			status: 'pending',
			error_msg: '',
			create_time: now,
			complete_time: null,
			create_by: openid
		})

		const exerciseLogRes = await db.collection('ai_learn_logs').add({
			record_id: recordId || '',
			source_content: content,
			ai_result: '',
			type: 'exercise',
			batch_id: batchId,
			status: 'pending',
			error_msg: '',
			create_time: now,
			complete_time: null,
			create_by: openid
		})

		// 2. 写入任务队列（携带 batch_id 和两条记录的 _id）
		// create_by 供 processLearnNote 定时触发器反查调用者，写入 AI 调用监控日志
		await db.collection('ai_task_queue').add({
			log_id: noteLogRes.id,
			note_log_id: noteLogRes.id,
			exercise_log_id: exerciseLogRes.id,
			batch_id: batchId,
			content: content,
			create_by: openid,
			status: 'pending',
			error_msg: '',
			create_time: now,
			update_time: now
		})

		// 3. 立即返回，不调 AI，不存在超时问题
		return {
			code: 0,
			message: '已提交，AI正在生成中',
			data: {
				logId: noteLogRes.id,
				batchId: batchId
			}
		}
	} catch (err) {
		console.error('提交任务失败：', err.message)
		return { code: -1, message: '提交失败，请稍后重试' }
	}
}
