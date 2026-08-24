'use strict'

const crypto = require('crypto')

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000

function base64url(input) {
	return Buffer.from(input).toString('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
}

function decodeBase64url(input) {
	const normalized = String(input).replace(/-/g, '+').replace(/_/g, '/')
	const padding = '='.repeat((4 - normalized.length % 4) % 4)
	return Buffer.from(normalized + padding, 'base64').toString('utf8')
}

function signPayload(encodedPayload, secret) {
	return base64url(crypto.createHmac('sha256', secret).update(encodedPayload).digest())
}

function assertSecret(secret) {
	if (!secret || String(secret).length < 32) {
		throw new Error('KB_SESSION_SECRET 必须至少 32 个字符')
	}
}

function issueSession(openid, secret, ttlMs = DEFAULT_TTL_MS, now = Date.now()) {
	assertSecret(secret)
	if (!openid) throw new Error('openid 不能为空')

	const expiresAt = now + ttlMs
	const payload = {
		v: 1,
		openid: String(openid),
		iat: now,
		exp: expiresAt
	}
	const encodedPayload = base64url(JSON.stringify(payload))
	const signature = signPayload(encodedPayload, secret)
	return {
		token: `${encodedPayload}.${signature}`,
		expiresAt
	}
}

function verifySession(token, secret, now = Date.now()) {
	assertSecret(secret)
	const parts = String(token || '').split('.')
	if (parts.length !== 2 || !parts[0] || !parts[1]) {
		throw new Error('登录凭证格式无效')
	}

	const expected = signPayload(parts[0], secret)
	const actualBuffer = Buffer.from(parts[1])
	const expectedBuffer = Buffer.from(expected)
	if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
		throw new Error('登录凭证签名无效')
	}

	let payload
	try {
		payload = JSON.parse(decodeBase64url(parts[0]))
	} catch (e) {
		throw new Error('登录凭证内容无效')
	}
	if (payload.v !== 1 || !payload.openid || !Number.isFinite(payload.exp)) {
		throw new Error('登录凭证内容无效')
	}
	if (now >= payload.exp) {
		throw new Error('登录凭证已过期')
	}
	return payload
}

module.exports = {
	DEFAULT_TTL_MS,
	issueSession,
	verifySession
}
