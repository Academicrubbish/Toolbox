/**
 * 用户认证缓存工具
 * 实现类似 Web 端 token 缓存的功能，一段时间内不需要用户反复登录
 */

const CACHE_KEY = 'user_auth_cache'
const DEFAULT_EXPIRE_DAYS = 7 // 默认缓存 7 天

/**
 * 获取缓存数据
 * @returns {Object|null} 缓存数据，包含 openid 和过期时间
 */
export function getAuthCache() {
  try {
    const cacheStr = uni.getStorageSync(CACHE_KEY)
    if (!cacheStr) {
      return null
    }
    const cache = JSON.parse(cacheStr)
    return cache
  } catch (e) {
    return null
  }
}

/**
 * 保存认证缓存
 * @param {string} openid 用户 openid
 * @param {number} expireDays 过期天数，默认 7 天
 */
export function setAuthCache(openid, expireDays = DEFAULT_EXPIRE_DAYS) {
  try {
    const expireTime = Date.now() + expireDays * 24 * 60 * 60 * 1000
    const cache = {
      openid: openid,
      expireTime: expireTime,
      createTime: Date.now()
    }
    uni.setStorageSync(CACHE_KEY, JSON.stringify(cache))
    return true
  } catch (e) {
    return false
  }
}

/**
 * 清除认证缓存
 */
export function clearAuthCache() {
  try {
    uni.removeStorageSync(CACHE_KEY)
    return true
  } catch (e) {
    return false
  }
}

/**
 * 检查缓存是否有效
 * @returns {boolean} 缓存是否有效
 */
export function isAuthCacheValid() {
  const cache = getAuthCache()
  if (!cache || !cache.openid) {
    return false
  }
  
  // 检查是否过期
  const now = Date.now()
  if (cache.expireTime && now > cache.expireTime) {
    // 缓存已过期，清除缓存
    clearAuthCache()
    return false
  }
  
  return true
}

/**
 * 从缓存获取 openid
 * @returns {string|null} openid，如果缓存无效则返回 null
 */
export function getOpenidFromCache() {
  if (!isAuthCacheValid()) {
    return null
  }
  
  const cache = getAuthCache()
  return cache ? cache.openid : null
}

/**
 * 获取缓存剩余有效时间（毫秒）
 * @returns {number} 剩余有效时间，如果无效则返回 0
 */
export function getCacheRemainingTime() {
  const cache = getAuthCache()
  if (!cache || !cache.expireTime) {
    return 0
  }
  
  const now = Date.now()
  const remaining = cache.expireTime - now
  return remaining > 0 ? remaining : 0
}

