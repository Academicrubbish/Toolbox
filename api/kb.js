import store from '@/store';
import { withAuth } from '@/utils/api-auth.js';

/**
 * 知识库 API（第二期：语义搜索）
 * 云函数 semanticSearch：语义 + 关键词混合检索，接口故障自动降级为关键词搜索。
 * 返回结构沿用 searchRecord 的约定（result.data / result.total），便于前端无感切换。
 */

// 语义搜索（混合检索，需要登录）
// 返回 { result: { data, total, degraded } }，degraded 为 true 表示语义服务暂不可用、当前为普通搜索
export const semanticSearch = function(data, options = {}) {
  return withAuth(function(data) {
    const { keyword, pageNum = 1, pageSize = 10 } = data;
    const user = store.state.user;

    if (!keyword || keyword.trim() === '') {
      return Promise.reject(new Error('搜索关键词不能为空'));
    }

    return uniCloud.callFunction({
      name: 'semanticSearch',
      data: {
        keyword: keyword.trim(),
        openid: user.openid,
        pageNum,
        pageSize
      }
    }).then(res => {
      if (res.result && res.result.code === 0) {
        return {
          result: {
            data: res.result.data || [],
            total: res.result.total || 0,
            degraded: !!res.result.degraded
          }
        };
      } else {
        return Promise.reject(new Error(res.result?.message || '搜索失败'));
      }
    });
  }, store, options)(data);
}

/**
 * 获取相关笔记推荐（详情页"相关笔记"区块，第三期）
 * 笔记无向量 / 候选不足 / 低于相似度阈值时返回空数组，前端隐藏区块
 * @param {string} sourceId 当前笔记 ID
 * @returns {Promise<{result: {data: Array}}>} 推荐笔记列表（带 relatedScore）
 */
export const getRelatedRecords = function(sourceId, options = {}) {
  return withAuth(function(sourceId) {
    return uniCloud.callFunction({
      name: 'semanticSearch',
      data: {
        mode: 'byRecord',
        sourceId: sourceId,
        openid: store.state.user.openid,
        topK: 5
      }
    }).then(res => {
      if (res.result && res.result.code === 0) {
        return { result: { data: res.result.data || [] } };
      } else {
        return Promise.reject(new Error(res.result?.message || '获取相关笔记失败'));
      }
    });
  }, store, options)(sourceId);
}
