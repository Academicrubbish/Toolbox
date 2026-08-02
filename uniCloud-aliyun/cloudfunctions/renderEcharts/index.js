'use strict'

// 使用 echarts 的 SVG 渲染方案，避免 canvas 依赖问题
// echarts 5.x 支持 SVG 渲染，无需 canvas

let echarts

try {
  echarts = require('echarts')
} catch (error) {
  console.warn('无法加载 echarts', error)
}

exports.main = async (event, context) => {
  try {
    const { option, theme = 'light', width = 800, height = 400 } = event
    
    // 参数验证
    if (!option || typeof option !== 'object') {
      return {
        code: 400,
        message: 'option 参数不能为空且必须是对象',
        data: null
      }
    }

    // 检查依赖是否可用
    if (!echarts) {
      return {
        code: 500,
        message: 'ECharts 依赖未安装，请检查云函数依赖',
        data: null
      }
    }

    // 创建一个虚拟的 DOM 环境用于 echarts
    const { JSDOM } = require('jsdom')
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    })
    
    // 保存原始全局变量（避免影响其他请求）
    const originalWindow = global.window
    const originalDocument = global.document
    const originalNavigator = global.navigator
    
    global.window = dom.window
    global.document = dom.window.document
    global.navigator = dom.window.navigator
    
    try {
      // 创建一个 div 元素作为容器
      const container = dom.window.document.createElement('div')
      container.style.width = width + 'px'
      container.style.height = height + 'px'
      dom.window.document.body.appendChild(container)
      
      // 初始化 echarts 实例（使用 SVG 渲染器）
      const chart = echarts.init(container, theme === 'dark' ? 'dark' : null, {
        renderer: 'svg', // 使用 SVG 渲染器，无需 canvas
        width: width,
        height: height
      })
      
      // 设置默认颜色
      const finalOption = { ...option }
      if (!finalOption.color) {
        finalOption.color = ['#60acfc', '#32d3eb', '#5bc49f', '#feb64d', '#ff7c7c', '#9287e7']
      }
      
      // 设置图表配置
      chart.setOption(finalOption)
      
      // 等待渲染完成（优化：减少等待时间）
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 获取 SVG 字符串
      let svg = ''
      if (chart.getRenderedSVG) {
        svg = chart.getRenderedSVG()
      } else {
        // 如果方法不存在，从容器中提取 SVG
        const svgElement = container.querySelector('svg')
        if (svgElement) {
          svg = svgElement.outerHTML
        } else {
          svg = container.innerHTML
        }
      }
      
      if (!svg || !svg.includes('<svg')) {
        throw new Error('无法获取 SVG 内容，请检查图表配置')
      }
      
      // 确保 SVG 有正确的尺寸属性
      if (!svg.includes('width=')) {
        svg = svg.replace('<svg', `<svg width="${width}" height="${height}"`)
      }
      
      // 如果是暗色主题，调整颜色
      if (theme === 'dark') {
        svg = svg.replace(/fill="[^"]*"/g, (match) => {
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
      const base64 = Buffer.from(svg).toString('base64')
      const dataUri = `data:image/svg+xml;base64,${base64}`
      
      return {
        code: 0,
        message: 'success',
        data: dataUri
      }
    } finally {
      // 恢复全局变量，避免影响其他请求
      global.window = originalWindow
      global.document = originalDocument
      global.navigator = originalNavigator
    }
  } catch (error) {
    console.error('ECharts 渲染错误：', error)
    return {
      code: 500,
      message: error.message || 'ECharts 渲染失败',
      data: null
    }
  }
}
