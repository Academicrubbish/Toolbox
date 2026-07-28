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
 * 修复 Mermaid 节点标签中的特殊字符问题
 * mermaid 解析器对 [..含括号..] 形式的矩形节点标签敏感：
 * 标签内的半角圆括号 ( ) 会被误判为圆角节点语法的开始，导致整图解析失败（Kroki 返回 400）。
 * 修复策略：含特殊字符的 [..] / {..} 标签用双引号包裹，使其作为纯文本解析。
 * 覆盖存量已生成内容（每次渲染都过此函数）+ AI 新生成内容。
 */
function fixMermaidLabels(code) {
  return code.replace(/([A-Za-z0-9_]+)(\[[^\]\n]*\]|\{[^}\n]*\})/g, (m, id, bracket) => {
    const open = bracket[0]
    const close = bracket[bracket.length - 1]
    let inner = bracket.slice(1, -1)
    // 已用双引号包裹则跳过
    if (/^"[\s\S]*"$/.test(inner)) return m
    // 无特殊字符则跳过
    if (!/[()[\]{}|"<>#]/.test(inner)) return m
    // 内部双引号转义为 mermaid 实体
    inner = inner.replace(/"/g, '&quot;')
    return id + open + '"' + inner + '"' + close
  })
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

    const fixed = fixMermaidLabels(code.trim())
    const encoded = encodeKroki(fixed)
    const url = `${KROKI_BASE}/mermaid/svg/${encoded}`

    return { code: 0, message: 'success', data: url }
  } catch (error) {
    console.error('[renderMermaid] 错误:', error.message)
    return { code: 500, message: error.message, data: null }
  }
}
