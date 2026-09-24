const test = require('node:test')
const assert = require('node:assert/strict')
const core = require('../uniCloud-aliyun/cloudfunctions/common/ai-archive-core/index.js')

test('密钥只以摘要存储并在 365 天后过期', () => {
  const now = Date.UTC(2026, 8, 23)
  const issued = core.issueKey('我的研究', 'user-1', now)
  assert.match(issued.secret, /^an_[A-Za-z0-9_-]{43}$/)
  assert.equal(issued.document.secretHash, core.hashKey(issued.secret))
  assert.equal(issued.document.expiresAt - now, 365 * 24 * 60 * 60 * 1000)
  assert.equal(JSON.stringify(issued.document).includes(issued.secret), false)
})

test('归档数据需要合理标题和 Markdown 正文', () => {
  assert.deepEqual(core.validateArchive({ title: ' 灵感 ', content: ' # 内容 ', requestId: 'abc' }), {
    title: '灵感', content: '# 内容', requestId: 'abc'
  })
  assert.throws(() => core.validateArchive({ title: '', content: '内容' }), /标题/)
  assert.throws(() => core.validateArchive({ title: '标题', content: ' '.repeat(5) }), /正文/)
  assert.throws(() => core.validateArchive({ title: '标题', content: 'x'.repeat(60001) }), /过长/)
  assert.throws(() => core.validateArchive({ title: '标题', content: '正文', requestId: '$bad' }), /请求标识/)
})

test('只有有效密钥可归档', () => {
  const now = Date.UTC(2026, 8, 23)
  const { document, secret } = core.issueKey('工作', 'user-1', now)
  assert.equal(core.isKeyUsable(document, secret, now), true)
  assert.equal(core.isKeyUsable(document, secret + 'x', now), false)
  assert.equal(core.isKeyUsable({ ...document, revokedAt: now }, secret, now), false)
  assert.equal(core.isKeyUsable(document, secret, document.expiresAt), false)
})

test('限频：小时窗口达到上限后拒绝，跨窗口自动归零', () => {
  const now = Date.UTC(2026, 8, 23, 12)
  let doc = {}
  for (let i = 0; i < core.RATE_LIMIT_1H; i++) {
    const rate = core.checkRateLimit(doc, now)
    assert.equal(rate.allowed, true)
    doc = { ...doc, ...rate.patch }
  }
  const blocked = core.checkRateLimit(doc, now + 60 * 1000)
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.retryAfterMs > 0 && blocked.retryAfterMs <= 60 * 60 * 1000)
  const nextWindow = core.checkRateLimit(doc, now + 60 * 60 * 1000)
  assert.equal(nextWindow.allowed, true)
  assert.equal(nextWindow.patch.useCount1h, 1)
  assert.equal(nextWindow.patch.useCount24h, core.RATE_LIMIT_1H + 1)
})

test('限频：天窗口达到上限后按天拒绝', () => {
  const now = Date.UTC(2026, 8, 23, 12)
  const doc = {
    useWindow1h: 0, useCount1h: 0,
    useWindow24h: Math.floor(now / (24 * 60 * 60 * 1000)), useCount24h: core.RATE_LIMIT_24H
  }
  const blocked = core.checkRateLimit(doc, now)
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.retryAfterMs > 60 * 60 * 1000)
})
