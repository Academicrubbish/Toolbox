---
title: 文章分享功能 — 实施计划
design: ./design.md
status: done
created: 2026-04-16
updated: 2026-05-04
author: yuanchuang
---

## 需求简述

用户在小程序详情页点击"分享"按钮，选择有效期后生成一个可公开访问的 H5 网页链接。他人在浏览器中打开即可阅读 Markdown 笔记内容（含代码高亮、LaTeX 公式、流程图）。基于现有 uniCloud 阿里云基础设施，不额外租服务器。

## 阶段1：基础设施（数据库 + 云函数）

### 步骤1.1：创建 `share_links` 数据库集合

- 在 uniCloud 控制台新建集合 `share_links`
- 字段：`record_id`（string）、`share_type`（string）、`log_id`（string）、`expire_time`（number）、`create_time`（number）、`create_by`（string）
- 创建索引：`record_id`、`expire_time`
- **已完成**

### 步骤1.2：创建云函数 `generateShareLink`

- 路径：`uniCloud-aliyun/cloudfunctions/generateShareLink/`
- 核心逻辑：
  1. 接收 `recordId`、`expireType`、`shareType`、`logId`、`openid` 参数
  2. 根据 `shareType` 校验权限（record 查 daily_record，ai_learn 查 ai_learn_logs → daily_record）
  3. 查询是否已有未过期链接（复用策略），有则直接返回
  4. 根据 `expireType` 计算 `expire_time`
  5. 写入 `share_links` 集合，返回 shareUrl
- openid 从客户端 Vuex store 传入（非 UNICLOUD_INFO）
- **已完成**

### 步骤1.3：创建云函数 `getShareArticle`

- 路径：`uniCloud-aliyun/cloudfunctions/getShareArticle/`
- 核心逻辑：
  1. 处理 OPTIONS 预检请求（返回 CORS 头）
  2. 从 URL 参数获取 `sid`
  3. 查询 `share_links`，校验存在且未过期
  4. 根据 `share_type` 分支：
     - `record`：查 daily_record + summarize 获取内容
     - `ai_learn`：查 ai_learn_logs 获取 ai_result，查 daily_record 获取标题
  5. 查询 `tb_user` 获取作者昵称
  6. 使用阿里云集成响应格式返回（mpserverlessComposedResponse）
- **已完成**

## 阶段2：H5 阅读页

### 步骤2.1：编写 `share.html`

- 独立 HTML 文件，通过 CDN 引入渲染库：
  - marked.js v12.0.2（Markdown 解析）
  - highlight.js v11.11.1（代码高亮）
  - KaTeX v0.16.11（LaTeX 公式）
  - Mermaid v10.9.3（流程图/时序图）
- 自定义 marked renderer 处理 mermaid 代码块
- KaTeX 渲染块级（`$$...$$`）和行内（`$...$`）公式
- Mermaid 渲染前确保容器可见（避免布局计算失败）
- 三种页面状态：loading → content / error
- **已完成**

### 步骤2.2：部署配置

- `share.html` 部署到前端网页托管（域名 `doc.coptis.top`）
- `getShareArticle` 云函数开启 URL 化（域名 `api.coptis.top`）
- 云函数 `generateShareLink` 中 `HOSTING_DOMAIN = 'http://doc.coptis.top'`
- H5 页面 API 地址 `GET_ARTICLE_URL = 'http://api.coptis.top/getShareArticle'`
- **已完成**

## 阶段3：小程序端 UI

### 步骤3.1：新建 `api/share.js`

- 封装 `callGenerateShareLink` 方法，使用 `withAuth` 包装
- 传入参数：recordId、expireType、shareType、logId、openid
- **已完成**

### 步骤3.2：详情页添加分享按钮

- `subpackage/depart/detail.vue`：普通记录分享
- `subpackage/depart/learn-result-detail.vue`：AI 辅导结果分享
- 两处均使用底部弹窗选择有效期（默认 1 天）
- 点击生成后复制链接到剪贴板
- **已完成**

## 实现过程中解决的问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| "未登录" | 云函数使用 UNICLOUD_INFO.OPENID 不稳定 | 改为客户端 Vuex store 传入 openid |
| context.setHeader is not a function | 阿里云 URL 化不支持 context.setHeader | 使用集成响应格式（mpserverlessComposedResponse） |
| share.html 加载失败 | HTTPS 页面请求 HTTP 接口（混合内容限制） | API 地址改用 HTTP，或部署 HTTPS |
| highlight.js 404 | CDN URL 版本号不完整 | 使用完整版本号 `@11.11.1`，路径 `gh/highlightjs/cdn-release` |
| Mermaid 布局计算失败 | 容器 display:none 时无法计算尺寸 | 先 showState('content') 再 mermaid.run() |
| Vue 模板报错 "does not have a method" | 使用 `<div>` 而非 `<view>` | 小程序模板使用 `<view>` |
| AI 辅导分享权限校验失败 | ai_learn_logs.create_by 与 openid 不一致 | 通过父记录 daily_record.createBy 校验权限 |
| 日期显示 ISO 格式 | 使用 new Date().toISOString() | 添加 formatDate() 输出 'YYYY-MM-DD HH:mm' |

## 变更记录

| 日期 | 作者 | 变更说明 |
|------|------|---------|
| 2026-04-16 | yuanchuang | 初始版本 |
| 2026-05-04 | yuanchuang | 更新为实际实现状态，新增 AI 辅导分享、链接复用、CDN 渲染、问题记录，标记完成 |
