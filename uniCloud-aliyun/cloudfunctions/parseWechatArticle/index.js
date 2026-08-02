'use strict'
const axios = require('axios')

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY
const GLM_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const READER_URL = 'https://open.bigmodel.cn/api/paas/v4/reader'

// ========== AI 调用监控相关常量 ==========
/** 单次调用 token 异常阈值，超过则即时告警 */
const SINGLE_BURST_THRESHOLD = 20000
const AI_FUNCTION = 'wechat_article'

/** 调 GLM 文本模型清洗文章噪声，返回 { content, usage, error } */
async function cleanWithGLM(content) {
	try {
		const response = await axios.post(
			GLM_URL,
			{
				model: 'glm-4-flash',
				messages: [
					{
						role: 'system',
						content: '你是一个内容清洗助手。去除文章中的广告、导语、推广信息、公众号关注引导等噪声内容，只保留核心正文。输出格式为 Markdown，不添加任何解释说明。'
					},
					{ role: 'user', content: content }
				],
				max_tokens: 8192,
				temperature: 0.1
			},
			{
				headers: {
					'Authorization': `Bearer ${ZHIPU_API_KEY}`,
					'Content-Type': 'application/json'
				},
				timeout: 60000
			}
		)
		return {
			content: response.data.choices[0].message.content || content,
			usage: response.data.usage || null,
			error: ''
		}
	} catch (err) {
		// 清洗失败时降级，返回原始内容
		console.error('GLM 清洗失败，降级返回原始内容：', err.message)
		return { content: content, usage: null, error: err.message || '清洗失败' }
	}
}

exports.main = async (event, context) => {
	const { url, html, title } = event || {}
	if (!url && !html) return { code: -1, message: '链接或文章内容为空' }
	if (!ZHIPU_API_KEY) {
		return { code: -1, message: '文章解析服务缺少 ZHIPU_API_KEY 环境变量' }
	}

	const db = uniCloud.database()
	// 优先用客户端显式传入的 openid（阿里云自定义登录下 UNICLOUD_INFO.OPENID 不可靠）
	const openid = event.openid || (event.UNICLOUD_INFO && event.UNICLOUD_INFO.OPENID) || ''

	try {
		let rawContent = html || ''
		let rawTitle = title || ''

		// 当前客户端已抓取正文并传入 html；url 路径为旧客户端保留
		if (!rawContent && url) {
			const readerStart = Date.now()
			const readerRes = await axios.post(
				READER_URL,
				{ url, return_format: 'markdown', retain_images: false },
				{
					headers: {
						'Authorization': `Bearer ${ZHIPU_API_KEY}`,
						'Content-Type': 'application/json'
					},
					timeout: 30000
				}
			)

			const data = readerRes.data || {}
			rawContent = data.content || (data.data && data.data.content) || ''
			rawTitle = rawTitle || data.title || (data.data && data.data.title) || ''

			// 记录阅读接口调用监控（reader 按次计费，通常无标准 usage）
			await recordAiCall(db, {
				fn: AI_FUNCTION, model: 'reader', openid: openid,
				usage: data.usage || (data.data && data.data.usage) || null,
				durationMs: Date.now() - readerStart,
				status: 'success'
			})
		}

		if (!rawContent) return { code: -1, message: '文章内容为空' }

		// 调 GLM 清洗噪声
		const cleanStart = Date.now()
		const cleanResult = await cleanWithGLM(rawContent)

		// 记录清洗调用监控
		await recordAiCall(db, {
			fn: AI_FUNCTION, model: 'glm-4-flash', openid: openid,
			usage: cleanResult.usage, durationMs: Date.now() - cleanStart,
			status: cleanResult.error ? 'error' : 'success', errorMsg: cleanResult.error
		})

		return { code: 0, data: { title: rawTitle, content: cleanResult.content } }
	} catch (err) {
		return { code: -1, message: '解析失败：' + (err.message || '未知错误') }
	}
}

/**
 * 记录一次 AI 调用到 ai_call_logs，并对单次异常消耗触发即时告警
 * 全程 try-catch 兜底：监控的任何异常都静默忽略，绝不影响业务主流程
 * 昵称不在此查询（避免热路径额外开销），统计展示时再 join tb_user
 * @param {Object} db 数据库实例
 * @param {Object} params { fn, model, openid, usage, durationMs, status, errorMsg }
 */
async function recordAiCall(db, params) {
	try {
		const { fn, model, openid, usage, durationMs, status, errorMsg } = params
		const totalTokens = usage && typeof usage.total_tokens === 'number' ? usage.total_tokens : null

		await db.collection('ai_call_logs').add({
			function: fn,
			model: model,
			openid: openid || '',
			user_name: '',
			prompt_tokens: usage ? usage.prompt_tokens : null,
			completion_tokens: usage ? usage.completion_tokens : null,
			total_tokens: totalTokens,
			duration_ms: durationMs,
			status: status,
			error_msg: errorMsg || '',
			batch_id: '',
			create_time: Date.now()
		})

		// 单次 token 异常即时告警
		if (totalTokens !== null && totalTokens > SINGLE_BURST_THRESHOLD) {
			await raiseAlert(db, {
				rule: 'single_burst',
				level: 'warn',
				openid: openid || '',
				user_name: '',
				function: fn,
				metric_value: totalTokens,
				threshold: SINGLE_BURST_THRESHOLD,
				message: `单次调用 token 异常：${fn}/${model} 消耗 ${totalTokens} tokens`
			})
		}
	} catch (e) {
		console.error('[recordAiCall] 监控异常，已忽略不影响业务：', e.message)
	}
}

/**
 * 写入一条告警记录到 ai_alerts 并打印日志
 * 预留 notifyAlert() 钩子，未来可接入 webhook / 订阅消息推送
 * @param {Object} db 数据库实例
 * @param {Object} alert 告警内容（不含 create_time）
 */
async function raiseAlert(db, alert) {
	try {
		await db.collection('ai_alerts').add({
			...alert,
			create_time: Date.now()
		})
		console.warn(`[AI告警] ${alert.rule}: ${alert.message}`)
		// 预留钩子：未来接入企业微信/钉钉机器人或订阅消息推送
		// notifyAlert(alert)
	} catch (e) {
		console.error('[raiseAlert] 写入告警失败：', e.message)
	}
}
