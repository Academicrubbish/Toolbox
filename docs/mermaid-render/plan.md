---
title: Mermaid 图表云函数渲染 — 实施计划
design: ./design.md
status: draft
created: 2026-05-25
updated: 2026-05-25
author: yuanchuang
---

## 需求简述

复用现有 LaTeX 云函数渲染架构，为 towxml 新增 Mermaid 图表渲染能力。用户在 Markdown 笔记中写入 ` ```mermaid ` 代码块后，小程序端自动调用云函数渲染为 SVG 图片展示，支持 flowchart、sequence diagram、class diagram、gantt chart 等图表类型。

## 前置条件

- uniCloud 阿里云环境已配置（现有云函数已正常运行）
- 微信开发者工具已连接项目
- `@mermaid-js/mermaid` npm 包兼容阿里云 Node.js 18 环境

## 实施阶段

### 阶段1：云函数 + API 层

**目标：** 搭建 Mermaid 渲染后端，可通过测试参数验证云函数功能。

**排序理由：** 云函数是整条链路的基础，无前端依赖，可独立部署验证。

| 步骤 | 内容 | 验证点 |
|------|------|--------|
| 1.1 | 创建 `renderMermaid` 云函数（index.js + package.json + param.json） | 本地测试参数返回 code 0 |
| 1.2 | 在 `api/render.js` 新增 `renderMermaid` 函数 | 导出函数可被 import |

### 阶段2：towxml 渲染管道

**目标：** Markdown 中的 mermaid 代码块能在小程序端渲染为图片。

**排序理由：** 依赖云函数已部署（阶段1），是核心渲染链路。

| 步骤 | 内容 | 验证点 |
|------|------|--------|
| 2.1 | 创建 markdown-it 插件 `plugins/mermaid.js` | fence 拦截逻辑正确 |
| 2.2 | 创建 mermaid 原生组件（4 个文件） | 组件结构与 latex 一致 |
| 2.3 | 修改 `decode.wxml` + `decode.json` 注册组件 | 路由和注册无语法错误 |
| 2.4 | 修改 `markdown/index.js` 注册插件 | `md.use(require('./plugins/mermaid'))` |
| 2.5 | 端到端验证：笔记中写入 mermaid 代码块，预览渲染为图片 | 流程图/时序图均正常显示 |

### 阶段3：编辑器集成

**目标：** 编辑器工具栏可快速插入 mermaid 示例，预览延迟正确处理。

**排序理由：** 依赖渲染管道已就绪（阶段2），是用户体验增强。

| 步骤 | 内容 | 验证点 |
|------|------|--------|
| 3.1 | `toolbar-actions.js` 新增 mermaid 操作（4 种模板） | 点击插入对应模板文本 |
| 3.2 | `index.vue` 更多面板新增「流程图」按钮 | 按钮可见可点击 |
| 3.3 | `index.vue` 更新延迟检测条件，加入 mermaid | 包含 mermaid 时走 3 秒延迟 |

## 风险与应对

| 风险 | 影响阶段 | 应对 |
|------|---------|------|
| mermaid 服务端渲染需要 jsdom | 阶段1 | package.json 中增加 jsdom 依赖 |
| mermaid SVG 尺寸不固定 | 阶段2 | load 回调中等比缩放，maxWidth 限制 |
| iconfont 中无 mermaid 图标 | 阶段3 | 复用 cuIcon-creativefill 或 icon-flow |

## 变更记录

| 日期 | 作者 | 变更 |
|------|------|------|
| 2026-05-25 | yuanchuang | 初稿 |
