---
title: UI 全站重构 — 任务清单
plan: ./plan.md
status: draft
created: 2026-05-13
updated: 2026-05-13
author: yuanchuang
---

# UI 全站重构 Tasks

> 完成标准：每个 Task 的实现内容完成 + 测试用例全部通过。

## Task 列表

---

### Task 1：新建 Design Tokens 文件（对应阶段1-步骤1.1）

- **操作类型**：新增
- **涉及文件**：
  - `styles/tokens.scss`（新增）
  - `uni.scss`（修改）
- **实现内容**：
  - 新建 `styles/tokens.scss`，定义以下变量组：
    - 颜色：`$color-primary: #007AFF`、`$color-primary-light`、`$color-success`、`$color-warning`、`$color-error`、文本色（primary/secondary/tertiary/placeholder/disabled）、背景色（page/card/sidebar/input/mask）、边框色（border/divider）
    - 圆角：`$radius-card: 16px`、`$radius-button: 12px`、`$radius-input: 12px`、`$radius-tag: 6px`、`$radius-pill: 20px`
    - 间距：`$spacing-xs: 4px`、`$spacing-sm: 8px`、`$spacing-md: 16px`、`$spacing-lg: 24px`、`$spacing-xl: 32px`、`$spacing-xxl: 48px`
    - 字体：`$font-page-title: 700 28px/1.3`、`$font-section-title: 700 22px/1.3`、`$font-card-title: 600 16px/1.3`、`$font-body: 400 15px/1.7`、`$font-secondary: 400 13px/1.5`、`$font-label: 600 11px/1`
    - 阴影：`$shadow-card`、`$shadow-sidebar`、`$shadow-fab`、`$shadow-sheet`
    - 动画：`$duration-fast: 150ms`、`$duration-normal: 250ms`、`$duration-slow: 350ms`、`$ease-out`
    - 毛玻璃 mixin：`@mixin glass-bg($opacity: 0.72)`
  - 在 `uni.scss` 末尾添加 `@import './styles/tokens.scss';`
- **测试用例**：
  - 用例 1：编译项目 → 编译无报错
  - 用例 2：在任意 `.vue` 文件的 `<style lang="scss">` 中引用 `$color-primary` → 编译无报错且渲染为 #007AFF
- **依赖**：无

---

### Task 2：重构标签色板（对应阶段1-步骤1.2）

- **操作类型**：修改
- **涉及文件**：
  - `utils/tagColors.js`（修改）
- **实现内容**：
  - 将现有 `tagColorClasses` 数组（12 个 ColorUI 类名如 `'bg-red light'`）替换为 `tagColors` 数组（8 个色值对象）
  - 每个对象结构：`{ bg: 'rgba(R,G,B,0.10)', text: '#HEXCOLOR', bar: '#HEXCOLOR' }`
  - 8 色顺序：蓝 #007AFF、紫 #AF52DE、橙 #FF9500、绿 #34C759、红 #FF3B30、青 #5AC8FA、粉 #FF2D55、靛 #5856D6
  - 保留原 `tagColorClasses` 导出（标记 @deprecated），避免引用处立即报错
  - 新增 `export function getTagColor(index) { return tagColors[index % tagColors.length] }`
  - 保留原 `getTagColorClass` 函数（标记 @deprecated）
- **测试用例**：
  - 用例 1：`getTagColor(0)` → `{ bg: 'rgba(0,122,255,0.10)', text: '#007AFF', bar: '#007AFF' }`
  - 用例 2：`getTagColor(8)` → 循环返回与 `getTagColor(0)` 相同
  - 用例 3：现有 `tagColorClasses` 和 `getTagColorClass` 仍可引用（向后兼容）
- **依赖**：无

---

### Task 3：增强时间格式化工具（对应阶段1-步骤1.3）

- **操作类型**：修改
- **涉及文件**：
  - `utils/format.js`（修改）
- **实现内容**：
  - 新增 `export function formatSmartDate(dateStr)`：
    - 基于 moment.js，计算与今天的天数差
    - diff=0 → '今天'，diff=1 → '昨天'，diff<7 → '本周'，其余 → '更早'
  - 新增 `export function formatRelativeTime(dateStr)`：
    - <1分钟 → '刚刚'，<60分钟 → 'X分钟前'，今天 → 'HH:mm'，昨天 → '昨天 HH:mm'，<7天 → 'X天前'，更早 → 'MM-DD'
  - 改造 `groupRecordsByDate(list)`：
    - 内部调用 `formatSmartDate` 替代原有 `YYYY-MM-DD` 分组
    - 按 `['今天', '昨天', '本周', '更早']` 固定顺序输出
    - 保持返回结构 `{ date, children, count }` 不变
- **测试用例**：
  - 用例 1：`formatSmartDate(今天日期)` → `'今天'`
  - 用例 2：`formatSmartDate(昨天日期)` → `'昨天'`
  - 用例 3：`formatRelativeTime(30秒前)` → `'刚刚'`
  - 用例 4：`formatRelativeTime(5分钟前)` → `'5分钟前'`
  - 用例 5：`formatRelativeTime(昨天14:30)` → `'昨天 14:30'`
  - 用例 6：`groupRecordsByDate` 返回的 `date` 字段为 `'今天'/'昨天'/'本周'/'更早'`
- **依赖**：无

---

### Task 4：新建毛玻璃导航栏组件（对应阶段2-步骤2.1）

- **操作类型**：新增
- **涉及文件**：
  - `component/nav-bar/index.vue`（新增）
- **实现内容**：
  - Props：`title: { type: String, default: '' }`、`showBack: { type: Boolean, default: false }`、`showMenu: { type: Boolean, default: false }`
  - Events：`@menu-click`、`@back-click`
  - Slots：`right`（右侧自定义内容）
  - data：`statusBarHeight`（`uni.getSystemInfoSync().statusBarHeight`）、`isAndroid`（平台判断）
  - methods：`handleBack()` → `uni.navigateBack({ delta: 1 })`
  - 模板结构：
    ```
    <view class="nav-bar" :class="{ 'nav-bar--android': isAndroid }">
      <view class="nav-bar__content" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="nav-bar__left">
          <!-- showMenu: 菜单按钮(cuIcon-sort) @tap emit menu-click -->
          <!-- showBack: ← 返回 @tap handleBack -->
        </view>
        <view class="nav-bar__title">{{ title }}</view>
        <view class="nav-bar__right"><slot name="right"></slot></view>
      </view>
    </view>
    ```
  - 样式：
    - 高度：statusBarHeight + 44px
    - 背景：`@include glass-bg(0.72)`
    - 安卓降级 `.nav-bar--android`：`background: rgba(255,255,255,0.95); backdrop-filter: none`
    - 标题：`600 17px #1C1C1E`
    - 返回按钮：`#007AFF`
- **测试用例**：
  - 用例 1：`<nav-bar title="测试" showBack />` → 显示"← 返回"+ 居中标题"测试"
  - 用例 2：点击返回 → 执行 `uni.navigateBack`
  - 用例 3：`<nav-bar showMenu />` → 显示菜单按钮而非返回按钮
  - 用例 4：iOS 环境毛玻璃效果渲染正常
- **依赖**：Task 1（tokens.scss 中的 glass-bg mixin）

---

### Task 5：全站替换 cu-custom 为 nav-bar（对应阶段2-步骤2.2）

- **操作类型**：修改
- **涉及文件**：
  - `pages/home/index.vue`（修改）— `<cu-custom bgColor="bg-gradual-blue">` → `<nav-bar showMenu @menu-click="openSidebar">`
  - `subpackage/depart/form.vue`（修改）— → `<nav-bar title="编辑记录" showBack>`
  - `subpackage/depart/detail.vue`（修改）— → `<nav-bar title="记录详情" showBack>`
  - `subpackage/depart/learn-result.vue`（修改）— → `<nav-bar title="学习结果" showBack>`
  - `subpackage/depart/learn-result-detail.vue`（修改）— → `<nav-bar title="学习详情" showBack>`
  - `subpackage/summarize/index.vue`（修改）— → `<nav-bar title="编辑内容" showBack>`
  - `subpackage/dictCategory/index.vue`（修改）— → `<nav-bar title="标签管理" showBack>`
  - `subpackage/dictCategory/form.vue`（修改）— → `<nav-bar title="编辑标签" showBack>`
  - `subpackage/changelog/index.vue`（修改）— → `<nav-bar title="更新日志" showBack>`
- **实现内容**：
  - 每个页面：
    1. `import navBar from '@/component/nav-bar/index.vue'` 并注册组件
    2. 将 `<cu-custom ...>` 替换为 `<nav-bar ...>`
    3. 移除 cu-custom 的 slot 内容（如 `slot="content"` 中的自定义内容）
    4. 若原 cu-custom 有右侧按钮（如 detail.vue 的 `···`），改用 nav-bar 的 `right` slot
    5. 确保页面顶部间距不变（nav-bar 高度与 cu-custom 一致）
  - 各页面右侧 slot 处理：
    - detail.vue：保留 `···` 菜单按钮，放入 `<template #right>`
    - 其余页面：无右侧内容
- **测试用例**：
  - 用例 1：全站无 `bg-gradual-blue` / `bg-gradual-orange` / `bg-gradual-pink` 残留
  - 用例 2：每个页面标题正确显示
  - 用例 3：每个子页面返回按钮功能正常
  - 用例 4：页面布局无高度塌陷（与替换前一致）
- **依赖**：Task 4

---

### Task 6：新建侧边栏组件（对应阶段3-步骤3.1）

- **操作类型**：新增
- **涉及文件**：
  - `component/sidebar/index.vue`（新增）
- **实现内容**：
  - Props：
    - `visible: { type: Boolean, default: false }`
    - `tagList: { type: Array, default: () => [] }`
    - `recordCount: { type: Number, default: 0 }`
    - `isGuest: { type: Boolean, default: true }`
  - Events：`@close`、`@tag-select(tagId)`、`@quick-action(action)`、`@navigate(url)`
  - data：`selectedTagId: ''`（默认空=全部）
  - 模板结构：
    ```
    <view v-if="visible" class="sidebar-overlay" @tap="$emit('close')">
      <view class="sidebar" :class="{ 'sidebar--visible': visible }" @tap.stop>
        <!-- 头部：头像 + "我的知识库" + 记录统计 -->
        <!-- 游客提示：isGuest 时显示登录提示 -->
        <!-- 标签筛选区域：tagList 遍历，显示彩色圆点+名称+记录数 -->
        <!-- 快捷操作：拍照识别/导入链接/AI辅导历史 -->
        <!-- 其他：标签管理/更新日志/联系客服/QQ交流群 -->
        <!-- 底部版本号 -->
      </view>
    </view>
    ```
  - 样式：
    - 宽度 78%（约 290px）
    - 背景 `rgba(247,247,250,0.92)` + `backdrop-filter: blur(48px)`
    - 遮罩 `rgba(0,0,0,0.28)`
    - 打开动画 `transform: translateX(-100%) → translateX(0)`，`$duration-normal $ease-out`
    - 选中态 `background: rgba(0,122,255,0.10)`，文字 `#007AFF`
  - 标签筛选区域每项点击：`$emit('tag-select', tag._id || '')` + `$emit('close')`
  - 快捷操作点击：`$emit('quick-action', 'ocr'|'link'|'ai-history')`
  - 其他项点击：`$emit('navigate', url)`
- **测试用例**：
  - 用例 1：`visible=true` → 侧边栏从左滑入显示
  - 用例 2：点击遮罩 → emit close 事件
  - 用例 3：点击标签项 → emit tag-select + close
  - 用例 4：`isGuest=true` → 显示登录提示区域
  - 用例 5：点击快捷操作 → emit quick-action
- **依赖**：Task 1（Tokens）、Task 2（tagColors）

---

### Task 7：改造 record-card 组件（对应阶段3-步骤3.2）

- **操作类型**：修改
- **涉及文件**：
  - `component/record-card/index.vue`（修改）
- **实现内容**：
  - 左侧色条：卡片根元素添加 `position: relative; overflow: hidden`，通过子 `<view class="card-bar" :style="{ background: barColor }">` 实现（不用伪元素，小程序兼容性更好）
  - `barColor` computed：取 `record.tags[0]` → 从 tagList 找索引 → `getTagColor(index).bar`
  - 标签样式：将 `tagColorClasses[index % 12]` ColorUI 类名替换为内联 `:style="{ background: getTagColor(i).bg, color: getTagColor(i).text }"`
  - 移除右上角 `···` 更多按钮（`@tap.stop="$emit('more-click', ...)"`）
  - 根元素添加 `@longpress="$emit('card-longpress', $event, record)"`
  - AI 角标：从 `<view class="cuIcon-ai">` 改为胶囊样式 `<view class="ai-badge">✨ AI笔记 {{ aiNoteCount }}篇</view>`，样式：`background: rgba(255,149,0,0.08); color: #FF9500; border-radius: 6px`
  - 时间格式：将 `formatTime(record.createTime)` 改为 `formatRelativeTime(record.createTime)`
  - import 更新：引入 `getTagColor` 替代 `tagColorClasses`，引入 `formatRelativeTime` 替代 `formatTime`
  - 新增 Event：`@card-longpress(e, record)`
- **测试用例**：
  - 用例 1：卡片左侧显示 3px 色条，颜色与第一个标签色板一致
  - 用例 2：标签显示为独立色值胶囊（非 ColorUI 类名）
  - 用例 3：长按卡片 → emit card-longpress 事件
  - 用例 4：无 `···` 更多按钮
  - 用例 5：AI 角标为胶囊样式
  - 用例 6：时间显示为相对时间（如"5分钟前"）
- **依赖**：Task 2（tagColors）、Task 3（formatRelativeTime）

---

### Task 8：重构首页布局（对应阶段3-步骤3.3）

- **操作类型**：修改
- **涉及文件**：
  - `pages/home/index.vue`（修改）
- **实现内容**：
  - 删除原有 `cu-modal drawer-modal` 代码块（约第 92-143 行），替换为 `<sidebar>` 组件
  - 新增 data：`sidebarVisible: false`、`selectedTagId: ''`
  - 新增 methods：
    - `openSidebar()` / `closeSidebar()`
    - `handleTagSelect(tagId)` — 设置 selectedTagId + 过滤列表 + 关闭侧边栏
    - `filterRecordsByTag(tagId)` — 若 tagId 为空返回全部，否则 `recordList.filter(r => r.tags && r.tags.includes(tagId))`
  - 标签筛选横滑条：在搜索栏下方新增 `<scroll-view scroll-x>` 区域
    - 数据来源：`getDictCategoryList()` 返回的标签列表
    - 默认选中"全部"
    - 点击标签 → `selectedTagId = tagId` + 过滤列表
    - 选中态 `background: #007AFF; color: #fff`，未选中态 `background: rgba(118,118,128,0.08)`
  - 搜索栏：菜单按钮 + 搜索输入框，替代原 cu-custom 中的搜索图标
  - 日期分组头：去掉原有日历图标+蓝色背景块，改为 `<text class="section-date-title">{{ group.date }}</text>`，样式 `font-size: 11px; font-weight: 700; color: #8E8E93; text-transform: uppercase`
  - FAB 触发改为打开 Sheet（Sheet 尚未开发时先用 `showSheetDialog: true` 占位）
  - record-card 事件处理：
    - `@card-tap` → 保持原有 goDetail 逻辑
    - `@card-longpress` → 弹出 context-popup（编辑/删除）
    - 移除 `@more-click` 处理
  - 长按菜单：引入 `context-popup` 组件，在 `card-longpress` 事件中调用 `this.$refs.contextPopup.show(e, record)`
  - 背景色改为 `$color-bg-page (#F2F2F7)`
- **测试用例**：
  - 用例 1：点击菜单按钮 → 侧边栏打开；点击遮罩 → 关闭
  - 用例 2：标签筛选横滑条点击 → 列表按标签过滤
  - 用例 3：日期分组显示"今天/昨天/本周/更早"
  - 用例 4：长按卡片 → 弹出编辑/删除菜单
  - 用例 5：编辑 → 跳转 form 页，删除 → 弹出确认框
  - 用例 6：原有 drawer-modal 代码已删除
- **依赖**：Task 5（nav-bar 替换）、Task 6（sidebar）、Task 7（record-card）

---

### Task 9：改造 FAB 按钮（对应阶段4-步骤4.1）

- **操作类型**：修改
- **涉及文件**：
  - `component/fab-button/index.vue`（修改）
- **实现内容**：
  - 背景色：`linear-gradient(135deg, #39b54a, #8dc63f)` → `$color-primary (#007AFF)`
  - 圆角：`border-radius: 50%` → `border-radius: 16px`
  - 阴影：`box-shadow: 0 6rpx 16rpx rgba(57,181,74,0.4)` → `box-shadow: 0 4px 16px rgba(0,122,255,0.35)`
  - 尺寸保持 56px × 56px 不变
  - 图标保持 `+` 白色
- **测试用例**：
  - 用例 1：FAB 颜色为 #007AFF
  - 用例 2：FAB 为圆角方形（非圆形）
  - 用例 3：阴影为蓝色调
  - 用例 4：点击仍 emit click 事件
- **依赖**：Task 1（Tokens）

---

### Task 10：新建快速创建 Sheet 组件（对应阶段4-步骤4.2）

- **操作类型**：新增
- **涉及文件**：
  - `component/create-sheet/index.vue`（新增）
- **实现内容**：
  - Props：`visible: Boolean`、`tagMap: Object`
  - Events：`@close`、`@submit({ title, tags, inputMethod })`
  - data：`title: ''`、`selectedTags: []`、`inputMethod: ''`（'manual'|'ocr'|'link'）
  - computed：`canSubmit` — `title.trim() !== '' && selectedTags.length > 0 && inputMethod !== ''`
  - 模板结构：
    ```
    <view v-if="visible" class="sheet-overlay" @tap="$emit('close')">
      <view class="sheet" :class="{ 'sheet--visible': visible }" @tap.stop>
        <!-- 把手：36px × 5px，rgba(60,60,67,0.16)，圆角 3px -->
        <!-- 标题：新建记录 -->
        <!-- 标题输入：input + 字数统计/50 -->
        <!-- 标签选择：tagMap 遍历，胶囊多选 -->
        <!-- 输入方式三选一：手动输入/拍照识别/导入链接 -->
        <!-- 保存按钮：canSubmit 控制禁用态 -->
      </view>
    </view>
    ```
  - 标签选择逻辑：点击胶囊 → toggle selectedTags（已选则移除，未选则添加）
  - 输入方式选择：点击卡片 → 设置 inputMethod，选中态显示蓝色边框
  - 保存按钮：`canSubmit` 为 false 时 opacity: 0.5 + 禁止点击
  - 样式：
    - 最大高度 75vh
    - 底部安全区 `padding-bottom: calc(40rpx + env(safe-area-inset-bottom))`
    - 背景 #FFFFFF，顶部圆角 20px
    - 打开动画 `transform: translateY(100%) → translateY(0)`，`$duration-slow $ease-out`
  - 提交时 `$emit('submit', { title, tags: selectedTags, inputMethod })`
- **测试用例**：
  - 用例 1：`visible=true` → Sheet 从底部滑入
  - 用例 2：标题为空 + 无标签 + 无方式 → 保存按钮禁用
  - 用例 3：填写标题 + 选择标签 + 选择方式 → 保存按钮可用，emit submit
  - 用例 4：点击遮罩 → emit close
  - 用例 5：标签胶囊多选正确 toggle
  - 用例 6：输入方式三选一，选中另一个自动取消前一个
- **依赖**：Task 1（Tokens）、Task 2（tagColors）

---

### Task 11：集成 Sheet 到首页（对应阶段4-步骤4.3）

- **操作类型**：修改
- **涉及文件**：
  - `pages/home/index.vue`（修改）
- **实现内容**：
  - 引入 `create-sheet` 组件
  - 新增 data：`sheetVisible: false`
  - FAB 点击事件改为 `sheetVisible = true`
  - 模板添加 `<create-sheet :visible="sheetVisible" :tagMap="tagMap" @close="sheetVisible = false" @submit="handleSheetSubmit" />`
  - 新增 method `handleSheetSubmit({ title, tags, inputMethod })`：
    - `manual`：`uni.navigateTo({ url: '/subpackage/summarize/index' })`，通过 eventChannel 或 Vuex 传递 title+tags
    - `ocr`：调用现有 OCR 流程（`handleOcr` 逻辑提取为独立函数）
    - `link`：弹出链接输入框（`handleLinkImport` 逻辑）
  - 提交后 `sheetVisible = false`
  - 移除原有 `addRecord` 方法中的 `navigateTo('/subpackage/depart/form?type=add')` 跳转
- **测试用例**：
  - 用例 1：FAB 点击 → Sheet 弹出
  - 用例 2：Sheet 提交"手动输入" → 跳转编辑页
  - 用例 3：Sheet 提交"拍照识别" → 触发 OCR
  - 用例 4：Sheet 提交"导入链接" → 弹出链接输入框
  - 用例 5：Sheet 关闭后首页状态正常
- **依赖**：Task 8（首页重构）、Task 9（FAB 改造）、Task 10（Sheet 组件）

---

### Task 12：详情页 Tip 工具栏 + 移除旧按钮（对应阶段5-步骤5.1）

- **操作类型**：修改
- **涉及文件**：
  - `subpackage/depart/detail.vue`（修改）
- **实现内容**：
  - 导航栏下方新增 Tip 工具栏 `<scroll-view scroll-x class="detail-tips">`：
    - 5 个胶囊按钮：编辑（灰）/ AI辅导（橙）/ 下载（蓝）/ 分享（绿）/ 删除（红）
    - 每个按钮样式：`padding: 5px 12px; border-radius: 16px; font-size: 12px; font-weight: 500`
    - 各按钮颜色按 Design 中的规范（边框色+背景色+文字色）
  - 移除原有底部工具栏区域中的独立 download-btn、ai-btn、share-btn
  - 保留分享弹窗（有效期选择），触发方式从原 share-btn 改为 Tip 中的"分享"按钮
  - 编辑按钮：`uni.navigateTo({ url: '/subpackage/depart/form?type=update&id=' + id })`
  - AI辅导按钮：调用现有 `handleAiLearn` 逻辑
  - 下载按钮：调用现有 `downloadDocument` 逻辑
  - 分享按钮：调用现有分享弹窗打开逻辑
  - 删除按钮：弹出 `uni.showModal` 确认 → 调用删除逻辑
  - 导航栏右侧保留 `···` 菜单按钮（通过 nav-bar 的 right slot），包含完整操作列表
- **测试用例**：
  - 用例 1：Tip 工具栏显示 5 个按钮，水平可滚动
  - 用例 2：点击"编辑" → 跳转编辑页
  - 用例 3：点击"AI辅导" → 触发 AI 生成流程
  - 用例 4：点击"下载" → 下载 Markdown 文件
  - 用例 5：点击"分享" → 弹出有效期选择弹窗
  - 用例 6：点击"删除" → 弹出确认框 → 确认后删除
  - 用例 7：原有底部独立按钮已移除
- **依赖**：Task 5（nav-bar 替换）

---

### Task 13：详情页 AI 笔记内联展示（对应阶段5-步骤5.2）

- **操作类型**：修改
- **涉及文件**：
  - `subpackage/depart/detail.vue`（修改）
- **实现内容**：
  - 新增 data：`aiResults: []`、`noteResults: []`、`exerciseResults: []`、`isAiProcessing: false`
  - 新增 method `loadAiResults()`：
    - 调用 `getLearnResultList({ recordId: this.recordId })`
    - 过滤 `type === 'note' && status === 'success'` → noteResults
    - 过滤 `type === 'exercise' && status === 'success'` → exerciseResults
    - 检查 `status === 'pending' || 'processing'` → isAiProcessing
  - 在 `onLoad` 或 `mounted` 中调用 `loadAiResults()`
  - 新增 method `getAiSummary(content, maxLen=100)`：截取 AI 结果前 N 字符
  - 新增 method `goToAiDetail(logId)`：`uni.navigateTo({ url: '/subpackage/depart/learn-result-detail?id=' + logId })`
  - 模板：在标题+标签区域下方、总结内容上方插入 AI 卡片：
    ```vue
    <view v-if="noteResults.length || exerciseResults.length || isAiProcessing" class="ai-card">
      <view v-if="isAiProcessing" class="ai-loading">AI 正在生成中...</view>
      <template v-else>
        <view class="ai-header">✨ AI 学习笔记</view>
        <view v-for="note in noteResults" class="ai-result-item">...</view>
        <view v-for="ex in exerciseResults" class="ai-result-item">...</view>
      </template>
    </view>
    ```
  - AI 卡片样式：`background: rgba(255,149,0,0.05); border: 1px solid rgba(255,149,0,0.1); border-radius: $radius-card`
  - 移除原有独立 AI 结果入口区域（`hasAiResult` / `hasPendingAi` 区块）
- **测试用例**：
  - 用例 1：有 AI 结果 → 显示 AI 卡片（精讲+练习摘要）
  - 用例 2：无 AI 结果 → 不显示 AI 卡片区域
  - 用例 3：AI 正在生成 → 显示"AI 正在生成中..."
  - 用例 4：点击"查看完整笔记" → 跳转 learn-result-detail
  - 用例 5：原有独立 AI 结果入口已移除
- **依赖**：Task 12（详情页 Tip 工具栏）

---

### Task 14：详情页阅读时间 + 标题样式 + 代码块（对应阶段5-步骤5.3、5.4）

- **操作类型**：修改
- **涉及文件**：
  - `subpackage/depart/detail.vue`（修改）
- **实现内容**：
  - 新增 computed `readingTime`：
    ```js
    readingTime() {
      const content = this.summaryContent || ''
      const charCount = content.replace(/\s/g, '').length
      return Math.max(1, Math.ceil(charCount / 300)) + ' 分钟阅读'
    }
    ```
  - 标题样式：从原有 `text-lg` 改为 `font-size: 28px; font-weight: 700; color: #1C1C1E; line-height: 1.3`
  - 标题下方元数据行：`createTime` + `·` + `readingTime` + `·` + 标签胶囊（独立色值）
  - 标签胶囊：从 ColorUI 类名改为 `:style="{ background: getTagColor(i).bg, color: getTagColor(i).text }"`
  - 代码块样式覆盖（towxml 渲染后的样式）：
    - 行内代码：`background: rgba(118,118,128,0.12); padding: 2px 6px; border-radius: 6px; color: #FF3B30`
    - 代码块：`background: #1C1C1E; color: #E5E5EA; padding: 16px; border-radius: 12px; font-size: 14px`
  - 总结内容区去掉白色卡片包裹，改为全宽直接展示
  - import 更新：引入 `getTagColor`、`formatRelativeTime`
- **测试用例**：
  - 用例 1：标题区域显示 28px 粗体标题
  - 用例 2：元数据行显示时间 + 阅读时间 + 标签
  - 用例 3：阅读时间 = ceil(content长度/300) 分钟
  - 用例 4：代码块深色背景 + 浅色文字
  - 用例 5：行内代码浅灰背景 + 红色文字
- **依赖**：Task 2（tagColors）、Task 3（formatRelativeTime）、Task 5（nav-bar）

---

### Task 15：表单页视觉更新（对应阶段6-步骤6.1）

- **操作类型**：修改
- **涉及文件**：
  - `subpackage/depart/form.vue`（修改）
- **实现内容**：
  - 表单卡片圆角：`24rpx` → `16px`（替换 border-radius 引用）
  - 标签选择区域：ColorUI 类名 → 独立色值 `:style` 绑定（引入 `getTagColor`）
  - 提交按钮：`bg-gradual-blue` → `background: #007AFF` 实色
  - 输入框焦点样式：保持蓝色边框 + 浅蓝阴影，统一使用 Token 变量
  - 背景色统一为 `$color-bg-page (#F2F2F7)`
- **测试用例**：
  - 用例 1：表单卡片圆角为 16px
  - 用例 2：标签为独立色值胶囊
  - 用例 3：提交按钮为 #007AFF 实色
  - 用例 4：新建/编辑记录流程功能正常
- **依赖**：Task 2（tagColors）、Task 5（nav-bar）

---

### Task 16：Markdown 编辑页视觉更新（对应阶段6-步骤6.2）

- **操作类型**：修改
- **涉及文件**：
  - `subpackage/summarize/index.vue`（修改）
- **实现内容**：
  - 编辑区域背景：去掉蓝色背景，改为纯白 `#FFFFFF`
  - 底部工具栏：添加毛玻璃背景 `@include glass-bg(0.96)`
  - 页面背景色统一为 `#FFFFFF`
- **测试用例**：
  - 用例 1：编辑区域为纯白背景
  - 用例 2：底部工具栏为毛玻璃效果
  - 用例 3：Markdown 编辑/预览功能正常
- **依赖**：Task 5（nav-bar）

---

### Task 17：AI 学习结果页视觉更新（对应阶段6-步骤6.3、6.4）

- **操作类型**：修改
- **涉及文件**：
  - `subpackage/depart/learn-result.vue`（修改）
  - `subpackage/depart/learn-result-detail.vue`（修改）
- **实现内容**：
  - learn-result.vue：
    - 背景色 `linear-gradient(...)` → `#F2F2F7`
    - 卡片圆角 `24rpx` → `16px`
    - 类型徽章圆角 `8rpx` → `8px`
    - 空状态：去掉大图标，改为居中文字提示"暂无学习结果"
  - learn-result-detail.vue：
    - 背景色 → `#F2F2F7`
    - 代码块样式同步 Task 14 的深色代码块样式
- **测试用例**：
  - 用例 1：AI 结果列表页背景为 #F2F2F7
  - 用例 2：卡片圆角为 16px
  - 用例 3：空状态显示居中文字
  - 用例 4：AI 结果详情页背景为 #F2F2F7
  - 用例 5：详情页代码块深色背景正常
- **依赖**：Task 5（nav-bar）

---

### Task 18：标签管理页重构（对应阶段6-步骤6.5、6.6）

- **操作类型**：修改
- **涉及文件**：
  - `subpackage/dictCategory/index.vue`（修改）
  - `subpackage/dictCategory/form.vue`（修改）
- **实现内容**：
  - index.vue：
    - 布局：双列网格（现有 `<view class="cu-list menu-card-grid">` 或类似 grid 布局）→ 单列列表
    - 列表项结构：`<view class="tag-item">` → 左侧彩色圆点 `<view class="tag-dot">` + 标签名 + 记录数 + 最近更新时间 + 右箭头
    - 公共标签：从混合列表中分离，新增独立区块 `<view class="tag-section-title">公共标签</view>` + 灰色胶囊
    - 标签关联记录数：新增 computed `tagRecordCounts`，遍历 recordList 统计每个标签的记录数
    - 最近更新时间：新增 computed `tagLastUpdates`，遍历 recordList 取每个标签最新记录的 createTime，格式化为相对时间
    - FAB 按钮样式改造：颜色→#007AFF、圆角→16px（同 Task 9）
    - 背景色 → `#F2F2F7`
    - 标签颜色：ColorUI 类名 → `getTagColor` 独立色值
  - form.vue：
    - 输入框样式同步 Task 15（圆角 16px）
    - 背景色统一
- **测试用例**：
  - 用例 1：标签列表为单列布局
  - 用例 2：每个标签项显示彩色圆点+名称+记录数+更新时间
  - 用例 3：公共标签在独立区块中显示为灰色胶囊
  - 用例 4：长按标签弹出编辑/删除菜单
  - 用例 5：FAB 颜色为 #007AFF
  - 用例 6：新增/编辑标签功能正常
- **依赖**：Task 2（tagColors）、Task 3（formatRelativeTime）、Task 5（nav-bar）

---

### Task 19：更新日志页视觉更新（对应阶段6-步骤6.7）

- **操作类型**：修改
- **涉及文件**：
  - `subpackage/changelog/index.vue`（修改）
- **实现内容**：
  - 背景色 `#ffffff` → `#F2F2F7`
  - 日志卡片圆角统一为 `16px`
  - QQ 交流群区域圆角统一为 `12px`
  - 间距统一使用 Token 变量
- **测试用例**：
  - 用例 1：背景为 #F2F2F7
  - 用例 2：卡片圆角为 16px
  - 用例 3：更新日志列表功能正常
- **依赖**：Task 5（nav-bar）

---

### Task 20：ColorUI 依赖清理（对应阶段7）

- **操作类型**：修改 / 删除
- **涉及文件**：
  - 全局搜索涉及的文件（根据搜索结果确定）
- **实现内容**：
  - 全局搜索 `bg-gradual-blue`、`bg-gradual-orange`、`bg-gradual-pink`、`shadow-warp`、`tagColorClasses` — 确认无残留引用
  - 全局搜索 `cu-custom` — 确认已全部替换为 nav-bar
  - 检查 `tagColorClasses` 和 `getTagColorClass` 是否仍被引用：
    - 若无引用 → 从 `utils/tagColors.js` 中删除 deprecated 函数
    - 若仍有引用 → 保留但标记 @deprecated
  - 检查 `colorui/` 目录中仍被使用的组件：
    - cuIcon 图标类名（如 `cuIcon-sort`、`cuIcon-search`）→ 保留
    - 其他已不用的 ColorUI 组件 → 确认最小依赖集
  - 最终视觉回归检查：
    - 全站无硬编码色值（除 tokens.scss 外）
    - 间距符合 8pt 网格
    - 圆角统一（卡片 16px、按钮 12px、标签 6px、胶囊 20px）
- **测试用例**：
  - 用例 1：全局搜索 `bg-gradual-blue` → 0 结果
  - 用例 2：全局搜索 `shadow-warp` → 0 结果
  - 用例 3：全局搜索 `cu-custom` → 0 结果（除可能的注释）
  - 用例 4：全站功能回归测试通过
- **依赖**：Task 15、16、17、18、19（所有页面改造完成）

## 变更记录

| 日期 | 作者 | 变更内容 |
|------|------|---------|
| 2026-05-13 | yuanchuang | 初始版本，20 个 Task，覆盖 7 个实施阶段 |
