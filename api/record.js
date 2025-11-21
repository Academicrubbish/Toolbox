import store from '@/store';
import { withAuth } from '@/utils/api-auth.js';

// 延迟初始化数据库连接，避免在模块加载时 uniCloud 未初始化
const getRequest = () => {
  if (typeof uniCloud === 'undefined' || !uniCloud.database) {
    throw new Error('uniCloud 未初始化，请确保在应用启动后再调用数据库操作')
  }
  return uniCloud.database().collection("daily_record")
}

// 将传统分页 {pageSize, pageNum} 转换为 JQL 分页 {skip, limit}
function convertPagination(pageSize, pageNum) {
  // 计算需要跳过的条目数
  const skipCount = (pageNum - 1) * pageSize;

  // 返回 JQL 可用的 skip 和 limit 参数
  return {
    skip: skipCount,
    limit: pageSize
  };
}

// 查询记录列表（需要登录）
// 注意：此函数支持传入 options 参数来控制是否自动弹出登录弹窗
export const getRecordList = function(data, options = {}) {
  return withAuth(function(data) {
    const { pageSize, pageNum } = data;
    const { skip, limit } = convertPagination(pageSize, pageNum);
    const user = store.state.user
    return getRequest().where({ createBy: user.openid }).orderBy('createTime desc').skip(skip).limit(limit).get()
  }, store, options)(data)
}

// 查询记录详情（不需要登录）
export function getRecord(id) {
  return getRequest().doc(id).get()
}

// 添加记录（需要登录）
export const addRecord = withAuth(function(data) {
  return getRequest().add(data)
}, store)

// 更新记录（需要登录）
export const updateRecord = withAuth(function(id, data) {
  return getRequest().doc(id).update(data)
}, store)

// 删除记录（需要登录）
export const delRecord = withAuth(function(id) {
  return getRequest().doc(id).remove()
}, store)