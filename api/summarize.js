import store from '@/store';
import { withAuth } from '@/utils/api-auth.js';
import { enqueueEmbedTaskBySummarizeId } from '@/api/embedTask.js';
import { noteRequest } from '@/api/noteService.js';

// 查询总结详情
export function  getSummarize(id) {
  return noteRequest('getSummarize', { id })
}

// 根据recordId查询summarize信息
export function  summarizeRecordInfoById(id) {
  return noteRequest('getSummaryByRecord', { id })
}



// 添加总结（需要登录）
export const addSummarize = withAuth(function(data) {
  return noteRequest('addSummarize', { value: data })
}, store)

// 更新总结（需要登录）
// 正文编辑后投递向量化任务（按 summarizeId 反查所属笔记）
export const updateSummarize = withAuth(function(id, data) {
  return noteRequest('updateSummarize', { id, value: data }).then(res => {
    enqueueEmbedTaskBySummarizeId(id)
    return res
  })
}, store)

// 删除总结（需要登录）；服务端校验归属并级联删除云存储图片
export const delSummarize = withAuth(function(id) {
  return noteRequest('deleteSummarize', { id })
}, store)
