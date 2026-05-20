import { delRecord } from '@/api/record.js'
import { delSummarize } from '@/api/summarize.js'
import { deleteAiLogsByRecordId } from '@/api/aiLearn.js'

/**
 * 级联删除记录及其所有关联数据
 * 1. 删除 AI 日志 + 任务队列
 * 2. 删除总结 + 云存储图片
 * 3. 删除记录本身
 * @param {string} recordId 记录ID
 * @param {string} [summarizeId] 总结ID（可选）
 * @returns {Promise}
 */
export function deleteRecordCascade(recordId, summarizeId) {
	return delRecord(recordId).then(res => {
		if (!res.result || (res.result.code !== 0 && res.result.code !== undefined)) {
			return Promise.reject(new Error(res.result?.msg || '删除记录失败'))
		}
		// 记录已删，后续清理不需要阻塞用户
		const tasks = [deleteAiLogsByRecordId(recordId)]
		if (summarizeId) {
			tasks.push(delSummarize(summarizeId))
		}
		return Promise.all(tasks)
	})
}
