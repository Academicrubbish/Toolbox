'use strict'

/**
 * 生成记录列表所属的身份作用域。
 * 列表请求和返回结果必须属于同一作用域，避免登录前的示例数据覆盖登录后的个人数据。
 *
 * @param {Object} user 用户状态
 * @returns {string} 身份作用域键
 */
function buildRecordScopeKey(user = {}) {
  const version = Number(user.authStateVersion) || 0
  if (user.isGuest || !user.openid) {
    return `guest:${version}`
  }
  return `user:${String(user.openid)}:${version}`
}

/**
 * 判断异步记录查询结果是否仍可写入当前列表。
 *
 * @param {Object} params 查询上下文
 * @returns {boolean} 是否接收结果
 */
function shouldAcceptRecordQuery(params = {}) {
  return params.requestId === params.latestRequestId
    && params.requestScope === params.currentScope
}

module.exports = {
  buildRecordScopeKey,
  shouldAcceptRecordQuery,
}
