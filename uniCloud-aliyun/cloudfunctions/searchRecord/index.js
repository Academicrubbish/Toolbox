'use strict'

/**
 * 首页模糊查询云函数
 * 支持通过时间、标题、总结内容进行模糊查询
 * 
 * 参数说明：
 * @param {String} keyword - 搜索关键词
 * @param {String} openid - 用户openid（必填）
 * @param {Number} pageNum - 页码，默认1
 * @param {Number} pageSize - 每页数量，默认10
 */
exports.main = async (event, context) => {
  
  const db = uniCloud.database()
  const { keyword = '', openid, pageNum = 1, pageSize = 10 } = event
  
  // 参数校验
  if (!openid) {
    return {
      code: -1,
      message: 'openid不能为空',
      data: [],
      total: 0
    }
  }
  
  if (!keyword || keyword.trim() === '') {
    return {
      code: -1,
      message: '搜索关键词不能为空',
      data: [],
      total: 0
    }
  }
  
  // 统一处理返回结果格式的辅助函数
  const getDataFromResult = (res) => {
    if (res && res.result && res.result.data) {
      return res.result.data
    } else if (res && res.data) {
      return res.data
    } else if (res && Array.isArray(res)) {
      return res
    }
    return []
  }
  
  try {
    const skip = (pageNum - 1) * pageSize
    const limit = pageSize
    const keywordTrimmed = keyword.trim()
    
    // 转义正则表达式特殊字符
    const escapeRegex = (str) => {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
    
    // 构建正则表达式字符串（匹配包含关键词的字符串）
    const regexPattern = escapeRegex(keywordTrimmed)
    const filterRegex = new RegExp(regexPattern, 'i')
    
    // 用于存储匹配的记录ID集合（去重）
    const matchedRecordIds = new Set()
    
    // 1. 通过 summarize 表搜索内容匹配的记录
    try {
      const allSummarizeRes = await db.collection('summarize')
        .field({
          recordId: true,
          content: true,
          _id: true
        })
        .get()
      
      const summarizeData = getDataFromResult(allSummarizeRes)
      
      if (summarizeData && summarizeData.length > 0) {
        // 过滤出内容匹配的 summarize
        const matchedSummarize = summarizeData.filter(item => {
          return item.content && filterRegex.test(item.content)
        })
        
        const summarizeIdsForBackfill = []
        
        // 收集匹配的 recordId
        matchedSummarize.forEach(item => {
          if (item.recordId && item.recordId !== '') {
            matchedRecordIds.add(item.recordId)
          } else if (item._id) {
            summarizeIdsForBackfill.push(item._id)
          }
        })
        
        // 针对 summarize 缺失 recordId 的情况，反查 daily_record
        if (summarizeIdsForBackfill.length > 0) {
          const relatedRecordsRes = await db.collection('daily_record')
            .where({
              summarizeId: db.command.in(summarizeIdsForBackfill),
              createBy: openid
            })
            .field({
              _id: true
            })
            .get()
          
          const relatedRecords = getDataFromResult(relatedRecordsRes)
          relatedRecords.forEach(record => {
            matchedRecordIds.add(record._id)
          })
        }
      }
    } catch (e) {
      // 继续执行其他搜索
    }
    
    // 2. 查询 daily_record 表中标题或时间匹配的记录
    try {
      const allRecordsRes = await db.collection('daily_record')
        .where({
          createBy: openid
        })
        .get()
      
      const allRecords = getDataFromResult(allRecordsRes)
      
      if (allRecords && allRecords.length > 0) {
        // 过滤标题或时间匹配的记录
        allRecords.forEach((record, index) => {
          const titleMatch = record.title && filterRegex.test(record.title)
          const timeMatch = record.createTime && filterRegex.test(record.createTime)
          
          if (titleMatch || timeMatch) {
            matchedRecordIds.add(record._id)
          }
        })
      }
    } catch (e) {
      // 查询失败，继续执行
    }
    
    // 3. 如果没有匹配的记录，直接返回
    if (matchedRecordIds.size === 0) {
      return {
        code: 0,
        message: '查询成功',
        data: [],
        total: 0
      }
    }
    
    // 4. 通过匹配的 recordId 列表查询完整的记录信息
    const recordIdsArray = Array.from(matchedRecordIds)
    
    const recordsRes = await db.collection('daily_record')
      .where({
        _id: db.command.in(recordIdsArray),
        createBy: openid  // 再次确认是当前用户的记录
      })
      .orderBy('createTime', 'desc')
      .get()
    
    const allMatchedRecords = getDataFromResult(recordsRes)
    
    if (!allMatchedRecords || allMatchedRecords.length === 0) {
      return {
        code: 0,
        message: '查询成功',
        data: [],
        total: 0
      }
    }
    
    // 5. 分页处理
    const total = allMatchedRecords.length
    const records = allMatchedRecords.slice(skip, skip + limit)
    
    // 6. 关联查询 summarize 内容
    if (records.length > 0) {
      const summarizeIds = records
        .map(record => record.summarizeId)
        .filter(id => id && id !== '')
      
      if (summarizeIds.length > 0) {
        const summarizeRes = await db.collection('summarize')
          .where({
            _id: db.command.in(summarizeIds)
          })
          .get()
        
        const summarizeData = getDataFromResult(summarizeRes)
        
        // 构建总结内容映射
        const summarizeMap = {}
        summarizeData.forEach(summarize => {
          summarizeMap[summarize._id] = summarize.content || ''
        })
        
        // 将总结内容合并到记录中
        records.forEach((record, index) => {
          if (record.summarizeId && summarizeMap[record.summarizeId]) {
            record.summarizeContent = summarizeMap[record.summarizeId]
          } else {
            record.summarizeContent = ''
          }
        })
      } else {
        records.forEach(record => {
          record.summarizeContent = ''
        })
      }
    }
    
    return {
      code: 0,
      message: '查询成功',
      data: records,
      total: total
    }
    
  } catch (error) {
    return {
      code: -1,
      message: '搜索失败：' + (error.message || '未知错误'),
      data: [],
      total: 0
    }
  }
}

