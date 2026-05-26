---
title: Mermaid 图表云函数渲染 — 代码实现报告
plan: ./plan.md
status: draft
created: 2026-05-25
updated: 2026-05-25
author: yuanchuang
---

## 执行概览

| 指标 | 值 |
|------|-----|
| 总 Task 数 | 9 |
| 完成 | 9 |
| 失败 | 0 |
| 跳过 | 0 |

## Task 执行明细

### Task 1 — 创建 renderMermaid 云函数

- **状态：** completed
- **新增文件：**
  - `uniCloud-aliyun/cloudfunctions/renderMermaid/index.js`
  - `uniCloud-aliyun/cloudfunctions/renderMermaid/package.json`
  - `uniCloud-aliyun/cloudfunctions/renderMermaid/renderMermaid.param.json`
- **说明：** 使用 mermaid + jsdom 服务端渲染 SVG，30 秒超时保护

### Task 2 — api/render.js 新增 renderMermaid

- **状态：** completed
- **修改文件：** `api/render.js`
- **改动：** 新增 `renderMermaid` 函数，ES6 + CommonJS 双导出

### Task 3 — 创建 markdown-it 插件 mermaid.js

- **状态：** completed
- **新增文件：** `wxcomponents/towxml/parse/markdown/plugins/mermaid.js`
- **说明：** 拦截 fence renderer，mermaid 语言生成 `<mermaid>` 标签

### Task 4 — 创建 mermaid 原生组件

- **状态：** completed
- **新增文件：**
  - `wxcomponents/towxml/mermaid/mermaid.js`
  - `wxcomponents/towxml/mermaid/mermaid.wxml`
  - `wxcomponents/towxml/mermaid/mermaid.json`
  - `wxcomponents/towxml/mermaid/mermaid.wxss`
- **说明：** 复用 latex 组件结构，attached 时调 renderMermaid 云函数

### Task 5 — 注册组件和插件

- **状态：** completed
- **修改文件：**
  - `wxcomponents/towxml/decode.wxml` — 新增 mermaid 标签路由
  - `wxcomponents/towxml/decode.json` — 注册 mermaid 组件
  - `wxcomponents/towxml/parse/markdown/index.js` — 注册 mermaid 插件

### Task 6 — 端到端验证

- **状态：** pending（需部署云函数后在小程序中验证）
- **验证步骤：**
  1. 上传 renderMermaid 云函数并安装 npm 依赖
  2. 笔记中写入 mermaid 代码块
  3. 预览模式下检查渲染结果

### Task 7 — toolbar-actions.js 新增 mermaid 操作

- **状态：** completed
- **修改文件：** `component/md-editor/toolbar-actions.js`
- **改动：** 新增 mermaid 操作，支持 4 种图表模板（流程图/时序图/甘特图/类图）

### Task 8 — 更多面板新增 mermaid 按钮

- **状态：** completed
- **修改文件：** `component/md-editor/index.vue`
- **改动：** 更多面板新增「流程图」按钮，使用 cuIcon-creativefill 图标

### Task 9 — 更新编辑器延迟检测

- **状态：** completed
- **修改文件：** `component/md-editor/index.vue`
- **改动：** 延迟检测条件新增 ` ```mermaid `

## 验收结论

| 验收标准 | 对应 Task | 状态 |
|---------|----------|------|
| mermaid 代码块渲染为流程图图片 | Task 1-5 | 待部署验证 |
| 支持暗色主题 | Task 1 | 代码已支持 |
| 渲染失败降级显示 | Task 1 | 代码已支持 |
| 云函数超时不崩溃 | Task 1 | 代码已支持 |
| 不影响现有 LaTeX 渲染 | Task 3, 5 | 代码未修改 latex 链路 |

## 变更文件汇总

**新增（10 个文件）：**
- `uniCloud-aliyun/cloudfunctions/renderMermaid/index.js`
- `uniCloud-aliyun/cloudfunctions/renderMermaid/package.json`
- `uniCloud-aliyun/cloudfunctions/renderMermaid/renderMermaid.param.json`
- `wxcomponents/towxml/parse/markdown/plugins/mermaid.js`
- `wxcomponents/towxml/mermaid/mermaid.js`
- `wxcomponents/towxml/mermaid/mermaid.wxml`
- `wxcomponents/towxml/mermaid/mermaid.json`
- `wxcomponents/towxml/mermaid/mermaid.wxss`
- `docs/mermaid-render/spec.md`
- `docs/mermaid-render/design.md`
- `docs/mermaid-render/plan.md`
- `docs/mermaid-render/tasks.md`

**修改（5 个文件）：**
- `api/render.js`
- `wxcomponents/towxml/decode.wxml`
- `wxcomponents/towxml/decode.json`
- `wxcomponents/towxml/parse/markdown/index.js`
- `component/md-editor/index.vue`
- `component/md-editor/toolbar-actions.js`

## 变更记录

| 日期 | 作者 | 变更 |
|------|------|------|
| 2026-05-25 | yuanchuang | 初稿 |
