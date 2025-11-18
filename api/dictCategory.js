import store from '@/store';

const request = uniCloud.database().collection("dict_category") //创建数据库连接
const db = uniCloud.database()

// 查询标签列表（不分页，获取当前用户的所有标签和公共标签）
export function getDictCategoryList() {
  // 在函数内部获取最新的 openid，避免模块加载时 openid 还未初始化
  const openid = store.state.user.openid;
  if (!openid) {
    return Promise.reject(new Error('用户未登录'));
  }
  // 查询条件：当前用户的标签 OR 公共标签（createBy为空字符串）
  // 使用 db.command.or 组合多个查询条件
  return request.where(
    db.command.or([
      { createBy: openid },  // 当前用户的标签
      { createBy: '' }       // 公共标签（createBy为空字符串）
    ])
  ).orderBy('createTime desc').get()
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

