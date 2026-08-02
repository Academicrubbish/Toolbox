'use strict'

/**
 * 生成文章分享链接
 * @param {string} recordId - 记录 ID
 * @param {string} expireType - 有效期：1h / 1d / 1w / 1y / forever
 * @param {string} shareType - 分享类型：record（默认）/ ai_learn
 * @param {string} logId - AI 学习结果 ID（shareType 为 ai_learn 时必填）
 */

const HOSTING_DOMAIN = 'http://doc.coptis.top'

const EXPIRE_MAP = {
  '1h': 3600000,
  '1d': 86400000,
  '1w': 604800000,
  '1y': 31536000000,
  'forever': null
}

exports.main = async (event, context) => {
  const { recordId, expireType, shareType = 'record', logId } = event
  const db = uniCloud.database()
  const openid = event.openid || ''

  if (!expireType || !openid) {
    return { code: -1, message: '参数缺失或未登录' }
  }

  const validTypes = Object.keys(EXPIRE_MAP)
  if (!validTypes.includes(expireType)) {
    return { code: -1, message: '无效的有效期类型' }
  }

  try {
    // 根据类型校验权限
    const targetId = shareType === 'ai_learn' ? logId : recordId
    if (!targetId) {
      return { code: -1, message: '参数缺失' }
    }

    if (shareType === 'ai_learn') {
      // AI 学习结果：通过关联的 record_id 查父记录验证权限
      const logRes = await db.collection('ai_learn_logs').doc(logId).get()
      if (!logRes.data || logRes.data.length === 0) {
        return { code: -1, message: '记录不存在' }
      }
      const log = logRes.data[0]
      if (!log.record_id) {
        return { code: -1, message: '记录不存在' }
      }
      const recordRes = await db.collection('daily_record').doc(log.record_id).get()
      if (!recordRes.data || recordRes.data.length === 0 || recordRes.data[0].createBy !== openid) {
        return { code: -1, message: '无权分享此记录' }
      }
    } else {
      const recordRes = await db.collection('daily_record').doc(recordId).get()
      if (!recordRes.data || recordRes.data.length === 0) {
        return { code: -1, message: '记录不存在' }
      }
      if (recordRes.data[0].createBy !== openid) {
        return { code: -1, message: '无权分享此记录' }
      }
    }

    // 查找是否已有未过期链接
    const now = Date.now()
    const dbCmd = db.command
    const whereCond = {
      create_by: openid,
      share_type: shareType
    }
    if (shareType === 'ai_learn') {
      whereCond.log_id = logId
    } else {
      whereCond.record_id = recordId
    }

    const existingRes = await db.collection('share_links').where(
      dbCmd.and([
        whereCond,
        dbCmd.or([
          { expire_time: null },
          { expire_time: dbCmd.gt(now) }
        ])
      ])
    ).limit(1).get()

    if (existingRes.data && existingRes.data.length > 0) {
      const shareUrl = HOSTING_DOMAIN + '/share.html?sid=' + existingRes.data[0]._id
      return { code: 0, message: '生成成功', data: { shareUrl } }
    }

    // 创建新链接
    const expireDuration = EXPIRE_MAP[expireType]
    const expireTime = expireDuration ? now + expireDuration : null

    const addData = {
      record_id: recordId || '',
      share_type: shareType,
      expire_time: expireTime,
      create_time: now,
      create_by: openid
    }
    if (shareType === 'ai_learn') {
      addData.log_id = logId
    }

    const addRes = await db.collection('share_links').add(addData)
    const shareUrl = HOSTING_DOMAIN + '/share.html?sid=' + addRes.id

    return { code: 0, message: '生成成功', data: { shareUrl } }
  } catch (err) {
    console.error('生成分享链接失败：', err.message)
    return { code: -1, message: '生成失败，请稍后重试' }
  }
}
