'use strict'

const yuml2svg = require('yuml2svg')

exports.main = async (event, context) => {
  try {
    const { yuml, theme = 'light' } = event
    
    // 参数验证
    if (!yuml || typeof yuml !== 'string' || yuml.trim().length === 0) {
      return {
        code: 400,
        message: 'yuml 参数不能为空',
        data: null
      }
    }

    // 使用 yuml2svg 渲染图表
    // yuml2svg 返回 Promise，支持主题配置
    const isDark = theme === 'dark'
    const svg = await yuml2svg(yuml.trim(), {
      isDark: isDark
    })
    
    if (!svg || typeof svg !== 'string') {
      throw new Error('YUML 渲染失败：无法生成 SVG')
    }
    
    // 如果是暗色主题，可能需要调整颜色（根据实际返回的 SVG 格式调整）
    let finalSvg = svg
    if (isDark) {
      // 根据实际 SVG 格式调整颜色
      finalSvg = svg.replace(/fill="[^"]*"/g, (match) => {
        if (match.includes('black') || match.includes('#000') || match.includes('#000000')) {
          return 'fill="#ffffff"'
        }
        return match
      }).replace(/stroke="[^"]*"/g, (match) => {
        if (match.includes('black') || match.includes('#000') || match.includes('#000000')) {
          return 'stroke="#ffffff"'
        }
        return match
      })
    }
    
    // 将 SVG 转换为 Base64
    const base64 = Buffer.from(finalSvg).toString('base64')
    const dataUri = `data:image/svg+xml;base64,${base64}`
    
    return {
      code: 0,
      message: 'success',
      data: dataUri,
      svg: finalSvg // 同时返回原始 SVG，方便调试
    }
  } catch (error) {
    console.error('YUML 渲染错误：', error)
    return {
      code: 500,
      message: error.message || 'YUML 渲染失败',
      data: null
    }
  }
}

