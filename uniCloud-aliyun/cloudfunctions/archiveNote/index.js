'use strict'

const { hashKey, isKeyUsable, validateArchive, checkRateLimit, RATE_LIMIT_1H, RATE_LIMIT_24H } = require('ai-archive-core')

const rows = result => (result && (result.result || result).data) || []
const idOf = result => (result && (result.result || result).id) || ''
const response = (statusCode, body) => ({
  mpserverlessComposedResponse: true,
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body)
})

function bearer(event) {
  const headers = event.headers || {}
  const header = headers.authorization || headers.Authorization || ''
  const match = /^Bearer (an_[A-Za-z0-9_-]{43})$/.exec(header)
  return match ? match[1] : ''
}

function bodyOf(event) {
  if (typeof event.body === 'string') return JSON.parse(event.body)
  return event.body || {}
}

function dateTime(now) {
  return new Date(now).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai', hour12: false })
}

async function findPrior(db, owner, archiveRequestId, recordId) {
  const current = rows(await db.collection('daily_record').doc(recordId).get())[0]
  if (current && current.createBy === owner && current.archiveRequestId === archiveRequestId) return current
  // 兼容改动前自动生成 _id 的归档笔记。
  return rows(await db.collection('daily_record').where({ createBy: owner, archiveRequestId }).limit(1).get())[0]
}

exports.main = async event => {
  if (!event || event.httpMethod !== 'POST') return response(405, { code: -1, message: '仅支持 POST' })
  const secret = bearer(event)
  if (!secret) return response(401, { code: -401, message: '归档密钥无效' })
  let payload
  try { payload = validateArchive(bodyOf(event)) }
  catch (error) { return response(400, { code: -1, message: error.message }) }

  const db = uniCloud.database()
  try {
    const secretHash = hashKey(secret)
    const key = rows(await db.collection('ai_archive_keys').where({ secretHash }).limit(1).get())[0]
    if (!key) {
      // 认证日志只记失败阶段；HTTP 请求本身可能含有原始密钥，不在这里重复记录。
      console.warn('[archiveNote] auth rejected: key lookup returned no rows')
      return response(401, { code: -401, message: '归档密钥无效或已过期' })
    }
    if (!isKeyUsable(key, secret)) {
      console.warn('[archiveNote] auth rejected: matched key unusable', {
        revoked: Boolean(key.revokedAt),
        expired: Date.now() >= key.expiresAt,
        hashMatches: key.secretHash === secretHash
      })
      return response(401, { code: -401, message: '归档密钥无效或已过期' })
    }
    const owner = key.createBy
    const archiveRequestId = hashKey(key._id + ':' + payload.requestId)
    // 固定 _id 是数据库级唯一约束；并发的同一请求只有一次插入能成功。
    const recordId = 'ai-' + archiveRequestId
    for (let attempt = 0; attempt < 8; attempt++) {
      const prior = await findPrior(db, owner, archiveRequestId, recordId)
      if (prior) return response(200, { code: 0, data: { recordId: prior._id, existing: true } })

      const now = Date.now()
      const timestamp = dateTime(now)
      // 阿里云事务内不支持 where 查询；分类查询放在事务外，新增时用固定 _id 防止并发重复。
      const existingCategory = rows(await db.collection('dict_category')
        .where({ createBy: owner, name: '外部汇入' }).limit(1).get())[0]
      const tx = await db.startTransaction()
      try {
        // uniCloud 事务内 doc().get() 的 data 是单个对象，不是普通查询的数组。
        const currentKeyResult = await tx.collection('ai_archive_keys').doc(key._id).get()
        const currentKey = currentKeyResult && (currentKeyResult.result || currentKeyResult).data
        if (!isKeyUsable(currentKey, secret, now)) {
          await tx.rollback()
          return response(401, { code: -401, message: '归档密钥无效或已过期' })
        }
        const rate = checkRateLimit(currentKey, now)
        if (!rate.allowed) {
          await tx.rollback()
          const created = await findPrior(db, owner, archiveRequestId, recordId)
          if (created) return response(200, { code: 0, data: { recordId: created._id, existing: true } })
          const minutes = Math.max(1, Math.ceil(rate.retryAfterMs / 60000))
          return response(429, { code: -1, message: `归档过于频繁（每小时最多 ${RATE_LIMIT_1H} 篇、每天最多 ${RATE_LIMIT_24H} 篇），请约 ${minutes} 分钟后再试` })
        }
        // 同一密钥的事务都写这一行，写冲突后重试并重新读取计数。
        await tx.collection('ai_archive_keys').doc(key._id).update({ lastUsedAt: now, ...rate.patch })
        let categoryId = existingCategory && existingCategory._id
        if (!categoryId) {
          categoryId = idOf(await tx.collection('dict_category').add({
            _id: 'ai-category-' + hashKey(owner), name: '外部汇入',
            description: '从外部 AI 会话汇入的笔记', system: true,
            createBy: owner, createTime: timestamp
          }))
        } else if (!existingCategory.system) {
          await tx.collection('dict_category').doc(categoryId).update({ system: true })
        }
        const summarizeId = idOf(await tx.collection('summarize').add({
          category: 0, content: payload.content, recordId: '', createBy: owner,
          createTime: timestamp, updateTime: timestamp
        }))
        await tx.collection('daily_record').add({
          _id: recordId, title: payload.title, summarizeId, tags: [categoryId], createBy: owner,
          createTime: timestamp, updateTime: timestamp, archiveRequestId
        })
        await tx.collection('summarize').doc(summarizeId).update({ recordId })
        await tx.commit()
        // 索引故障不影响已保存的笔记。
        await db.collection('embed_task_queue').add({
          source_id: recordId, create_by: owner, source_version: timestamp,
          status: 'pending', error_msg: '', claim_token: '', retry_count: 0,
          create_time: now, update_time: now
        }).catch(error => console.error('[archiveNote] embed:', error.message))
        return response(201, { code: 0, data: { recordId, existing: false } })
      } catch (error) {
        try { await tx.rollback() } catch (_) { /* 事务可能已自动回滚 */ }
        const created = await findPrior(db, owner, archiveRequestId, recordId)
        if (created) return response(200, { code: 0, data: { recordId: created._id, existing: true } })
        const conflict = /write.?conflict|transaction.*(?:conflict|abort)|duplicate|E11000|事务.*冲突|写冲突/i.test(error.message || '')
        if (!conflict || attempt === 7) throw error
        await new Promise(resolve => setTimeout(resolve, 15 * (attempt + 1) + Math.floor(Math.random() * 20)))
      }
    }
  } catch (error) {
    console.error('[archiveNote]', error.message)
    return response(500, { code: -1, message: '归档失败，请稍后重试' })
  }
}
