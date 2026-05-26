'use strict'

const KROKI_URL = 'https://kroki.io/mermaid/svg'

exports.main = async (event, context) => {
  console.log('[renderMermaid] 收到请求:', JSON.stringify(event))

  try {
    const { code, theme = 'light' } = event
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return { code: 400, message: 'code 参数不能为空', data: null }
    }

    console.log('[renderMermaid] 调用 kroki 渲染, code长度=' + code.length)

    const res = await uniCloud.httpclient.request(KROKI_URL, {
      method: 'POST',
      data: code.trim(),
      dataType: 'text',
      headers: { 'Content-Type': 'text/plain' },
      timeout: 30000
    })

    console.log('[renderMermaid] kroki 响应 status=' + res.status + ', data长度=' + (res.data ? res.data.length : 'null'))

    if (res.status !== 200 || !res.data) {
      return { code: 500, message: 'kroki 渲染失败: HTTP ' + res.status, data: null }
    }

    let svg = res.data
    if (theme === 'dark') {
      svg = svg.replace(/fill="[^"]*"/g, 'fill="#ffffff"')
      svg = svg.replace(/stroke="[^"]*"/g, 'stroke="#ffffff"')
      svg = svg.replace(/color: [^;"]*/g, 'color: #ffffff')
    }

    const base64 = Buffer.from(svg).toString('base64')
    return { code: 0, message: 'success', data: `data:image/svg+xml;base64,${base64}` }
  } catch (error) {
    console.error('[renderMermaid] 错误:', error.message, error.stack)
    return { code: 500, message: error.message, data: null }
  }
}
