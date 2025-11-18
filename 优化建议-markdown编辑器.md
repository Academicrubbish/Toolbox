# Markdown编辑器代码包优化分析

## 📊 当前占用情况分析

### 主要功能模块
1. **towxml** - Markdown/HTML 解析和渲染库
2. **highlight.js** - 代码高亮核心库（体积最大）
3. **parse2** - HTML解析器
4. **markdown解析器** - Markdown语法解析
5. **17种语言高亮支持** - 各种编程语言的高亮规则
6. **多个插件** - emoji, latex, yuml, todo, sub, sup, ins, mark

### 使用场景
- `component/md-editor/index.vue` - 编辑器预览模式
- `subpackage/depart/detail.vue` - 记录详情展示
- `subpackage/knowledge/detail.vue` - 知识点详情展示

## 🎯 优化建议

### 1. 减少代码高亮语言支持（推荐 ⭐⭐⭐⭐⭐）
**当前支持17种语言，可以精简到3-5种常用语言**

优化文件：`wxcomponents/towxml/config.js`

**建议只保留：**
- `javascript` - JavaScript（必需）
- `json` - JSON（常用）
- `css` - CSS（常用）
- `bash` - Shell脚本（可选）
- `python` - Python（可选）

**可删除的语言：**
- c-like, c, dart, go, java, less, scss, shell, xml, htmlbars, nginx, php, python-repl, typescript

**预计减少：** 约 200-300KB

### 2. 移除不需要的插件（推荐 ⭐⭐⭐⭐）
**当前启用的插件：**
- sub（下标）
- sup（上标）
- ins（删除线）
- mark（高亮）
- emoji（表情）
- todo（任务列表）
- latex（数学公式）
- yuml（图表）

**建议保留：**
- todo（任务列表）- 如果常用
- emoji（表情）- 如果常用

**建议移除：**
- latex（数学公式）- 如果不需要数学公式
- yuml（图表）- 如果不需要图表
- sub/sup（上下标）- 如果不常用
- ins/mark（删除线/高亮）- 如果不常用

**预计减少：** 约 50-100KB

### 3. 使用云函数处理Markdown解析（推荐 ⭐⭐⭐）
**方案：** 将Markdown解析移到云函数，前端只负责展示

**优点：**
- 大幅减少代码包体积
- 解析性能更好
- 可以支持更多功能

**缺点：**
- 需要网络请求
- 增加服务器成本

**预计减少：** 约 500-800KB

### 4. 按需加载语言文件（推荐 ⭐⭐⭐）
**方案：** 只在需要时动态加载语言高亮文件

**实现方式：**
- 默认不加载任何语言
- 检测代码块语言类型
- 动态require对应的语言文件

**预计减少：** 初始加载减少 200-300KB

### 5. 使用更轻量的Markdown解析器（推荐 ⭐⭐）
**方案：** 替换为更轻量的解析器，如 `marked` 或 `markdown-it` 的精简版

**注意：** 需要适配towxml的渲染格式

## 📝 具体优化步骤

### 步骤1：精简代码高亮语言（最简单，效果明显）

修改 `wxcomponents/towxml/config.js`：

```javascript
highlight:[
    'javascript',  // JavaScript
    'json',        // JSON
    'css',         // CSS
    // 其他语言按需添加
],
```

### 步骤2：精简Markdown插件

修改 `wxcomponents/towxml/config.js`：

```javascript
markdown:[
    'todo',       // 任务列表（如果常用）
    'emoji',      // 表情（如果常用）
    // 移除不需要的插件
],
```

### 步骤3：移除不需要的组件

修改 `wxcomponents/towxml/config.js`：

```javascript
components:[
    'table',      // 表格支持（如果常用）
    'todogroup',  // todo支持（如果常用）
    'img',        // 图片解析组件（必需）
    // 移除 latex, yuml 如果不需要
],
```

## 💡 最佳实践建议

1. **优先执行步骤1和步骤2** - 简单有效，预计可减少 300-400KB
2. **如果还不够，考虑步骤3** - 使用云函数处理，可减少 500-800KB
3. **保留核心功能** - 确保基本的Markdown渲染和代码高亮可用

## ⚠️ 注意事项

1. 修改后需要测试所有使用towxml的页面
2. 确保删除的语言和插件确实不需要
3. 如果使用云函数方案，需要处理网络异常情况

