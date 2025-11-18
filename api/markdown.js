/**
 * Markdown 解析 API
 * 使用云函数处理 Markdown 渲染，减少代码包体积
 */

/**
 * 解析 Markdown 为 HTML（通过云函数）
 * @param {string} markdown - Markdown 文本
 * @param {string} type - 类型：'markdown' 或 'html'
 * @returns {Promise} 返回解析后的 HTML
 */
export function parseMarkdown(markdown, type = 'markdown') {
  return new Promise((resolve, reject) => {
    uniCloud.callFunction({
      name: 'parseMarkdown',
      data: {
        markdown: markdown,
        type: type
      }
    }).then(res => {
      if (res.result && res.result.code === 0) {
        resolve(res.result.data)
      } else {
        reject(new Error(res.result?.message || 'Markdown 解析失败'))
      }
    }).catch(err => {
      console.error('调用 Markdown 解析云函数失败：', err)
      reject(err)
    })
  })
}

