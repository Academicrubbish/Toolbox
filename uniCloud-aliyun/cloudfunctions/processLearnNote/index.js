'use strict'
const axios = require('axios')

// ========== AI 调用监控相关常量 ==========
/** 单次调用 token 异常阈值，超过则即时告警 */
const SINGLE_BURST_THRESHOLD = 20000
const AI_FUNCTION = 'learn_note'
const AI_MODEL = 'glm-5'

const SYSTEM_PROMPT = `你是一位经验丰富、耐心细致的辅导老师，能够根据学生笔记的学科和内容灵活调整教学方式，帮助不同年龄段的学习者真正理解和掌握知识。

请根据学生提供的笔记内容，生成一份结构清晰的 Markdown 文档，严格包含以下两个部分，每个部分使用二级标题（##）：

## 一、知识点精讲

1. **核心知识梳理**：提炼笔记中的关键概念和知识脉络，建立清晰的逻辑框架
2. **知识补充与拓展**：补充笔记中遗漏的重要要点、背景知识和关联信息
3. **通俗易懂的讲解**：用贴近生活的类比、生动的例子帮助理解抽象概念，避免生硬的教科书语气
4. **重点标注**：用 **加粗** 标记重点内容，提醒需要特别注意的易错点、难点或常见误区
5. **知识地图**：在末尾用简要的方式展示本节知识与其他知识的关联，帮助学生建立知识网络

语言风格要求：
- 亲切自然，像一对一辅导那样与学生对话
- 根据笔记内容自动判断学科领域和适合的读者水平，调整用词深度
- 避免堆砌术语，遇到专业术语要给出通俗解释

## 二、针对性练习题

采用**渐进式实战练习**设计，共4道题目，总分100分：

### 题目1：基础理解（20分）
- **目标**：检验最基本的概念理解
- **形式**：概念辨析、填空、判断正误或简单应用
- **要求**：2-3个小题，紧扣核心知识点

### 题目2：入门应用（30分）
- **目标**：将知识初步应用到具体场景
- **形式**：根据学科特点出题——
  - 理科类：计算题、推导题、实验分析
  - 文科类：材料分析、观点阐述、案例分析
  - 技术类：代码编写、功能实现、问题排查
  - 生活类：情境分析、决策判断、方案设计

### 题目3：进阶挑战（30分）
- **目标**：举一反三，跨场景迁移运用
- **形式**：提供一个新情境或变式问题，需要灵活运用所学知识解决
- **要求**：有一定思维深度，不能直接套用公式或模板

### 题目4：综合实战（20分）
- **目标**：融会贯通，综合运用所学解决实际问题
- **形式**：设计一个贴近真实生活或学习的综合场景，需要同时运用多个知识点
- **要求**：开放性强，鼓励多角度思考

每道题必须包含：
- **题目描述**：清晰的题目要求
- **详细答案与解析**：逐步分析解题思路，帮助学生理解"为什么这么做"，而不是只给最终结果

注意事项：
- 全部使用中文
- Markdown 格式输出，标题层级清晰
- 根据笔记内容自动适配学科（数学、物理、化学、历史、语文、英语、编程、经济、心理学、生活常识等），出题方式匹配该学科特点
- 如果笔记内容不完整，基于已有信息合理推断和补充
- 知识地图如使用 mermaid 流程图（graph/flowchart），节点标签内禁止使用半角圆括号 ()、方括号 []、花括号 {} 等特殊字符（会被图表引擎误解析导致渲染失败），可改用全角括号（）或用双引号包裹整个标签文本
- 请严格使用"## 一、知识点精讲"和"## 二、针对性练习题"作为两个部分的标题，不要修改这两个标题文字`

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY

exports.main = async (event, context) => {
	if (!ZHIPU_API_KEY) {
		console.error('[processLearnNote] 缺少 ZHIPU_API_KEY 环境变量')
		return { code: -1, message: 'AI 学习服务配置缺失' }
	}

	const db = uniCloud.database()
	let taskId = null
	let noteLogId = null
	let exerciseLogId = null
	let openid = ''
	let batchId = ''
	let callStart = 0

	try {
		// 1. 从任务队列取一条 pending 任务
		console.log('[processLearnNote] 开始查询 ai_task_queue...')
		const taskRes = await db.collection('ai_task_queue')
			.where({ status: 'pending' })
			.limit(1)
			.get()

		console.log('[processLearnNote] 查询结果:', JSON.stringify(taskRes.result || taskRes))

		// 兼容云端(taskRes.result.data)和本地(taskRes.data)两种返回格式
		const queryResult = taskRes.result || taskRes
		const taskList = queryResult.data || []

		if (taskList.length === 0) {
			return { code: 0, message: '无待处理任务' }
		}

		const task = taskList[0]
		taskId = task._id
		noteLogId = task.note_log_id || task.log_id
		exerciseLogId = task.exercise_log_id
		const content = task.content
		openid = task.create_by || ''
		batchId = task.batch_id || ''

		console.log('[processLearnNote] 取到任务:', taskId, 'noteLogId:', noteLogId, 'exerciseLogId:', exerciseLogId)

		// 2. 标记为 processing，防止重复消费
		await db.collection('ai_task_queue').doc(taskId).update({
			status: 'processing',
			update_time: Date.now()
		})

		// 3. 调用智谱 GLM API
		console.log('[processLearnNote] 开始调用 GLM-5 API...')
		callStart = Date.now()
		const response = await axios.post(
			'https://open.bigmodel.cn/api/paas/v4/chat/completions',
			{
				model: AI_MODEL,
				messages: [
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'user', content: content }
				],
				thinking: { type: 'disabled' },
				max_tokens: 8192,
				temperature: 1.0
			},
			{
				headers: {
					'Authorization': `Bearer ${ZHIPU_API_KEY}`,
					'Content-Type': 'application/json'
				},
				timeout: 300000
			}
		)

		const aiContent = response.data.choices[0].message.content
		const usage = response.data.usage || null
		const durationMs = Date.now() - callStart
		const now = Date.now()

		// 4. 拆分 AI 返回内容为笔记和练习
		const splitResult = splitAiContent(aiContent)

		if (splitResult.success) {
			// 拆分成功，分别更新两条记录
			await db.collection('ai_learn_logs').doc(noteLogId).update({
				ai_result: splitResult.note,
				status: 'success',
				complete_time: now
			})

			await db.collection('ai_learn_logs').doc(exerciseLogId).update({
				ai_result: splitResult.exercise,
				status: 'success',
				complete_time: now
			})
		} else {
			// 拆分失败兜底：完整内容存入笔记记录，练习记录标记失败
			await db.collection('ai_learn_logs').doc(noteLogId).update({
				ai_result: aiContent,
				status: 'success',
				complete_time: now
			})

			await db.collection('ai_learn_logs').doc(exerciseLogId).update({
				status: 'error',
				error_msg: '内容拆分失败，完整内容已合并到知识点精讲中',
				complete_time: now
			})
		}

		// 5. 标记任务为 done
		await db.collection('ai_task_queue').doc(taskId).update({
			status: 'done',
			update_time: now
		})

		// 6. 记录 AI 调用监控（含单次异常即时告警）
		await recordAiCall(db, {
			fn: AI_FUNCTION,
			model: AI_MODEL,
			openid,
			usage,
			durationMs,
			status: 'success',
			batchId
		})

		console.log('[processLearnNote] 生成成功')
		return { code: 0, message: '生成成功' }
	} catch (err) {
		console.error('[processLearnNote] 处理任务失败：', err.message)

		const now = Date.now()
		const errorMsg = (err.response && err.response.data && err.response.data.error)
			? err.response.data.error.message
			: err.message || 'AI 生成失败'
		const durationMs = callStart ? Date.now() - callStart : null

		if (taskId && noteLogId) {
			// 两条记录都标记失败
			await db.collection('ai_learn_logs').doc(noteLogId).update({
				status: 'error',
				error_msg: errorMsg,
				complete_time: now
			}).catch(() => {})

			if (exerciseLogId) {
				await db.collection('ai_learn_logs').doc(exerciseLogId).update({
					status: 'error',
					error_msg: errorMsg,
					complete_time: now
				}).catch(() => {})
			}

			await db.collection('ai_task_queue').doc(taskId).update({
				status: 'failed',
				error_msg: errorMsg,
				update_time: now
			}).catch(() => {})
		}

		// 记录失败的 AI 调用监控
		await recordAiCall(db, {
			fn: AI_FUNCTION,
			model: AI_MODEL,
			openid,
			usage: null,
			durationMs,
			status: 'error',
			errorMsg,
			batchId
		}).catch(() => {})

		return { code: -1, message: '任务处理失败' }
	}
}

/**
 * 拆分 AI 返回内容为笔记和练习
 * 使用固定分隔符 "## 二、针对性练习题" 进行拆分
 */
function splitAiContent(content) {
	const separator = '## 二、针对性练习题'
	const index = content.indexOf(separator)

	if (index === -1) {
		return { success: false, note: '', exercise: '' }
	}

	// 查找分隔符之前的完整标题 "## 一、知识点精讲"
	const noteHeaderMatch = content.match(/##\s*一[、.．]\s*知识点精讲\s*\n/)
	const noteStartIndex = noteHeaderMatch ? noteHeaderMatch.index + noteHeaderMatch[0].length : 0

	return {
		success: true,
		note: content.substring(noteStartIndex, index).trim(),
		// 跳过 "## 二、针对性练习题" 标题行，直接从正文开始
		exercise: content.substring(index + separator.length).replace(/^\s*\n/, '').trim()
	}
}

/**
 * 记录一次 AI 调用到 ai_call_logs，并对单次异常消耗触发即时告警
 * 全程 try-catch 兜底：监控的任何异常都静默忽略，绝不影响业务主流程
 * 昵称不在此查询（避免热路径额外开销），统计展示时再 join tb_user
 * @param {Object} db 数据库实例
 * @param {Object} params { fn, model, openid, usage, durationMs, status, errorMsg, batchId }
 */
async function recordAiCall(db, params) {
	try {
		const { fn, model, openid, usage, durationMs, status, errorMsg, batchId } = params
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
			batch_id: batchId || '',
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
