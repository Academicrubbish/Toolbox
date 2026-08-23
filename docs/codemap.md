# Toolbox 代码地图

微信小程序（uni-app Vue 2 + uniCloud 云开发），Markdown 学习工具箱。
支持游客模式和登录模式，主要功能：学习记录 CRUD、AI 辅导笔记、Markdown 编辑/渲染、标签管理、更新日志。

新环境部署、云函数环境变量和交接检查请参见 [部署与环境变量配置](./deployment.md)。

## 目录结构

```
api/                  # 数据库操作层（每个集合一个文件）
component/            # 公共组件（5 个）
pages/home/           # 主包首页
subpackage/           # 分包页面
  depart/             # 记录表单/详情/学习结果
  dictCategory/       # 标签管理
  summarize/          # 总结
  changelog/          # 更新日志
store/modules/        # Vuex 模块（user、summarize）
utils/                # 工具函数（8 个文件）
static/               # 静态资源
wxcomponents/towxml/  # Markdown 渲染引擎（第三方）
uniCloud-aliyun/      # 云开发（云函数 + 数据库 schema）
  cloudfunctions/     # 9 个云函数
  database/           # 7 个数据库表 schema
```

## 数据库集合

| 集合名 | 说明 | API 文件 |
|--------|------|---------|
| `daily_record` | 学习记录 | `api/record.js` |
| `summarize` | 记录总结 | `api/summarize.js` |
| `tb_user` | 用户信息 | `store/modules/user.js`（直接操作） |
| `dict_category` | 标签分类 | `api/dictCategory.js` |
| `dict` | 标签字典 | `api/dict.js` |
| `ai_learn_logs` | AI 辅导日志 | `api/aiLearn.js` |
| `ai_task_queue` | AI 任务队列 | 云函数内部使用 |
| `changelog` | 更新日志 | `api/changelog.js` |

### 数据库表结构

**`daily_record`** — 学习记录
| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 标题 |
| `summarizeId` | string | 关联 summarize 表 |
| `tags` | array | 标签 ID 数组（来自 dict_category） |
| `createTime` | string | 创建时间 |
| `updateTime` | string | 修改时间 |
| `createBy` | string | 创建人 openid |

**`summarize`** — 总结
| 字段 | 类型 | 说明 |
|------|------|------|
| `category` | number | 分类 |
| `content` | string | 内容 |
| `recordId` | string | 关联记录 ID |
| `createTime` | string | 创建时间 |
| `updateTime` | string | 修改时间 |

**`ai_learn_logs`** — AI 辅导日志
| 字段 | 类型 | 说明 |
|------|------|------|
| `record_id` | string | 关联 daily_record ID |
| `source_content` | string | 原始笔记内容 |
| `ai_result` | string | AI 生成结果（Markdown） |
| `type` | string | 类型：`note`（知识点精讲）/ `exercise`（练习题） |
| `batch_id` | string | 同批次关联笔记和练习 |
| `status` | string | `pending` / `success` / `error` |
| `error_msg` | string | 错误信息 |
| `create_time` | number | 创建时间戳 |
| `complete_time` | number | 完成时间戳 |
| `create_by` | string | 创建人 openid |

**`ai_task_queue`** — AI 任务队列
| 字段 | 类型 | 说明 |
|------|------|------|
| `log_id` | string | 关联 ai_learn_logs（笔记） |
| `note_log_id` | string | 笔记记录 ID |
| `exercise_log_id` | string | 练习记录 ID |
| `batch_id` | string | 批次 ID |
| `content` | string | 笔记内容 |
| `status` | string | `pending` / `processing` / `done` / `failed` |
| `error_msg` | string | 错误信息 |
| `create_time` | number | 创建时间戳 |
| `update_time` | number | 更新时间戳 |

**`tb_user`** — 用户
| 字段 | 类型 | 说明 |
|------|------|------|
| `userName` | string | 姓名 |
| `wec` | string | 社交帐号 |
| `gender` | number | 性别 |
| `userImg` | string | 头像 |
| `motto` | string | 签名 |
| `_openid` | string | openid（自动填充） |

**`dict_category`** — 标签分类
| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 标签名称 |
| `description` | string | 介绍 |
| `createTime` | string | 创建时间 |
| `createBy` | string | 创建人 openid（空字符串表示公共标签） |

**`changelog`** — 更新日志（只读，管理员控制台插入）
| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | string | 版本号（如 1.0.0） |
| `content` | string | 更新内容 |
| `date` | string | 显示日期（如 2026-04-14） |
| `create_time` | number | 创建时间戳 |

## 云函数

| 名称 | 说明 | 调用方式 |
|------|------|---------|
| `login` | 微信登录，code 换 openid | `store/modules/user.js` |
| `searchRecord` | 模糊搜索记录（标题/时间/总结内容） | `api/record.js` |
| `generateLearnNote` | 提交 AI 生成请求（写入任务队列，立即返回） | `api/aiLearn.js` |
| `processLearnNote` | 消费任务队列，调用 GLM API 生成笔记+练习 | 定时触发器（非客户端调用） |
| `delImage` | 批量删除云存储文件 | 图片管理场景 |
| `parseMarkdown` | Markdown → HTML（markdown-it） | 编辑器渲染 |
| `renderLatex` | LaTeX → Base64 SVG（mathjax-node） | `api/render.js` |
| `renderYuml` | YUML → Base64 SVG | `api/render.js` |
| `renderEcharts` | ECharts → Base64 SVG | `api/render.js` |

### AI 辅导异步处理架构

```
客户端                          云端
  │                               │
  │  callGenerateLearnNote ──────→│  generateLearnNote 云函数
  │                               │    ├─ 创建 2 条 ai_learn_logs（note + exercise）
  │                               │    └─ 写入 1 条 ai_task_queue（status: pending）
  │  ← 返回 batchId ─────────────│
  │                               │
  │                    定时触发器 ──→ processLearnNote 云函数
  │                               │    ├─ 取 pending 任务 → processing
  │                               │    ├─ 调用智谱 GLM-5 API
  │                               │    ├─ 拆分结果为笔记 + 练习
  │                               │    ├─ 分别更新 2 条 ai_learn_logs → success
  │                               │    └─ 标记 ai_task_queue → done
  │                               │
  │  getLearnResultList ─────────→│  客户端轮询查结果
```

关键设计：
- **不阻塞**：`generateLearnNote` 只写队列立即返回，避免云函数超时
- **两条记录**：每次生成创建 `type=note` 和 `type=exercise` 两条 `ai_learn_logs`，通过 `batch_id` 关联
- **拆分逻辑**：`processLearnNote` 内部用 `"## 二、针对性练习题"` 作为分隔符拆分 AI 返回内容

## 授权与登录体系

项目的核心机制——游客模式 vs 登录模式，所有需要写操作的 API 都通过 `withAuth()` 保护。

### `withAuth(apiFunction, store, options?)` — API 授权包装器
- **文件：** `utils/api-auth.js`
- **作用：** 包装需要登录的 API 函数，调用前自动检查登录状态，未登录则弹出登录弹窗
- **返回：** 包装后的异步函数，登录成功后执行原函数，失败则 reject `'用户未授权'`

```js
// 使用示例（来自 api/record.js）
export const addRecord = withAuth(function(data) {
  return getRequest().add(data)
}, store)

// 支持配置
getRecordList(data, { autoShowLogin: false })  // 不自动弹窗，用于列表预加载
```

### `checkLoginBeforeRequest(store, options?)` — 登录检查
- **文件：** `utils/api-auth.js`
- **返回：** `Promise<boolean>`，true 表示已登录

### `setLoginModalRef(ref)` / `getLoginModalRef()` — 登录弹窗引用管理
- **文件：** `utils/api-auth.js`
- **作用：** 全局维护登录弹窗组件的引用，`withAuth` 通过它弹出登录

### `notifyLoginResult(success)` — 登录结果通知
- **文件：** `utils/api-auth.js`
- **作用：** 通知所有等待中的 `checkLoginBeforeRequest` Promise

### `isLoggedIn(store?)` — 登录状态检查
- **文件：** `utils/auth.js`
- **返回：** `boolean`，检查 `store.state.user.openid` 是否存在

### `checkLogin(options?)` — 带提示的登录检查
- **文件：** `utils/auth.js`
- **参数：** `{ title, content, onConfirm, onCancel, store }`

### `login-mixin.js` — 登录处理 mixin
- **文件：** `utils/login-mixin.js`
- **方法：** `handleLoginSuccess()`、`handleLoginCancel()`、`setupLoginModal()`
- **使用：** 在需要登录弹窗的页面混入

```js
import loginMixin from '@/utils/login-mixin.js'
export default {
  mixins: [loginMixin],
  mounted() { this.setupLoginModal() }
}
```

### 认证缓存 — `utils/auth-cache.js`
- `setAuthCache(openid, expireDays?)` — 保存登录缓存（默认 7 天）
- `getAuthCache()` — 获取缓存数据
- `clearAuthCache()` — 清除缓存
- `isAuthCacheValid()` — 检查缓存是否有效
- `getOpenidFromCache()` — 从缓存获取 openid
- `getCacheRemainingTime()` — 获取剩余有效时间（毫秒）

## API 层（数据库操作）

所有 API 文件位于 `api/` 目录，每个云数据库集合一个文件。统一使用延迟初始化模式 `getRequest()` 避免模块加载时 uniCloud 未就绪。

### `api/record.js` — 学习记录（集合：`daily_record`）

| 函数 | 需要登录 | 说明 |
|------|---------|------|
| `getRecordList(data, options?)` | 自动判断 | 游客查示例记录，登录查个人记录，支持分页 |
| `getRecord(id)` | 否 | 查询记录详情 |
| `addRecord(data)` | 是 | 添加记录 |
| `updateRecord(id, data)` | 是 | 更新记录 |
| `delRecord(id)` | 是 | 删除记录 |
| `searchRecord(data, options?)` | 是 | 模糊搜索（keyword + searchType: all/title/time/summary） |

- 内部使用 `convertPagination(pageSize, pageNum)` 转为 JQL 的 skip/limit
- 内部使用 `attachSummarizeContent(records)` 批量关联总结内容

### `api/summarize.js` — 总结（集合：`summarize`）

| 函数 | 需要登录 | 说明 |
|------|---------|------|
| `getSummarize(id)` | 否 | 查询总结详情 |
| `summarizeRecordInfoById(id)` | 否 | 按 recordId 查询 |
| `addSummarize(data)` | 是 | 添加总结 |
| `updateSummarize(id, data)` | 是 | 更新总结 |
| `delSummarize(id)` | 是 | 删除总结 |

### `api/dictCategory.js` — 标签分类（集合：`dict_category`）

| 函数 | 需要登录 | 说明 |
|------|---------|------|
| `getDictCategoryList()` | 否 | 按登录状态返回不同数据（登录=用户+公共，游客=公共） |
| `getDictCategory(id)` | 否 | 查询详情 |
| `addDictCategory(data)` | 是 | 添加（自动填充 createBy） |
| `updateDictCategory(id, data)` | 是 | 更新 |
| `delDictCategory(id)` | 是 | 删除 |

### `api/dict.js` — 标签字典（集合：`dict_category`）

| 函数 | 需要登录 | 说明 |
|------|---------|------|
| `getDictList()` | 是 | 查询用户可见标签列表 |
| `getDictTopList()` | 是 | 查询前 3 个标签 |
| `getDict(id)` | 否 | 查询详情 |
| `addDict(data)` | 是 | 添加 |
| `updateDict(id, data)` | 是 | 更新 |
| `delDict(id)` | 是 | 删除 |

### `api/aiLearn.js` — AI 辅导（集合：`ai_learn_logs`）

| 函数 | 需要登录 | 说明 |
|------|---------|------|
| `callGenerateLearnNote(data)` | 是 | 提交 AI 生成请求（异步云函数） |
| `getLearnResultList(data)` | 否 | 按 recordId 查询学习结果列表 |
| `getLearnResultDetail(logId)` | 否 | 查询学习结果详情 |
| `batchQueryAiResults(recordIds)` | 否 | 批量查询 AI 结果状态，返回 `{ [recordId]: { hasAiNote, aiNoteCount } }` |
| `getAiResultCount(recordId)` | 否 | 查询某记录的 AI 结果统计 |

### `api/changelog.js` — 更新日志（集合：`changelog`）

| 函数 | 说明 |
|------|------|
| `getChangelogList(limit?)` | 获取更新日志列表，按日期降序+同日版本号降序排列 |

### `api/render.js` — 渲染服务（云函数调用）

| 函数 | 说明 |
|------|------|
| `renderLatex(tex, theme?)` | LaTeX → Base64 SVG（默认 light） |
| `renderYuml(yuml, theme?)` | YUML → Base64 SVG |
| `renderEcharts(option, theme?, width?, height?)` | ECharts → Base64 SVG（默认 800×400） |

- 同时支持 ES6 export 和 CommonJS（供小程序组件使用）

## Vuex Store

### `store/modules/user.js` — 用户模块

**State：**
- `openid: string` — 用户 openid
- `userData: object` — 用户信息
- `isGuest: boolean` — 是否游客（默认 true）
- `authStateVersion: number` — 授权状态版本号（登录成功时递增）

**Mutations：**
- `SET_OPENID` / `SET_USERDATA` / `SET_IS_GUEST` / `INCREMENT_AUTH_STATE_VERSION`

**Actions：**
- `GetOpenId({ commit }, code)` — 微信登录获取 openid，自动缓存
- `RestoreFromCache({ commit, dispatch })` — 从缓存恢复登录态，验证 openid 有效性
- `GetInfo({ commit, state })` — 查询 `tb_user` 获取用户信息
- `AddUser({ commit, state }, userForm)` — 注册新用户

### `store/modules/summarize.js` — 总结缓存模块

**State：** `summarizeId`、`summarizeStatus`

**Actions：**
- `cacheSummary({ commit }, data)` — 缓存总结 ID 和状态
- `deleteSummary({ commit })` — 清空缓存

## 公共组件

### `record-card` — 记录卡片
- **文件：** `component/record-card/index.vue`
- **Props：**
  - `record: Object` — 记录数据（title、tags、summarizeContent、createTime、createBy）
  - `tagMap: Object` — 标签 ID → 标签对象的映射
  - `aiNoteCount: Number` — AI 笔记数量
  - `showMore: Boolean` — 是否显示更多操作按钮（默认 true）
- **Events：** `@card-tap`、`@more-click(e, record)`、`@ai-note-click`

### `context-popup` — 长按弹窗菜单
- **文件：** `component/context-popup/index.vue`
- **Props：** `buttons: Array`（默认 `["编辑", "删除"]`）
- **Events：** `@select({ action, item })`
- **方法：** `show(e, record)` — 在指定位置显示弹窗

### `fab-button` — 浮动添加按钮
- **文件：** `component/fab-button/index.vue`
- **Events：** `@click`

### `login-modal` — 登录授权弹窗
- **文件：** `component/login-modal/index.vue`
- **Events：** `@success`、`@cancel`
- **方法：** `open()` — 打开弹窗
- **注意：** 全局注册组件，已在 `main.js` 中 `Vue.component('login-modal', ...)`

### `md-editor` — Markdown 编辑器
- **文件：** `component/md-editor/index.vue`
- **用途：** 内嵌 Markdown 编辑/预览组件

## 工具函数

### `utils/format.js` — 格式化工具
- `formatTime(timeStr, format?)` — 格式化时间（默认 `'HH:mm'`，基于 moment.js）
- `formatSummaryContent(content)` — 去除 Markdown 语法，提取纯文本
- `groupRecordsByDate(list)` — 按日期分组记录，返回 `[{ date, children, count }]`

### `utils/download.js` — 文档下载
- `downloadMarkdown(title, content)` — 下载 Markdown 文档（上传云存储 → 下载 → 保存 → 打开）
- 内部降级策略：平台不支持时提示复制到剪贴板

### `utils/tagColors.js` — 标签颜色
- `tagColorClasses: string[]` — 12 个 ColorUI 颜色类名数组
- `getTagColorClass(index)` — 根据索引循环获取颜色类

### `utils/auth.js` — 登录状态（见授权体系章节）
### `utils/api-auth.js` — API 授权（见授权体系章节）
### `utils/auth-cache.js` — 认证缓存（见授权体系章节）
### `utils/login-mixin.js` — 登录 mixin（见授权体系章节）

## 固定写法模板

### 新增 API 文件模板

每个数据库集合对应 `api/` 下的一个文件，结构固定：

```js
import store from '@/store';
import { withAuth } from '@/utils/api-auth.js';

// 延迟初始化数据库连接
const getRequest = () => {
  if (typeof uniCloud === 'undefined' || !uniCloud.database) {
    throw new Error('uniCloud 未初始化，请确保在应用启动后再调用数据库操作')
  }
  return uniCloud.database().collection("集合名")
}

// 不需要登录的查询
export function getXxx(id) {
  return getRequest().doc(id).get()
}

// 需要登录的写操作 — 用 withAuth 包装
export const addXxx = withAuth(function(data) {
  return getRequest().add(data)
}, store)

export const updateXxx = withAuth(function(id, data) {
  return getRequest().doc(id).update(data)
}, store)

export const delXxx = withAuth(function(id) {
  return getRequest().doc(id).remove()
}, store)
```

### 新增分包页面模板

1. 在 `subpackage/<feature>/` 下创建页面
2. 在 `pages.json` 的 `subPackages[0].pages` 数组中注册
3. 静态资源放 `static/<feature>/`
4. 需要登录弹窗的页面混入 `loginMixin`

### 页面中引用登录弹窗

```vue
<template>
  <login-modal ref="loginModal" @success="handleLoginSuccess" @cancel="handleLoginCancel" />
</template>
<script>
import loginMixin from '@/utils/login-mixin.js'
export default {
  mixins: [loginMixin],
  mounted() { this.setupLoginModal() }
}
</script>
```

### 首页与登录状态联动

首页通过 `authStateVersion` 监听登录状态变化，自动刷新列表：

```js
// mounted 中记录初始状态
this.lastAuthStateVersion = this.$store.state.user.authStateVersion
// watch 中监听变化
watch: {
  '$store.state.user.authStateVersion': {
    handler(newVersion, oldVersion) {
      if (newVersion !== oldVersion) this.refreshAfterAuthChange()
    }
  }
}
```

## 学习专区（规划中）

独立于现有 AI 辅导的新模块，提供**多来源内容采集 → 预览编辑 → 用户选择处理模式（保存或 AI 处理） → AI 智能处理**的完整工作流。

多来源输入能力（OCR 拍照、链接导入）同时下沉到现有 depart 文档新增流程中，作为基础能力被所有场景复用。

### 目录结构（规划）

```
subpackage/learnZone/       # 学习专区分包
  index/                    # 专区首页（文档列表）
  source/                   # 内容来源选择页
  preview/                  # 预览编辑页（复用 md-editor）
  result/                   # AI 处理结果页
api/learnDocument.js        # 学习文档 API（集合：learn_document）
store/modules/learnZone.js  # 学习专区 Vuex 模块（规划中）
```

### 数据库集合（规划）

**`learn_document`** — 学习文档
| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 文档标题 |
| `source_type` | string | 来源类型：`note`（已有笔记）/ `ocr`（拍照识别）/ `link`（链接解析） |
| `source_ref` | string | 来源引用（recordId / OCR批次ID / 链接URL） |
| `content` | string | 文档内容（Markdown） |
| `ai_options` | array | 已使用的 AI 处理选项列表 |
| `status` | string | `draft` / `confirmed` / `processing` / `completed` |
| `createTime` | string | 创建时间 |
| `updateTime` | string | 修改时间 |
| `createBy` | string | 创建人 openid |

**`learn_ocr_log`** — OCR 识别日志（depart 和学习专区共用）
| 字段 | 类型 | 说明 |
|------|------|------|
| `document_id` | string | 关联 learn_document ID（学习专区场景），depart 场景为空 |
| `image_urls` | array | 原始图片云存储路径列表 |
| `raw_results` | array | qwen3.6-flash 视觉模型原始返回列表 |
| `merged_content` | string | 合并后的 Markdown 内容 |
| `status` | string | `pending` / `processing` / `done` / `failed` |
| `error_msg` | string | 错误信息 |
| `create_time` | number | 创建时间戳 |

**`learn_ai_result`** — 学习专区 AI 处理结果
| 字段 | 类型 | 说明 |
|------|------|------|
| `document_id` | string | 关联 learn_document ID |
| `process_type` | string | 处理类型：`review`（归纳复习）/ `preview_expand`（预习扩展）等 |
| `ai_result` | string | AI 生成结果（Markdown） |
| `source_content` | string | 处理时的文档快照 |
| `status` | string | `pending` / `success` / `error` |
| `error_msg` | string | 错误信息 |
| `create_time` | number | 创建时间戳 |
| `complete_time` | number | 完成时间戳 |
| `create_by` | string | 创建人 openid |

### 云函数（规划）

| 名称 | 说明 | 调用方式 |
|------|------|---------|
| `processOcr` | 调用阿里云百炼 qwen3.6-flash 视觉模型并行识别图片 → 合并输出 Markdown | `api/ocr.js` |
| `parseWechatArticle` | 解析微信公众号文章链接 → 提取正文转为 Markdown | `api/learnDocument.js` |
| `processLearnDocument` | 学习专区 AI 处理（归纳复习等），复用定时触发器 + 任务队列模式 | 定时触发器 |

### 学习专区工作流

```
用户进入学习专区
       │
       ▼
  ┌─────────────────────────────────────┐
  │  第一步：内容采集                      │
  │  ├── 从已有笔记选择（引用 record）       │
  │  ├── OCR 批量拍照（qwen3.6-flash）     │
  │  └── 微信公众号链接（白名单解析）         │
  └─────────────┬───────────────────────┘
                ▼
  ┌─────────────────────────────────────┐
  │  第二步：预览编辑                      │
  │  ├── 展示解析/识别后的 Markdown 内容    │
  │  ├── 用户编辑修改（复用 md-editor）     │
  │  └── 用户确认内容                      │
  └─────────────┬───────────────────────┘
                ▼
  ┌─────────────────────────────────────┐
  │  第三步：选择操作                      │
  │  ├── 保存文档到学习专区                 │
  │  └── AI 处理（v1：归纳复习）            │
  │       ├── 生成精选笔记                  │
  │       └── 生成针对性练习题              │
  └─────────────────────────────────────┘
```

### 与现有模块的关系

- **独立数据层**：学习专区使用 `learn_document` 等独立集合，不写入 `daily_record` 或 `ai_learn_logs`
- **引用而非复制**：选择"已有笔记"时，只存储 `source_ref`（recordId），不复制内容
- **复用组件**：预览编辑页复用 `md-editor` 组件
- **复用架构**：AI 异步处理复用现有的定时触发器 + 任务队列模式
- **OCR 模型**：使用阿里云百炼 qwen3.6-flash 视觉模型，通过 OpenAI 兼容接口调用

## UI 全站重构（规划中）

基于 Apple HIG 设计语言，对全部 9 个页面进行视觉和交互重构。不涉及后端改动。

详细文档：[spec](ui-redesign/spec.md) / [design](ui-redesign/design.md) / [PRD](../ui-redesign-prd.md)

### 核心改动

- **Design Tokens**：新建 `styles/tokens.scss`，统一颜色/圆角/间距/字体/阴影/动画变量
- **导航栏统一**：新建 `component/nav-bar/index.vue`（毛玻璃），替代全站 cu-custom
- **侧边栏**：新建 `component/sidebar/index.vue`，替代首页左侧抽屉
- **Sheet 快速创建**：新建 `component/create-sheet/index.vue`，FAB 触发，替代跳转表单页
- **record-card 改造**：左侧色条 + 独立色值标签 + 长按菜单
- **详情页重构**：Tip 工具栏 + AI 笔记内联展示 + 代码块样式

### 文件变更清单

**新建文件**

| 文件 | 说明 |
|------|------|
| `styles/tokens.scss` | Design Tokens（颜色/圆角/间距/字体/阴影/动画） |
| `component/nav-bar/index.vue` | 毛玻璃导航栏（替代 cu-custom） |
| `component/sidebar/index.vue` | 侧边栏（替代首页抽屉） |
| `component/create-sheet/index.vue` | 快速创建 Sheet |

**改造文件**

| 文件 | 改动程度 |
|------|---------|
| `pages/home/index.vue` | 重构 |
| `subpackage/depart/detail.vue` | 重构 |
| `subpackage/depart/form.vue` | 样式更新 |
| `subpackage/summarize/index.vue` | 样式更新 |
| `subpackage/dictCategory/index.vue` | 布局+样式重构 |
| `subpackage/dictCategory/form.vue` | 样式更新 |
| `subpackage/depart/learn-result.vue` | 样式更新 |
| `subpackage/depart/learn-result-detail.vue` | 样式更新 |
| `subpackage/changelog/index.vue` | 样式更新 |
| `component/record-card/index.vue` | 样式改造 |
| `component/fab-button/index.vue` | 样式改造 |
| `utils/tagColors.js` | 色板从 ColorUI 类名→独立色值对象 |
| `utils/format.js` | 新增 formatRelativeTime/formatSmartDate |
| `uni.scss` | 引入 tokens.scss |

### 实施分期

```
P0 (Tokens + nav-bar)  →  P1 (首页重构)  →  P2 (Sheet)
                            ↓                   ↓
                       P4 (子页面视觉)      P3 (详情页)
                            ↓
                       P5 (ColorUI 清理)
```

---
<!-- codemap-meta
commit: bf3e7d09ed6c5f91a8c8ec2e1aecf6d9214e0ffb
updated: 2026-05-13
note: 增量更新 - 新增 UI 全站重构规划（Design Tokens、导航栏、侧边栏、Sheet、详情页重构）
-->
