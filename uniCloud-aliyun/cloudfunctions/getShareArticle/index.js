'use strict'

/**
 * 获取分享文章内容
 * 支持两种分享类型：
 * - record：普通记录（daily_record + summarize）
 * - ai_learn：AI 学习结果（ai_learn_logs）
 */

function buildResponse(data) {
  return {
    mpserverlessComposedResponse: true,
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(data)
  }
}

// 查询作者昵称
async function getAuthor(db, openid) {
  if (!openid) return '匿名'
  const userRes = await db.collection('tb_user')
    .where({ _openid: openid })
    .limit(1)
    .get()
  if (userRes.data && userRes.data.length > 0 && userRes.data[0].userName) {
    return userRes.data[0].userName
  }
  return '匿名'
}

function formatDate(timestamp) {
  const d = new Date(timestamp)
  const pad = n => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

exports.main = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return buildResponse({ code: 0 })
  }

  const sid = event.queryStringParameters?.sid || event.sid

  if (!sid) {
    return buildResponse({ code: -1, message: '链接无效' })
  }

  const db = uniCloud.database()

  try {
    // 1. 查询分享记录
    const shareRes = await db.collection('share_links').doc(sid).get()
    if (!shareRes.data || shareRes.data.length === 0) {
      return buildResponse({ code: -1, message: '链接无效' })
    }

    const share = shareRes.data[0]

    // 2. 校验过期
    if (share.expire_time !== null && share.expire_time < Date.now()) {
      return buildResponse({ code: -1, message: '链接已失效' })
    }

    const shareType = share.share_type || 'record'

    // 3. 按类型查询内容
    if (shareType === 'ai_learn') {
      // AI 学习结果
      if (!share.log_id) {
        return buildResponse({ code: -1, message: '链接无效' })
      }
      const logRes = await db.collection('ai_learn_logs').doc(share.log_id).get()
      if (!logRes.data || logRes.data.length === 0) {
        return buildResponse({ code: -1, message: '文章不存在或已被作者删除' })
      }
      const log = logRes.data[0]
      const author = await getAuthor(db, log.create_by)

      // 查询关联记录标题
      let title = 'AI 辅导内容'
      if (log.record_id) {
        const recordRes = await db.collection('daily_record').doc(log.record_id).get()
        if (recordRes.data && recordRes.data.length > 0) {
          title = (recordRes.data[0].title || '无标题') + ' - AI 辅导'
        }
      }

      return buildResponse({
        code: 0,
        data: {
          title,
          content: log.ai_result || '',
          createTime: log.complete_time ? formatDate(log.complete_time) : '',
          author
        }
      })
    } else {
      // 普通记录
      const recordRes = await db.collection('daily_record').doc(share.record_id).get()
      if (!recordRes.data || recordRes.data.length === 0) {
        return buildResponse({ code: -1, message: '文章不存在或已被作者删除' })
      }

      const record = recordRes.data[0]

      let content = ''
      if (record.summarizeId) {
        const summarizeRes = await db.collection('summarize').doc(record.summarizeId).get()
        if (summarizeRes.data && summarizeRes.data.length > 0) {
          content = summarizeRes.data[0].content || ''
        }
      }

      const author = await getAuthor(db, record.createBy)

      return buildResponse({
        code: 0,
        data: {
          title: record.title || '无标题',
          content,
          createTime: record.createTime || '',
          author
        }
      })
    }
  } catch (err) {
    console.error('获取分享文章失败：', err.message)
    return buildResponse({ code: -1, message: '服务异常' })
  }
}
