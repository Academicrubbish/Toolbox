'use strict'

// 引入 markdown-it 库进行 Markdown 解析
const MarkdownIt = require('markdown-it')
const md = new MarkdownIt({
  html: true,        // 启用 HTML 标签
  linkify: true,     // 自动识别链接
  typographer: true, // 启用一些语言中性的替换 + 引号美化
  breaks: true       // 转换段落里的 '\n' 到 <br>
})

// 可选：添加代码高亮插件（如果需要）
// const hljs = require('highlight.js')
// md.use(require('markdown-it-highlightjs'))

exports.main = async (event, context) => {
  try {
    const { markdown, type = 'markdown' } = event
    
    if (!markdown) {
      return {
        code: 400,
        message: 'markdown 参数不能为空',
        data: null
      }
    }

    let result
    
    if (type === 'markdown') {
      // 将 Markdown 转换为 HTML
      const html = md.render(markdown)
      
      // 返回 HTML 字符串，前端使用 towxml 的 HTML 模式解析
      result = {
        code: 0,
        message: 'success',
        data: html
      }
    } else if (type === 'html') {
      // 如果传入的是 HTML，直接返回
      result = {
        code: 0,
        message: 'success',
        data: markdown
      }
    } else {
      return {
        code: 400,
        message: 'type 参数错误，只支持 markdown 或 html',
        data: null
      }
    }

    return result
  } catch (error) {
    console.error('Markdown 解析错误：', error)
    return {
      code: 500,
      message: error.message || 'Markdown 解析失败',
      data: null
    }
  }
}

