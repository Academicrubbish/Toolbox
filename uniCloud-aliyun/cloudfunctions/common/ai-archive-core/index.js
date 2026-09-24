'use strict'

const crypto = require('crypto')
const KEY_TTL_MS = 365 * 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const RATE_LIMIT_1H = 10
const RATE_LIMIT_24H = 50

function hashKey(secret) {
  return crypto.createHash('sha256').update(String(secret || '')).digest('hex')
}

function issueKey(name, openid, now = Date.now()) {
  const cleanName = String(name || '').trim()
  if (!cleanName || cleanName.length > 40) throw new Error('密钥名称需为 1-40 个字符')
  if (!openid) throw new Error('登录凭证无效')
  const secret = 'an_' + crypto.randomBytes(32).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return {
    secret,
    document: {
      name: cleanName,
      createBy: openid,
      secretHash: hashKey(secret),
      suffix: secret.slice(-4),
      createdAt: now,
      expiresAt: now + KEY_TTL_MS,
      revokedAt: null,
      lastUsedAt: null
    }
  }
}

function isKeyUsable(doc, secret, now = Date.now()) {
  if (!doc || !doc.secretHash || doc.revokedAt || now >= doc.expiresAt) return false
  const expected = Buffer.from(doc.secretHash, 'hex')
  const actual = Buffer.from(hashKey(secret), 'hex')
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

function validateArchive(input) {
  const title = String(input && input.title || '').trim()
  const content = String(input && input.content || '').trim()
  const requestId = String(input && input.requestId || '').trim()
  if (!title || title.length > 120) throw new Error('标题需为 1-120 个字符')
  if (!content) throw new Error('正文不能为空')
  if (content.length > 60000) throw new Error('正文过长，最多 60000 个字符')
  if (requestId && !/^[A-Za-z0-9_-]{1,80}$/.test(requestId)) throw new Error('请求标识格式无效')
  return { title, content, requestId }
}

/**
 * 固定时间窗限频：每把密钥每小时最多 RATE_LIMIT_1H 篇、每 24 小时最多 RATE_LIMIT_24H 篇。
 * 窗口不匹配时计数归零；patch 为本次通过后应写回的计数快照。
 */
function checkRateLimit(doc, now = Date.now()) {
  const hourWindow = Math.floor(now / HOUR_MS)
  const dayWindow = Math.floor(now / (24 * HOUR_MS))
  const hourCount = doc.useWindow1h === hourWindow ? (doc.useCount1h || 0) : 0
  const dayCount = doc.useWindow24h === dayWindow ? (doc.useCount24h || 0) : 0
  if (hourCount >= RATE_LIMIT_1H || dayCount >= RATE_LIMIT_24H) {
    const hourLimited = hourCount >= RATE_LIMIT_1H
    const resetAt = (hourLimited ? hourWindow + 1 : dayWindow + 1) * (hourLimited ? HOUR_MS : 24 * HOUR_MS)
    return { allowed: false, retryAfterMs: resetAt - now, patch: null }
  }
  return {
    allowed: true, retryAfterMs: 0,
    patch: { useWindow1h: hourWindow, useCount1h: hourCount + 1, useWindow24h: dayWindow, useCount24h: dayCount + 1 }
  }
}

module.exports = { KEY_TTL_MS, RATE_LIMIT_1H, RATE_LIMIT_24H, hashKey, issueKey, isKeyUsable, validateArchive, checkRateLimit }
