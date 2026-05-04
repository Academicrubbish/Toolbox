---
title: 文章分享功能 — 任务清单
plan: ./plan.md
status: done
created: 2026-04-16
updated: 2026-05-04
author: yuanchuang
---

## Task 1：创建 `share_links` 数据库集合

- **对应：** 阶段1-步骤1.1
- **操作：** 配置
- **涉及文件：**
  - `uniCloud-aliyun/database/share_links.schema.json`（新增）

**实现内容：**

在 uniCloud 控制台新建集合 `share_links`，字段定义：
- `record_id`：string，关联 daily_record
- `share_type`：string，分享类型（`record` / `ai_learn`）
- `log_id`：string，AI 学习结果 ID（ai_learn 时）
- `expire_time`：number，过期时间戳（毫秒），永久为 null
- `create_time`：number，创建时间戳
- `create_by`：string，创建者 openid

创建索引：`record_id`（普通索引）、`expire_time`（普通索引）

**状态：** 已完成

---

## Task 2：创建云函数 `generateShareLink`

- **对应：** 阶段1-步骤1.2
- **操作：** 新增
- **涉及文件：**
  - `uniCloud-aliyun/cloudfunctions/generateShareLink/index.js`（新增）
  - `uniCloud-aliyun/cloudfunctions/generateShareLink/package.json`（新增）

**实际实现：**

- 接收参数：`recordId`、`expireType`、`shareType`、`logId`、`openid`
- openid 从客户端 Vuex store 传入（非 UNICLOUD_INFO）
- 根据 `shareType` 分支校验权限：
  - `record`：查 daily_record.createBy === openid
  - `ai_learn`：查 ai_learn_logs → 取 record_id → 查 daily_record.createBy === openid
- **链接复用**：查询已有未过期链接（`dbCmd.and([whereCond, dbCmd.or([{expire_time: null}, {expire_time: dbCmd.gt(now)}])])`），有则直接返回
- `HOSTING_DOMAIN = 'http://doc.coptis.top'`

**状态：** 已完成

---

## Task 3：创建云函数 `getShareArticle`

- **对应：** 阶段1-步骤1.3
- **操作：** 新增
- **涉及文件：**
  - `uniCloud-aliyun/cloudfunctions/getShareArticle/index.js`（新增）
  - `uniCloud-aliyun/cloudfunctions/getShareArticle/package.json`（新增）

**实际实现：**

- 使用阿里云集成响应格式（`mpserverlessComposedResponse: true`），CORS 头在 headers 中设置
- 处理 OPTIONS 预检请求
- 参数获取兼容两种模式：`event.queryStringParameters?.sid || event.sid`
- 根据 `share.share_type` 分支：
  - `record`：查 daily_record → summarize（取 content）→ tb_user（取 author）
  - `ai_learn`：查 ai_learn_logs（取 ai_result）→ daily_record（取 title）→ tb_user（取 author）
- `formatDate()` 格式化时间为 'YYYY-MM-DD HH:mm'
- `getAuthor()` 查询 tb_user 获取作者昵称，未找到返回"匿名"

**状态：** 已完成

---

## Task 4：编写 H5 阅读页 `share.html`

- **对应：** 阶段2-步骤2.1
- **操作：** 新增
- **涉及文件：**
  - `docs/article-share/share.html`（新增，部署到前端网页托管）

**实际实现：**

CDN 引入渲染库：
- marked.js v12.0.2：Markdown 解析
- highlight.js v11.11.1：代码语法高亮
- KaTeX v0.16.11：LaTeX 公式（块级 `$$...$$` + 行内 `$...$`）
- Mermaid v10.9.3：流程图 / 时序图

自定义 marked renderer：mermaid 代码块输出为 `<div class="mermaid">`，其他语言用 highlight.js 高亮。

渲染顺序：marked.parse → renderKatex → 显示容器 → mermaid.run。

`GET_ARTICLE_URL = 'http://api.coptis.top/getShareArticle'`

**状态：** 已完成

---

## Task 5：部署配置与联调

- **对应：** 阶段2-步骤2.2
- **操作：** 配置
- **涉及文件：**
  - 云函数和 H5 页面中的域名配置

**实际配置：**

| 配置项 | 值 |
|-------|---|
| 前端网页托管域名 | `doc.coptis.top` |
| 云函数 URL 化域名 | `api.coptis.top` |
| generateShareLink HOSTING_DOMAIN | `http://doc.coptis.top` |
| share.html API 地址 | `http://api.coptis.top/getShareArticle` |

**状态：** 已完成

---

## Task 6：新建 `api/share.js`

- **对应：** 阶段3-步骤3.1
- **操作：** 新增
- **涉及文件：**
  - `api/share.js`（新增）

**实际实现：**

```javascript
export const callGenerateShareLink = withAuth(function(data) {
  const user = store.state.user;
  return uniCloud.callFunction({
    name: 'generateShareLink',
    data: {
      recordId: data.recordId,
      expireType: data.expireType,
      shareType: data.shareType || 'record',
      logId: data.logId || '',
      openid: user.openid
    }
  }).then(res => {
    if (res.result && res.result.code === 0) {
      return res.result;
    }
    return Promise.reject(new Error(res.result?.message || '生成失败'));
  });
}, store);
```

传入参数为对象形式（data），包含 recordId、expireType、shareType、logId。

**状态：** 已完成

---

## Task 7：详情页添加分享按钮

- **对应：** 阶段3-步骤3.2
- **操作：** 修改
- **涉及文件：**
  - `subpackage/depart/detail.vue`（修改）
  - `subpackage/depart/learn-result-detail.vue`（修改）

**实际实现：**

两处页面均添加：
- 绿色分享按钮（与下载、AI 辅导并列）
- 底部弹窗有效期选择器（1h / 1d / 1w / 1y / forever，默认 1d）
- handleShare() 方法调用 callGenerateShareLink
- shareLoading 防重复点击
- 成功后 uni.setClipboardData 复制链接

learn-result-detail.vue 传入 `shareType: 'ai_learn'` 和 `logId: this.logId`。

**状态：** 已完成

## 变更记录

| 日期 | 作者 | 变更说明 |
|------|------|---------|
| 2026-04-16 | yuanchuang | 初始版本 |
| 2026-05-04 | yuanchuang | 更新为实际实现内容，新增 AI 辅导分享、链接复用、CDN 渲染升级、集成响应格式、问题记录，所有任务标记完成 |
