/**
 * 云函数渲染结果缓存（LaTeX / YUML / Mermaid / ECharts 共用）
 *
 * 背景：towxml 子组件在 attached 时各自调用云函数渲染，同一内容每次预览
 * 都重新发起网络请求。本模块提供双层缓存 + 并发去重：
 * - 内存层：Map，当前会话内命中即秒出
 * - 持久层：本地存储快照（懒加载 + 防抖写入 + 条数上限淘汰），跨会话复用
 *
 * 仅缓存成功结果；存储读写失败静默降级，不影响正常渲染流程。
 *
 * 注意：本模块会被两份打包产物引用（wxcomponents 原样拷贝 + Vue 侧 webpack
 * 打包），模块级变量会有两个实例，共享状态必须锚定到 global
 * （同 towxml 自身的 global._events / global._theme 方案）。
 */

var STORAGE_KEY = 'towxml_render_cache'
var MAX_ENTRIES = 50
var SAVE_DELAY = 500

/** 全局共享状态（双打包实例共用同一份） */
var state = (function () {
  var g = typeof global !== 'undefined' ? global : {}
  if (!g.__towxmlRenderCacheState) {
    g.__towxmlRenderCacheState = {
      // 内存层（当前会话）
      mem: new Map(),
      // 进行中的请求，相同 key 的并发调用共享同一个 Promise（如同一公式在文中多次出现）
      inflight: new Map(),
      // 持久层快照，首次访问时懒加载；null 表示尚未加载
      snapshot: null,
      // 防抖写入定时器；null 表示无待写入
      saveTimer: null
    }
  }
  return g.__towxmlRenderCacheState
})()

/** 简单字符串哈希（djb2 变体），用于生成缓存 key */
function hash(str) {
  var h = 5381
  for (var i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0
  }
  // 拼接长度进一步降低碰撞影响
  return h.toString(36) + '_' + str.length
}

/** 生成缓存 key：type + 附加维度（主题/尺寸）+ 内容哈希 */
function buildKey(type, content, extra) {
  return type + '|' + (extra || '') + '|' + hash(content)
}

/** 读取持久层快照（懒加载，失败返回空对象） */
function loadStorage() {
  if (state.snapshot === null) {
    try {
      var data = uni.getStorageSync(STORAGE_KEY)
      state.snapshot = data && typeof data === 'object' ? data : {}
    } catch (e) {
      state.snapshot = {}
    }
  }
  return state.snapshot
}

/** 防抖写入持久层，超上限按最近写入时间淘汰最旧条目 */
function scheduleSave() {
  if (state.saveTimer !== null) return
  state.saveTimer = setTimeout(function () {
    state.saveTimer = null
    try {
      var cache = loadStorage()
      var keys = Object.keys(cache)
      if (keys.length > MAX_ENTRIES) {
        keys.sort(function (a, b) { return (cache[a].t || 0) - (cache[b].t || 0) })
          .slice(0, keys.length - MAX_ENTRIES)
          .forEach(function (k) { delete cache[k] })
      }
      uni.setStorageSync(STORAGE_KEY, cache)
    } catch (e) {
      // 存储写入失败静默忽略，缓存仅是加速手段
    }
  }, SAVE_DELAY)
}

/**
 * 查询缓存
 * @param {string} type 渲染类型：latex / yuml / mermaid / echarts
 * @param {string} content 渲染内容原文
 * @param {string} [extra] 附加维度（主题、尺寸等影响渲染结果的参数）
 * @returns {string|null} 命中返回渲染结果，未命中返回 null
 */
function getRenderCache(type, content, extra) {
  var key = buildKey(type, content, extra)
  if (state.mem.has(key)) return state.mem.get(key)
  var storage = loadStorage()
  if (storage[key]) {
    state.mem.set(key, storage[key].d)
    return storage[key].d
  }
  return null
}

/**
 * 写入缓存（仅成功结果调用）
 * @param {string} type 渲染类型
 * @param {string} content 渲染内容原文
 * @param {string} [extra] 附加维度
 * @param {string} data 渲染结果（Base64 图片或图片 URL）
 */
function setRenderCache(type, content, extra, data) {
  var key = buildKey(type, content, extra)
  state.mem.set(key, data)
  var storage = loadStorage()
  storage[key] = { d: data, t: Date.now() }
  scheduleSave()
}

/**
 * 带缓存的渲染执行器：先查缓存，未命中则执行 task，相同 key 的并发调用共享请求
 * @param {string} type 渲染类型
 * @param {string} content 渲染内容原文
 * @param {string} [extra] 附加维度
 * @param {Function} task 实际发起云函数调用的函数，返回 Promise<string>
 * @returns {Promise<string>} 渲染结果
 */
function renderWithCache(type, content, extra, task) {
  var cached = getRenderCache(type, content, extra)
  if (cached !== null) return Promise.resolve(cached)

  var key = buildKey(type, content, extra)
  if (state.inflight.has(key)) return state.inflight.get(key)

  var p = task().then(
    function (data) {
      state.inflight.delete(key)
      setRenderCache(type, content, extra, data)
      return data
    },
    function (err) {
      state.inflight.delete(key)
      throw err
    }
  )
  state.inflight.set(key, p)
  return p
}

module.exports = {
  getRenderCache: getRenderCache,
  setRenderCache: setRenderCache,
  renderWithCache: renderWithCache
}
