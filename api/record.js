import store from '@/store';
import { withAuth } from '@/utils/api-auth.js';

// 延迟初始化数据库连接，避免在模块加载时 uniCloud 未初始化
const getRequest = () => {
  if (typeof uniCloud === 'undefined' || !uniCloud.database) {
    throw new Error('uniCloud 未初始化，请确保在应用启动后再调用数据库操作')
  }
  return uniCloud.database().collection("daily_record")
}

// 将传统分页 {pageSize, pageNum} 转换为 JQL 分页 {skip, limit}
function convertPagination(pageSize, pageNum) {
  // 计算需要跳过的条目数
  const skipCount = (pageNum - 1) * pageSize;

  // 返回 JQL 可用的 skip 和 limit 参数
  return {
    skip: skipCount,
    limit: pageSize
  };
}

// 查询示例记录列表（游客状态使用，不需要登录）
function getExampleRecordList(data) {
  const { pageSize, pageNum } = data;
  const { skip, limit } = convertPagination(pageSize, pageNum);
  const db = uniCloud.database()
  
  // 查询 createBy 为空字符串的示例记录
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
      
      // 收集所有有 summarizeId 的记录ID
      const summarizeIds = res.result.data
        .map(record => record.summarizeId)
        .filter(id => id && id !== '');
      
      // 如果没有总结ID，直接返回
      if (summarizeIds.length === 0) {
        res.result.data.forEach(record => {
          record.summarizeContent = '';
        });
        return res;
      }
      
      // 批量查询总结内容
      return db.collection('summarize')
        .where({
          _id: db.command.in(summarizeIds)
        })
        .get()
        .then(summarizeRes => {
          // 构建总结内容映射
          const summarizeMap = {};
          if (summarizeRes.result && summarizeRes.result.data) {
            summarizeRes.result.data.forEach(summarize => {
              summarizeMap[summarize._id] = summarize.content || '';
            });
          }
          
          // 将总结内容合并到记录中
          res.result.data.forEach(record => {
            if (record.summarizeId && summarizeMap[record.summarizeId]) {
              record.summarizeContent = summarizeMap[record.summarizeId];
            } else {
              record.summarizeContent = '';
            }
          });
          
          return res;
        });
    })
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
  
  // 已登录状态，使用原来的逻辑
  return withAuth(function(data) {
    const { pageSize, pageNum } = data;
    const { skip, limit } = convertPagination(pageSize, pageNum);
    const user = store.state.user
    const db = uniCloud.database()
    
    // 先查询记录列表
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
        
        // 收集所有有 summarizeId 的记录ID
        const summarizeIds = res.result.data
          .map(record => record.summarizeId)
          .filter(id => id && id !== '');
        
        // 如果没有总结ID，直接返回
        if (summarizeIds.length === 0) {
          res.result.data.forEach(record => {
            record.summarizeContent = '';
          });
          return res;
        }
        
        // 批量查询总结内容
        return db.collection('summarize')
          .where({
            _id: db.command.in(summarizeIds)
          })
          .get()
          .then(summarizeRes => {
            // 构建总结内容映射
            const summarizeMap = {};
            if (summarizeRes.result && summarizeRes.result.data) {
              summarizeRes.result.data.forEach(summarize => {
                summarizeMap[summarize._id] = summarize.content || '';
              });
            }
            
            // 将总结内容合并到记录中
            res.result.data.forEach(record => {
              if (record.summarizeId && summarizeMap[record.summarizeId]) {
                record.summarizeContent = summarizeMap[record.summarizeId];
              } else {
                record.summarizeContent = '';
              }
            });
            
            return res;
          });
      })
  }, store, options)(data)
}

// 查询记录详情（不需要登录）
export function getRecord(id) {
  return getRequest().doc(id).get()
}

// 添加记录（需要登录）
export const addRecord = withAuth(function(data) {
  return getRequest().add(data)
}, store)

// 更新记录（需要登录）
export const updateRecord = withAuth(function(id, data) {
  return getRequest().doc(id).update(data)
}, store)

// 删除记录（需要登录）
export const delRecord = withAuth(function(id) {
  return getRequest().doc(id).remove()
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
      // 处理云函数返回的数据格式
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