// 延迟初始化数据库连接，避免在模块加载时 uniCloud 未初始化
const getRequest = () => {
  if (typeof uniCloud === 'undefined' || !uniCloud.database) {
    throw new Error('uniCloud 未初始化，请确保在应用启动后再调用数据库操作')
  }
  return uniCloud.database().collection("summarize")
}

// 查询总结详情
export function  getSummarize(id) {
  return getRequest().doc(id).get()
}

// 根据recordId查询summarize信息
export function  summarizeRecordInfoById(id) {
  return getRequest().where({ recordId: id }).get()
}



// 添加总结
export function addSummarize(data) {
  return getRequest().add(data)
}


// 更新总结
export function updateSummarize(id,data) {
  return getRequest().doc(id).update(data)
}


//删除总结
export function delSummarize(id) {
  return getRequest().doc(id).remove()
}