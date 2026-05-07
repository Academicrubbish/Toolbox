/**
 * web-reader.js — 客户端网页内容提取工具
 * 在小程序端直接请求网页并解析为 Markdown
 */

/** HTML 实体解码 */
function decodeEntities(str) {
	return str
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/&#(\d+);/gi, (_, code) => String.fromCharCode(parseInt(code)))
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

/** 去除 HTML 标签，保留纯文本 */
function stripTags(html) {
	return html.replace(/<[^>]+>/g, '')
}

/** 提取微信公众号文章标题 */
function extractTitle(html) {
	const ogMatch = html.match(/property="og:title"\s+content="([^"]*)"/i)
	if (ogMatch) return decodeEntities(ogMatch[1].trim())

	const h1Match = html.match(/class="rich_media_title[^"]*"[^>]*>([\s\S]*?)<\/h\d>/i)
	if (h1Match) return decodeEntities(stripTags(h1Match[1]).trim())

	const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
	if (titleMatch) {
		let t = decodeEntities(stripTags(titleMatch[1])).trim()
		return t.replace(/[-_|–—].*$/, '').trim()
	}
	return ''
}

/**
 * 用括号平衡法提取 id="js_content" 的完整 div 内容
 * 解决多层嵌套 div 导致正则提前截断的问题
 */
function extractBody(html) {
	// 策略1：括号平衡提取 js_content
	const startIdx = html.indexOf('id="js_content"')
	if (startIdx !== -1) {
		const tagStart = html.lastIndexOf('<div', startIdx)
		const depthStart = html.indexOf('>', tagStart) + 1
		let depth = 1
		let i = depthStart
		while (i < html.length && depth > 0) {
			const openDiv = html.indexOf('<div', i)
			const closeDiv = html.indexOf('</div', i)
			if (closeDiv === -1) break
			if (openDiv !== -1 && openDiv < closeDiv) {
				depth++
				i = openDiv + 4
			} else {
				depth--
				if (depth === 0) {
					return html.substring(depthStart, closeDiv)
				}
				i = closeDiv + 6
			}
		}
	}

	// 策略2：括号平衡提取 rich_media_content
	const startIdx2 = html.indexOf('class="rich_media_content')
	if (startIdx2 !== -1) {
		const tagStart = html.lastIndexOf('<div', startIdx2)
		const depthStart = html.indexOf('>', tagStart) + 1
		let depth = 1
		let i = depthStart
		while (i < html.length && depth > 0) {
			const openDiv = html.indexOf('<div', i)
			const closeDiv = html.indexOf('</div', i)
			if (closeDiv === -1) break
			if (openDiv !== -1 && openDiv < closeDiv) {
				depth++
				i = openDiv + 4
			} else {
				depth--
				if (depth === 0) {
					return html.substring(depthStart, closeDiv)
				}
				i = closeDiv + 6
			}
		}
	}

	// 兜底：取 body
	const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
	return bodyMatch ? bodyMatch[1] : html
}

/** 将 HTML 片段转为 Markdown */
function htmlToMarkdown(html) {
	let md = html

	md = md.replace(/<script[\s\S]*?<\/script>/gi, '')
	md = md.replace(/<style[\s\S]*?<\/style>/gi, '')

	// 图片（微信图片在 data-src）
	md = md.replace(/<img[^>]*data-src="([^"]*)"[^>]*>/gi, '\n![图片]($1)\n')
	md = md.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '\n![图片]($1)\n')

	// 链接
	md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')

	// 标题
	md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
	md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
	md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
	md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n')
	md = md.replace(/<h[5-6][^>]*>([\s\S]*?)<\/h[5-6]>/gi, '\n##### $1\n')

	// 列表
	md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
	md = md.replace(/<\/?(?:ul|ol)>/gi, '\n')

	// 加粗和斜体
	md = md.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**')
	md = md.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*')

	// 代码块
	md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
	md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')

	// 块引用
	md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
		return content.split('\n').map(line => '> ' + line.trim()).join('\n') + '\n'
	})

	// 换行
	md = md.replace(/<br\s*\/?>/gi, '\n')
	md = md.replace(/<\/p>/gi, '\n\n')
	md = md.replace(/<\/div>/gi, '\n')

	// 去除剩余标签
	md = md.replace(/<[^>]+>/g, '')

	// 解码实体
	md = decodeEntities(md)

	// 清理
	md = md.replace(/\n{3,}/g, '\n\n')
	md = md.replace(/[ \t]+$/gm, '')
	return md.trim()
}

/**
 * 请求网页并提取为 Markdown
 * @param {string} url - 网页链接
 * @returns {Promise<{title: string, content: string}>}
 */
export function fetchWebPage(url) {
	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method: 'GET',
			responseType: 'text',
			header: {
				'Accept': 'text/html'
			},
			success: (res) => {
				const html = res.data
				if (!html || typeof html !== 'string' || html.length < 100) {
					reject(new Error('网页内容获取失败'))
					return
				}

				const title = extractTitle(html)
				const bodyHtml = extractBody(html)
				const content = htmlToMarkdown(bodyHtml)

				if (!content || content.length < 30) {
					reject(new Error('文章正文提取为空'))
					return
				}

				resolve({ title, content })
			},
			fail: (err) => {
				reject(new Error(err.errMsg || '网络请求失败'))
			}
		})
	})
}
