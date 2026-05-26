'use strict'

const zlib = require('zlib')

const KROKI_BASE = 'https://render.coptis.top'

/**
 * 将 Mermaid 代码编码为 Kroki URL 格式
 * 编码流程：UTF-8 → zlib deflate → base64 → URL-safe base64
 */
function encodeKroki(code) {
  const compressed = zlib.deflateSync(Buffer.from(code, 'utf-8'))
  return compressed.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Mermaid 图表渲染云函数
 * 将 mermaid 代码编码后返回 Kroki 图片 URL，由小程序 <image> 直接加载
 */
exports.main = async (event) => {
  try {
    const { code, theme = 'light' } = event
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return { code: 400, message: 'code 参数不能为空', data: null }
    }

    const encoded = encodeKroki(code.trim())
    const url = `${KROKI_BASE}/mermaid/svg/${encoded}`

    return { code: 0, message: 'success', data: url }
  } catch (error) {
    console.error('[renderMermaid] 错误:', error.message)
    return { code: 500, message: error.message, data: null }
  }
}
