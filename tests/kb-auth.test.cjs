'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
	issueSession,
	verifySession
} = require('../uniCloud-aliyun/cloudfunctions/common/kb-auth')

const SECRET = 'test-secret-must-be-at-least-32-characters-long'
const OTHER_SECRET = 'another-secret-at-least-32-characters-long'
const NOW = 1787500000000

test('签发后可验证并取得 openid', () => {
	const session = issueSession('openid-a', SECRET, 10000, NOW)
	const payload = verifySession(session.token, SECRET, NOW + 1)
	assert.equal(payload.openid, 'openid-a')
	assert.equal(payload.exp, NOW + 10000)
})

test('篡改 payload 后拒绝验证', () => {
	const session = issueSession('openid-a', SECRET, 10000, NOW)
	const parts = session.token.split('.')
	const tampered = `${parts[0].slice(0, -1)}x.${parts[1]}`
	assert.throws(() => verifySession(tampered, SECRET, NOW + 1), /签名无效/)
})

test('使用不同密钥时拒绝验证', () => {
	const session = issueSession('openid-a', SECRET, 10000, NOW)
	assert.throws(() => verifySession(session.token, OTHER_SECRET, NOW + 1), /签名无效/)
})

test('过期凭证拒绝验证', () => {
	const session = issueSession('openid-a', SECRET, 10000, NOW)
	assert.throws(() => verifySession(session.token, SECRET, NOW + 10000), /已过期/)
})

test('过短密钥拒绝签发', () => {
	assert.throws(() => issueSession('openid-a', 'short', 10000, NOW), /至少 32 个字符/)
})
