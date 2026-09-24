import { delRecord } from '@/api/record.js'
import { deleteAiLogsByRecordId } from '@/api/aiLearn.js'

/**
 * 服务端先删关联图片，再在事务中删除正文和笔记。
 * AI 日志清理失败不改变笔记已删除的结果；孤儿数据清理工具可补偿。
 * @param {string} recordId 记录ID
 * @returns {Promise}
 */
export async function deleteRecordCascade(recordId) {
	const result = await delRecord(recordId)
	deleteAiLogsByRecordId(recordId).catch(error => {
		console.error('[record-delete] AI 日志清理失败：', error)
	})
	return result
}
