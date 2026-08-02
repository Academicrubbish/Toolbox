'use strict'

exports.main = async (event, context) => {
	const { content, recordId } = event

	if (!content || content.trim() === '') {
		return { code: -1, message: '笔记内容不能为空' }
	}

	const db = uniCloud.database()
	// 优先用客户端显式传入的 openid（阿里云自定义登录下 UNICLOUD_INFO.OPENID 不可靠）
	const openid = event.openid || (event.UNICLOUD_INFO && event.UNICLOUD_INFO.OPENID) || ''
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
