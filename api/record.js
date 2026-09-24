import store from '@/store'
import { withAuth } from '@/utils/api-auth.js'
import { noteRequest } from '@/api/noteService.js'
import { enqueueEmbedTask, removeEmbeddings } from '@/api/embedTask.js'

/** 获取记录列表（游客返回空列表，登录后按人过滤） */
export function getRecordList(data, options = {}) {
  if (store.state.user.isGuest) return noteRequest('listRecords', data)
  return withAuth(() => noteRequest('listRecords', data), store, options)()
}

/** 获取记录详情（本人或公共示例） */
export function getRecord(id) {
  return noteRequest('getRecord', { id })
}

/** 按正文 ID 反查所属记录 */
export const getRecordBySummarizeId = withAuth(
  id => noteRequest('getRecordBySummarizeId', { id }), store, { autoShowLogin: false }
)

/** 新增记录，成功后投递向量化任务 */
export const addRecord = withAuth(async data => {
  const result = await noteRequest('addRecord', { value: data })
  if (result.result.id && !result.result.existing) enqueueEmbedTask(result.result.id)
  return result
}, store)

/** 更新记录，成功后投递向量化任务 */
export const updateRecord = withAuth(async (id, data) => {
  const result = await noteRequest('updateRecord', { id, value: data })
  enqueueEmbedTask(id)
  return result
}, store)

/** 删除记录，成功后清理向量索引 */
export const delRecord = withAuth(async id => {
  const result = await noteRequest('deleteRecord', { id })
  removeEmbeddings(id)
  return result
}, store)

export function searchRecord(data, options = {}) {
  return withAuth(async () => {
    const response = await uniCloud.callFunction({
      name: 'searchRecord',
      data: { ...data, sessionToken: store.state.user.sessionToken }
    })
    const result = response.result || {}
    if (result.code !== 0) throw new Error(result.message || '搜索失败')
    return { result }
  }, store, options)()
}
