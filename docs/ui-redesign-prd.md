# Toolbox 小程序 UI 重构需求文档

> 版本：v1.0  
> 日期：2026-05-13  
> 原型参考：`docs/proposal-d-final.html`  
> 涉及范围：全部 9 个页面的布局、交互、样式重构

---

## 1. 背景与目标

### 1.1 现状问题

| # | 问题 | 影响 |
|---|------|------|
| 1 | 全站统一渐变蓝导航栏，页面间缺乏视觉区分度 | 用户无法通过视觉快速识别当前页面 |
| 2 | 新建记录需 3 次页面跳转（首页→表单→富文本编辑） | 创建流程割裂，用户容易中途流失 |
| 3 | 首页无标签筛选能力，只能靠搜索 | 标签系统价值未充分发挥 |
| 4 | 导航功能集中在左侧抽屉，入口隐蔽 | 标签管理、更新日志等低频功能难以被发现 |
| 5 | 详情页操作按钮分散（AI辅导、下载、分享各自独立） | 操作区域混乱，视觉噪声大 |
| 6 | AI 学习结果需多次跳转才能查看 | AI 功能感知弱，用户不知道自己有哪些学习产出 |
| 7 | 标签管理使用双列网格，信息密度低 | 标签多时需要大量滚动 |
| 8 | 依赖 ColorUI 框架，样式与设计系统脱节 | 无法统一管理 Design Tokens |

### 1.2 重构目标

1. **视觉升级**：采用 Apple HIG 设计语言，建立统一的 Design Tokens 体系
2. **交互精简**：新建记录从 3 步降至 1 步（Sheet）或 2 步（沉浸编辑）
3. **导航重构**：侧边栏替代抽屉，承载标签筛选 + 快捷操作 + 设置
4. **AI 感知增强**：AI 笔记内联展示在详情页，首页卡片展示 AI 角标
5. **代码层面**：逐步替换 ColorUI，建立项目自有设计变量系统

### 1.3 不在本次范围

- 不新增功能模块（知识图谱、暗色模式等作为后续迭代）
- 不修改后端云函数和数据库结构
- 不更换 Markdown 编辑器（towxml / md-editor 保持现有）
- 不更换技术栈（仍基于 uni-app Vue 2）

---

## 2. 设计系统

### 2.1 Design Tokens

新建文件 `styles/tokens.scss`，统一管理全局设计变量：

```
// ──── 颜色 ────
$color-primary:          #007AFF;   // iOS 蓝
$color-primary-light:    rgba(0,122,255,0.10);
$color-success:          #34C759;
$color-success-light:    rgba(52,199,89,0.10);
$color-warning:          #FF9500;   // AI 功能专用色
$color-warning-light:    rgba(255,149,0,0.08);
$color-error:            #FF3B30;
$color-error-light:      rgba(255,59,48,0.08);
$color-share:            #30BE64;
$color-share-light:      rgba(48,190,100,0.10);

$color-text-primary:     #1C1C1E;
$color-text-secondary:   #3C3C43;
$color-text-tertiary:    #8E8E93;
$color-text-placeholder: #C7C7CC;
$color-text-disabled:    #AEAEB2;

$color-bg-page:          #F2F2F7;
$color-bg-card:          #FFFFFF;
$color-bg-sidebar:       rgba(247,247,250,0.92);
$color-bg-input:         rgba(118,118,128,0.06);
$color-bg-mask:          rgba(0,0,0,0.28);

$color-border:           rgba(60,60,67,0.08);
$color-divider:          rgba(60,60,67,0.06);

// ──── 圆角 ────
$radius-card:     16px;
$radius-button:   12px;
$radius-input:    12px;
$radius-tag:       6px;
$radius-pill:     20px;
$radius-avatar:   50%;

// ──── 间距（8pt 网格） ────
$spacing-xs:   4px;
$spacing-sm:   8px;
$spacing-md:  16px;
$spacing-lg:  24px;
$spacing-xl:  32px;
$spacing-xxl: 48px;

// ──── 字体 ────
$font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
$font-page-title:   700 28px/1.3 $font-family;
$font-section-title: 700 22px/1.3 $font-family;
$font-card-title:    600 16px/1.3 $font-family;
$font-body:          400 15px/1.7 $font-family;
$font-secondary:     400 13px/1.5 $font-family;
$font-label:         600 11px/1   $font-family;
$font-code:          400 14px/1.6 'SF Mono', Menlo, Consolas, monospace;

// ──── 阴影 ────
$shadow-card:      0 1px 4px rgba(0,0,0,0.03);
$shadow-sidebar:   6px 0 40px rgba(0,0,0,0.12);
$shadow-fab:       0 4px 16px rgba(0,122,255,0.35);
$shadow-sheet:     0 -4px 40px rgba(0,0,0,0.1);

// ──── 动画 ────
$duration-fast:   150ms;
$duration-normal: 250ms;
$duration-slow:   350ms;
$ease-out:        cubic-bezier(0.25, 0.46, 0.45, 0.94);
```

### 2.2 标签色板重构

现有 `utils/tagColors.js` 使用 ColorUI 的类名（如 `bg-red light`），需重构为独立色值：

```js
export const tagColors = [
  { bg: 'rgba(0,122,255,0.10)',  text: '#007AFF', bar: '#007AFF' },  // 蓝
  { bg: 'rgba(175,82,222,0.10)', text: '#AF52DE', bar: '#AF52DE' },  // 紫
  { bg: 'rgba(255,149,0,0.10)',  text: '#FF9500', bar: '#FF9500' },  // 橙
  { bg: 'rgba(52,199,89,0.10)',  text: '#34C759', bar: '#34C759' },  // 绿
  { bg: 'rgba(255,59,48,0.10)',  text: '#FF3B30', bar: '#FF3B30' },  // 红
  { bg: 'rgba(90,200,250,0.10)', text: '#5AC8FA', bar: '#5AC8FA' },  // 青
  { bg: 'rgba(255,45,85,0.10)',  text: '#FF2D55', bar: '#FF2D55' },  // 粉
  { bg: 'rgba(88,86,214,0.10)',  text: '#5856D6', bar: '#5856D6' },  // 靛
];
```

每个标签对象包含 `bg`（标签背景色）、`text`（标签文字色）、`bar`（卡片左侧色条颜色）。

### 2.3 时间格式化重构

现有 `utils/format.js` 中的 `groupRecordsByDate` 按 `YYYY-MM-DD` 分组，需改为更人性化的分组：

| 原分组 | 新分组 |
|--------|--------|
| 2025-05-13 | 今天 |
| 2025-05-12 | 昨天 |
| 2025-05-10 | 本周 |
| 2025-05-06 | 更早 |

同时 `formatTime` 需新增"相对时间"模式：`3 分钟前` / `昨天 14:30` / `3天前`。

---

## 3. 全局组件变更

### 3.1 导航栏 — cu-custom 替换

| 现有 | 重构为 |
|------|--------|
| `cu-custom`（ColorUI 组件） | 自定义 `nav-bar` 组件 |
| `bgColor="bg-gradual-blue"` 硬编码渐变蓝 | 半透明毛玻璃：`background: rgba(255,255,255,0.72); backdrop-filter: blur(24px)` |
| `bgColor="bg-gradual-orange"` / `bg-gradual-pink` | 统一为毛玻璃样式，取消彩色导航栏 |

**新导航栏组件结构**：

```
┌─────────────────────────────────┐
│  ← 返回        页面标题     ···  │  ← 毛玻璃背景
└─────────────────────────────────┘
```

- 首页导航栏右侧不显示任何内容，左侧为菜单按钮（打开侧边栏）
- 子页面导航栏左侧显示"← 返回"，中间显示页面标题
- 导航栏标题字体：`600 17px`，颜色 `#1C1C1E`
- 返回按钮颜色：`#007AFF`

### 3.2 新增侧边栏组件 — `sidebar`

**文件位置**：`component/sidebar/index.vue`

**功能**：

| 区域 | 内容 | 交互 |
|------|------|------|
| 头部 | 用户头像 + "我的知识库" + 记录统计 | 静态展示 |
| 标签筛选 | 全部记录（默认选中）/ 各标签（显示记录数） | 点击标签 → 关闭侧边栏 → 首页列表按标签过滤 |
| 快捷操作 | 拍照识别 / 导入链接 / AI辅导历史 | 拍照识别 → 直接调用 OCR 流程；导入链接 → 弹出链接输入框；AI辅导历史 → 跳转AI结果页 |
| 其他 | 标签管理 / 更新日志 / 联系客服 / QQ交流群 | 标签管理 → `navigateTo('/subpackage/dictCategory/index')`；其余同现有逻辑 |

**视觉规范**：
- 宽度：屏幕宽度 78%（约 290px）
- 背景：`rgba(247,247,250,0.92)` + `backdrop-filter: blur(48px)`
- 遮罩：`rgba(0,0,0,0.28)`
- 打开动画：从左侧滑入，`250ms ease-out`
- 关闭：点击遮罩关闭
- 选中态：`background: rgba(0,122,255,0.10)`，文字变蓝

**替代关系**：此组件替代现有 `pages/home/index.vue` 中的 `cu-modal drawer-modal`（约第 92-143 行的左侧抽屉）。

### 3.3 新增 Sheet 组件 — `create-sheet`

**文件位置**：`component/create-sheet/index.vue`

**功能**：

| 区域 | 说明 |
|------|------|
| 标题输入 | uni-easyinput，最多 50 字，右下角字数统计 |
| 标签选择 | 从 `tagMap` 渲染标签胶囊，支持多选 |
| 内容输入方式 | 三选一：手动输入（跳转沉浸编辑页） / 拍照识别（调用 OCR） / 导入链接（弹出链接输入框） |
| 保存按钮 | 校验标题非空 + 至少一个标签 + 内容输入方式已选 |

**视觉规范**：
- 顶部把手：`36px × 5px`，`rgba(60,60,67,0.16)`，圆角 3px
- 最大高度：屏幕 75%
- 底部安全区：`padding-bottom: calc(40rpx + env(safe-area-inset-bottom))`
- 遮罩：`rgba(0,0,0,0.3)`
- 打开动画：从底部滑入，`350ms ease-out`

**触发方式**：点击首页 FAB 按钮打开。

**替代关系**：替代现有 `fab-button` 点击后 `navigateTo('/subpackage/depart/form?type=add')` 的跳转逻辑。

### 3.4 record-card 组件改造

**文件位置**：`component/record-card/index.vue`

| 改动项 | 现有 | 改为 |
|--------|------|------|
| 整体样式 | 白色圆角卡片 + ColorUI shadow-warp | 白色卡片 + 左侧 3px 色条（颜色取标签第一个颜色） + $shadow-card |
| 标签样式 | ColorUI 类名 `bg-red light` 等 | 独立色值 `$tagColors[index].bg` + `$tagColors[index].text` |
| 更多操作按钮 | 右上角 `···` 图标，点击弹出 context-popup | 移除更多按钮，改为长按卡片弹出菜单 |
| AI 笔记角标 | 底部显示 | 保持底部，样式改为胶囊标签 |
| 时间格式 | `HH:mm` | 相对时间：`3分钟前` / `昨天 14:30` |
| 摘要截取 | 2 行截断 | 保持 2 行截断，样式统一 |

### 3.5 fab-button 组件改造

**文件位置**：`component/fab-button/index.vue`

| 改动项 | 现有 | 改为 |
|--------|------|------|
| 颜色 | 绿色渐变 `#39b54a → #8dc63f` | iOS 蓝 `#007AFF` |
| 圆角 | 50%（圆形） | 16px（圆角方形） |
| 阴影 | 绿色阴影 | `0 4px 16px rgba(0,122,255,0.35)` |
| 点击行为 | `$emit('click')` → 跳转表单页 | `$emit('click')` → 打开 Sheet |

---

## 4. 各页面详细需求

### 4.1 首页 — `pages/home/index.vue`

#### 4.1.1 导航区

| 改动 | 说明 |
|------|------|
| 去掉 cu-custom 导航栏 | 改为顶部搜索栏 + 左侧菜单按钮 |
| 新增菜单按钮 | 点击打开侧边栏 |
| 新增搜索栏 | 菜单按钮右侧，圆角灰色背景，点击展开搜索输入 |

#### 4.1.2 标签筛选横滑条

**新增功能**，位于搜索栏下方：

- 横向滚动的标签胶囊列表
- 默认选中"全部"
- 点击标签 → 按标签 ID 过滤记录列表
- 数据来源：调用 `getDictCategoryList()` 获取标签列表
- 选中态：`background: #007AFF; color: #fff`
- 未选中态：`background: rgba(118,118,128,0.08); color: #1C1C1E`

#### 4.1.3 记录列表

| 改动 | 说明 |
|------|------|
| 日期分组格式 | `YYYY-MM-DD` → 今天 / 昨天 / 本周 / 更早 |
| 去掉日期分组头的日历图标+蓝色背景块 | 改为纯文字小标题 `font-size: 11px; font-weight: 700; color: #8E8E93; text-transform: uppercase` |
| 卡片间距 | `gap: 20rpx` → `margin-bottom: 10px` |
| 卡片样式 | 参见 3.4 record-card 改造 |

#### 4.1.4 侧边栏

**新增组件**，参见 3.2 sidebar 组件。

- 替代现有左侧抽屉（第 92-143 行的 `cu-modal drawer-modal`）
- 游客状态提示：侧边栏头部下方显示"登录后可保存和管理您的记录" + 登录按钮

#### 4.1.5 FAB → Sheet

- FAB 按钮样式改造参见 3.5
- 点击 FAB → 打开 `create-sheet`（参见 3.3）
- Sheet 中选择"手动输入" → `navigateTo('/subpackage/summarize/index')`，返回后自动创建记录
- Sheet 中选择"拍照识别" → 调用 OCR 流程（复用现有 `handleOcr` 逻辑）
- Sheet 中选择"导入链接" → 弹出链接输入框（复用现有 `handleLinkImport` 逻辑）

#### 4.1.6 长按菜单

替代现有右上角"···"图标的 context-popup：
- 长按卡片 → 弹出菜单：编辑 / 删除
- 编辑 → `navigateTo('/subpackage/depart/form?type=update&id=xxx')`
- 删除 → 弹出确认对话框（保持现有 uni-popup-dialog）

### 4.2 新建/编辑记录 — `subpackage/depart/form.vue`

#### 4.2.1 新建流程变更

| 现有流程 | 新流程 |
|----------|--------|
| FAB → 跳转 form.vue → 填标题+标签 → 点击总结 → 跳转 summarize → 返回 → 提交 | Sheet 选择"手动输入" → 跳转沉浸编辑页（标题+标签+内容一体） → 自动保存 → 点"完成" |
| 拍照识别/链接导入 在 form.vue 中通过 ActionSheet 选择 | 在 Sheet 中直接选择输入方式 |

#### 4.2.2 编辑流程（保持）

编辑现有记录时仍跳转 `form.vue`，但视觉样式需同步更新：

| 改动 | 说明 |
|------|------|
| 导航栏 | `bg-gradual-blue` → 毛玻璃 |
| 表单卡片圆角 | `24rpx` → `16px` |
| 标签选择样式 | ColorUI 类名 → 独立色值胶囊 |
| 输入框焦点样式 | 保持蓝色边框 + 浅蓝阴影 |
| 提交按钮 | `bg-gradual-blue` → `#007AFF` 实色 |

#### 4.2.3 提交后 AI 辅导引导（保持）

现有逻辑：提交后 `uni.showModal` 询问是否 AI 辅导。保持不变。

### 4.3 Markdown 编辑页 — `subpackage/summarize/index.vue`

此页面基本保持现有逻辑，仅做视觉更新：

| 改动 | 说明 |
|------|------|
| 导航栏 | `bg-gradual-blue` → 毛玻璃 |
| 编辑区域 | 去掉蓝色背景，改为纯白 |
| 底部工具栏样式（如有） | 统一为毛玻璃背景 |

> 注：沉浸式编辑页（标题+标签+内容一体 + "/"命令面板）作为后续迭代，本次先完成视觉统一。因为 md-editor 组件是独立的 WebView 编辑器，一体化改造涉及编辑器重构，工作量较大。

### 4.4 记录详情页 — `subpackage/depart/detail.vue`

#### 4.4.1 导航栏

| 改动 | 说明 |
|------|------|
| `bg-gradual-blue` | → 毛玻璃导航栏 |
| 右侧区域 | 仅保留 `···` 菜单按钮，包含：编辑、下载、分享、删除 |

#### 4.4.2 顶部 Tip 工具栏（新增）

位于导航栏下方，标题上方的水平滚动胶囊按钮条：

```
[ ✏️ 编辑 ] [ 🤖 AI辅导 ] [ 📥 下载 ] [ 📤 分享 ] [ 🗑 删除 ]
```

| Tip | 样式 | 行为 |
|-----|------|------|
| 编辑 | 灰色边框 `rgba(118,118,128,0.1)` | 跳转编辑页 |
| AI辅导 | 橙色边框 `rgba(255,149,0,0.15)`，文字 `#FF9500` | 调用 AI 辅导（同现有 `handleAiLearn`） |
| 下载 | 蓝色边框 `rgba(0,122,255,0.12)`，文字 `#007AFF` | 下载 Markdown（同现有 `downloadDocument`） |
| 分享 | 绿色边框 `rgba(52,199,89,0.12)`，文字 `#34C759` | 打开分享有效期选择弹窗 |
| 删除 | 红色边框 `rgba(255,59,48,0.1)`，文字 `#FF3B30` | 弹出删除确认 |

**替代关系**：移除现有详情页中的独立 download-btn、ai-btn、share-btn 按钮（约第 64-76 行）。

#### 4.4.3 标题区域

| 改动 | 说明 |
|------|------|
| 标题字号 | `text-lg` (16px) → `700 28px` |
| 新增"阅读时间"估算 | 在时间右侧显示，基于内容字数估算（约 300字/分钟） |
| 标签样式 | ColorUI 类名 → 独立色值胶囊 |

#### 4.4.4 AI 学习笔记卡片（内联展示）

**新增区域**，位于标题和标签下方、总结内容上方：

```
┌─ ✨ AI 学习笔记 ─────────────────┐
│                                   │
│  ┌─ 📖 知识点精讲 ──────────────┐ │
│  │ · 要点 1                     │ │
│  │ · 要点 2                     │ │
│  │ · 要点 3                     │ │
│  │ 查看完整笔记 →               │ │
│  └──────────────────────────────┘ │
│                                   │
│  ┌─ ✏️ 针对性练习 ──────────────┐ │
│  │ · 练习 1                     │ │
│  │ · 练习 2                     │ │
│  │ 查看完整练习 →               │ │
│  └──────────────────────────────┘ │
│                                   │
└───────────────────────────────────┘
```

**数据来源**：调用 `getLearnResultList({ recordId })` 获取 AI 结果列表，按 `type`（note/exercise）分组展示。

**条件显示**：
- 有成功的 AI 结果时显示此卡片
- 无 AI 结果时不显示（不显示空状态）
- AI 正在生成时显示加载态："AI 正在生成中..."

**点击"查看完整笔记/练习"**：跳转 `subpackage/depart/learn-result-detail?id=xxx`

#### 4.4.5 总结内容区域

| 改动 | 说明 |
|------|------|
| 去掉卡片包裹 | Markdown 渲染内容直接全宽展示，无额外白色卡片 |
| 代码块样式 | 深色背景 `#1C1C1E` + 浅色文字 `#E5E5EA` + 12px 圆角 |
| 行内代码 | 浅灰背景 `rgba(118,118,128,0.12)` + 红色文字 `#FF3B30` |

#### 4.4.6 去掉底部工具栏

移除现有页面底部的独立操作按钮区域。所有操作通过顶部 Tip 工具栏完成。

#### 4.4.7 分享弹窗（保持）

现有分享有效期选择弹窗保持功能和逻辑不变，仅做样式微调：
- 圆角从 `24rpx` → `16px`
- 选中态颜色从绿色 `#30be64` → 蓝色 `#007AFF`

### 4.5 AI 学习结果列表 — `subpackage/depart/learn-result.vue`

| 改动 | 说明 |
|------|------|
| 导航栏 | `bg-gradual-orange` → 毛玻璃 |
| 背景色 | `linear-gradient(...)` → `#F2F2F7` |
| 卡片圆角 | `24rpx` → `16px` |
| 状态圆点 | 保持绿色/橙色，统一 8px |
| 类型徽章 | 保持蓝/橙色，圆角从 `8rpx` → `8px` |
| 空状态 | 保持，去掉大图标，改为居中文字提示 |

### 4.6 AI 学习结果详情 — `subpackage/depart/learn-result-detail.vue`

> 此页面未在原型中单独展示，保持现有功能，仅做导航栏和背景色同步更新。

| 改动 | 说明 |
|------|------|
| 导航栏 | 改为毛玻璃 |
| 背景色 | 改为 `#F2F2F7` |
| Markdown 内容样式 | 同步 4.4.5 的代码块/行内代码样式 |

### 4.7 标签管理 — `subpackage/dictCategory/index.vue`

| 改动 | 现有 | 改为 |
|------|------|------|
| 导航栏 | `bg-gradual-pink` | 毛玻璃 |
| 布局 | 双列网格 | 单列列表 |
| 标签卡片 | 网格卡片，显示名称+描述 | 列表项：左侧彩色圆点 + 标签名 + 记录数 + 最近更新时间 |
| 公共标签区域 | 混在卡片列表中 | 分离为独立区块，灰色胶囊展示 |
| 操作方式 | 点击编辑、长按删除 | 保持，长按弹出菜单（编辑/删除） |
| FAB 颜色 | 绿色 | `#007AFF` |
| FAB 圆角 | 圆形 | 16px 圆角方形 |

**新增显示字段**：
- 关联记录数：需在 `getDictCategoryList` 返回时附带每个标签的记录统计（或前端本地统计）
- 最近更新时间：同上

> 如后端不支持附带统计，前端可在加载标签列表后，遍历记录列表计算。这是一个可接受的降级方案。

### 4.8 标签表单 — `subpackage/dictCategory/form.vue`

> 此页面不在原型中单独展示，仅做导航栏视觉同步。

| 改动 | 说明 |
|------|------|
| 导航栏 | 改为毛玻璃 |
| 输入框样式 | 同步 4.2 form.vue 的输入框样式 |

### 4.9 更新日志 — `subpackage/changelog/index.vue`

| 改动 | 说明 |
|------|------|
| 导航栏 | `bg-gradual-blue` → 毛玻璃 |
| 背景色 | `#ffffff` → `#F2F2F7` |
| 日志卡片 | 白色卡片 → `#F2F2F7` 背景（保持浅灰）+ `16px` 圆角 |
| QQ 交流群区域 | 保持功能，样式微调（圆角统一） |

---

## 5. 数据/接口变更

### 5.1 前端计算，无需后端改动

| 需求 | 实现方式 |
|------|---------|
| 首页标签筛选 | 前端过滤 `recordList`，按 `tags` 数组包含选中标签 ID |
| 相对时间格式化 | 在 `utils/format.js` 中新增 `formatRelativeTime()` |
| 阅读时间估算 | 在详情页 `computed` 中根据 `summaryContent.length / 300` 估算 |
| AI 笔记内联展示 | 调用现有 `getLearnResultList` 接口 |
| 标签关联记录数 | 遍历记录列表统计（降级方案，无需改接口） |

### 5.2 建议后端优化（非必须）

| 需求 | 说明 |
|------|------|
| `getDictCategoryList` 返回记录统计 | 在标签对象中增加 `recordCount` 和 `lastRecordTime` 字段 |
| `getRecordList` 支持标签过滤 | 新增 `tagId` 参数，服务端按标签过滤 |

---

## 6. 实施计划

### 6.1 分期计划

| 阶段 | 内容 | 涉及文件 | 工作量 |
|------|------|---------|--------|
| **P0** | Design Tokens + 导航栏毛玻璃化 | 新建 `styles/tokens.scss`；改造 `cu-custom` → `nav-bar` | 1天 |
| **P1** | 首页重构（侧边栏 + 标签筛选 + Block卡片 + 长按菜单） | `pages/home/index.vue`；新建 `component/sidebar/index.vue`；改造 `component/record-card/index.vue` | 3天 |
| **P2** | Sheet 快速创建 | 新建 `component/create-sheet/index.vue`；改造 `component/fab-button/index.vue` | 2天 |
| **P3** | 详情页重构（Tip 工具栏 + AI 内联 + 代码块样式） | `subpackage/depart/detail.vue` | 2天 |
| **P4** | 子页面视觉统一（编辑页、标签管理、学习结果、更新日志） | `depart/form.vue`、`summarize/index.vue`、`dictCategory/index.vue`、`learn-result.vue`、`learn-result-detail.vue`、`changelog/index.vue` | 2天 |
| **P5** | 标签色板迁移 + ColorUI 依赖清理 | `utils/tagColors.js`、`utils/format.js`；移除 `colorui/` 引用 | 1天 |

**总工作量估算**：约 11 个工作日。

### 6.2 依赖关系

```
P0 (Design Tokens)  ──→  P1 (首页)  ──→  P2 (Sheet)
                         ↓                    ↓
                    P4 (子页面)          P3 (详情页)
                         ↓
                    P5 (清理)
```

- P0 必须最先完成，所有页面依赖 Tokens
- P1 和 P3 可以并行（首页和详情页改动互不影响）
- P2 依赖 P1（Sheet 触发在首页 FAB 上）
- P5 最后执行，清理旧代码

### 6.3 风险与降级

| 风险 | 影响 | 降级方案 |
|------|------|---------|
| 毛玻璃效果在低端安卓机性能差 | 卡顿 | 安卓关闭 `backdrop-filter`，使用纯色半透明替代 |
| 侧边栏滑动与 z-paging 下拉冲突 | 手势冲突 | 侧边栏改为点击按钮开关，不响应滑动手势 |
| md-editor 编辑器无法一体化改造 | 无法实现沉浸编辑页 | 保持现有编辑器，后续版本再重构 |
| 标签关联记录数需遍历计算 | 首页加载变慢 | 首屏不显示记录数，异步计算后更新 |

---

## 7. 验收标准

### 7.1 视觉验收

- [ ] 全站无 ColorUI 渐变蓝导航栏
- [ ] 所有导航栏为毛玻璃效果（或纯色半透明降级）
- [ ] 卡片左侧色条颜色与标签色板一致
- [ ] 间距符合 8pt 网格（8/16/24/32）
- [ ] 圆角统一：卡片 16px、按钮 12px、标签 6px、胶囊 20px
- [ ] 颜色全部使用 Tokens 变量，无硬编码色值

### 7.2 交互验收

- [ ] 侧边栏可正常打开/关闭，标签筛选生效
- [ ] FAB 点击弹出 Sheet，选择输入方式后流程正常
- [ ] 长按卡片弹出编辑/删除菜单
- [ ] 详情页顶部 Tip 工具栏所有按钮可点击且功能正常
- [ ] AI 笔记在详情页内联展示，点击可跳转详情
- [ ] 页面间跳转流畅，无白屏闪烁

### 7.3 兼容性验收

- [ ] iOS 微信：毛玻璃效果正常
- [ ] 安卓微信：关闭毛玻璃降级方案正常
- [ ] 小屏幕设备（iPhone SE）：布局不溢出、不截断
- [ ] 大屏幕设备（iPhone 15 Pro Max）：布局无异常拉伸

### 7.4 性能验收

- [ ] 首页列表滚动流畅（无明显卡顿）
- [ ] 侧边栏打开/关闭动画帧率 ≥ 30fps
- [ ] Sheet 打开/关闭动画帧率 ≥ 30fps
- [ ] 内存无异常增长（使用侧边栏/Sheet 后内存能正常回收）

---

## 附录

### A. 页面文件对照表

| 页面 | 文件路径 | 改动程度 |
|------|---------|---------|
| 首页 | `pages/home/index.vue` | 重构 |
| 记录表单 | `subpackage/depart/form.vue` | 样式更新 |
| 记录详情 | `subpackage/depart/detail.vue` | 重构 |
| AI 结果列表 | `subpackage/depart/learn-result.vue` | 样式更新 |
| AI 结果详情 | `subpackage/depart/learn-result-detail.vue` | 样式更新 |
| Markdown 编辑 | `subpackage/summarize/index.vue` | 样式更新 |
| 标签管理 | `subpackage/dictCategory/index.vue` | 布局+样式更新 |
| 标签表单 | `subpackage/dictCategory/form.vue` | 样式更新 |
| 更新日志 | `subpackage/changelog/index.vue` | 样式更新 |

### B. 新增/改造组件清单

| 组件 | 文件 | 类型 |
|------|------|------|
| 导航栏 | `component/nav-bar/index.vue` | 新建（替代 cu-custom） |
| 侧边栏 | `component/sidebar/index.vue` | 新建 |
| 快速创建 Sheet | `component/create-sheet/index.vue` | 新建 |
| 记录卡片 | `component/record-card/index.vue` | 改造 |
| FAB 按钮 | `component/fab-button/index.vue` | 改造 |
| 长按菜单 | `component/context-popup/index.vue` | 保持（交互触发方式变更） |

### C. 工具文件变更

| 文件 | 变更 |
|------|------|
| `utils/tagColors.js` | 色板从 ColorUI 类名重构为独立色值对象 |
| `utils/format.js` | 新增 `formatRelativeTime()` 和 `formatSmartDate()` |
| `styles/tokens.scss` | 新建，全局 Design Tokens |
| `uni.scss` | 引入 `tokens.scss`，替换原有变量 |
