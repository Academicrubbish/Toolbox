---
title: Mermaid 图表云函数渲染 — 任务清单
plan: ./plan.md
status: draft
created: 2026-05-25
updated: 2026-05-25
author: yuanchuang
---

## 任务清单

### Task 1 — 创建 renderMermaid 云函数（阶段1-步骤1.1）

**操作：** 新增

**涉及文件：**
- `uniCloud-aliyun/cloudfunctions/renderMermaid/index.js`（新增）
- `uniCloud-aliyun/cloudfunctions/renderMermaid/package.json`（新增）
- `uniCloud-aliyun/cloudfunctions/renderMermaid/renderMermaid.param.json`（新增）

**实现内容：**

```javascript
// index.js
'use strict'
const { JSDOM } = require('jsdom')
const mermaid = require('mermaid')

exports.main = async (event, context) => {
  const { code, theme = 'light' } = event
  if (!code || typeof code !== 'string') {
    return { code: 400, message: 'code 参数不能为空', data: null }
  }
  const result = await Promise.race([
    renderMermaidSvg(code, theme),
    new Promise((_, reject) => setTimeout(() => reject(new Error('渲染超时')), 30000))
  ])
  return result
}

async function renderMermaidSvg(code, theme) {
  try {
    const dom = new JSDOM('<!DOCTYPE html><body><div id="mermaid"></div></body>')
    global.window = dom.window
    global.document = dom.window.document
    global.navigator = dom.window.navigator
    mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'default' })
    const { svg } = await mermaid.render('mermaid-svg', code)
    const base64 = Buffer.from(svg).toString('base64')
    return { code: 0, message: 'success', data: `data:image/svg+xml;base64,${base64}` }
  } catch (err) {
    return { code: 500, message: `Mermaid 渲染失败: ${err.message}`, data: null }
  }
}
```

```json
// package.json
{ "name": "renderMermaid", "version": "1.0.0", "main": "index.js",
  "dependencies": { "mermaid": "^10.9.3", "jsdom": "^24.0.0" } }
```

```json
// renderMermaid.param.json
{ "code": "graph LR\nA[开始] --> B[结束]", "theme": "light" }
```

**测试用例：**
- 场景：测试参数 `{code: "graph LR\nA-->B", theme: "light"}`
- 期望：返回 `code: 0`，`data` 以 `data:image/svg+xml;base64,` 开头

**依赖：** 无

---

### Task 2 — api/render.js 新增 renderMermaid（阶段1-步骤1.2）

**操作：** 修改

**涉及文件：**
- `api/render.js`（修改）

**实现内容：**

新增函数：
```javascript
function renderMermaid(code, theme = 'light') {
  return new Promise((resolve, reject) => {
    if (typeof uniCloud === 'undefined') {
      reject(new Error('uniCloud 未定义'))
      return
    }
    uniCloud.callFunction({
      name: 'renderMermaid',
      data: { code, theme }
    }).then(res => {
      if (res.result && res.result.code === 0) resolve(res.result.data)
      else reject(new Error(res.result?.message || 'Mermaid 渲染失败'))
    }).catch(err => {
      console.error('调用 Mermaid 云函数失败：', err)
      reject(err)
    })
  })
}
```

ES6 export 新增：`export { renderLatex, renderYuml, renderEcharts, renderMermaid }`
CommonJS export 新增：`renderMermaid: renderMermaid`

**测试用例：**
- 场景：Vue 组件中 `import { renderMermaid } from '@/api/render'` 后调用
- 期望：返回 base64 data URI 字符串

**依赖：** Task 1

---

### Task 3 — 创建 markdown-it 插件 mermaid.js（阶段2-步骤2.1）

**操作：** 新增

**涉及文件：**
- `wxcomponents/towxml/parse/markdown/plugins/mermaid.js`（新增）

**实现内容：**

```javascript
module.exports = md => {
  const defaultFence = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options)
  }
  md.renderer.rules.fence = function(tokens, idx, options, env, self) {
    const token = tokens[idx]
    if (token.info.trim() === 'mermaid') {
      const encodedCode = encodeURIComponent(token.content).replace(/'/g, '%27')
      return '<mermaid value="' + encodedCode + '" type="block"></mermaid>'
    }
    return defaultFence(tokens, idx, options, env, self)
  }
}
```

**测试用例：**
- 场景：输入 ` ```mermaid\ngraph LR\nA-->B\n``` `
- 期望：输出包含 `<mermaid value="..." type="block">` 标签

**依赖：** 无

---

### Task 4 — 创建 mermaid 原生组件（阶段2-步骤2.2）

**操作：** 新增

**涉及文件：**
- `wxcomponents/towxml/mermaid/mermaid.js`（新增）
- `wxcomponents/towxml/mermaid/mermaid.wxml`（新增）
- `wxcomponents/towxml/mermaid/mermaid.json`（新增）
- `wxcomponents/towxml/mermaid/mermaid.wxss`（新增，空文件）

**实现内容：**

mermaid.js — 参照 `latex/latex.js` 结构：
- `attached` 生命周期：解码 value → 获取 uniCloud（三种策略）→ 调用 renderMermaid 云函数 → setData image src
- `load` 方法：等比缩放，maxWidth 690，scale 1.5

mermaid.wxml：
```xml
<image class="{{attrs.class}}" lazy-load="true" src="{{attrs.src}}"
       style="width:{{size.w}}px; height:{{size.h}}px;" bindload="load">
</image>
```

mermaid.json：`{ "component": true, "usingComponents": {} }`

**测试用例：**
- 场景：组件 attached 后检查 setData 是否被调用
- 期望：attrs.src 被设置为 base64 data URI

**依赖：** Task 1（云函数需已部署）

---

### Task 5 — 注册组件和插件（阶段2-步骤2.3 + 2.4）

**操作：** 修改

**涉及文件：**
- `wxcomponents/towxml/decode.wxml`（修改）
- `wxcomponents/towxml/decode.json`（修改）
- `wxcomponents/towxml/parse/markdown/index.js`（修改）

**实现内容：**

decode.wxml — 在 echarts 路由块后新增：
```xml
<block wx:if="{{item.tag==='mermaid'}}"><mermaid data="{{item}}" data-data="{{item}}" catch:tap="_tap"/></block>
```

decode.json — usingComponents 新增：
```json
"mermaid": "/wxcomponents/towxml/mermaid/mermaid"
```

markdown/index.js 第 56 行末尾追加：
```javascript
md.use(require('./plugins/mermaid'));
```

**测试用例：**
- 场景：小程序编译无报错
- 期望：decode 组件正常加载，无组件注册错误

**依赖：** Task 3, Task 4

---

### Task 6 — 端到端验证（阶段2-步骤2.5）

**操作：** 验证

**涉及文件：** 无新增修改

**验证内容：**
1. 在学习记录的总结内容中写入 mermaid 代码块
2. 预览模式下检查流程图是否渲染为图片
3. 测试时序图、甘特图等不同类型
4. 检查暗色主题下文字颜色

**测试用例：**
- 场景：笔记内容包含 ` ```mermaid\ngraph LR\nA-->B-->C\n``` `
- 期望：预览时显示为流程图图片，非代码文本

**依赖：** Task 2, Task 5

---

### Task 7 — toolbar-actions.js 新增 mermaid 操作（阶段3-步骤3.1）

**操作：** 修改

**涉及文件：**
- `component/md-editor/toolbar-actions.js`（修改）

**实现内容：**

在 `toolbarActions` 对象中新增：
```javascript
mermaid(ctx, appendText) {
  uni.showActionSheet({
    itemList: ['流程图', '时序图', '甘特图', '类图'],
    success: (res) => {
      const templates = [
        '\n```mermaid\ngraph LR\n    A[开始] --> B{条件判断}\n    B -->|是| C[执行操作]\n    B -->|否| D[结束]\n    C --> D\n```\n',
        '\n```mermaid\nsequenceDiagram\n    participant A as 用户\n    participant B as 系统\n    A->>B: 发起请求\n    B-->>A: 返回结果\n```\n',
        '\n```mermaid\ngantt\n    title 项目计划\n    dateFormat YYYY-MM-DD\n    section 阶段一\n    任务A :a1, 2024-01-01, 7d\n    任务B :after a1, 5d\n```\n',
        '\n```mermaid\nclassDiagram\n    class Animal {\n        +String name\n        +makeSound()\n    }\n    class Dog {\n        +fetch()\n    }\n    Animal <|-- Dog\n```\n',
      ];
      appendText(templates[res.tapIndex]);
    },
  });
},
```

**测试用例：**
- 场景：点击「流程图」选项
- 期望：编辑器中插入包含 ` ```mermaid ` 的流程图模板文本

**依赖：** 无

---

### Task 8 — 更多面板新增 mermaid 按钮（阶段3-步骤3.2）

**操作：** 修改

**涉及文件：**
- `component/md-editor/index.vue`（修改，template 部分）

**实现内容：**

在 echarts 按钮（第 54 行）后新增：
```xml
<view class="more-item" @click="onMoreAction('mermaid')">
  <view class="iconfont icon-diagram more-icon" />
  <text class="more-label">流程图</text>
</view>
```

> 注：若 iconfont 中无 `icon-diagram`，复用 `cuIcon-creativefill`。

**测试用例：**
- 场景：打开更多面板
- 期望：「流程图」按钮可见，点击后触发 mermaid action

**依赖：** Task 7

---

### Task 9 — 更新编辑器延迟检测（阶段3-步骤3.3）

**操作：** 修改

**涉及文件：**
- `component/md-editor/index.vue`（修改，script 部分）

**实现内容：**

修改第 126-128 行的检测条件：
```javascript
const hasLatexOrYumlOrEcharts = this.textareaData.includes('$') ||
                                this.textareaData.includes('```yuml') ||
                                this.textareaData.includes('```echarts') ||
                                this.textareaData.includes('```mermaid');
```

**测试用例：**
- 场景：编辑器中输入包含 mermaid 的内容并切换预览
- 期望：走 3 秒延迟等待，不走 300ms 快速路径

**依赖：** 无

## 依赖关系

```
Task 1 ──→ Task 2 ──→ Task 6
Task 3 ──→ Task 5 ──→ Task 6
Task 4 ──→ Task 5
Task 7 ──→ Task 8
Task 9（独立）
```

## 变更记录

| 日期 | 作者 | 变更 |
|------|------|------|
| 2026-05-25 | yuanchuang | 初稿 |
