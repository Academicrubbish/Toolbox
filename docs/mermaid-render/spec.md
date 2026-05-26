---
title: Mermaid 图表云函数渲染
parent:
status: draft
created: 2026-05-25
updated: 2026-05-25
author: yuanchuang
---

## 背景

当前项目的 Markdown 渲染引擎 towxml 不支持 Mermaid 图表语法。用户在笔记中写入 ```mermaid 代码块（如 `graph LR` 流程图、时序图、甘特图等），渲染时只会显示为纯文本代码块，无法生成可视化图表。

项目中已有成熟的 LaTeX 公式云函数渲染方案（`renderLatex`），链路为：markdown-it 插件解析 `$...$` → 原生 `<latex>` 组件 → 云函数渲染 SVG → base64 `<image>` 展示。Mermaid 图表可以完全复用这套模式，仅需新增对应的插件、组件和云函数。

## 目标

复用现有 LaTeX 云函数渲染架构，为 towxml 新增 Mermaid 图表渲染能力。用户在 Markdown 笔记中写入 ```mermaid 代码块后，小程序端自动调用云函数将 Mermaid 语法渲染为 SVG 图片展示，支持 flowchart（LR/TD）、sequence diagram、class diagram、gantt chart 等常见图表类型。

## 架构设计

完全复用 LaTeX 渲染链路，对应关系：

```
LaTeX 已有链路                          Mermaid 新增链路
─────────────────                       ─────────────────
markdown-it 插件 latex.js          →    markdown-it 插件 mermaid.js
解析 $...$ 生成 <latex> 标签       →    解析 ```mermaid 生成 <mermaid> 标签
原生组件 latex/latex.js            →    原生组件 mermaid/mermaid.js
attached 时调 renderLatex 云函数   →    attached 时调 renderMermaid 云函数
mathjax-node 渲染 SVG → base64     →    mermaid 渲染 SVG → base64
<image src="data:image/svg+xml">   →    <image src="data:image/svg+xml">
```

## 功能点

### F1. 云函数 renderMermaid

**输入：** `{ code: string, theme: 'light' | 'dark' }`

- 接收 Mermaid 代码字符串
- 使用 `mermaid` npm 包（`@mermaid-js/mermaid`）服务端渲染为 SVG
- 暗色主题时替换 SVG 中的文字/线条颜色为白色
- SVG 转 base64，返回 `data:image/svg+xml;base64,{base64}` data URI
- 超时保护 30 秒
- 错误时返回 code 500 + 错误信息，不崩溃

**输出：** `{ code: 0, message: 'success', data: 'data:image/svg+xml;base64,...' }`

**文件：** `uniCloud-aliyun/cloudfunctions/renderMermaid/index.js` + `package.json`

**依赖：** `@mermaid-js/mermaid`

### F2. markdown-it 插件（mermaid.js）

- 注册为 markdown-it 插件，在 `wxcomponents/towxml/parse/markdown/plugins/mermaid.js`
- 解析 fenced code block，当 language 为 `mermaid` 时，生成自定义标签
- 输出格式：`<mermaid value="{url-encoded-code}" type="block"></mermaid>`
- 在 `wxcomponents/towxml/parse/markdown/index.js` 中注册插件（参照 latex 注册方式）

### F3. 原生组件 mermaid

**文件：** `wxcomponents/towxml/mermaid/mermaid.js` + `.wxml` + `.json` + `.wxss`

- 完全复用 `latex/latex.js` 的组件结构
- `attached` 生命周期：解码 `value` 属性 → 调用 `renderMermaid` 云函数 → 设置 image src
- `<image>` 标签展示 base64 SVG
- `load` 事件中按比例计算显示尺寸（参照 latex 组件的 scale 逻辑）
- 支持暗色主题（读取 `global._theme`）

**mermaid.wxml：**
```xml
<image class="{{attrs.class}}" lazy-load="true" src="{{attrs.src}}"
       style="width:{{size.w}}px; height:{{size.h}}px;" bindload="load">
</image>
```

### F4. 组件注册与路由

- `decode.wxml`：新增 `<block wx:if="{{item.tag==='mermaid'}}"><mermaid .../></block>` 路由
- `decode.json`：注册 `"mermaid": "/wxcomponents/towxml/mermaid/mermaid"` 组件
- `markdown/index.js`：`md.use(require('./plugins/mermaid'))` 注册插件

## 文件清单

| 操作 | 文件路径 | 说明 |
|------|---------|------|
| 新增 | `uniCloud-aliyun/cloudfunctions/renderMermaid/index.js` | 云函数主逻辑 |
| 新增 | `uniCloud-aliyun/cloudfunctions/renderMermaid/package.json` | 依赖声明 |
| 新增 | `uniCloud-aliyun/cloudfunctions/renderMermaid/renderMermaid.param.json` | 测试参数 |
| 新增 | `wxcomponents/towxml/parse/markdown/plugins/mermaid.js` | markdown-it 插件 |
| 新增 | `wxcomponents/towxml/mermaid/mermaid.js` | 原生组件逻辑 |
| 新增 | `wxcomponents/towxml/mermaid/mermaid.wxml` | 原生组件模板 |
| 新增 | `wxcomponents/towxml/mermaid/mermaid.json` | 原生组件声明 |
| 新增 | `wxcomponents/towxml/mermaid/mermaid.wxss` | 原生组件样式 |
| 修改 | `wxcomponents/towxml/decode.wxml` | 新增 mermaid 标签路由 |
| 修改 | `wxcomponents/towxml/decode.json` | 注册 mermaid 组件 |
| 修改 | `wxcomponents/towxml/parse/markdown/index.js` | 注册 mermaid 插件 |

## 约束与风险

- **云函数冷启动**：首次调用约 1-2s（mermaid 包较大 ~2MB），后续调用 <500ms。可参考 LaTeX 的使用体验，用户已接受此延迟
- **mermaid 版本**：使用 `@mermaid-js/mermaid` 最新稳定版，需确认 Node.js 环境兼容性（阿里云云函数默认 Node.js 18）
- **SVG 尺寸计算**：Mermaid 生成的 SVG 尺寸不固定，load 回调中需动态计算，参照 latex 组件的 scale 逻辑
- **渲染失败降级**：云函数调用失败时，显示原始 mermaid 代码文本（不阻塞页面）

## 验收标准

1. 笔记中写入 ` ```mermaid\ngraph LR\nA-->B-->C ` 后，小程序端渲染为流程图图片
2. 支持暗色主题，文字/线条颜色自动切换为白色
3. 渲染失败时降级显示代码文本，不阻塞页面
4. 云函数超时或异常时返回 code 500，不崩溃
5. 不影响现有 LaTeX 公式渲染功能

## 变更记录

| 日期 | 作者 | 变更 |
|------|------|------|
| 2026-05-25 | yuanchuang | 初稿 |
