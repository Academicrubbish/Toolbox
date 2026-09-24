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

exports.main = async event => {
  if (!event || event.httpMethod !== 'POST') return response(405, { code: -1, message: '仅支持 POST' })
  const secret = bearer(event)
  if (!secret) return response(401, { code: -401, message: '归档密钥无效' })
  let payload
  try { payload = validateArchive(bodyOf(event)) }
  catch (error) { return response(400, { code: -1, message: error.message }) }

  const db = uniCloud.database()
  try {
    const key = rows(await db.collection('ai_archive_keys').where({ secretHash: hashKey(secret) }).limit(1).get())[0]
    if (!isKeyUsable(key, secret)) return response(401, { code: -401, message: '归档密钥无效或已过期' })
    // 限频防刷：计数来自请求开始时的密钥快照，并发下的少量误差可接受。
    const rate = checkRateLimit(key)
    if (!rate.allowed) {
      const minutes = Math.max(1, Math.ceil(rate.retryAfterMs / 60000))
      return response(429, { code: -1, message: `归档过于频繁（每小时最多 ${RATE_LIMIT_1H} 篇、每天最多 ${RATE_LIMIT_24H} 篇），请约 ${minutes} 分钟后再试` })
    }
    const owner = key.createBy
    const archiveRequestId = payload.requestId ? hashKey(key._id + ':' + payload.requestId) : ''
    if (archiveRequestId) {
      const prior = rows(await db.collection('daily_record').where({ createBy: owner, archiveRequestId }).limit(1).get())[0]
      if (prior) return response(200, { code: 0, data: { recordId: prior._id, existing: true } })
    }

    const now = Date.now()
    const timestamp = dateTime(now)
    // 标签查询须在事务外：阿里云 uniCloud 事务内只支持 doc() 与 add()，不支持 where 查询。
    // system 标记用于在创建文档的标签选择器与标签管理页隐藏该标签。
    const categoryRows = rows(await db.collection('dict_category')
      .where({ createBy: owner, name: '外部汇入' }).limit(1).get())
    const existingCategory = categoryRows[0]
    if (existingCategory && !existingCategory.system) {
      await db.collection('dict_category').doc(existingCategory._id).update({ system: true })
        .catch(error => console.error('[archiveNote] system flag:', error.message))
    }
    const existingCategoryId = existingCategory && existingCategory._id
    const tx = await db.startTransaction()
    let recordId
    try {
      let categoryId = existingCategoryId
      if (!categoryId) {
        categoryId = idOf(await tx.collection('dict_category').add({
          name: '外部汇入', description: '从外部 AI 会话汇入的笔记', system: true,
          createBy: owner, createTime: timestamp
        }))
      }
      const summarizeId = idOf(await tx.collection('summarize').add({
        category: 0, content: payload.content, recordId: '', createBy: owner,
        createTime: timestamp, updateTime: timestamp
      }))
      recordId = idOf(await tx.collection('daily_record').add({
        title: payload.title, summarizeId, tags: [categoryId], createBy: owner,
        createTime: timestamp, updateTime: timestamp, archiveRequestId
      }))
      await tx.collection('summarize').doc(summarizeId).update({ recordId })
      await tx.commit()
    } catch (error) {
      await tx.rollback()
      throw error
    }
    // 与小程序手动新增笔记一致，投递语义索引任务；索引故障不影响已保存的笔记。
    await db.collection('embed_task_queue').add({
      source_id: recordId, create_by: owner, source_version: timestamp,
      status: 'pending', error_msg: '', claim_token: '', retry_count: 0,
      create_time: now, update_time: now
    }).catch(error => console.error('[archiveNote] embed:', error.message))
    await db.collection('ai_archive_keys').doc(key._id).update({ lastUsedAt: now, ...rate.patch })
      .catch(error => console.error('[archiveNote] lastUsedAt:', error.message))
    return response(201, { code: 0, data: { recordId, existing: false } })
  } catch (error) {
    console.error('[archiveNote]', error.message)
    return response(500, { code: -1, message: '归档失败，请稍后重试' })
  }
}
