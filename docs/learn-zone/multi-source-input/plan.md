---
title: 文档新增多来源输入 — 实施计划
design: ./design.md
status: draft
created: 2026-05-07
updated: 2026-05-07
author: yuanchuang
---

# 文档新增多来源输入 Plan

## 需求简述

在现有文档新增流程的"添加总结内容"环节，新增 OCR 拍照识别和微信公众号链接导入两种输入方式。识别/解析结果预填充到编辑器，用户编辑后保存。记录提交成功后新增 AI 辅导引导入口。涉及前端交互改造、Store 扩展、两个新云函数、一个新数据库集合。

## 前置条件

- uniCloud 阿里云环境可用，云函数部署权限正常
- 智谱 API Key 已配置在云函数环境变量中（GLM-4.6V-Flash 视觉模型 + 网页阅读 API）
- 现有 `depart/form.vue`、`summarize/index.vue`、`store/modules/summarize.js` 代码已理解
- 微信小程序 `wx.chooseMedia` API 可用

## 实施阶段

### 阶段 1：基础设施（数据库 + Store 扩展）

**目标**：建立数据层和状态传递机制，为后续云函数和前端改造提供基础

**为什么先做这个**：云函数需要 `learn_ocr_log` 集合，前端需要 Store 传递预填充内容，所有后续阶段都依赖这一层

- 步骤 1.1：在 uniCloud 控制台创建 `learn_ocr_log` 集合，字段按 Design 数据结构定义（`document_id`、`image_urls`、`raw_results`、`merged_content`、`status`、`error_msg`、`source`、`create_time`、`create_by`）
- 步骤 1.2：扩展 `store/modules/summarize.js`，新增 state 字段（`prefillContent`、`prefillSource`、`prefillTitle`、`ocrLogId`）和 actions（`cachePrefill`、`clearPrefill`）
- 步骤 1.3：创建 `api/ocr.js`，封装 `callProcessOcr`（withAuth 包装）和 `callParseWechatArticle`（withAuth 包装）两个云函数调用

**验证点**：
- `learn_ocr_log` 集合在 uniCloud 控制台可见，字段结构正确
- Store 调用 `cachePrefill` 后 state 正确存储，`clearPrefill` 后清空
- `api/ocr.js` 导出函数可正常引用，云函数调用格式正确

### 阶段 2：云函数（processOcr + parseWechatArticle）

**目标**：实现 OCR 识别和链接解析两个核心云函数

**为什么先做这个**：依赖阶段 1 的 `learn_ocr_log` 集合，前端改造需要调用这两个云函数

- 步骤 2.1：创建云函数 `processOcr`
  - 接收 `imageUrls`（云存储路径）、`source`、`openid`
  - 逐张下载图片 → 调 GLM-4.6V-Flash 视觉模型识别为 Markdown
  - 合并结果，写入 `learn_ocr_log`
  - 返回 `{ content, logId }`
- 步骤 2.2：创建云函数 `parseWechatArticle`
  - 接收 `url`、`openid`
  - 调智谱网页阅读 API（`POST /paas/v4/reader`，`return_format: "markdown"`）获取文章
  - 调 GLM 文本模型清洗噪声（广告、导语等）
  - 返回 `{ title, content }`

**验证点**：
- `processOcr`：传入测试图片云存储路径，返回 Markdown 内容，`learn_ocr_log` 中有记录
- `parseWechatArticle`：传入微信文章 URL，返回 `{ title, content }`，content 为干净 Markdown
- 两个云函数错误场景返回 `{ code: -1, message: "..." }`

### 阶段 3：前端交互改造（form.vue + summarize 预填充）

**目标**：改造 form.vue 支持输入方式选择，summarize 支持内容预填充

**为什么先做这个**：依赖阶段 1 的 Store 扩展和阶段 2 的云函数，是用户可直接感知的交互改造

- 步骤 3.1：改造 `depart/form.vue` — 输入方式选择
  - "点击添加富文本总结"文案改为"添加总结内容"
  - 点击后弹出 ActionSheet 展示三种输入方式（手动输入 / 拍照识别 / 导入链接）
  - 已有总结时直接进入编辑器（不弹窗）
- 步骤 3.2：改造 `depart/form.vue` — OCR 识别流程
  - 选择"拍照识别"→ `wx.chooseMedia`（count: 9）→ 上传云存储 → 调 `processOcr`
  - 展示进度提示（"正在识别第 x/n 张..."）
  - 成功后 `store.cachePrefill` → 跳转 `summarize/index.vue`
  - 失败时 Toast 提示，停留在 form.vue
- 步骤 3.3：改造 `depart/form.vue` — 链接导入流程
  - 选择"导入链接"→ 弹出输入框 → 校验 `mp.weixin.qq.com` 域名
  - 调 `parseWechatArticle` → `store.cachePrefill`（含 title）
  - 跳转 `summarize/index.vue`，标题回填 form.vue
- 步骤 3.4：改造 `summarize/index.vue` — 内容预填充
  - onLoad 时检查 `store.state.summarize.prefillContent`
  - 有内容则填入 `textareaData`（追加而非覆盖）
  - 填充后调用 `store.clearPrefill()`
  - 无内容时行为不变（手动输入）

**验证点**：
- 手动输入流程与现有完全一致，无回归
- OCR 选图 → 上传 → 识别 → 编辑器预填充，内容可编辑
- 链接导入 → 域名校验 → 解析 → 标题回填 + 编辑器预填充
- 识别/解析失败时正确提示，不崩溃

### 阶段 4：AI 辅导引导 + 收尾

**目标**：在记录保存成功后引导用户使用 AI 辅导

**为什么先做这个**：依赖阶段 3 的表单提交流程，功能独立且简单

- 步骤 4.1：改造 `depart/form.vue` — 保存后 AI 引导
  - `addRecord` 成功后弹出模态窗："记录保存成功！是否使用 AI 辅导学习？"
  - "立即辅导"→ 调用 `callGenerateLearnNote`（复用现有 AI 流程）
  - "稍后再说"→ `uni.navigateBack()` 返回列表
- 步骤 4.2：整体联调与回归测试
  - 验证三个用户故事（OCR 新增 / 链接导入+AI / 手动输入）
  - 验证所有边界条件（spec 验收标准逐条过）
  - 验证游客模式下 `withAuth` 拦截正常

**验证点**：
- 保存成功后弹窗正确显示
- "立即辅导"正确跳转 AI 流程
- "稍后再说"正常返回列表
- 手动输入流程无回归

## 并行策略

- 阶段 2 的步骤 2.1（processOcr）和步骤 2.2（parseWechatArticle）无互相依赖，可并行开发
- 阶段 3 的步骤 3.2（OCR 流程）和步骤 3.3（链接流程）依赖各自的云函数，可分别独立开发

## 风险与应对

| 风险 | 影响阶段 | 应对方案 |
|------|---------|---------|
| GLM-4.6V-Flash OCR 识别准确率不足 | 阶段 2 | 预填充到编辑器后用户可手动修正（Human-in-the-loop），不追求 100% 准确 |
| 智谱网页阅读 API 不稳定或微信反爬 | 阶段 2 | 错误处理中返回明确提示，用户可重试或切换手动输入 |
| wx.chooseMedia 在低版本微信不支持 | 阶段 3 | 使用 `wx.chooseImage` 作为降级方案 |
| 云函数 120s 超时（多张图片 OCR） | 阶段 2 | 限制单次最多 9 张，GLM-4.6V-Flash 响应快，单张约 3-5s，9 张内可完成 |
| Store 预填充内容在页面刷新后丢失 | 阶段 3 | Vuex state 不持久化是预期行为，刷新后回退到手动输入即可 |

## 变更记录

| 日期 | 作者 | 变更内容 |
|------|------|---------|
| 2026-05-07 | yuanchuang | 初始版本 |
