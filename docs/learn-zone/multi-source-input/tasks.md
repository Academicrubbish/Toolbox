---
title: 文档新增多来源输入 Tasks
plan: ./plan.md
status: draft
created: 2026-05-07
updated: 2026-08-02
author: yuanchuang
---

# 文档新增多来源输入 Tasks

> 完成标准：每个 Task 的实现内容完成 + 测试用例全部通过。

## Task 列表

### Task 1：创建 `learn_ocr_log` 数据库集合（对应 Plan 阶段1-步骤1.1）

- **操作类型**：新增
- **涉及文件**：
  - `uniCloud-aliyun/database/learn_ocr_log.schema.json`（新增）
- **实现内容**：
  - 在 uniCloud 控制台创建集合 `learn_ocr_log`
  - 创建 schema 文件，定义字段：
    ```json
    {
      "bsonType": "object",
      "properties": {
        "document_id": { "bsonType": "string", "description": "关联 learn_document，depart 场景为空" },
        "image_urls": { "bsonType": "array", "items": { "bsonType": "string" }, "description": "云存储文件路径列表" },
        "raw_results": { "bsonType": "array", "items": { "bsonType": "string" }, "description": "每张图片的 qwen3.6-flash 原始识别结果" },
        "merged_content": { "bsonType": "string", "description": "合并后的 Markdown 内容" },
        "status": { "bsonType": "string", "enum": ["pending", "processing", "done", "failed"] },
        "error_msg": { "bsonType": "string", "description": "错误信息" },
        "source": { "bsonType": "string", "enum": ["depart", "learnZone"], "description": "来源标识" },
        "create_time": { "bsonType": "number", "description": "创建时间戳" },
        "create_by": { "bsonType": "string", "description": "创建人 openid" }
      }
    }
    ```
  - 设置权限：`create_by` 字段写入权限校验
- **测试用例**：
  - 用例 1：在 uniCloud 控制台手动插入一条测试记录 → 可正常写入和查询
  - 用例 2：缺少必填字段时插入 → 被拒绝
- **依赖**：无

### Task 2：扩展 `store/modules/summarize.js`（对应 Plan 阶段1-步骤1.2）

- **操作类型**：修改
- **涉及文件**：
  - `store/modules/summarize.js`（修改）
- **实现内容**：
  - state 新增 4 个字段：
    ```javascript
    state: {
      summarizeId: '',
      summarizeStatus: '',
      prefillContent: '',    // 预填充到编辑器的 Markdown 内容
      prefillSource: '',     // 来源：manual / ocr / link
      prefillTitle: '',      // 链接导入时的文章标题
      ocrLogId: ''           // OCR 日志 ID
    }
    ```
  - mutations 新增：
    ```javascript
    SET_PREFILL: (state, payload) => {
      state.prefillContent = payload.content || ''
      state.prefillSource = payload.source || ''
      state.prefillTitle = payload.title || ''
      state.ocrLogId = payload.ocrLogId || ''
    },
    CLEAR_PREFILL: (state) => {
      state.prefillContent = ''
      state.prefillSource = ''
      state.prefillTitle = ''
      state.ocrLogId = ''
    }
    ```
  - actions 新增：
    ```javascript
    cachePrefill({ commit }, payload) {
      commit('SET_PREFILL', payload)
    },
    clearPrefill({ commit }) {
      commit('CLEAR_PREFILL')
    }
    ```
- **测试用例**：
  - 用例 1：调用 `cachePrefill({ content: '# test', source: 'ocr' })` → state 中 `prefillContent` 为 `'# test'`，`prefillSource` 为 `'ocr'`
  - 用例 2：调用 `clearPrefill()` → 4 个新增字段全部为空字符串
  - 用例 3：原有 `cacheSummary` / `deleteSummary` 功能不受影响
- **依赖**：无

### Task 3：新建 `api/ocr.js`（对应 Plan 阶段1-步骤1.3）

- **操作类型**：新增
- **涉及文件**：
  - `api/ocr.js`（新增）
- **实现内容**：
  - 参考 `api/aiLearn.js` 的 `callGenerateLearnNote` 模式
  - 导出两个函数：
    ```javascript
    import store from '@/store'
    import { withAuth } from '@/utils/api-auth.js'

    /** 调用 OCR 识别云函数 */
    export const callProcessOcr = withAuth(function(data) {
      return uniCloud.callFunction({
        name: 'processOcr',
        data: {
          imageUrls: data.imageUrls,
          source: data.source || 'depart',
          openid: store.state.user.openid
        }
      }).then(res => {
        if (res.result && res.result.code === 0) return res.result
        return Promise.reject(new Error(res.result?.message || '识别失败'))
      })
    }, store)

    /** 调用链接解析云函数 */
    export const callParseWechatArticle = withAuth(function(data) {
      return uniCloud.callFunction({
        name: 'parseWechatArticle',
        data: { url: data.url }
      }).then(res => {
        if (res.result && res.result.code === 0) return res.result
        return Promise.reject(new Error(res.result?.message || '解析失败'))
      })
    }, store)
    ```
- **测试用例**：
  - 用例 1：引用 `callProcessOcr` 和 `callParseWechatArticle` → 函数存在且为 withAuth 包装
  - 用例 2：未登录状态调用 → 弹出登录弹窗（withAuth 行为）
- **依赖**：无

### Task 4：创建云函数 `processOcr`（对应 Plan 阶段2-步骤2.1）

- **操作类型**：新增
- **涉及文件**：
  - `uniCloud-aliyun/cloudfunctions/processOcr/index.js`（新增）
  - `uniCloud-aliyun/cloudfunctions/processOcr/package.json`（新增）
- **实现内容**：
  - 入参：`{ imageUrls: string[], source: string, openid: string }`
  - 核心逻辑：
    ```javascript
    'use strict'
    exports.main = async (event, context) => {
      const { imageUrls, source = 'depart' } = event
      if (!imageUrls || imageUrls.length === 0) {
        return { code: -1, message: '图片列表为空' }
      }
      const db = uniCloud.database()
      // 1. 创建 learn_ocr_log（status: processing）
      const logRes = await db.collection('learn_ocr_log').add({
        document_id: '',
        image_urls: imageUrls,
        raw_results: [],
        merged_content: '',
        status: 'processing',
        error_msg: '',
        source: source,
        create_time: Date.now(),
        create_by: event.openid || ''
      })
      const logId = logRes.id
      try {
        // 2. 获取临时 URL，并行调 qwen3.6-flash 识别
        const tempUrlRes = await uniCloud.getTempFileURL({ fileList: imageUrls })
        const tempUrls = tempUrlRes.fileList.map(file => file.tempFileURL)
        if (tempUrls.length !== imageUrls.length) {
          throw new Error('获取图片临时链接失败')
        }
        const results = await Promise.all(tempUrls.map(callQwenVL))
        const failedResults = results.filter(result => result.error || !result.content.trim())
        if (failedResults.length > 0) {
          throw new Error(failedResults.length + '/' + results.length + ' 张识别失败')
        }
        // 3. 按图片顺序合并结果
        const rawResults = results.map(result => result.content)
        const mergedContent = rawResults.filter(r => r.trim()).join('\n\n')
        // 4. 更新 log
        await db.collection('learn_ocr_log').doc(logId).update({
          raw_results: rawResults,
          merged_content: mergedContent,
          status: 'done'
        })
        return { code: 0, data: { content: mergedContent, logId } }
      } catch (err) {
        await db.collection('learn_ocr_log').doc(logId).update({
          status: 'failed',
          error_msg: err.message
        })
        return { code: -1, message: '识别失败：' + err.message }
      }
    }
    ```
  - `callQwenVL(imageUrl)` 内部函数：通过阿里云百炼 OpenAI 兼容接口调用 qwen3.6-flash，prompt 指示将图片内容转为 Markdown
  - API Key 只从 `process.env.QWEN_API_KEY` 读取；缺失时整批失败，禁止硬编码或打印 Key
  - `package.json` 依赖：`axios`（调用阿里云百炼 API）
- **测试用例**：
  - 用例 1：传入 1 张测试图片云存储路径 → 返回 `{ code: 0, data: { content: "...", logId: "..." } }`
  - 用例 2：传入 3 张图片 → `raw_results` 有 3 项，`merged_content` 以 `\n\n` 连接
  - 用例 3：传入空数组 → 返回 `{ code: -1, message: "图片列表为空" }`
  - 用例 4：`learn_ocr_log` 中有对应记录，`status` 为 `done`
  - 用例 5：任意图片识别失败或返回空内容 → 返回 `code: -1`，日志 `status` 为 `failed`
  - 用例 6：未配置 `QWEN_API_KEY` → 返回配置错误，日志 `status` 为 `failed`
- **依赖**：Task 1

### Task 5：创建云函数 `parseWechatArticle`（对应 Plan 阶段2-步骤2.2）

- **操作类型**：新增
- **涉及文件**：
  - `uniCloud-aliyun/cloudfunctions/parseWechatArticle/index.js`（新增）
  - `uniCloud-aliyun/cloudfunctions/parseWechatArticle/package.json`（新增）
- **实现内容**：
  - 入参：`{ url: string, openid: string }`
  - 核心逻辑：
    ```javascript
    'use strict'
    const axios = require('axios')
    exports.main = async (event, context) => {
      const { url } = event
      if (!url) return { code: -1, message: '链接为空' }
      try {
        // 1. 调智谱网页阅读 API 获取 Markdown
        const readerRes = await axios.post(
          'https://open.bigmodel.cn/api/paas/v4/reader',
          { url, return_format: 'markdown', retain_images: false },
          { headers: { 'Authorization': `Bearer ${process.env.ZHIPU_API_KEY}` }, timeout: 30000 }
        )
        const rawContent = readerRes.data?.content || readerRes.data?.data?.content || ''
        const rawTitle = readerRes.data?.title || readerRes.data?.data?.title || ''
        if (!rawContent) return { code: -1, message: '文章内容为空' }
        // 2. 调 GLM 文本模型清洗噪声
        const cleaned = await cleanWithGLM(rawContent)
        return { code: 0, data: { title: rawTitle, content: cleaned } }
      } catch (err) {
        return { code: -1, message: '解析失败：' + err.message }
      }
    }
    ```
  - `cleanWithGLM(content)` 内部函数：调 GLM 文本模型，prompt 为"去除文章中的广告、导语、推广等噪声，保留核心正文内容，输出为 Markdown 格式"
  - 清洗失败时降级：直接返回 `rawContent`（跳过清洗）
  - API Key 从 `process.env.ZHIPU_API_KEY` 读取
- **测试用例**：
  - 用例 1：传入微信文章 URL → 返回 `{ code: 0, data: { title: "...", content: "..." } }`，content 为干净 Markdown
  - 用例 2：传入空字符串 → 返回 `{ code: -1, message: "链接为空" }`
  - 用例 3：传入无效 URL → 返回 `{ code: -1, message: "解析失败：..." }`
  - 用例 4：清洗失败时仍能返回原始内容（降级）
- **依赖**：无（与 Task 4 可并行）

### Task 6：改造 `depart/form.vue` — 输入方式选择 + OCR + 链接（对应 Plan 阶段3）

- **操作类型**：修改
- **涉及文件**：
  - `subpackage/depart/form.vue`（修改）
- **实现内容**：
  - **文案修改**：模板中 `点击添加富文本总结` → `添加总结内容`
  - **tap 事件修改**：`@tap="goSummarize"` → `@tap="handleAddSummarize"`
  - **新增方法 `handleAddSummarize()`**：
    ```javascript
    handleAddSummarize() {
      if (this.formData.summarizeId) {
        this.goSummarize()
        return
      }
      uni.showActionSheet({
        itemList: ['手动输入', '拍照识别', '导入链接'],
        success: (res) => {
          if (res.tapIndex === 0) this.goSummarize()
          else if (res.tapIndex === 1) this.handleOcr()
          else if (res.tapIndex === 2) this.handleLinkImport()
        }
      })
    }
    ```
  - **新增方法 `handleOcr()`**：选图 → 上传云存储 → 调 `callProcessOcr` → `store.cachePrefill` → `goSummarize()`
  - **新增方法 `handleLinkImport()`**：弹出输入框 → 校验 `mp.weixin.qq.com` 域名 → 调 `callParseWechatArticle` → `store.cachePrefill` → 回填标题 → `goSummarize()`
  - **import 新增**：`import { callProcessOcr, callParseWechatArticle } from '@/api/ocr.js'`
- **测试用例**：
  - 用例 1：点击"添加总结内容"（无已有总结）→ 弹出 ActionSheet 展示三个选项
  - 用例 2：选择"手动输入"→ 直接进入编辑器，流程与现有一致
  - 用例 3：选择"拍照识别"→ 选图 → 上传 → 识别 → 编辑器预填充内容
  - 用例 4：选择"导入链接"→ 输入非微信域名 → 提示"暂不支持"
  - 用例 5：选择"导入链接"→ 输入微信文章 → 解析成功 → 标题回填 + 编辑器预填充
  - 用例 6：已有总结时点击 → 直接进入编辑器，不弹窗
  - 用例 7：OCR/链接失败 → Toast 提示，停留在 form.vue
- **依赖**：Task 2、Task 3、Task 4、Task 5

### Task 7：改造 `summarize/index.vue` — 内容预填充（对应 Plan 阶段3-步骤3.4）

- **操作类型**：修改
- **涉及文件**：
  - `subpackage/summarize/index.vue`（修改）
- **实现内容**：
  - 在 `onLoad()` 末尾添加预填充逻辑：
    ```javascript
    const prefill = this.$store.state.summarize.prefillContent
    if (prefill) {
      if (this.textareaData && this.textareaData !== '# 标题') {
        this.textareaData = this.textareaData + '\n\n---\n\n' + prefill
      } else {
        this.textareaData = prefill
      }
      this.$store.dispatch('clearPrefill')
    }
    ```
  - 注意：预填充检查在现有 `getSummarize` 加载之后执行，确保编辑已有总结时追加逻辑正确
- **测试用例**：
  - 用例 1：从 form.vue OCR 流程跳转 → 编辑器显示识别内容，非默认 `# 标题`
  - 用例 2：从 form.vue 链接导入跳转 → 编辑器显示文章内容
  - 用例 3：从 form.vue 手动输入跳转 → 编辑器显示默认 `# 标题`（无预填充）
  - 用例 4：编辑已有总结时跳转 → 预填充内容追加到已有内容后面
  - 用例 5：预填充后 Store 中 `prefillContent` 已被清空
- **依赖**：Task 2、Task 6

### Task 8：改造 `depart/form.vue` — 保存后 AI 引导（对应 Plan 阶段4-步骤4.1）

- **操作类型**：修改
- **涉及文件**：
  - `subpackage/depart/form.vue`（修改）
- **实现内容**：
  - 在 `submit()` 的 `addRecord` 成功回调中，替换 `navigateBack` 为 `showModal`：
    ```javascript
    uni.showModal({
      title: '记录保存成功',
      content: '是否使用 AI 辅导学习？',
      confirmText: '立即辅导',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          this.goAiLearn(recordId)
        } else {
          uni.navigateBack({ delta: 1 })
        }
      }
    })
    ```
  - **新增方法 `goAiLearn(recordId)`**：获取总结内容 → 调 `callGenerateLearnNote` → 成功后返回列表
  - **import 新增**：`import { callGenerateLearnNote } from '@/api/aiLearn.js'`、`import { getSummarize } from '@/api/summarize.js'`
  - **更新模式不弹出 AI 引导**：仅在 `type === 'add'` 时弹出
- **测试用例**：
  - 用例 1：新增记录成功 → 弹窗显示"是否使用 AI 辅导学习？"
  - 用例 2：点击"立即辅导"→ 调用 `callGenerateLearnNote`，成功后返回列表
  - 用例 3：点击"稍后再说"→ 直接返回列表
  - 用例 4：AI 提交失败 → Toast 提示"提交失败"，仍返回列表
  - 用例 5：更新记录成功 → 不弹窗，直接返回列表（无回归）
- **依赖**：Task 6

### Task 9：整体联调与回归测试（对应 Plan 阶段4-步骤4.2）

- **操作类型**：验证
- **涉及文件**：无新增/修改
- **实现内容**：
  - 按照 Spec 验收标准逐条验证
  - 执行三个用户故事完整流程
  - 验证边界条件（已有总结不弹窗、域名白名单、内容追加不覆盖、游客 withAuth 拦截）
- **测试用例**：
  - 用例 1（用户故事1）：拍照识别新建记录 → OCR 预填充 → 编辑保存 → 成功
  - 用例 2（用户故事2）：链接导入新建记录 → AI 辅导 → 成功
  - 用例 3（用户故事3）：手动输入新建记录 → 流程与现有完全一致，无回归
  - 用例 4（边界）：已有总结时点击 → 直接进入编辑器
  - 用例 5（边界）：输入非微信链接 → 提示"暂不支持"
  - 用例 6（边界）：OCR 失败 → 提示错误，可重试
  - 用例 7（边界）：游客模式点击添加 → 弹出登录弹窗
- **依赖**：Task 6、Task 7、Task 8

## 变更记录

| 日期 | 作者 | 变更内容 |
|------|------|---------|
| 2026-05-07 | yuanchuang | 初始版本 |
| 2026-08-02 | Codex | OCR 实现说明更新为 qwen3.6-flash、环境变量凭证和整批失败语义 |
