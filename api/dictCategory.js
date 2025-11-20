import store from '@/store';

// 延迟初始化数据库连接，避免在模块加载时 uniCloud 未初始化
const getDb = () => {
  if (typeof uniCloud === 'undefined' || !uniCloud.database) {
    throw new Error('uniCloud 未初始化，请确保在应用启动后再调用数据库操作')
  }
  return uniCloud.database()
}

const getRequest = () => {
  return getDb().collection("dict_category")
}

// 查询标签列表（不分页，获取当前用户的所有标签和公共标签）
export function getDictCategoryList() {
  // 在函数内部获取最新的 openid，避免模块加载时 openid 还未初始化
  const openid = store.state.user.openid;
  if (!openid) {
    return Promise.reject(new Error('用户未登录'));
  }
  const db = getDb()
  const request = getRequest()
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
  return getRequest().doc(id).get()
}

// 添加标签
export function addDictCategory(data) {
  return getRequest().add(data)
}

// 更新标签
export function updateDictCategory(id, data) {
  return getRequest().doc(id).update(data)
}

// 删除标签
export function delDictCategory(id) {
  return getRequest().doc(id).remove()
}

