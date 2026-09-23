'use strict'

const { verifySession } = require('kb-auth')

const rows = result => (result && (result.result || result).data) || []
const first = result => rows(result)[0] || null
const idOf = result => (result && (result.result || result).id) || ''
const cleanId = value => typeof value === 'string' && value.length > 0 && value.length <= 100 ? value : ''
const ok = (data, extra = {}) => ({ code: 0, data, ...extra })
const nowText = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai', hour12: false })

async function owner(db, table, id, openid) {
  const item = cleanId(id) ? first(await db.collection(table).doc(id).get()) : null
  return item && item.createBy === openid ? item : null
}

async function canReadRecord(db, id, openid) {
  const item = cleanId(id) ? first(await db.collection('daily_record').doc(id).get()) : null
  return item && (item.createBy === '' || item.createBy === openid) ? item : null
}

async function canAccessSummary(db, id, openid, write = false) {
  const item = cleanId(id) ? first(await db.collection('summarize').doc(id).get()) : null
  if (!item) return null
  if (item.createBy) return item.createBy === openid ? item : null
  // 旧总结没有 createBy：通过已有笔记反查归属，避免迁移期间暴露内容。
  const owned = first(await db.collection('daily_record')
    .where({ summarizeId: id, createBy: openid }).limit(1).get())
  if (owned) return item
  if (!write) {
    const shared = first(await db.collection('daily_record')
      .where({ summarizeId: id, createBy: '' }).limit(1).get())
    if (shared) return item
  }
  if (!item.recordId) return null
  const linkedById = first(await db.collection('daily_record').doc(item.recordId).get())
  return linkedById && (linkedById.createBy === openid || (!write && linkedById.createBy === ''))
    ? item : null
}

async function attachSummaries(db, records) {
  const ids = records.map(item => item.summarizeId).filter(Boolean)
  if (!ids.length) return records.map(item => ({ ...item, summarizeContent: '' }))
  const contents = rows(await db.collection('summarize').where({ _id: db.command.in(ids) }).get())
  const map = Object.fromEntries(contents.map(item => [item._id, item.content || '']))
  return records.map(item => ({ ...item, summarizeContent: map[item.summarizeId] || '' }))
}

async function checkTags(db, tags, openid) {
  if (!Array.isArray(tags) || tags.length > 100 || tags.some(tag => !cleanId(tag))) throw new Error('标签格式无效')
  if (!tags.length) return []
  const found = rows(await db.collection('dict_category').where({ _id: db.command.in(tags) }).limit(tags.length).get())
  if (found.some(tag => tag.createBy !== '' && tag.createBy !== openid)) {
    throw new Error('包含无权使用的标签')
  }
  // 标签可能已被删除：只保留仍存在且有权使用的，避免旧笔记引用已删标签后无法编辑。
  return [...new Set(found.filter(tag => tag.createBy === '' || tag.createBy === openid).map(tag => tag._id))]
}

/**
 * 提取正文里的云存储图片 fileID（cloud:// 协议），供删除正文时级联清理。
 */
function extractCloudImageIds(content) {
  const ids = []
  const regex = /<img[^>]*src=["']([^"']+)["']/gi
  let match
  while ((match = regex.exec(content)) !== null) {
    if (/^cloud:\/\//i.test(match[1]) && !ids.includes(match[1])) ids.push(match[1])
  }
  return ids
}

exports.main = async event => {
  const action = event && event.action
  let openid = ''
  if (event && event.sessionToken) {
    try { openid = verifySession(event.sessionToken, process.env.KB_SESSION_SECRET).openid }
    catch (error) { return { code: -401, message: '登录已过期，请重新登录' } }
  }
  const guestActions = new Set(['listRecords', 'getRecord', 'getSummarize', 'getSummaryByRecord', 'listCategories', 'getCategory'])
  if (!openid && !guestActions.has(action)) return { code: -401, message: '请先登录' }
  const db = uniCloud.database()
  const data = event.data || {}
  try {
    if (action === 'listRecords') {
      const page = Math.max(1, Number(data.pageNum) || 1)
      const size = Math.min(50, Math.max(1, Number(data.pageSize) || 10))
      const found = rows(await db.collection('daily_record').where({ createBy: openid })
        .orderBy('createTime', 'desc').skip((page - 1) * size).limit(size).get())
      return ok(await attachSummaries(db, found))
    }
    if (action === 'getRecord') {
      const item = await canReadRecord(db, data.id, openid)
      return ok(item ? [item] : [])
    }
    if (action === 'getRecordBySummarizeId') {
      const item = cleanId(data.id) ? first(await db.collection('daily_record')
        .where({ summarizeId: data.id, createBy: openid }).limit(1).get()) : null
      return ok(item ? [item] : [])
    }
    if (action === 'addRecord') {
      const body = data.value || {}
      if (!cleanId(body.summarizeId) || !await canAccessSummary(db, body.summarizeId, openid, true)) throw new Error('正文不存在或无权使用')
      const existing = first(await db.collection('daily_record').where({ summarizeId: body.summarizeId, createBy: openid }).limit(1).get())
      if (existing) return ok(existing._id, { id: existing._id, existing: true })
      const title = String(body.title || '').trim()
      if (!title || title.length > 120) throw new Error('标题需为 1-120 个字符')
      const tags = await checkTags(db, body.tags || [], openid)
      const now = nowText()
      const added = await db.collection('daily_record').add({ title, summarizeId: body.summarizeId,
        tags, createBy: openid, createTime: body.createTime || now, updateTime: now })
      return ok(idOf(added), { id: idOf(added) })
    }
    if (action === 'updateRecord') {
      if (!await owner(db, 'daily_record', data.id, openid)) throw new Error('笔记不存在或无权操作')
      const body = data.value || {}
      const patch = { updateTime: nowText() }
      if (body.title !== undefined) {
        patch.title = String(body.title).trim()
        if (!patch.title || patch.title.length > 120) throw new Error('标题需为 1-120 个字符')
      }
      if (body.tags !== undefined) patch.tags = await checkTags(db, body.tags, openid)
      if (body.summarizeId !== undefined) {
        if (!await canAccessSummary(db, body.summarizeId, openid, true)) throw new Error('正文不存在或无权使用')
        patch.summarizeId = body.summarizeId
      }
      await db.collection('daily_record').doc(data.id).update(patch)
      return ok(null)
    }
    if (action === 'deleteRecord') {
      const record = await owner(db, 'daily_record', data.id, openid)
      if (!record) throw new Error('笔记不存在或无权操作')
      // 老正文缺少所有者字段；删除笔记前补上，后续级联删除仍可鉴权。
      if (record.summarizeId) {
        const summary = first(await db.collection('summarize').doc(record.summarizeId).get())
        if (summary && !summary.createBy) {
          await db.collection('summarize').doc(record.summarizeId).update({ createBy: openid })
        }
      }
      await db.collection('daily_record').doc(data.id).remove()
      return ok(null)
    }
    if (action === 'getRecordTitles') {
      const ids = Array.isArray(data.ids) ? data.ids.filter(cleanId).slice(0, 100) : []
      if (!ids.length) return ok([])
      const found = rows(await db.collection('daily_record').where({
        _id: db.command.in(ids), createBy: openid
      }).field({ _id: true, title: true }).get())
      return ok(found)
    }
    if (action === 'getSummarize') {
      const item = await canAccessSummary(db, data.id, openid)
      return ok(item ? [item] : [])
    }
    if (action === 'getSummaryByRecord') {
      const record = await canReadRecord(db, data.id, openid)
      let item = record && await canAccessSummary(db, record.summarizeId, openid)
      if (!item && record) {
        const linked = first(await db.collection('summarize').where({ recordId: record._id }).limit(1).get())
        item = linked && await canAccessSummary(db, linked._id, openid)
      }
      return ok(item ? [item] : [])
    }
    if (action === 'addSummarize') {
      const content = String(data.value && data.value.content || '')
      if (!content.trim() || content.length > 1000000) throw new Error('正文为空或过长')
      const now = nowText()
      const added = await db.collection('summarize').add({ content, createBy: openid,
        category: Number(data.value.category) || 0, recordId: '', createTime: now, updateTime: now })
      return ok(idOf(added), { id: idOf(added) })
    }
    if (action === 'updateSummarize') {
      if (!await canAccessSummary(db, data.id, openid, true)) throw new Error('正文不存在或无权操作')
      const content = String(data.value && data.value.content || '')
      if (!content.trim() || content.length > 1000000) throw new Error('正文为空或过长')
      await db.collection('summarize').doc(data.id).update({ content,
        updateTime: nowText() })
      return ok(null)
    }
    if (action === 'deleteSummarize') {
      const item = await canAccessSummary(db, data.id, openid, true)
      if (!item) throw new Error('正文不存在或无权操作')
      // 与旧版顺序一致：先删云存储图片再删记录，图片删除失败时记录保留、可重试。
      const images = extractCloudImageIds(item.content || '')
      if (images.length) await uniCloud.deleteFile({ fileList: images })
      await db.collection('summarize').doc(data.id).remove()
      return ok(null)
    }
    if (action === 'listCategories') {
      const condition = openid ? db.command.or([{ createBy: openid }, { createBy: '' }]) : { createBy: '' }
      return ok(rows(await db.collection('dict_category').where(condition).orderBy('createTime', 'desc').get()))
    }
    if (action === 'getCategory') {
      const item = cleanId(data.id) ? first(await db.collection('dict_category').doc(data.id).get()) : null
      return ok(item && (item.createBy === openid || item.createBy === '') ? [item] : [])
    }
    if (action === 'addCategory') {
      const name = String(data.value && data.value.name || '').trim()
      if (!name || name.length > 40) throw new Error('标签名称需为 1-40 个字符')
      const description = String(data.value.description || '')
      if (description.length > 10000) throw new Error('标签说明过长')
      const added = await db.collection('dict_category').add({ name,
        description,
        createBy: openid, createTime: nowText() })
      return ok(idOf(added), { id: idOf(added) })
    }
    if (action === 'updateCategory') {
      if (!await owner(db, 'dict_category', data.id, openid)) throw new Error('标签不存在或无权操作')
      const name = String(data.value && data.value.name || '').trim()
      if (!name || name.length > 40) throw new Error('标签名称需为 1-40 个字符')
      const description = String(data.value.description || '')
      if (description.length > 10000) throw new Error('标签说明过长')
      await db.collection('dict_category').doc(data.id).update({ name, description })
      return ok(null)
    }
    if (action === 'deleteCategory') {
      if (!await owner(db, 'dict_category', data.id, openid)) throw new Error('标签不存在或无权操作')
      await db.collection('dict_category').doc(data.id).remove()
      return ok(null)
    }
    return { code: -1, message: '不支持的操作' }
  } catch (error) {
    console.error('[noteService]', action, error.message)
    return { code: -1, message: error.message || '笔记操作失败' }
  }
}
