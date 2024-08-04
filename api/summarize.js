const request = uniCloud.database().collection("summarize") //创建数据库连接

// 查询总结详情
export function  getSummarize(id) {
  return request.doc(id).get()
}

// 根据recordId查询summarize信息
export function  summarizeRecordInfoById(id) {
  return request.where({ recordId: id }).get()
}



// 添加总结
export function addSummarize(data) {
  return request.add(data)
}


// 更新总结
export function updateSummarize(id,data) {
  return request.doc(id).update(data)
}


//删除总结
export function delSummarize(id) {
  return request.doc(id).remove()
}