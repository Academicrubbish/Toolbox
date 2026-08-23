/**
 * towxml 图片画廊预览工具
 *
 * 文档内 Markdown 图片点击后进入画廊模式预览（可左右切换本文档所有图片）。
 * 图表（ECharts/YUML/Mermaid）的预览不走本模块：
 * - ECharts/YUML 为 SVG data URI，previewImage 真机不支持，走 chart-preview 全屏组件
 * - Mermaid 为 Kroki URL，组件内自行换 /png/ 端点走原生预览
 *
 * 画廊按页面维度隔离（WeakMap，页面销毁自动回收），同一文档多次解析以最后一次为准。
 *
 * 注意：本模块会被两份打包产物引用（wxcomponents 原样拷贝 + Vue 侧 webpack
 * 打包），画廊状态锚定到 global 才能在两侧共享（同 towxml 的 global._events 方案）。
 */

var pageGalleries = (function () {
  var g = typeof global !== 'undefined' ? global : {}
  if (!g.__towxmlPageGalleries) {
    g.__towxmlPageGalleries = new WeakMap()
  }
  return g.__towxmlPageGalleries
})()

/** 获取当前页面栈顶（失败返回 null） */
function getTopPage() {
  try {
    var pages = getCurrentPages()
    return pages.length ? pages[pages.length - 1] : null
  } catch (e) {
    return null
  }
}

/**
 * 遍历解析后的节点树，收集文档内全部图片地址，并记录到当前页面的画廊
 * @param {Object} nodes towxml 解析结果（含 children 的节点树）
 * @returns {string[]} 图片地址列表
 */
function collectAndSetGallery(nodes) {
  var srcs = []
  ;(function walk(node) {
    var children = node && node.children
    if (!children) return
    for (var i = 0; i < children.length; i++) {
      var item = children[i]
      if ((item.tag === 'img' || item.tag === 'image') && item.attrs && item.attrs.src) {
        srcs.push(item.attrs.src)
      }
      walk(item)
    }
  })(nodes)

  var page = getTopPage()
  if (page) pageGalleries.set(page, srcs)
  return srcs
}

/** 读取当前页面的图片画廊（无记录返回空数组） */
function getPageGallery() {
  var page = getTopPage()
  return page ? pageGalleries.get(page) || [] : []
}

/**
 * 画廊模式预览：以被点击图片为起点，可左右切换本文档所有图片
 * @param {string} src 被点击的图片地址
 */
function previewFromGallery(src) {
  if (!src) return
  var urls = getPageGallery()
  if (!urls.length || urls.indexOf(src) < 0) {
    urls = [src]
  }
  wx.previewImage({ current: src, urls: urls })
}

module.exports = {
  collectAndSetGallery: collectAndSetGallery,
  getPageGallery: getPageGallery,
  previewFromGallery: previewFromGallery
}
