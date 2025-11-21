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

// 查询记录列表（需要登录）
export const getDictList = withAuth(function() {
    const db = getDb()
    const request = getRequest()
    const user = store.state.user
    return request.where(db.command.or([{ isPublicVisible: false }, { createBy: user.openid }])).orderBy('createTime desc').get()
}, store)

// 查询记录列表 - 前三个标签（需要登录）
export const getDictTopList = withAuth(function() {
    const db = getDb()
    const request = getRequest()
    const user = store.state.user
    return request.where(db.command.or([{ isPublicVisible: false }, { createBy: user.openid }])).orderBy('createTime desc').limit(3).get()
}, store)

// 查询标签详情（不需要登录）
export function getDict(id) {
    return getRequest().doc(id).get()
}

// 添加标签（需要登录）
export const addDict = withAuth(function(data) {
    return getRequest().add(data)
}, store)

// 更新标签（需要登录）
export const updateDict = withAuth(function(id, data) {
    return getRequest().doc(id).update(data)
}, store)

// 删除标签（需要登录）
export const delDict = withAuth(function(id) {
    return getRequest().doc(id).remove()
}, store)