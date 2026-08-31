import store from '@/store';
import { withAuth } from '@/utils/api-auth.js';
import { enqueueEmbedTask, removeEmbeddings } from '@/api/embedTask.js';

// 延迟初始化数据库连接，避免在模块加载时 uniCloud 未初始化
const getRequest = () => {
  if (typeof uniCloud === 'undefined' || !uniCloud.database) {
    throw new Error('uniCloud 未初始化，请确保在应用启动后再调用数据库操作')
  }
  return uniCloud.database().collection("daily_record")
}

// 将传统分页 {pageSize, pageNum} 转换为 JQL 分页 {skip, limit}
function convertPagination(pageSize, pageNum) {
  const skipCount = (pageNum - 1) * pageSize;
  return { skip: skipCount, limit: pageSize };
}

/**
 * 批量查询总结内容并合并到记录列表中
 * @param {Array} records - 记录列表
 * @returns {Promise<Array>} 合并了 summarizeContent 的记录列表
 */
function attachSummarizeContent(records) {
  if (!records || records.length === 0) {
    return Promise.resolve(records);
  }

  const summarizeIds = records
    .map(record => record.summarizeId)
    .filter(id => id && id !== '');

  if (summarizeIds.length === 0) {
    records.forEach(record => { record.summarizeContent = ''; });
    return Promise.resolve(records);
  }

  const db = uniCloud.database();
  return db.collection('summarize')
    .where({ _id: db.command.in(summarizeIds) })
    .get()
    .then(summarizeRes => {
      const summarizeMap = {};
      if (summarizeRes.result && summarizeRes.result.data) {
        summarizeRes.result.data.forEach(summarize => {
          summarizeMap[summarize._id] = summarize.content || '';
        });
      }

      records.forEach(record => {
        record.summarizeContent = (record.summarizeId && summarizeMap[record.summarizeId])
          ? summarizeMap[record.summarizeId]
          : '';
      });

      return records;
    });
}

// 查询示例记录列表（游客状态使用，不需要登录）
function getExampleRecordList(data) {
  const { pageSize, pageNum } = data;
  const { skip, limit } = convertPagination(pageSize, pageNum);

  return getRequest()
    .where({ createBy: '' })
    .orderBy('createTime desc')
    .skip(skip)
    .limit(limit)
    .get()
    .then(res => {
      if (!res.result || !res.result.data || res.result.data.length === 0) {
        return res;
      }
      return attachSummarizeContent(res.result.data).then(() => res);
    });
}

// 查询记录列表（需要登录）
// 注意：此函数支持传入 options 参数来控制是否自动弹出登录弹窗
export const getRecordList = function(data, options = {}) {
  const user = store.state.user
  const isGuest = user.isGuest

  // 如果是游客状态，查询示例记录
  if (isGuest) {
    return Promise.resolve(getExampleRecordList(data))
      .then(res => {
        return { result: res.result || { data: [], total: 0 } }
      })
      .catch(err => {
        return Promise.reject(err)
      })
  }

  // 已登录状态
  return withAuth(function(data) {
    const { pageSize, pageNum } = data;
    const { skip, limit } = convertPagination(pageSize, pageNum);
    const user = store.state.user

    return getRequest()
      .where({ createBy: user.openid })
      .orderBy('createTime desc')
      .skip(skip)
      .limit(limit)
      .get()
      .then(res => {
        if (!res.result || !res.result.data || res.result.data.length === 0) {
          return res;
        }
        return attachSummarizeContent(res.result.data).then(() => res);
      })
  }, store, options)(data)
}

// 查询记录详情（不需要登录）
export function getRecord(id) {
  return getRequest().doc(id).get()
}

// 根据正文 ID 查询当前用户的记录，用于草稿恢复和保存幂等校验
export const getRecordBySummarizeId = withAuth(function(summarizeId) {
  const openid = store.state?.user?.openid
  if (!openid || !summarizeId) {
    return Promise.resolve({ result: { data: [] } })
  }
  return getRequest()
    .where({ summarizeId, createBy: openid })
    .limit(1)
    .get()
}, store, { autoShowLogin: false })

// 添加记录（需要登录）
// 保存成功后投递向量化任务（fire-and-forget，不影响保存主流程）
export const addRecord = withAuth(function(data) {
  // data 可能在游客状态下先构造，必须在登录完成后重新读取当前用户身份。
  const openid = store.state?.user?.openid;
  if (!openid) {
    return Promise.reject(new Error('登录状态异常，请重新登录'));
  }
  const recordData = {
    ...data,
    createBy: openid,
  };
  if (!recordData.summarizeId) {
    return Promise.reject(new Error('正文不存在，请重新编辑后保存'));
  }

  // 客户端可能在数据库写入后、清理本地草稿前退出；重试时复用已有记录。
  return getRequest()
    .where({ summarizeId: recordData.summarizeId, createBy: openid })
    .limit(1)
    .get()
    .then(existingRes => {
      const existing = existingRes?.result?.data?.[0]
      if (existing) {
        return { result: { code: 0, id: existing._id, existing: true } }
      }
      return getRequest().add(recordData).then(res => {
        const newId = res?.result?.id || res?.result?.data
        if (newId) enqueueEmbedTask(newId)
        return res
      })
    })
}, store)

// 更新记录（需要登录）
// 编辑成功后投递向量化任务，消费端将拉取最新内容重建向量
export const updateRecord = withAuth(function(id, data) {
  return getRequest().doc(id).update(data).then(res => {
    enqueueEmbedTask(id)
    return res
  })
}, store)

// 删除记录（需要登录）
// 级联清理该笔记的全部向量，避免搜索命中已删除笔记
export const delRecord = withAuth(function(id) {
  return getRequest().doc(id).remove().then(res => {
    removeEmbeddings(id)
    return res
  })
}, store)

// 模糊查询记录（需要登录）
// 支持通过时间、标题、总结内容进行模糊查询
export const searchRecord = function(data, options = {}) {
  return withAuth(function(data) {
    const { keyword, pageNum = 1, pageSize = 10, searchType = 'all' } = data;
    const user = store.state.user;

    if (!keyword || keyword.trim() === '') {
      return Promise.reject(new Error('搜索关键词不能为空'));
    }

    return uniCloud.callFunction({
      name: 'searchRecord',
      data: {
        keyword: keyword.trim(),
        openid: user.openid,
        pageNum,
        pageSize,
        searchType // 'all'(全部)、'title'(标题)、'time'(时间)、'summary'(总结内容)
      }
    }).then(res => {
      if (res.result && res.result.code === 0) {
        return {
          result: {
            data: res.result.data || [],
            total: res.result.total || 0
          }
        };
      } else {
        return Promise.reject(new Error(res.result?.message || '搜索失败'));
      }
    });
  }, store, options)(data);
}
