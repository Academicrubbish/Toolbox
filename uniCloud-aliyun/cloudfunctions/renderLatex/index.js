'use strict'

const mathjax = require('mathjax-node')

// 初始化 mathjax（在模块加载时初始化）
mathjax.start()

exports.main = async (event, context) => {
  try {
    const { tex, theme = 'light' } = event
    
    // 参数验证
    if (!tex || typeof tex !== 'string' || tex.trim().length === 0) {
      return {
        code: 400,
        message: 'tex 参数不能为空',
        data: null
      }
    }

    // 使用 Promise 包装 mathjax.typeset，添加超时处理
    const result = await Promise.race([
      new Promise((resolve, reject) => {
        mathjax.typeset({
          math: tex.trim(),
          format: 'TeX',
          svg: true,
          width: null, // 自动宽度
          linebreaks: false // 不自动换行
        }, (data) => {
          if (data.errors && data.errors.length > 0) {
            reject(new Error(`LaTeX 公式错误: ${data.errors.join(', ')}`))
            return
          }
          
          if (!data.svg) {
            reject(new Error('LaTeX 渲染失败：未生成 SVG'))
            return
          }
          
          let svg = data.svg
          
          // 如果是暗色主题，将颜色改为白色
          if (theme === 'dark') {
            svg = svg.replace(/fill="currentColor"/g, 'fill="#ffffff"')
            svg = svg.replace(/stroke="currentColor"/g, 'stroke="#ffffff"')
          }
          
          // 将 SVG 转换为 Base64
          const base64 = Buffer.from(svg).toString('base64')
          const dataUri = `data:image/svg+xml;base64,${base64}`
          
          resolve({
            code: 0,
            message: 'success',
            data: dataUri,
            svg: svg // 同时返回原始 SVG，方便调试
          })
        })
      }),
      // 超时处理（30秒）
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('LaTeX 渲染超时'))
        }, 30000)
      })
    ])

    return result
  } catch (error) {
    console.error('LaTeX 渲染错误：', error)
    return {
      code: 500,
      message: error.message || 'LaTeX 渲染失败',
      data: null
    }
  }
}

