import store from '@/store';
import { withAuth } from '@/utils/api-auth.js';

/**
 * 向量任务队列（集合：embed_task_queue）
 * 知识库第一期：笔记保存/编辑后投递向量化任务，由 processEmbedding 定时消费。
 * 全部为 fire-and-forget 调用：入队失败只打日志、不影响保存主流程（下次编辑会再次入队）。
 */

// 延迟初始化数据库连接，避免在模块加载时 uniCloud 未初始化
const getQueue = () => {
  if (typeof uniCloud === 'undefined' || !uniCloud.database) {
    throw new Error('uniCloud 未初始化，请确保在应用启动后再调用数据库操作')
  }
  return uniCloud.database().collection("embed_task_queue")
}

const getEmbedding = () => {
  if (typeof uniCloud === 'undefined' || !uniCloud.database) {
    throw new Error('uniCloud 未初始化，请确保在应用启动后再调用数据库操作')
  }
  return uniCloud.database().collection("note_embedding")
}

const getRecordCollection = () => {
  if (typeof uniCloud === 'undefined' || !uniCloud.database) {
    throw new Error('uniCloud 未初始化，请确保在应用启动后再调用数据库操作')
  }
  return uniCloud.database().collection("daily_record")
}

/**
 * 投递一条向量化任务
 * 同笔记重复投递无害：消费端按笔记去重且先删后写（幂等）
 * @param {string} sourceId 笔记 ID（daily_record._id）
 */
export function enqueueEmbedTask(sourceId) {
  if (!sourceId) return
  const now = Date.now()
  getQueue().add({
    source_id: sourceId,
    content: '',
    status: 'pending',
    error_msg: '',
    create_time: now,
    update_time: now
  }).catch(err => {
    console.error('[embedTask] 向量化任务投递失败（不影响保存）：', err)
  })
}

/**
 * 正文编辑后投递任务：按 summarizeId 反查所属笔记
 * 说明：正文编辑走 summarize 集合，不经过 record 保存流程，需反查 daily_record 定位笔记
 * @param {string} summarizeId 总结 ID
 */
export function enqueueEmbedTaskBySummarizeId(summarizeId) {
  if (!summarizeId) return
  getRecordCollection().where({ summarizeId }).limit(1).get().then(res => {
    const record = (res.result?.data || res.data || [])[0]
    if (record) enqueueEmbedTask(record._id)
  }).catch(err => {
    console.error('[embedTask] 反查笔记失败（不影响保存）：', err)
  })
}

/**
 * 删除笔记时清理其全部向量
 * 队列中该笔记的残留任务由消费端按"笔记已删除"自行跳过，无需额外处理
 * @param {string} sourceId 笔记 ID（daily_record._id）
 */
export function removeEmbeddings(sourceId) {
  if (!sourceId) return
  getEmbedding().where({ source_id: sourceId }).remove().catch(err => {
    console.error('[embedTask] 向量清理失败（不影响删除）：', err)
  })
}
