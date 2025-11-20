import store from '@/store';
import { create } from 'lodash';

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

// 查询记录列表  找到公共标签或者该用户的私有标签
export function getDictList() {
    const db = getDb()
    const request = getRequest()
    const user = store.state.user
    return request.where(db.command.or([{ isPublicVisible: false }, { createBy: user.openid }])).orderBy('createTime desc').get()
}

// 查询记录列表  找到最新创建的前三个标签
export function getDictTopList() {
    const db = getDb()
    const request = getRequest()
    const user = store.state.user
    return request.where(db.command.or([{ isPublicVisible: false }, { createBy: user.openid }])).orderBy('createTime desc').limit(3).get()
}

// 查询标签详情
export function getDict(id) {
    return getRequest().doc(id).get()
}

// 添加标签
export function addDict(data) {
    return getRequest().add(data)
}

// 更新标签
export function updateDict(id, data) {
    return getRequest().doc(id).update(data)
}

//删除标签
export function delDict(id) {
    return getRequest().doc(id).remove()
}