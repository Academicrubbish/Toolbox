const test = require('node:test')
const assert = require('node:assert/strict')
const { classifyApiError } = require('../uniCloud-aliyun/cloudfunctions/processEmbedding/classify-error.js')

const axiosError = (status, body) => ({
  response: { status, data: body },
  message: 'Request failed with status code ' + status
})

test('429 余额不足（1113）判为 quota，快速熔断不再重试', () => {
  const result = classifyApiError(axiosError(429, { error: { code: '1113', message: 'Insufficient balance' } }))
  assert.equal(result.kind, 'quota')
  assert.match(result.message, /余额不足/)
  assert.match(result.message, /1113/)
})

test('429 用量上限（1308）同样判为 quota', () => {
  const result = classifyApiError(axiosError(429, { error: { code: '1308', message: 'Usage limit reached' } }))
  assert.equal(result.kind, 'quota')
})

test('429 限流（1302）与平台过载（1305）判为 rate，退避不计重试次数', () => {
  assert.equal(classifyApiError(axiosError(429, { error: { code: '1302', message: 'rate limit' } })).kind, 'rate')
  assert.equal(classifyApiError(axiosError(429, { error: { code: '1305', message: 'overloaded' } })).kind, 'rate')
})

test('429 无响应体或未知错误码按 rate 退避处理', () => {
  assert.equal(classifyApiError(axiosError(429, undefined)).kind, 'rate')
  assert.equal(classifyApiError(axiosError(429, { error: { code: '9999' } })).kind, 'rate')
})

test('非 429 错误走普通重试，且错误信息包含状态码与响应体说明', () => {
  const bad = classifyApiError(axiosError(400, { error: { code: '1210', message: 'API 参数无效' } }))
  assert.equal(bad.kind, 'error')
  assert.match(bad.message, /400/)
  assert.match(bad.message, /参数无效/)
})

test('网络超时等无响应错误返回原始错误信息', () => {
  const timeout = classifyApiError({ message: 'timeout of 60000ms exceeded' })
  assert.equal(timeout.kind, 'error')
  assert.match(timeout.message, /timeout/)
})
