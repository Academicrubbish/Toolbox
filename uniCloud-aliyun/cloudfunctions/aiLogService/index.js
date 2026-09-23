'use strict'

const { verifySession } = require('kb-auth')

const rows = result => (result && (result.result || result).data) || []
const first = result => rows(result)[0] || null
const cleanId = value => typeof value === 'string' && value.length > 0 && value.length <= 100 ? value : ''
const ok = data => ({ code: 0, data })

// AI 辅导日志的可见性与笔记一致：本人日志可见，公共示例记录（createBy 为空串）上的日志对所有人可见。
async function readableRecord(db, recordId, openid) {
  if (!cleanId(recordId)) return false
  const item = first(await db.collection('daily_record').where({ _id: recordId }).limit(1).get())
  return !!item && (item.createBy === '' || item.createBy === openid)
}

exports.main = async event => {
  const action = event && event.action
  let openid = ''
  if (event && event.sessionToken) {
    try { openid = verifySession(event.sessionToken, process.env.KB_SESSION_SECRET).openid }
    catch (error) { return { code: -401, message: '登录已过期，请重新登录' } }
  }
  const db = uniCloud.database()
  const data = event.data || {}
  try {
    if (action === 'listByRecord') {
      if (!await readableRecord(db, data.recordId, openid)) return ok([])
      const logs = rows(await db.collection('ai_learn_logs').where({ record_id: data.recordId })
        .orderBy('create_time desc').limit(50).get())
      return ok(logs)
    }
    if (action === 'getDetail') {
      const log = cleanId(data.logId) ? first(await db.collection('ai_learn_logs').where({ _id: data.logId }).limit(1).get()) : null
      if (log && (log.create_by === openid || await readableRecord(db, log.record_id, openid))) return ok(log)
      return ok(null)
    }
    if (action === 'batchHasResults') {
      const ids = Array.isArray(data.recordIds) ? data.recordIds.filter(cleanId).slice(0, 100) : []
      const readable = []
      for (const id of ids) { if (await readableRecord(db, id, openid)) readable.push(id) }
      if (!readable.length) return ok([])
      const found = rows(await db.collection('ai_learn_logs').where({
        record_id: db.command.in(readable), status: 'success'
      }).field({ record_id: true }).limit(200).get())
      return ok(found)
    }
    if (action === 'history') {
      if (!openid) return { code: -401, message: '请先登录' }
      const page = Math.max(1, Number(data.pageNo) || 1)
      const size = Math.min(50, Math.max(1, Number(data.pageSize) || 10))
      const logs = rows(await db.collection('ai_learn_logs').where({
        create_by: openid, status: db.command.in(['success', 'pending'])
      }).orderBy('create_time desc').skip((page - 1) * size).limit(size).get())
      return ok(logs)
    }
    if (action === 'deleteByRecord') {
      if (!openid) return { code: -401, message: '请先登录' }
      if (!cleanId(data.recordId)) return ok({ deleted: 0 })
      // 只能删除本人创建的日志；级联删除时记录可能已不存在，故不依赖 daily_record 鉴权。
      const logs = rows(await db.collection('ai_learn_logs').where({ record_id: data.recordId, create_by: openid })
        .field({ _id: true, batch_id: true }).limit(200).get())
      if (!logs.length) return ok({ deleted: 0 })
      const logIds = logs.map(log => log._id)
      const batchIds = [...new Set(logs.map(log => log.batch_id).filter(Boolean))]
      await db.collection('ai_learn_logs').where({ _id: db.command.in(logIds), create_by: openid }).remove()
      if (batchIds.length) await db.collection('ai_task_queue').where({ batch_id: db.command.in(batchIds) }).remove()
      return ok({ deleted: logIds.length })
    }
    return { code: -1, message: '不支持的操作' }
  } catch (error) {
    console.error('[aiLogService]', action, error.message)
    return { code: -1, message: error.message || 'AI 日志操作失败' }
  }
}
