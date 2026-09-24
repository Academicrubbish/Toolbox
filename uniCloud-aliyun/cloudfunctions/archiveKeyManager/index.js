'use strict'

const { verifySession } = require('kb-auth')
const { issueKey } = require('ai-archive-core')
const rows = result => (result && (result.result || result).data) || []
const idOf = result => (result && (result.result || result).id) || ''
const publicRow = row => ({ id: row._id, name: row.name, suffix: row.suffix,
  createdAt: row.createdAt, expiresAt: row.expiresAt,
  revokedAt: row.revokedAt || null, lastUsedAt: row.lastUsedAt || null })

exports.main = async event => {
  let openid
  try { openid = verifySession(event && event.sessionToken, process.env.KB_SESSION_SECRET).openid }
  catch (error) { return { code: -401, message: '登录已过期，请重新登录' } }
  const db = uniCloud.database()
  const table = db.collection('ai_archive_keys')
  try {
    const action = event.action
    if (action === 'list') {
      const keys = rows(await table.where({ createBy: openid }).orderBy('createdAt', 'desc').limit(100).get())
      return { code: 0, data: keys.map(publicRow) }
    }
    if (action === 'create' || action === 'rotate') {
      let old = null
      if (action === 'rotate') {
        old = rows(await table.where({ _id: event.id, createBy: openid }).limit(1).get())[0]
        if (!old || old.revokedAt) return { code: -404, message: '密钥不存在或已撤销' }
      }
      const active = rows(await table.where({ createBy: openid, revokedAt: null }).limit(100).get())
        .filter(row => row.expiresAt > Date.now())
      if (active.length >= 20 && !old) return { code: -1, message: '最多保留 20 个有效密钥' }
      const issued = issueKey(old ? old.name : event.name, openid)
      if (!old && active.some(row => row.name === issued.document.name)) {
        return { code: -1, message: '已有同名有效密钥，请更换名称或重新生成' }
      }
      let added
      if (old) {
        const tx = await db.startTransaction()
        try {
          added = await tx.collection('ai_archive_keys').add(issued.document)
          await tx.collection('ai_archive_keys').doc(old._id).update({ revokedAt: Date.now() })
          await tx.commit()
        } catch (error) {
          await tx.rollback()
          throw error
        }
      } else {
        added = await table.add(issued.document)
      }
      return { code: 0, data: { ...publicRow({ ...issued.document, _id: idOf(added) }), secret: issued.secret } }
    }
    if (action === 'revoke') {
      const old = rows(await table.where({ _id: event.id, createBy: openid }).limit(1).get())[0]
      if (!old) return { code: -404, message: '密钥不存在' }
      if (!old.revokedAt) await table.doc(old._id).update({ revokedAt: Date.now() })
      return { code: 0 }
    }
    return { code: -1, message: '不支持的操作' }
  } catch (error) {
    console.error('[archiveKeyManager]', error.message)
    return { code: -1, message: error.message || '密钥操作失败' }
  }
}
