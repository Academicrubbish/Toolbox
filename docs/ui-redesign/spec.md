---
title: UI 全站重构（Apple HIG 视觉升级）
parent:
status: draft
created: 2026-05-13
updated: 2026-05-13
author: yuanchuang
---

## 背景

Toolbox 小程序当前全站使用 ColorUI 渐变蓝导航栏，页面间缺乏视觉区分度；新建记录需 3 次页面跳转，流程割裂；首页无标签筛选能力；导航功能集中在隐蔽的左侧抽屉中。这些问题导致用户体验不佳，AI 功能感知弱。

本次重构旨在基于 Apple HIG 设计语言，对全部 9 个页面进行布局、交互、样式统一升级，同时精简创建流程、增强 AI 功能感知。

原型参考：`docs/proposal-d-final.html`
需求详情：`docs/ui-redesign-prd.md`

## 目标

1. **视觉升级**：采用 Apple HIG 设计语言，建立 Design Tokens 体系，全站统一毛玻璃导航栏
2. **交互精简**：新建记录从 3 步降至 1 步（Sheet）或 2 步（沉浸编辑）
3. **导航重构**：侧边栏替代抽屉，承载标签筛选 + 快捷操作 + 设置
4. **AI 感知增强**：AI 笔记内联展示在详情页，首页卡片展示 AI 角标
5. **代码层面**：逐步替换 ColorUI，建立项目自有设计变量系统

## 范围

### 在范围内

- Design Tokens 体系建立（`styles/tokens.scss`）
- 全站 9 个页面的视觉和交互重构
- 3 个新组件：`nav-bar`、`sidebar`、`create-sheet`
- 2 个组件改造：`record-card`、`fab-button`
- 标签色板重构（`utils/tagColors.js`）
- 时间格式化增强（`utils/format.js`）

### 不在范围内

- 不新增功能模块（知识图谱、暗色模式等作为后续迭代）
- 不修改后端云函数和数据库结构
- 不更换 Markdown 编辑器（towxml / md-editor 保持现有）
- 不更换技术栈（仍基于 uni-app Vue 2）
- 沉浸式编辑页的"/"命令面板作为后续迭代

## 功能描述

### F1. Design Tokens 体系

**优先级：P0**

新建 `styles/tokens.scss`，统一管理全局设计变量：
- 颜色 Token（primary、success、warning、error、text、bg、border 等）
- 圆角 Token（card 16px、button 12px、tag 6px、pill 20px）
- 间距 Token（8pt 网格：4/8/16/24/32/48px）
- 字体 Token（page-title、section-title、card-title、body 等）
- 阴影 Token（card、sidebar、fab、sheet）
- 动画 Token（fast 150ms、normal 250ms、slow 350ms）

验收标准：
- [ ] 所有页面无硬编码色值，全部引用 Token 变量
- [ ] Token 文件包含完整的颜色、圆角、间距、字体、阴影、动画定义

### F2. 导航栏统一（cu-custom → nav-bar）

**优先级：P0**

| 改动 | 说明 |
|------|------|
| 替换 cu-custom | 新建 `component/nav-bar/index.vue` |
| 样式统一 | 半透明毛玻璃：`rgba(255,255,255,0.72)` + `backdrop-filter: blur(24px)` |
| 首页导航栏 | 右侧无内容，左侧为菜单按钮（打开侧边栏） |
| 子页面导航栏 | 左侧"← 返回"，中间页面标题 |
| 取消彩色导航栏 | 不再使用 `bg-gradual-blue` / `bg-gradual-orange` / `bg-gradual-pink` |

验收标准：
- [ ] 全站无 ColorUI 渐变蓝导航栏
- [ ] 所有导航栏为毛玻璃效果（或安卓纯色半透明降级）
- [ ] 首页左侧菜单按钮可打开侧边栏
- [ ] 子页面返回按钮功能正常

### F3. 侧边栏组件（sidebar）

**优先级：P1**

新建 `component/sidebar/index.vue`，替代现有左侧抽屉。

| 区域 | 内容 |
|------|------|
| 头部 | 用户头像 + "我的知识库" + 记录统计 |
| 标签筛选 | 全部记录（默认）/ 各标签（显示记录数），点击关闭侧边栏并过滤 |
| 快捷操作 | 拍照识别 / 导入链接 / AI辅导历史 |
| 其他 | 标签管理 / 更新日志 / 联系客服 / QQ交流群 |

视觉规范：
- 宽度：屏幕 78%（约 290px）
- 背景：`rgba(247,247,250,0.92)` + `backdrop-filter: blur(48px)`
- 遮罩：`rgba(0,0,0,0.28)`
- 打开动画：左侧滑入 `250ms ease-out`
- 选中态：`background: rgba(0,122,255,0.10)`，文字变蓝

验收标准：
- [ ] 点击首页菜单按钮打开侧边栏
- [ ] 点击遮罩关闭侧边栏
- [ ] 标签筛选点击后关闭侧边栏，首页列表按标签过滤
- [ ] 快捷操作跳转正确
- [ ] 游客状态显示登录提示

### F4. 首页重构

**优先级：P1**

| 改动项 | 说明 |
|--------|------|
| 导航区 | 去掉 cu-custom，改为搜索栏 + 菜单按钮 |
| 标签筛选横滑条 | 新增，搜索栏下方，横向滚动标签胶囊 |
| 日期分组 | `YYYY-MM-DD` → 今天 / 昨天 / 本周 / 更早 |
| 日期分组头 | 去掉日历图标+蓝色背景块，改为纯文字小标题 |
| 左侧抽屉 | 替换为 sidebar 组件 |
| FAB 触发 | 改为打开 Sheet |
| 长按菜单 | 替代右上角"···"图标的 context-popup |

验收标准：
- [ ] 标签筛选横滑条可点击过滤
- [ ] 日期分组显示"今天/昨天/本周/更早"
- [ ] 长按卡片弹出编辑/删除菜单
- [ ] 侧边栏替代原有抽屉

### F5. 快速创建 Sheet（create-sheet）

**优先级：P2**

新建 `component/create-sheet/index.vue`，替代 FAB 点击后的页面跳转。

| 区域 | 说明 |
|------|------|
| 标题输入 | uni-easyinput，最多 50 字，右下角字数统计 |
| 标签选择 | 从 tagMap 渲染标签胶囊，支持多选 |
| 内容输入方式 | 三选一：手动输入 / 拍照识别 / 导入链接 |
| 保存按钮 | 校验标题非空 + 至少一个标签 + 内容输入方式已选 |

视觉规范：
- 顶部把手：`36px × 5px`，`rgba(60,60,67,0.16)`，圆角 3px
- 最大高度：屏幕 75%
- 底部安全区：`padding-bottom: calc(40rpx + env(safe-area-inset-bottom))`
- 打开动画：底部滑入 `350ms ease-out`

验收标准：
- [ ] FAB 点击弹出 Sheet
- [ ] 标题输入 + 标签选择 + 输入方式三选一
- [ ] 校验逻辑正确（标题非空 + 至少一个标签 + 方式已选）
- [ ] "手动输入"跳转编辑页，"拍照识别"调用 OCR，"导入链接"弹出输入框
- [ ] Sheet 关闭/打开动画流畅

### F6. record-card 改造

**优先级：P1**

| 改动项 | 现有 | 改为 |
|--------|------|------|
| 整体样式 | 白色圆角卡片 + ColorUI shadow-warp | 白色卡片 + 左侧 3px 色条 + $shadow-card |
| 标签样式 | ColorUI 类名 `bg-red light` | 独立色值 tagColors |
| 更多操作按钮 | 右上角 `···` 图标 | 移除，改为长按卡片弹出菜单 |
| AI 角标 | 底部显示 | 保持底部，样式改为胶囊标签 |
| 时间格式 | `HH:mm` | 相对时间 |

验收标准：
- [ ] 卡片左侧色条颜色与标签色板一致
- [ ] 标签使用独立色值渲染
- [ ] 长按弹出编辑/删除菜单
- [ ] AI 角标为胶囊样式

### F7. fab-button 改造

**优先级：P2**

| 改动项 | 现有 | 改为 |
|--------|------|------|
| 颜色 | 绿色渐变 `#39b54a → #8dc63f` | iOS 蓝 `#007AFF` |
| 圆角 | 50%（圆形） | 16px（圆角方形） |
| 阴影 | 绿色阴影 | `0 4px 16px rgba(0,122,255,0.35)` |

验收标准：
- [ ] FAB 颜色为 #007AFF
- [ ] FAB 为圆角方形（16px）
- [ ] 阴影为蓝色调

### F8. 详情页重构

**优先级：P3**

| 改动项 | 说明 |
|--------|------|
| 导航栏 | `bg-gradual-blue` → 毛玻璃 |
| 顶部 Tip 工具栏 | 新增：编辑 / AI辅导 / 下载 / 分享 / 删除，水平滚动胶囊 |
| 标题区域 | 字号 `700 28px`，新增阅读时间估算 |
| AI 笔记内联展示 | 新增卡片区域，展示知识点精讲和针对性练习摘要 |
| 总结内容 | 去掉卡片包裹，全宽展示，代码块深色背景 |
| 底部工具栏 | 移除，所有操作通过 Tip 工具栏完成 |
| 分享弹窗 | 保持功能，圆角统一为 16px，选中态颜色改为蓝色 |

AI 笔记内联卡片数据来源：`getLearnResultList({ recordId })`，按 `type`（note/exercise）分组。

验收标准：
- [ ] Tip 工具栏所有按钮可点击且功能正常
- [ ] AI 笔记有结果时显示卡片，无结果时不显示
- [ ] AI 正在生成时显示加载态
- [ ] 代码块深色背景 + 浅色文字
- [ ] 阅读时间估算显示正确

### F9. 表单页视觉更新

**优先级：P4**

`subpackage/depart/form.vue` 视觉同步：
- 导航栏 `bg-gradual-blue` → 毛玻璃
- 表单卡片圆角 `24rpx` → `16px`
- 标签选择样式 ColorUI → 独立色值胶囊
- 提交按钮 `bg-gradual-blue` → `#007AFF` 实色

验收标准：
- [ ] 视觉与设计系统统一
- [ ] 表单功能不受影响

### F10. Markdown 编辑页视觉更新

**优先级：P4**

`subpackage/summarize/index.vue` 视觉同步：
- 导航栏 `bg-gradual-blue` → 毛玻璃
- 编辑区域去掉蓝色背景，改为纯白
- 底部工具栏统一毛玻璃背景

验收标准：
- [ ] 视觉与设计系统统一
- [ ] 编辑器功能不受影响

### F11. AI 学习结果页视觉更新

**优先级：P4**

`subpackage/depart/learn-result.vue`：
- 导航栏 `bg-gradual-orange` → 毛玻璃
- 背景色 `linear-gradient(...)` → `#F2F2F7`
- 卡片圆角 `24rpx` → `16px`
- 类型徽章圆角 `8rpx` → `8px`
- 空状态去掉大图标，改为居中文字

`subpackage/depart/learn-result-detail.vue`：
- 导航栏 → 毛玻璃
- 背景色 → `#F2F2F7`
- 代码块样式同步 F8

验收标准：
- [ ] 视觉与设计系统统一
- [ ] 功能不受影响

### F12. 标签管理重构

**优先级：P4**

`subpackage/dictCategory/index.vue`：
- 导航栏 `bg-gradual-pink` → 毛玻璃
- 布局：双列网格 → 单列列表
- 列表项：左侧彩色圆点 + 标签名 + 记录数 + 最近更新时间
- 公共标签：分离为独立区块，灰色胶囊展示
- FAB 颜色 → `#007AFF`，圆角 → 16px

`subpackage/dictCategory/form.vue`：
- 导航栏 → 毛玻璃
- 输入框样式同步表单页

验收标准：
- [ ] 单列列表布局正常
- [ ] 公共标签独立区块显示
- [ ] 标签关联记录数（前端遍历计算）

### F13. 更新日志视觉更新

**优先级：P4**

`subpackage/changelog/index.vue`：
- 导航栏 `bg-gradual-blue` → 毛玻璃
- 背景色 `#ffffff` → `#F2F2F7`
- 日志卡片圆角 `16px`
- QQ 交流群区域圆角统一

验收标准：
- [ ] 视觉与设计系统统一

### F14. 标签色板迁移 + ColorUI 依赖清理

**优先级：P5**

- `utils/tagColors.js`：从 ColorUI 类名重构为独立色值对象（bg、text、bar）
- `utils/format.js`：新增 `formatRelativeTime()` 和 `formatSmartDate()`
- 移除 `colorui/` 引用中已无用的部分

验收标准：
- [ ] 标签色板为独立色值对象
- [ ] `formatRelativeTime` 返回"3分钟前"/"昨天14:30"/"3天前"
- [ ] `formatSmartDate` 分组为"今天/昨天/本周/更早"
- [ ] 无残留 ColorUI 样式引用

## 页面文件对照表

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

## 新增/改造组件清单

| 组件 | 文件 | 类型 |
|------|------|------|
| 导航栏 | `component/nav-bar/index.vue` | 新建（替代 cu-custom） |
| 侧边栏 | `component/sidebar/index.vue` | 新建 |
| 快速创建 Sheet | `component/create-sheet/index.vue` | 新建 |
| 记录卡片 | `component/record-card/index.vue` | 改造 |
| FAB 按钮 | `component/fab-button/index.vue` | 改造 |
| 长按菜单 | `component/context-popup/index.vue` | 保持（触发方式变更） |

## 数据/接口影响

### 前端计算，无需后端改动

| 需求 | 实现方式 |
|------|---------|
| 首页标签筛选 | 前端过滤 recordList，按 tags 数组包含选中标签 ID |
| 相对时间格式化 | `utils/format.js` 新增 `formatRelativeTime()` |
| 阅读时间估算 | 详情页 computed 根据 content.length / 300 |
| AI 笔记内联展示 | 调用现有 `getLearnResultList` 接口 |
| 标签关联记录数 | 遍历记录列表统计（降级方案） |

### 建议后端优化（非必须）

| 需求 | 说明 |
|------|------|
| `getDictCategoryList` 返回记录统计 | 增加 recordCount 和 lastRecordTime 字段 |
| `getRecordList` 支持标签过滤 | 新增 tagId 参数 |

## 风险与降级

| 风险 | 降级方案 |
|------|---------|
| 毛玻璃效果低端安卓机性能差 | 安卓关闭 backdrop-filter，纯色半透明替代 |
| 侧边栏滑动与 z-paging 下拉冲突 | 侧边栏改为点击按钮开关，不响应滑动手势 |
| md-editor 无法一体化改造 | 保持现有编辑器，后续版本重构 |
| 标签关联记录数需遍历计算 | 首屏不显示记录数，异步计算后更新 |

## 验收标准

### 视觉验收

- [ ] 全站无 ColorUI 渐变蓝导航栏
- [ ] 所有导航栏为毛玻璃效果（或纯色半透明降级）
- [ ] 卡片左侧色条颜色与标签色板一致
- [ ] 间距符合 8pt 网格（8/16/24/32）
- [ ] 圆角统一：卡片 16px、按钮 12px、标签 6px、胶囊 20px
- [ ] 颜色全部使用 Tokens 变量，无硬编码色值

### 交互验收

- [ ] 侧边栏可正常打开/关闭，标签筛选生效
- [ ] FAB 点击弹出 Sheet，选择输入方式后流程正常
- [ ] 长按卡片弹出编辑/删除菜单
- [ ] 详情页 Tip 工具栏所有按钮可点击且功能正常
- [ ] AI 笔记在详情页内联展示，点击可跳转详情
- [ ] 页面间跳转流畅，无白屏闪烁

### 兼容性验收

- [ ] iOS 微信：毛玻璃效果正常
- [ ] 安卓微信：关闭毛玻璃降级方案正常
- [ ] 小屏幕设备（iPhone SE）：布局不溢出
- [ ] 大屏幕设备（iPhone 15 Pro Max）：布局无异常拉伸

### 性能验收

- [ ] 首页列表滚动流畅
- [ ] 侧边栏/Sheet 动画帧率 ≥ 30fps
- [ ] 内存无异常增长

## 变更记录

| 日期 | 作者 | 变更说明 |
|------|------|---------|
| 2026-05-13 | yuanchuang | 初始版本，基于 ui-redesign-prd.md 生成 |
