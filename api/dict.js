import store from '@/store';
import { create } from 'lodash';

const db = uniCloud.database()
const request = uniCloud.database().collection("dict_category") //创建数据库连接
const user = store.state.user

// 查询记录列表  找到公共标签或者该用户的私有标签
export function getDictList() {
    return request.where(db.command.or([{ isPublicVisible: false }, { createBy: user.openid }])).orderBy('createTime desc').get()
}

// 查询记录列表  找到最新创建的前三个标签
export function getDictTopList() {
    return request.where(db.command.or([{ isPublicVisible: false }, { createBy: user.openid }])).orderBy('createTime desc').limit(3).get()
}

// 查询标签详情
export function getDict(id) {
    return request.doc(id).get()
}

// 添加标签
export function addDict(data) {
    return request.add(data)
}

// 更新标签
export function updateDict(id, data) {
    return request.doc(id).update(data)
}

//删除标签
export function delDict(id) {
    return request.doc(id).remove()
}