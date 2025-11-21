/**
 * API授权检查工具
 * 统一处理需要登录的接口调用前的授权检查
 */

import { isLoggedIn } from './auth.js'

// 全局登录弹窗引用
let loginModalRef = null
// 登录检查的 Promise resolve 回调队列
let pendingLoginChecks = []

/**
 * 设置登录弹窗引用
 * @param {Object} ref 登录弹窗组件的引用
 */
export function setLoginModalRef(ref) {
  loginModalRef = ref
}

/**
 * 获取登录弹窗引用
 * @returns {Object|null} 登录弹窗引用
 */
export function getLoginModalRef() {
  return loginModalRef
}

/**
 * 检查登录状态，如果未登录则弹出登录弹窗
 * @param {Object} store Vuex store 实例
 * @returns {Promise<boolean>} 返回Promise，resolve(true)表示已登录，resolve(false)表示未登录或登录失败
 */
/**
 * 通知所有待处理的登录检查
 * @param {boolean} success 是否登录成功
 */
export function notifyLoginResult(success) {
  // 处理所有待处理的 Promise
  pendingLoginChecks.forEach(resolve => {
    try {
      resolve(success);
    } catch (e) {
      // 忽略错误
    }
  });
  // 清空队列
  pendingLoginChecks = [];
}

export function checkLoginBeforeRequest(store, options = {}) {
  const { autoShowLogin = true } = options;
  
  return new Promise((resolve) => {
    // 如果已登录，直接返回true
    if (isLoggedIn(store)) {
      resolve(true)
      return
    }

    // 如果不需要自动弹出登录弹窗，直接返回 false
    if (!autoShowLogin) {
      resolve(false)
      return
    }

    // 如果未登录，弹出登录弹窗
    if (!loginModalRef) {
      // 尝试从 globalData 获取引用
      try {
        const app = getApp();
        if (app && app.globalData && app.globalData.loginModal) {
          loginModalRef = app.globalData.loginModal;
          setLoginModalRef(loginModalRef);
        }
      } catch (e) {
        // 忽略错误
      }
      
      // 如果仍然没有引用，直接返回 false
      if (!loginModalRef) {
        resolve(false)
        return
      }
    }
    
    // 先关闭可能存在的 loading，避免遮挡登录弹窗
    try {
      uni.hideLoading();
    } catch (e) {
      // 忽略错误，可能没有 loading
    }
    
    // 将 resolve 添加到待处理队列
    pendingLoginChecks.push(resolve);
    
    // 打开登录弹窗
    try {
      loginModalRef.open()
    } catch (e) {
      // 从队列中移除并直接 resolve
      const index = pendingLoginChecks.indexOf(resolve);
      if (index > -1) {
        pendingLoginChecks.splice(index, 1);
      }
      resolve(false);
      return;
    }
  })
}

/**
 * 包装需要登录的API函数
 * @param {Function} apiFunction 原始API函数
 * @param {Object} store Vuex store 实例
 * @param {Object} options 选项配置
 * @param {Boolean} options.autoShowLogin 是否自动弹出登录弹窗，默认为 true
 * @returns {Function} 包装后的API函数
 */
export function withAuth(apiFunction, store, options = {}) {
  return async function(...args) {
    // 先检查登录状态
    const isLoggedIn = await checkLoginBeforeRequest(store, options)
    if (!isLoggedIn) {
      // 用户取消登录或未登录，返回一个被拒绝的Promise
      return Promise.reject(new Error('用户未授权'))
    }
    // 已登录，执行原始API函数
    return apiFunction.apply(this, args)
  }
}


