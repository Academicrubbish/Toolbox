---
title: UI 全站重构 — 技术设计
spec: ./spec.md
status: draft
created: 2026-05-13
updated: 2026-05-13
author: yuanchuang
---

## 需求简述

基于 Apple HIG 设计语言对 Toolbox 全部 9 个页面进行视觉和交互重构。核心改动：建立 Design Tokens 体系、毛玻璃导航栏统一、侧边栏替代抽屉、Sheet 快速创建、详情页 AI 笔记内联展示、标签色板迁移。

**核心约束：**
- 不修改后端云函数和数据库结构
- 不更换技术栈（uni-app Vue 2）
- 不更换 Markdown 编辑器（towxml / md-editor 保持现有）
- 毛玻璃效果需兼容低端安卓机（降级方案）

**涉及模块：**
- 新建组件：nav-bar、sidebar、create-sheet
- 改造组件：record-card、fab-button
- 工具层：tagColors.js、format.js
- 样式层：新建 tokens.scss
- 全部 9 个页面文件

## 实施分期

```
P0 (Design Tokens + nav-bar)  ──→  P1 (首页重构)  ──→  P2 (Sheet)
                                     ↓                      ↓
                                P4 (子页面视觉)         P3 (详情页)
                                     ↓
                                P5 (ColorUI 清理)
```

## 技术方案

### 模块一：Design Tokens（P0）

#### 1.1 新建 styles/tokens.scss

全站设计变量集中管理，按类别分组：

```scss
// 颜色
$color-primary: #007AFF;
$color-primary-light: rgba(0,122,255,0.10);
// ... 完整定义见 PRD 2.1 节

// 圆角
$radius-card: 16px;
$radius-button: 12px;
$radius-tag: 6px;
$radius-pill: 20px;

// 间距（8pt 网格）
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;

// 阴影
$shadow-card: 0 1px 4px rgba(0,0,0,0.03);
$shadow-sidebar: 6px 0 40px rgba(0,0,0,0.12);
$shadow-fab: 0 4px 16px rgba(0,122,255,0.35);
$shadow-sheet: 0 -4px 40px rgba(0,0,0,0.1);

// 动画
$duration-fast: 150ms;
$duration-normal: 250ms;
$duration-slow: 350ms;
$ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
```

#### 1.2 引入方式

在 `uni.scss` 中 `@import './styles/tokens.scss'`，所有页面和组件可直接使用变量。

#### 1.3 毛玻璃降级策略

```scss
@mixin glass-bg($opacity: 0.72) {
  background: rgba(255, 255, 255, $opacity);
  /* #ifndef APP-PLUS-NVUE */
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  /* #endif */
}

// 安卓降级：通过 JS 判断平台，动态添加 class
// .nav-bar--android { background: rgba(255,255,255,0.95); backdrop-filter: none; }
```

### 模块二：导航栏组件（P0）

#### 2.1 新建 component/nav-bar/index.vue

**Props：**

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| title | String | '' | 页面标题 |
| showBack | Boolean | false | 是否显示返回按钮 |
| showMenu | Boolean | false | 首页专用，显示菜单按钮 |
| rightActions | Array | [] | 右侧操作按钮列表 |

**结构：**
```vue
<template>
  <view class="nav-bar" :class="{ 'nav-bar--android': isAndroid }">
    <view class="nav-bar__content" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar__left">
        <view v-if="showMenu" class="nav-bar__menu" @tap="$emit('menu-click')">
          <text class="cuIcon-sort"></text>
        </view>
        <view v-if="showBack" class="nav-bar__back" @tap="handleBack">
          <text class="nav-bar__back-arrow">←</text>
          <text class="nav-bar__back-text">返回</text>
        </view>
      </view>
      <view class="nav-bar__title">{{ title }}</view>
      <view class="nav-bar__right">
        <slot name="right"></slot>
      </view>
    </view>
  </view>
</template>
```

**关键实现：**
- `statusBarHeight`：通过 `uni.getSystemInfoSync().statusBarHeight` 获取
- `handleBack`：`uni.navigateBack({ delta: 1 })`
- 毛玻璃样式通过 mixin 实现，安卓降级通过平台判断

#### 2.2 替换策略

逐页替换 `cu-custom`，替换映射：

| 页面 | 现有 | 替换为 |
|------|------|--------|
| home/index.vue | `<cu-custom bgColor="bg-gradual-blue">` | `<nav-bar showMenu @menu-click="openSidebar">` |
| depart/form.vue | `<cu-custom bgColor="bg-gradual-blue">` | `<nav-bar title="编辑记录" showBack>` |
| depart/detail.vue | `<cu-custom bgColor="bg-gradual-blue">` | `<nav-bar title="记录详情" showBack>` |
| depart/learn-result.vue | `<cu-custom bgColor="bg-gradual-orange">` | `<nav-bar title="学习结果" showBack>` |
| summarize/index.vue | `<cu-custom bgColor="bg-gradual-blue">` | `<nav-bar title="编辑内容" showBack>` |
| dictCategory/index.vue | `<cu-custom bgColor="bg-gradual-pink">` | `<nav-bar title="标签管理" showBack>` |
| changelog/index.vue | `<cu-custom bgColor="bg-gradual-blue">` | `<nav-bar title="更新日志" showBack>` |

### 模块三：侧边栏组件（P1）

#### 3.1 新建 component/sidebar/index.vue

**Props：**

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| visible | Boolean | false | 控制显示/隐藏 |
| tagList | Array | [] | 标签列表 |
| recordCount | Number | 0 | 记录总数 |
| isGuest | Boolean | true | 是否游客 |

**Events：**

| Event | Payload | 说明 |
|-------|---------|------|
| close | - | 关闭侧边栏 |
| tag-select | tagId: string | 选择标签（空字符串=全部） |
| quick-action | action: string | 快捷操作（ocr/link/ai-history） |
| navigate | url: string | 导航跳转 |

**状态管理：**

侧边栏不使用 Vuex，由首页通过 props/events 管理状态：

```js
// pages/home/index.vue
data() {
  return {
    sidebarVisible: false,
    selectedTagId: ''
  }
},
methods: {
  openSidebar() { this.sidebarVisible = true },
  closeSidebar() { this.sidebarVisible = false },
  handleTagSelect(tagId) {
    this.selectedTagId = tagId
    this.filterRecordsByTag(tagId)
    this.closeSidebar()
  }
}
```

**动画实现：**
```scss
.sidebar {
  transform: translateX(-100%);
  transition: transform $duration-normal $ease-out;

  &--visible {
    transform: translateX(0);
  }
}
```

**标签筛选数据流：**
```
sidebar emit(tag-select, tagId) → home.handleTagSelect(tagId)
→ home.filterRecordsByTag(tagId) → 前端过滤 this.recordList
→ 按 record.tags.includes(tagId) 过滤
```

#### 3.2 替换关系

删除 `pages/home/index.vue` 中约第 92-143 行的 `cu-modal drawer-modal` 代码块，替换为 `<sidebar>` 组件。

### 模块四：Sheet 快速创建组件（P2）

#### 4.1 新建 component/create-sheet/index.vue

**Props：**

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| visible | Boolean | false | 控制显示/隐藏 |
| tagMap | Object | {} | 标签映射 |

**Events：**

| Event | Payload | 说明 |
|-------|---------|------|
| close | - | 关闭 Sheet |
| submit | { title, tags, inputMethod } | 提交创建 |

**表单状态：**

```js
data() {
  return {
    title: '',
    selectedTags: [],      // 已选标签 ID 数组
    inputMethod: '',       // 'manual' | 'ocr' | 'link'
  }
}
```

**校验逻辑：**
```js
canSubmit() {
  return this.title.trim() !== ''
    && this.selectedTags.length > 0
    && this.inputMethod !== ''
}
```

**提交后路由：**

| inputMethod | 行为 |
|-------------|------|
| manual | `navigateTo('/subpackage/summarize/index')` → 返回后自动创建记录 |
| ocr | 调用现有 `handleOcr` 逻辑（复用 depart/form 中的 OCR 流程） |
| link | 弹出链接输入框（复用现有 `handleLinkImport` 逻辑） |

**动画实现：**
```scss
.create-sheet {
  transform: translateY(100%);
  transition: transform $duration-slow $ease-out;

  &--visible {
    transform: translateY(0);
  }
}
```

### 模块五：record-card 改造（P1）

#### 5.1 样式改造

关键改动点：

1. **左侧色条**：通过伪元素实现
```scss
.record-card {
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: 0 2px 2px 0;
    background: var(--card-bar-color); // 动态设置
  }
}
```

2. **色条颜色取值**：取记录第一个标签的颜色
```js
computed: {
  barColor() {
    const firstTagId = this.record.tags?.[0]
    const firstTag = this.tagMap[firstTagId]
    const colorIndex = /* 从 tagList 中找到索引 */
    return tagColors[colorIndex % tagColors.length]
  }
}
```

3. **标签样式**：从 ColorUI 类名改为内联样式
```vue
<text
  v-for="(tagId, i) in record.tags"
  :key="tagId"
  :style="{
    background: tagColors[i].bg,
    color: tagColors[i].text
  }"
>{{ tagMap[tagId]?.name }}</text>
```

4. **长按菜单**：替换右上角"···"按钮
```vue
<!-- 移除原有更多按钮 -->
<!-- 添加长按事件 -->
<view @longpress="handleLongPress">
  <!-- 卡片内容 -->
</view>
```

### 模块六：详情页重构（P3）

#### 6.1 Tip 工具栏

水平滚动的胶囊按钮条，位于导航栏下方：

```vue
<scroll-view scroll-x class="detail-tips">
  <view class="detail-tip detail-tip--edit" @tap="handleEdit">
    <text>✏️ 编辑</text>
  </view>
  <view class="detail-tip detail-tip--ai" @tap="handleAiLearn">
    <text>🤖 AI辅导</text>
  </view>
  <view class="detail-tip detail-tip--download" @tap="downloadDocument">
    <text>📥 下载</text>
  </view>
  <view class="detail-tip detail-tip--share" @tap="handleShare">
    <text>📤 分享</text>
  </view>
  <view class="detail-tip detail-tip--delete" @tap="handleDelete">
    <text>🗑 删除</text>
  </view>
</scroll-view>
```

各按钮颜色规范：
- 编辑：灰色边框 `rgba(118,118,128,0.1)` + 灰色文字
- AI辅导：橙色边框 `rgba(255,149,0,0.15)` + 橙色文字 `#FF9500`
- 下载：蓝色边框 `rgba(0,122,255,0.12)` + 蓝色文字 `#007AFF`
- 分享：绿色边框 `rgba(52,199,89,0.12)` + 绿色文字 `#34C759`
- 删除：红色边框 `rgba(255,59,48,0.1)` + 红色文字 `#FF3B30`

#### 6.2 AI 笔记内联卡片

```js
// 数据加载
async loadAiResults() {
  const res = await getLearnResultList({ recordId: this.recordId })
  this.aiResults = res.data || []
  this.noteResults = this.aiResults.filter(r => r.type === 'note' && r.status === 'success')
  this.exerciseResults = this.aiResults.filter(r => r.type === 'exercise' && r.status === 'success')
  this.isAiProcessing = this.aiResults.some(r => r.status === 'pending' || r.status === 'processing')
}
```

**条件渲染：**
```vue
<!-- 有 AI 结果或正在生成时显示 -->
<view v-if="noteResults.length || exerciseResults.length || isAiProcessing" class="ai-card">
  <view v-if="isAiProcessing" class="ai-loading">AI 正在生成中...</view>
  <template v-else>
    <view class="ai-header">✨ AI 学习笔记</view>
    <view v-for="note in noteResults" :key="note._id" class="ai-result-item">
      <view class="ai-result-title">📖 知识点精讲</view>
      <view class="ai-result-preview">{{ getSummary(note.ai_result) }}</view>
      <view class="ai-result-link" @tap="goToAiDetail(note._id)">查看完整笔记 →</view>
    </view>
    <!-- 练习题同理 -->
  </template>
</view>
```

#### 6.3 阅读时间估算

```js
computed: {
  readingTime() {
    const content = this.summaryContent || ''
    const charCount = content.replace(/\s/g, '').length
    const minutes = Math.max(1, Math.ceil(charCount / 300))
    return `${minutes} 分钟阅读`
  }
}
```

#### 6.4 代码块样式

Markdown 渲染后的代码块样式覆盖（通过 towxml 的自定义样式）：
```scss
// 行内代码
code {
  background: rgba(118,118,128,0.12);
  padding: 2px 6px;
  border-radius: 6px;
  color: #FF3B30;
  font-family: 'SF Mono', monospace;
}

// 代码块
pre {
  background: #1C1C1E;
  color: #E5E5EA;
  padding: 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
}
```

### 模块七：工具层改造（P5）

#### 7.1 tagColors.js 重构

```js
// 改造前：ColorUI 类名
export const tagColorClasses = ['bg-red light', 'bg-blue light', ...]

// 改造后：独立色值对象
export const tagColors = [
  { bg: 'rgba(0,122,255,0.10)',  text: '#007AFF', bar: '#007AFF' },  // 蓝
  { bg: 'rgba(175,82,222,0.10)', text: '#AF52DE', bar: '#AF52DE' },  // 紫
  { bg: 'rgba(255,149,0,0.10)',  text: '#FF9500', bar: '#FF9500' },  // 橙
  { bg: 'rgba(52,199,89,0.10)',  text: '#34C759', bar: '#34C759' },  // 绿
  { bg: 'rgba(255,59,48,0.10)',  text: '#FF3B30', bar: '#FF3B30' },  // 红
  { bg: 'rgba(90,200,250,0.10)', text: '#5AC8FA', bar: '#5AC8FA' },  // 青
  { bg: 'rgba(255,45,85,0.10)',  text: '#FF2D55', bar: '#FF2D55' },  // 粉
  { bg: 'rgba(88,86,214,0.10)',  text: '#5856D6', bar: '#5856D6' },  // 靛
]

export function getTagColor(index) {
  return tagColors[index % tagColors.length]
}
```

#### 7.2 format.js 增强

```js
/**
 * 智能日期分组：今天/昨天/本周/更早
 */
export function formatSmartDate(dateStr) {
  const date = moment(dateStr)
  const today = moment().startOf('day')
  const diff = today.diff(date.startOf('day'), 'days')

  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff < 7) return '本周'
  return '更早'
}

/**
 * 相对时间格式化
 * - 1小时内：X分钟前
 * - 今天内：HH:mm
 * - 昨天：昨天 HH:mm
 * - 7天内：X天前
 * - 更早：MM-DD
 */
export function formatRelativeTime(dateStr) {
  const date = moment(dateStr)
  const now = moment()
  const diffMinutes = now.diff(date, 'minutes')
  const diffDays = now.startOf('day').diff(date.startOf('day'), 'days')

  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  if (diffDays === 0) return date.format('HH:mm')
  if (diffDays === 1) return `昨天 ${date.format('HH:mm')}`
  if (diffDays < 7) return `${diffDays}天前`
  return date.format('MM-DD')
}
```

**groupRecordsByDate 改造：**

```js
export function groupRecordsByDate(list) {
  const groups = {}
  const order = ['今天', '昨天', '本周', '更早']

  list.forEach(record => {
    const group = formatSmartDate(record.createTime)
    if (!groups[group]) groups[group] = []
    groups[group].push(record)
  })

  return order
    .filter(label => groups[label])
    .map(label => ({ date: label, children: groups[label], count: groups[label].length }))
}
```

### 模块八：标签管理页重构（P4）

#### 8.1 布局改造：双列网格 → 单列列表

```vue
<!-- 改造后 -->
<view class="tag-list">
  <view class="tag-section-title">我的标签</view>
  <view
    v-for="tag in myTags"
    :key="tag._id"
    class="tag-item"
    @longpress="handleTagLongPress(tag)"
  >
    <view class="tag-dot" :style="{ background: getTagDotColor(tag) }"></view>
    <view class="tag-info">
      <text class="tag-name">{{ tag.name }}</text>
      <text class="tag-meta">{{ getTagRecordCount(tag._id) }} 条记录 · {{ getTagLastUpdate(tag._id) }}</text>
    </view>
    <text class="tag-arrow">›</text>
  </view>

  <view class="tag-section-title">公共标签</view>
  <view class="public-tags">
    <text v-for="tag in publicTags" :key="tag._id" class="public-tag-pill">{{ tag.name }}</text>
  </view>
</view>
```

#### 8.2 标签关联记录数

前端降级方案：遍历记录列表统计

```js
computed: {
  tagRecordCounts() {
    const counts = {}
    this.recordList.forEach(record => {
      (record.tags || []).forEach(tagId => {
        counts[tagId] = (counts[tagId] || 0) + 1
      })
    })
    return counts
  },
  tagLastUpdates() {
    const latest = {}
    this.recordList.forEach(record => {
      (record.tags || []).forEach(tagId => {
        if (!latest[tagId] || record.createTime > latest[tagId]) {
          latest[tagId] = record.createTime
        }
      })
    })
    return latest
  }
}
```

## 组件间数据流

```
首页 (home/index.vue)
  ├── nav-bar (showMenu, @menu-click)
  ├── sidebar (visible, tagList, @tag-select, @quick-action, @navigate)
  ├── 标签筛选横滑条 (首页内实现)
  ├── record-card × N (record, tagMap, @longpress)
  ├── fab-button (@click → 打开 Sheet)
  └── create-sheet (visible, tagMap, @submit, @close)

详情页 (depart/detail.vue)
  ├── nav-bar (title, showBack)
  ├── Tip 工具栏 (首页内实现)
  ├── AI 笔记内联卡片 (调用 getLearnResultList)
  └── Markdown 内容区 (towxml 渲染)
```

## 文件变更清单

### 新建文件

| 文件 | 说明 |
|------|------|
| `styles/tokens.scss` | Design Tokens |
| `component/nav-bar/index.vue` | 毛玻璃导航栏 |
| `component/sidebar/index.vue` | 侧边栏 |
| `component/create-sheet/index.vue` | 快速创建 Sheet |

### 改造文件

| 文件 | 改动范围 |
|------|---------|
| `uni.scss` | 引入 tokens.scss |
| `pages/home/index.vue` | 重构（导航栏+侧边栏+标签筛选+Sheet+长按菜单） |
| `subpackage/depart/form.vue` | 视觉更新（导航栏+表单样式） |
| `subpackage/depart/detail.vue` | 重构（导航栏+Tip工具栏+AI内联+代码块样式） |
| `subpackage/depart/learn-result.vue` | 视觉更新 |
| `subpackage/depart/learn-result-detail.vue` | 视觉更新 |
| `subpackage/summarize/index.vue` | 视觉更新 |
| `subpackage/dictCategory/index.vue` | 布局+视觉重构 |
| `subpackage/dictCategory/form.vue` | 视觉更新 |
| `subpackage/changelog/index.vue` | 视觉更新 |
| `component/record-card/index.vue` | 样式改造 |
| `component/fab-button/index.vue` | 样式改造 |
| `utils/tagColors.js` | 色板重构 |
| `utils/format.js` | 新增 formatRelativeTime/formatSmartDate |

## 测试策略

### 视觉回归测试

每个阶段完成后，逐页检查：
1. 导航栏毛玻璃效果（iOS/安卓）
2. 卡片色条与标签色板一致性
3. 间距、圆角、字号是否符合 Token 规范
4. 深色代码块渲染效果

### 功能回归测试

| 功能 | 测试要点 |
|------|---------|
| 新建记录 | Sheet → 手动输入/拍照/链接 → 记录创建成功 |
| 编辑记录 | 长按卡片 → 编辑 → 保存 |
| 删除记录 | 长按卡片 → 删除 → 确认 |
| 标签筛选 | 侧边栏标签 / 首页横滑条 → 列表过滤 |
| AI 辅导 | 详情页 Tip → AI辅导 → 生成成功 |
| AI 内联展示 | 详情页 → AI 笔记卡片显示 → 点击跳转 |
| 下载/分享 | 详情页 Tip → 下载/分享 → 功能正常 |
| 标签管理 | 单列列表 → 新增/编辑/删除标签 |

### 兼容性测试

| 设备 | 关注点 |
|------|--------|
| iOS（微信） | 毛玻璃效果、安全区、返回手势 |
| 安卓（微信） | 毛玻璃降级、侧边栏动画流畅度 |
| iPhone SE | 布局不溢出 |
| 大屏设备 | 布局无异常拉伸 |

## 变更记录

| 日期 | 作者 | 变更说明 |
|------|------|---------|
| 2026-05-13 | yuanchuang | 初始版本 |
