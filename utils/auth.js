/**
 * 登录授权工具函数
 */

/**
 * 获取 store 实例
 * @returns {Object|null} store 实例
 */
function getStore() {
  try {
    // 尝试从全局获取
    const app = getApp()
    if (app && app.$store) {
      return app.$store
    }
    // 尝试从 globalData 获取
    if (app && app.globalData && app.globalData.store) {
      return app.globalData.store
    }
    // 如果是在 Vue 组件中，可以通过 Vue 实例获取
    // 这里返回 null，由调用方传入 store
    return null
  } catch (e) {
    return null
  }
}

/**
 * 检查用户是否已登录
 * @param {Object} store 可选的 store 实例，如果不传则尝试自动获取
 * @returns {boolean} 是否已登录
 */
export function isLoggedIn(store = null) {
  const storeInstance = store || getStore()
  if (!storeInstance) {
    // 如果无法获取 store，返回 false（保守策略）
    return false
  }
  const openid = storeInstance.state?.user?.openid
  return !!openid && openid !== ''
}

/**
 * 获取当前用户 openid
 * @param {Object} store 可选的 store 实例，如果不传则尝试自动获取
 * @returns {string} openid
 */
export function getOpenId(store = null) {
  const storeInstance = store || getStore()
  if (!storeInstance) {
    return ''
  }
  return storeInstance.state?.user?.openid || ''
}

/**
 * 检查登录状态，如果未登录则提示
 * @param {Object} options 配置选项
 * @param {string} options.title 提示标题，默认"需要登录"
 * @param {string} options.content 提示内容，默认"此功能需要登录后使用"
 * @param {Function} options.onConfirm 确认回调
 * @param {Function} options.onCancel 取消回调
 * @returns {boolean} 是否已登录
 */
export function checkLogin(options = {}) {
  const {
    title = '需要登录',
    content = '此功能需要登录后使用，是否前往登录？',
    onConfirm,
    onCancel,
    store = null
  } = options

  if (isLoggedIn(store)) {
    return true
  }

  uni.showModal({
    title,
    content,
    confirmText: '去登录',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        if (onConfirm) {
          onConfirm()
        } else {
          // 默认显示登录弹窗（需要调用方传入弹窗引用）
          // 这里保留原有逻辑，但建议使用弹窗组件
          console.warn('请使用登录弹窗组件，而不是跳转页面')
        }
      } else {
        if (onCancel) {
          onCancel()
        }
      }
    }
  })

  return false
}

