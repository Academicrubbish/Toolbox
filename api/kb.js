import store from '@/store';
import { withAuth } from '@/utils/api-auth.js';

function rejectCloudError(result, fallbackMessage) {
  if (result && result.code === -401) {
    store.commit('SET_IS_GUEST', true);
    store.commit('SET_OPENID', '');
    store.commit('SET_SESSION_TOKEN', '');
    return Promise.reject(new Error('登录凭证已过期，请重新登录'));
  }
  return Promise.reject(new Error(result?.message || fallbackMessage));
}

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
        // 过渡发布兼容：旧云函数读取 openid，新云函数只验证 sessionToken 并忽略 openid。
        openid: user.openid,
        sessionToken: user.sessionToken,
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
        return rejectCloudError(res.result, '搜索失败');
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
        // 过渡发布兼容：确认新版云函数稳定后可删除该冗余字段。
        openid: store.state.user.openid,
        sessionToken: store.state.user.sessionToken,
        topK: 5
      }
    }).then(res => {
      if (res.result && res.result.code === 0) {
        return { result: { data: res.result.data || [] } };
      } else {
        return rejectCloudError(res.result, '获取相关笔记失败');
      }
    });
  }, store, options)(sourceId);
}
