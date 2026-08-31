'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildRecordScopeKey,
  shouldAcceptRecordQuery,
} = require('../utils/record-query-state')

test('游客与登录用户生成不同的记录列表作用域', () => {
  assert.equal(buildRecordScopeKey({ isGuest: true, openid: '', authStateVersion: 0 }), 'guest:0')
  assert.equal(
    buildRecordScopeKey({ isGuest: false, openid: 'openid-a', authStateVersion: 1 }),
    'user:openid-a:1',
  )
})

test('登录前发出的游客请求不能覆盖登录后的个人列表', () => {
  assert.equal(shouldAcceptRecordQuery({
    requestId: 1,
    latestRequestId: 2,
    requestScope: 'guest:0',
    currentScope: 'user:openid-a:1',
  }), false)
})

test('只有最新且身份作用域一致的查询结果可以写入列表', () => {
  assert.equal(shouldAcceptRecordQuery({
    requestId: 2,
    latestRequestId: 2,
    requestScope: 'user:openid-a:1',
    currentScope: 'user:openid-a:1',
  }), true)
})
