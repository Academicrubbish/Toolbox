import store from '@/store';

const request = uniCloud.database().collection("dict_category") //创建数据库连接

// 查询标签列表（不分页，获取当前用户的所有标签）
export function getDictCategoryList() {
  // 在函数内部获取最新的 openid，避免模块加载时 openid 还未初始化
  const openid = store.state.user.openid;
  if (!openid) {
    return Promise.reject(new Error('用户未登录'));
  }
  return request.where({ createBy: openid }).orderBy('createTime desc').get()
}

// 查询标签详情
export function getDictCategory(id) {
  return request.doc(id).get()
}

// 添加标签
export function addDictCategory(data) {
  return request.add(data)
}

// 更新标签
export function updateDictCategory(id, data) {
  return request.doc(id).update(data)
}

// 删除标签
export function delDictCategory(id) {
  return request.doc(id).remove()
}

