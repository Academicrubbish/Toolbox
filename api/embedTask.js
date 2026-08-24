import store from '@/store';

function invalidateExpiredSession(result) {
  if (!result || result.code !== -401) return
  store.commit('SET_IS_GUEST', true)
  store.commit('SET_OPENID', '')
  store.commit('SET_SESSION_TOKEN', '')
}

/**
 * 向量任务队列（集合：embed_task_queue）
 * 知识库第一期：笔记保存/编辑后投递向量化任务，由 processEmbedding 定时消费。
 * 全部为 fire-and-forget 调用：入队失败只打日志、不影响保存主流程（下次编辑会再次入队）。
 */

function callManageEmbedding(action, data) {
  return uniCloud.callFunction({
    name: 'manageEmbedding',
    data: Object.assign({
      action,
      sessionToken: store.state.user.sessionToken
    }, data)
  }).then(res => {
    if (!res.result || res.result.code !== 0) {
      invalidateExpiredSession(res.result)
      return Promise.reject(new Error(res.result?.message || '向量索引操作失败'))
    }
    return res.result
  })
}

/**
 * 投递一条向量化任务
 * 同笔记重复投递无害：消费端按笔记去重且先删后写（幂等）
 * @param {string} sourceId 笔记 ID（daily_record._id）
 */
export function enqueueEmbedTask(sourceId) {
  if (!sourceId) return
  callManageEmbedding('enqueue', { sourceId }).catch(err => {
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
  callManageEmbedding('enqueue', { summarizeId }).catch(err => {
    console.error('[embedTask] 正文编辑后向量化任务投递失败（不影响保存）：', err)
  })
}

/**
 * 删除笔记时清理其全部向量
 * 队列中该笔记的残留任务由消费端按"笔记已删除"自行跳过，无需额外处理
 * @param {string} sourceId 笔记 ID（daily_record._id）
 */
export function removeEmbeddings(sourceId) {
  if (!sourceId) return
  callManageEmbedding('deleteIndex', { sourceId }).catch(err => {
    console.error('[embedTask] 向量清理失败（不影响删除）：', err)
  })
}
