import store from '@/store';
import { withAuth } from '@/utils/api-auth.js';

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

// 查询标签列表（根据授权状态返回不同数据）
export function getDictCategoryList() {
  const db = getDb()
  const request = getRequest()
  const openid = store.state?.user?.openid
  
  // 如果已登录，返回：用户标签 + 公共标签
  if (openid && openid !== '') {
    return request.where(
      db.command.or([
        { createBy: openid },  // 当前用户的标签
        { createBy: '' }       // 公共标签（createBy为空字符串）
      ])
    ).orderBy('createTime desc').get()
  }
  
  // 如果未登录，只返回公共标签
  return request.where({
    createBy: ''
  }).orderBy('createTime desc').get()
}

// 查询标签详情（不需要登录）
export function getDictCategory(id) {
  return getRequest().doc(id).get()
}

// 添加标签（需要登录）
export const addDictCategory = withAuth(function(data) {
  return getRequest().add(data)
}, store)

// 更新标签（需要登录）
export const updateDictCategory = withAuth(function(id, data) {
  return getRequest().doc(id).update(data)
}, store)

// 删除标签（需要登录）
export const delDictCategory = withAuth(function(id) {
  return getRequest().doc(id).remove()
}, store)

