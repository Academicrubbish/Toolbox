# Toolbox — 项目指令

## 项目概述

**Toolbox** 是一个基于 UniApp + uniCloud（阿里云）的微信小程序，定位为 Markdown 学习工具箱。支持游客模式和登录模式，核心功能包括学习记录 CRUD、AI 辅导笔记、Markdown 编辑/渲染、标签管理、文章分享。

**技术栈**：UniApp（Vue 2）+ uniCloud 云开发 + ColorUI + Vuex + towxml（Markdown 渲染）+ 智谱 GLM API

## 开发流程

遵循 **Spec → Design → Plan → Execute** 流程，详见 [usage-guide.md](../docs/usage-guide.md)。
新功能开发使用 taiji 系列技能（taiji-spec / taiji-design / taiji-plan / taiji-execute）。

## 项目结构

```
api/                    # 数据库操作层（每个集合一个文件）
component/              # 公共组件
pages/home/             # 主包首页
subpackage/             # 分包页面
  depart/               # 记录表单/详情/学习结果
  dictCategory/         # 标签管理
  summarize/            # 总结
  changelog/            # 更新日志
store/modules/          # Vuex 模块（user、summarize）
utils/                  # 工具函数
wxcomponents/towxml/    # Markdown 渲染引擎
uniCloud-aliyun/        # 云开发（云函数 + 数据库 schema）
```

详细代码地图见 [codemap.md](../docs/codemap.md)。

## 架构约束

### uniCloud 阿里云限制
- **云函数 return 后逻辑立即终止**，不可用 setTimeout / Promise 延迟执行后台任务
- 非定时触发云函数最大超时 **120 秒**，定时触发最大超时 **7200 秒**
- 异步任务必须采用 **定时触发器 + 任务队列** 方案

### 数据库集合

| 集合 | API 文件 | 说明 |
|------|---------|------|
| `daily_record` | `api/record.js` | 学习记录 |
| `summarize` | `api/summarize.js` | 记录总结 |
| `tb_user` | `store/modules/user.js` | 用户信息 |
| `dict_category` | `api/dictCategory.js` | 标签分类 |
| `dict` | `api/dict.js` | 标签字典 |
| `ai_learn_logs` | `api/aiLearn.js` | AI 辅导日志 |
| `ai_task_queue` | 云函数内部 | AI 任务队列 |
| `changelog` | `api/changelog.js` | 更新日志 |

### AI 功能架构
- 提交任务：`generateLearnNote`（只写数据库，立即返回）
- 消费任务：`processLearnNote`（定时触发器，调智谱 GLM API）
- 状态流转：`pending` → `processing` → `done` / `failed`
- API Key 必须通过云函数环境变量传递，禁止暴露在客户端

## 编码规范

详细规范见 `.claude/rules/` 目录：
- [code-style.md](.claude/rules/code-style.md) — 代码风格（ES6+、Vue 组件结构、API 层、样式、分包）
- [commit-convention.md](.claude/rules/commit-convention.md) — Commit 格式（`<type>(<scope>): <subject>`，subject 用中文）

### 关键规范速查

- 使用 `const`/`let`，禁止 `var`
- 函数不超过 80 行，Vue 文件不超过 500 行
- 组件结构：`template` → `script` → `style`
- API 层：`getRequest()` 延迟初始化，`withAuth()` 包装需登录的接口
- 导出命名动词开头：`getRecordList`、`addRecord`、`delRecord`
- 样式使用 `rpx`，组件样式 `scoped`，优先用 ColorUI 工具类
- 主包仅放首页，新功能放 `subpackage/<feature>/`

## 产品定位与 AI 功能设计原则

详见 [ai-product-principles.md](.claude/rules/ai-product-principles.md) — 产品定位、长文本差异化策略、AI 功能不可替代性检验标准、已识别用户场景。

## 常见模式

### API 文件模板
```javascript
const { getRequest, withAuth } = require('@/api/requestHelper')
/** 获取记录列表 */
exports.getRecordList = withAuth(async (openid, params) => {
  const db = getRequest()
  return db.collection('daily_record').where({ createBy: openid }).get()
})
```

### 云函数模板
```javascript
'use strict'
exports.main = async (event, context) => {
  const db = uniCloud.database()
  // 业务逻辑...
  return { code: 0, message: 'success', data: {} }
}
```

### 页面路由
- 主包页面在 `pages` 数组中注册
- 分包页面在 `subPackages[0].pages` 中注册，路径从 `subpackage/` 开始
