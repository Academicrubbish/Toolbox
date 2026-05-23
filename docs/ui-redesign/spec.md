---
title: UI 全站重构（Apple HIG 视觉升级）
status: in-progress
created: 2026-05-13
updated: 2026-05-15
author: yuanchuang
---

# UI 全站重构 Spec

## 背景

当前 Toolbox 小程序存在以下 8 个核心问题：

1. **全站统一渐变蓝导航栏**，页面间缺乏视觉区分度，用户无法通过视觉快速识别当前页面
2. **新建记录需 3 次页面跳转**（首页→表单→富文本编辑），流程割裂，用户容易中途流失
3. **首页无标签筛选能力**，只能靠搜索，标签系统价值未充分发挥
4. **导航功能集中在左侧抽屉**，入口隐蔽，标签管理、更新日志等低频功能难以被发现
5. **详情页操作按钮分散**（AI辅导、下载、分享各自独立），操作区域混乱，视觉噪声大
6. **AI 学习结果需多次跳转才能查看**，AI 功能感知弱，用户不知道自己有哪些学习产出
7. **标签管理使用双列网格**，信息密度低，标签多时需要大量滚动
8. **依赖 ColorUI 框架**，样式与设计系统脱节，无法统一管理 Design Tokens

基于以上问题，决定基于 Apple HIG 设计语言对全站进行视觉和交互重构。

原型参考：[proposal-d-final.html](./proposal-d-final.html)

## 目标

1. **视觉升级**：采用 Apple HIG 设计语言，建立统一的 Design Tokens 体系，全站统一毛玻璃导航栏
2. **交互精简**：新建记录从 3 步降至 1 步（Sheet）或 2 步（沉浸编辑）
3. **导航重构**：侧边栏替代抽屉，承载标签筛选 + 快捷操作 + 设置
4. **AI 感知增强**：AI 笔记内联展示在详情页，首页卡片展示 AI 角标
5. **代码层面**：逐步替换 ColorUI，建立项目自有设计变量系统

## 功能描述

### 格式一：功能点列表

#### F1. Design Tokens 体系

- 新建 `styles/tokens.scss`，统一管理全局设计变量
- 颜色 Token：primary (#007AFF)、success (#34C759)、warning (#FF9500)、error (#FF3B30)、text（5 级灰度）、bg（5 种场景）、border/divider
- 圆角 Token：card 16px、button 12px、tag 6px、pill 20px
- 间距 Token：8pt 网格（4/8/16/24/32/48px）
- 字体 Token：page-title、section-title、card-title、body、secondary、label
- 阴影 Token：card、sidebar、fab、sheet
- 动画 Token：fast 150ms、normal 250ms、slow 350ms、ease-out
- 毛玻璃 mixin：`@mixin glass-bg($opacity: 0.72)`

#### F2. 导航栏统一（cu-custom → nav-bar）

- 新建 `component/nav-bar/index.vue`，替代 `cu-custom`
- 样式：半透明毛玻璃 `rgba(255,255,255,0.72)` + `backdrop-filter: blur(24px)`
- 首页导航栏：左侧菜单按钮（打开侧边栏），右侧无内容
- 子页面导航栏：左侧"← 返回"，中间页面标题
- 安卓降级：关闭 `backdrop-filter`，使用 `rgba(255,255,255,0.95)` 纯色半透明
- 取消所有彩色导航栏（`bg-gradual-blue` / `bg-gradual-orange` / `bg-gradual-pink`）

#### F3. 侧边栏组件（sidebar）

- 新建 `component/sidebar/index.vue`，替代现有左侧抽屉
- 头部：用户头像 + "我的知识库" + 记录统计
- 标签筛选：全部记录（默认）/ 各标签（显示记录数），点击关闭侧边栏并过滤
- 快捷操作：拍照识别 / 导入链接 / AI辅导历史
- 其他：标签管理 / 更新日志 / 联系客服 / QQ交流群
- 视觉规范：宽度 78%（约 290px）、背景 `rgba(247,247,250,0.92)` + `backdrop-filter: blur(48px)`、遮罩 `rgba(0,0,0,0.28)`、打开动画左侧滑入 250ms、选中态 `background: rgba(0,122,255,0.10)`

#### F4. 首页重构

- 导航区：去掉 cu-custom，改为搜索栏 + 菜单按钮
- 标签筛选横滑条：搜索栏下方，横向滚动标签胶囊，点击过滤
- 日期分组：`YYYY-MM-DD` → 今天 / 昨天 / 本周 / 更早
- 日期分组头：去掉日历图标+蓝色背景块，改为纯文字小标题
- 左侧抽屉：替换为 sidebar 组件
- FAB 触发：改为打开 Sheet
- 长按菜单：替代右上角"···"图标的 context-popup

#### F5. 快速创建 Sheet（create-sheet）— 两阶段流程

- 新建 `component/create-sheet/index.vue`，替代 FAB 点击后的页面跳转
- **Phase 1（选择输入方式）**：显示三个方法卡片（手动输入 / 拍照识别 / 导入链接），点击后立即触发对应编辑流程
- **Phase 2（填写元数据）**：编辑器返回后自动进入，显示标题输入（最多 50 字+字数统计）、标签选择（多选胶囊，选中态实色背景+白字）、总结状态（已完成/重新编辑）+ 内容预览（前 60 字）、保存按钮
- 保存按钮校验：标题非空 + 至少一个标签 + 总结已完成（summarizeId 存在）
- Props：`visible`、`tagMap`、`summarizeId`（控制 Phase 1/2 切换）、`summaryPreview`（总结预览文字）
- Events：`@close`、`@method-select(method)`、`@submit({ title, tags })`
- 视觉规范：顶部把手 36px×5px、最大高度 75%、底部安全区、打开动画底部滑入 350ms
- 新建记录流程：Sheet Phase 1 → 编辑器 → 返回首页 → Sheet Phase 2 → 保存 → addRecord API 直接创建
- OCR/链接导入逻辑提取为 `utils/record-create.js`（`processOcr`、`processLinkImport`），home.vue 和 form.vue 共用

#### F6. record-card 改造

- 整体样式：白色卡片 + 左侧 3px 色条（颜色取标签第一个颜色）+ 新阴影
- 标签样式：从 ColorUI 类名改为独立色值内联样式
- 更多操作按钮：移除右上角"···"，改为长按卡片弹出菜单
- AI 角标：底部胶囊标签样式
- 时间格式：`HH:mm` → 相对时间（3分钟前 / 昨天 14:30 / 3天前）

#### F7. fab-button 改造

- 颜色：绿色渐变 → iOS 蓝 `#007AFF`
- 圆角：50%（圆形）→ 16px（圆角方形）
- 阴影：绿色阴影 → `0 4px 16px rgba(0,122,255,0.35)`
- 点击行为：`$emit('click')` → 打开 Sheet（而非跳转表单页）

#### F8. 详情页重构

- 导航栏：`bg-gradual-blue` → 毛玻璃，右侧"..."菜单按钮（无背景色），点击弹出 ActionSheet 提供编辑/AI辅导/下载/分享/删除操作
- 标题区域：字号放大至 28px 粗体，`margin-top: 16px` 与导航栏拉开间距，新增阅读时间估算（字数/300）
- 标签区域：独立色值胶囊（getTagColor 内联样式）
- AI 笔记内联展示：标题和标签下方新增卡片区域，展示知识点精讲和针对性练习摘要，点击跳转详情
- 总结内容：去掉卡片包裹，全宽展示，代码块深色背景 + 浅色文字
- 底部工具栏：移除，总结区域保留"下载"快捷入口
- 分享功能：弹窗选择链接有效期（1小时/1天/1周/1年/永久）

#### F9. 子页面视觉统一

- 表单页（depart/form.vue）：表单卡片圆角 16px、标签独立色值胶囊、提交按钮 #007AFF
- Markdown 编辑页（summarize/index.vue）：编辑区域纯白背景、底部工具栏毛玻璃
- AI 学习结果页（depart/learn-result.vue）：背景 #F2F2F7、卡片圆角 16px、空状态居中文字
- AI 结果详情（depart/learn-result-detail.vue）：背景 #F2F2F7、代码块样式同步
- 标签管理（dictCategory/index.vue）：双列网格→单列列表、左侧彩色圆点+记录数+更新时间、公共标签独立区块
- 标签表单（dictCategory/form.vue）：输入框样式同步
- 更新日志（changelog/index.vue）：背景 #F2F2F7、卡片圆角 16px

#### F10. 标签色板迁移 + 工具层增强

- `utils/tagColors.js`：从 ColorUI 类名重构为独立色值对象（bg/text/bar），移除旧的 `tagColorClasses` 和 `getTagColorClass` 导出
- `utils/format.js`：新增 `formatRelativeTime()` 和 `formatSmartDate()`，修复未来日期和 moment 对象 mutation 问题
- `utils/record-create.js`：**新建**，提取 `processOcr(store)` 和 `processLinkImport(store)` 为独立工具函数
- 移除 `colorui/` 引用中已无用的部分

### 格式三：用例

#### 用例 1：通过侧边栏筛选标签

- **前置条件**：用户在首页
- **操作步骤**：
  1. 点击首页左上角菜单按钮
  2. 侧边栏从左侧滑入
  3. 在"标签筛选"区域点击"前端"标签
  4. 侧边栏关闭，首页列表仅显示"前端"标签相关的记录
- **预期结果**：侧边栏正常打开/关闭，筛选生效

#### 用例 2：通过 Sheet 快速创建记录（两阶段流程）

- **前置条件**：用户在首页
- **操作步骤（Phase 1）**：
  1. 点击右下角 FAB 按钮
  2. Sheet 从底部滑入，显示三个输入方式卡片
  3. 点击"手动输入"
  4. Sheet 不关闭，跳转到 Markdown 编辑器
  5. 编辑内容，点击保存
- **操作步骤（Phase 2）**：
  6. 返回首页，Sheet 自动进入 Phase 2
  7. Sheet 显示"总结 ✓ 已完成"+ 内容预览
  8. 输入标题"React Hooks 学习笔记"
  9. 选择"前端"和"React"标签
  10. 点击"保存记录"
- **预期结果**：记录创建成功，首页列表刷新

#### 用例 3：详情页查看 AI 笔记并跳转

- **前置条件**：用户打开一条已有 AI 学习结果的记录
- **操作步骤**：
  1. 页面展示 AI 笔记内联卡片
  2. 卡片展示"知识点精讲"和"针对性练习"摘要
  3. 点击"查看完整笔记 →"
  4. 跳转到 learn-result-detail 页面
- **预期结果**：AI 卡片正常显示，点击跳转正确

## 边界条件

- **不新增功能模块**：知识图谱、暗色模式等作为后续迭代
- **不修改后端**：云函数和数据库结构保持不变
- **不更换 Markdown 编辑器**：towxml / md-editor 保持现有
- **不更换技术栈**：仍基于 uni-app Vue 2
- **毛玻璃降级**：低端安卓机自动降级为纯色半透明
- **侧边栏手势冲突**：仅通过按钮开关，不响应左滑手势
- **"/"命令面板**：作为后续迭代，本次先完成视觉统一

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
- [ ] FAB 点击弹出 Sheet Phase 1，选择输入方式后进入编辑器
- [ ] 编辑器返回后 Sheet 自动进入 Phase 2（总结已完成+预览）
- [ ] Sheet Phase 2 填写标题+标签后可保存，记录创建成功
- [ ] 长按卡片弹出编辑/删除菜单
- [ ] 详情页"..."菜单弹出 ActionSheet，所有操作可点击且功能正常
- [ ] AI 笔记在详情页内联展示，点击可跳转详情
- [ ] 页面间跳转流畅，无白屏闪烁

### 兼容性验收

- [ ] iOS 微信：毛玻璃效果正常
- [ ] 安卓微信：关闭毛玻璃降级方案正常
- [ ] 小屏幕设备（iPhone SE）：布局不溢出、不截断
- [ ] 大屏幕设备（iPhone 15 Pro Max）：布局无异常拉伸

### 性能验收

- [ ] 首页列表滚动流畅（无明显卡顿）
- [ ] 侧边栏打开/关闭动画帧率 ≥ 30fps
- [ ] Sheet 打开/关闭动画帧率 ≥ 30fps
- [ ] 内存无异常增长

## 关联信息

- 需求来源：产品规划 + 用户体验优化
- 原型：[proposal-d-final.html](./proposal-d-final.html)
- 需求文档：[ui-redesign-prd.md](./ui-redesign-prd.md)

## 变更记录

| 日期 | 作者 | 变更内容 |
|------|------|---------|
| 2026-05-13 | yuanchuang | 初始版本 |
| 2026-05-15 | yuanchuang | 实施阶段同步更新：Sheet 改为两阶段流程、详情页 Tip 工具栏改为 ActionSheet、新增 record-create.js 工具函数、补充 format.js bug 修复 |
