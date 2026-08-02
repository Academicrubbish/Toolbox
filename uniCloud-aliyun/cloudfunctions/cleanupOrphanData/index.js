'use strict'

/**
 * 孤儿数据清洗云函数
 * 以 daily_record 为准，清理无直接或间接关联的数据
 *
 * @param {boolean} dryRun - true=预览模式，false=执行删除
 * @param {boolean} cleanCloudStorage - 是否清理云存储孤立文件（耗时较长）
 */

const BATCH_SIZE = 200

exports.main = async (event, context) => {
  const { dryRun = true, cleanCloudStorage = false } = event
  const db = uniCloud.database()
  const dbCmd = db.command

  const report = {
    mode: dryRun ? 'preview' : 'execute',
    collections: {},
    cloudStorage: { scanned: 0, orphans: 0, deleted: 0, files: [] },
    summary: { totalOrphans: 0, totalDeleted: 0 }
  }

  try {
    // 1. 获取所有有效的 record ID
    const validRecordIds = await getAllRecordIds(db, dbCmd)
    report.validRecordCount = validRecordIds.length

    // 2. 获取所有有效的 ai_learn_logs ID
    const validLogIds = await getAllLogIds(db, dbCmd)
    report.validLogCount = validLogIds.length

    // 3. 获取所有有效的 batch_id
    const validBatchIds = await getAllBatchIds(db, dbCmd)

    // 4. 清理各表孤儿数据
    await cleanSummarize(db, dbCmd, validRecordIds, dryRun, report)
    await cleanAiLearnLogs(db, dbCmd, validRecordIds, dryRun, report)
    await cleanAiTaskQueue(db, dbCmd, validBatchIds, dryRun, report)
    await cleanShareLinks(db, dbCmd, validRecordIds, validLogIds, dryRun, report)

    // 6. 清理云存储孤立文件（可选）
    if (cleanCloudStorage) {
      await cleanCloudFiles(db, dbCmd, validRecordIds, dryRun, report)
    }

    // 汇总
    Object.keys(report.collections).forEach(key => {
      const col = report.collections[key]
      report.summary.totalOrphans += col.orphans
      report.summary.totalDeleted += col.deleted
    })
    report.summary.totalOrphans += report.cloudStorage.orphans
    report.summary.totalDeleted += report.cloudStorage.deleted

    return { code: 0, message: 'success', data: report }
  } catch (err) {
    console.error('清洗失败：', err)
    return { code: -1, message: err.message || '清洗失败' }
  }
}

/** 获取所有有效的 record ID */
async function getAllRecordIds(db, dbCmd) {
  const ids = []
  let skip = 0
  while (true) {
    const res = await db.collection('daily_record')
      .field({ _id: true })
      .skip(skip)
      .limit(BATCH_SIZE)
      .get()
    const list = res.data || []
    ids.push(...list.map(r => r._id))
    if (list.length < BATCH_SIZE) break
    skip += BATCH_SIZE
  }
  return ids
}

/** 获取所有有效的 ai_learn_logs ID */
async function getAllLogIds(db, dbCmd) {
  const ids = []
  let skip = 0
  while (true) {
    const res = await db.collection('ai_learn_logs')
      .field({ _id: true })
      .skip(skip)
      .limit(BATCH_SIZE)
      .get()
    const list = res.data || []
    ids.push(...list.map(r => r._id))
    if (list.length < BATCH_SIZE) break
    skip += BATCH_SIZE
  }
  return ids
}

/** 获取所有有效的 batch_id */
async function getAllBatchIds(db, dbCmd) {
  const batchIds = new Set()
  let skip = 0
  while (true) {
    const res = await db.collection('ai_learn_logs')
      .field({ batch_id: true })
      .skip(skip)
      .limit(BATCH_SIZE)
      .get()
    const list = res.data || []
    list.forEach(r => { if (r.batch_id) batchIds.add(r.batch_id) })
    if (list.length < BATCH_SIZE) break
    skip += BATCH_SIZE
  }
  return [...batchIds]
}

/** 清理 summarize 表孤儿记录 */
async function cleanSummarize(db, dbCmd, validRecordIds, dryRun, report) {
  const orphanIds = []
  let skip = 0

  while (true) {
    const res = await db.collection('summarize')
      .field({ _id: true })
      .skip(skip)
      .limit(BATCH_SIZE)
      .get()
    const list = res.data || []
    if (list.length === 0) break

    // 没有被 daily_record.summarizeId 引用的记录
    const batchIds = list.map(r => r._id)
    const referenced = await db.collection('daily_record')
      .where({ summarizeId: dbCmd.in(batchIds) })
      .field({ summarizeId: true })
      .get()
    const referencedIds = new Set((referenced.data || []).map(r => r.summarizeId))

    list.forEach(r => {
      if (!referencedIds.has(r._id)) orphanIds.push(r._id)
    })

    if (list.length < BATCH_SIZE) break
    skip += BATCH_SIZE
  }

  report.collections.summarize = { orphans: orphanIds.length, deleted: 0 }

  if (orphanIds.length > 0 && !dryRun) {
    // 分批删除
    for (let i = 0; i < orphanIds.length; i += BATCH_SIZE) {
      const batch = orphanIds.slice(i, i + BATCH_SIZE)
      await db.collection('summarize')
        .where({ _id: dbCmd.in(batch) })
        .remove()
      report.collections.summarize.deleted += batch.length
    }
  }
}

/** 清理 ai_learn_logs 表孤儿记录 */
async function cleanAiLearnLogs(db, dbCmd, validRecordIds, dryRun, report) {
  const orphanIds = []
  let skip = 0

  while (true) {
    const res = await db.collection('ai_learn_logs')
      .where({ record_id: dbCmd.nin(validRecordIds) })
      .field({ _id: true })
      .skip(skip)
      .limit(BATCH_SIZE)
      .get()
    const list = res.data || []
    orphanIds.push(...list.map(r => r._id))
    if (list.length < BATCH_SIZE) break
    skip += BATCH_SIZE
  }

  report.collections.ai_learn_logs = { orphans: orphanIds.length, deleted: 0 }

  if (orphanIds.length > 0 && !dryRun) {
    for (let i = 0; i < orphanIds.length; i += BATCH_SIZE) {
      const batch = orphanIds.slice(i, i + BATCH_SIZE)
      await db.collection('ai_learn_logs')
        .where({ _id: dbCmd.in(batch) })
        .remove()
      report.collections.ai_learn_logs.deleted += batch.length
    }
  }
}

/** 清理 ai_task_queue 表孤儿记录 */
async function cleanAiTaskQueue(db, dbCmd, validBatchIds, dryRun, report) {
  const orphanIds = []
  let skip = 0

  // 有效的 batch_id 或没有 batch_id 的记录保留
  while (true) {
    const res = await db.collection('ai_task_queue')
      .where({
        batch_id: dbCmd.nin(validBatchIds),
        batch_id: dbCmd.neq('') // 排除空字符串
      })
      .field({ _id: true, batch_id: true })
      .skip(skip)
      .limit(BATCH_SIZE)
      .get()
    const list = res.data || []
    // 只清理有 batch_id 但无效的记录
    list.forEach(r => {
      if (r.batch_id && !validBatchIds.includes(r.batch_id)) {
        orphanIds.push(r._id)
      }
    })
    if (list.length < BATCH_SIZE) break
    skip += BATCH_SIZE
  }

  report.collections.ai_task_queue = { orphans: orphanIds.length, deleted: 0 }

  if (orphanIds.length > 0 && !dryRun) {
    for (let i = 0; i < orphanIds.length; i += BATCH_SIZE) {
      const batch = orphanIds.slice(i, i + BATCH_SIZE)
      await db.collection('ai_task_queue')
        .where({ _id: dbCmd.in(batch) })
        .remove()
      report.collections.ai_task_queue.deleted += batch.length
    }
  }
}

/** 清理 share_links 表孤儿/过期记录 */
async function cleanShareLinks(db, dbCmd, validRecordIds, validLogIds, dryRun, report) {
  const orphanIds = []
  const expiredIds = []
  const now = Date.now()
  let skip = 0

  while (true) {
    const res = await db.collection('share_links')
      .field({ _id: true, record_id: true, log_id: true, expire_time: true, share_type: true })
      .skip(skip)
      .limit(BATCH_SIZE)
      .get()
    const list = res.data || []
    if (list.length === 0) break

    list.forEach(r => {
      // 过期链接
      if (r.expire_time && r.expire_time < now) {
        expiredIds.push(r._id)
        return
      }
      // record 不存在
      if (r.share_type === 'record' && r.record_id && !validRecordIds.includes(r.record_id)) {
        orphanIds.push(r._id)
        return
      }
      // ai_learn log 不存在
      if (r.share_type === 'ai_learn' && r.log_id && !validLogIds.includes(r.log_id)) {
        orphanIds.push(r._id)
        return
      }
    })

    if (list.length < BATCH_SIZE) break
    skip += BATCH_SIZE
  }

  const allIds = [...orphanIds, ...expiredIds]
  report.collections.share_links = {
    orphans: orphanIds.length,
    expired: expiredIds.length,
    deleted: 0
  }

  if (allIds.length > 0 && !dryRun) {
    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const batch = allIds.slice(i, i + BATCH_SIZE)
      await db.collection('share_links')
        .where({ _id: dbCmd.in(batch) })
        .remove()
      report.collections.share_links.deleted += batch.length
    }
  }
}


/** 清理云存储孤立文件 */
async function cleanCloudFiles(db, dbCmd, validRecordIds, dryRun, report) {
  // 1. 获取所有 summarize 中引用的图片 URL
  const referencedUrls = new Set()
  let skip = 0

  while (true) {
    const res = await db.collection('summarize')
      .field({ content: true })
      .skip(skip)
      .limit(BATCH_SIZE)
      .get()
    const list = res.data || []
    list.forEach(r => {
      const urls = extractCloudImageUrls(r.content || '')
      urls.forEach(url => referencedUrls.add(url))
    })
    if (list.length < BATCH_SIZE) break
    skip += BATCH_SIZE
  }

  // 2. 从数据库中收集所有可能出现的云存储 URL（OCR 图片、下载文件等）
  const allDbUrls = new Set()

  // ai_learn_logs 中可能包含图片引用
  skip = 0
  while (true) {
    const res = await db.collection('ai_learn_logs')
      .field({ content: true })
      .skip(skip)
      .limit(BATCH_SIZE)
      .get()
    const list = res.data || []
    list.forEach(r => {
      const urls = extractCloudImageUrls(r.content || '')
      urls.forEach(url => allDbUrls.add(url))
    })
    if (list.length < BATCH_SIZE) break
    skip += BATCH_SIZE
  }

  // 3. 构造需要检查的文件 ID 列表
  // 从 referencedUrls 和 allDbUrls 中提取云存储路径
  const potentialFileIds = new Set([...referencedUrls, ...allDbUrls])

  // 4. 获取云存储中所有文件的临时 URL（用于后续删除）
  const prefixes = ['cloudstorage/recordImg/', 'cloudstorage/ocr/', 'cloudstorage/downloads/']
  const allCloudFiles = []

  for (const prefix of prefixes) {
    try {
      // 先尝试获取目录下的文件列表
      const testIds = Array.from({ length: 5 }, (_, i) => prefix + `test${i}.jpg`)
      const testRes = await uniCloud.getTempFileURL({ fileList: testIds }).catch(() => null)

      // 如果 API 可用，我们需要从数据库中收集所有可能的文件路径
      // 由于 uniCloud 不支持 listFiles，我们通过数据库记录来反向查找
    } catch (err) {
      console.error(`扫描 ${prefix} 失败：`, err)
    }
  }

  // 5. 方案B：直接从数据库记录中提取所有云存储 URL，然后检查哪些不存在
  // 由于无法直接列出云存储文件，我们采用保守策略：
  // 只清理数据库中明确引用但已失效的文件

  // 6. 检查 summarize 中引用的文件是否还存在
  const urlsToCheck = Array.from(referencedUrls).slice(0, 50) // 限制检查数量
  if (urlsToCheck.length > 0) {
    try {
      const urlRes = await uniCloud.getTempFileURL({ fileList: urlsToCheck })
      const invalidFiles = (urlRes.fileList || [])
        .filter(f => !f.tempFileURL && !f.download_url)
        .map(f => f.fileID)

      report.cloudStorage.scanned = urlsToCheck.length
      report.cloudStorage.orphans = invalidFiles.length

      if (!dryRun && invalidFiles.length > 0) {
        for (let i = 0; i < invalidFiles.length; i += 50) {
          const batch = invalidFiles.slice(i, i + 50)
          await uniCloud.deleteFile({ fileList: batch })
          report.cloudStorage.deleted += batch.length
        }
      }

      if (dryRun) {
        report.cloudStorage.files = invalidFiles
      }
    } catch (err) {
      console.error('检查文件失败：', err)
    }
  }

  // 7. 提示：云存储无法直接列出所有文件，建议在 uniCloud 控制台手动检查
  report.cloudStorage.note = '云存储无法通过 API 列出所有文件，以上为数据库引用中失效的文件。建议在 uniCloud 控制台手动检查 cloudstorage/ 目录。'
}

/** 从 HTML 内容中提取云存储图片 fileID */
function extractCloudImageUrls(htmlString) {
  if (!htmlString) return []
  const urls = []
  const regex = /<img[^>]*src=["']([^"']+)["']/gi
  let match
  while ((match = regex.exec(htmlString)) !== null) {
    if (/^cloud:\/\//i.test(match[1]) || /cloudstorage/i.test(match[1])) {
      urls.push(match[1])
    }
  }
  return urls
}
