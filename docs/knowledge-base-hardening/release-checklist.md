# 知识库专项加固线上发布检查表

适用范围：方案 B 首次部署到当前线上 uniCloud 服务空间。

核心原则：**先部署兼容后端和兼容客户端，确认新版客户端可用后，再部署强制鉴权云函数，最后关闭数据库客户端权限。**

## 0. 发布前确认

- [ ] 已完成 `daily_record`、`summarize` 数据备份。
- [ ] 当前 `processEmbedding` 队列无长期 `pending` / `processing` 任务。
- [ ] 记录当前线上 `semanticSearch`、`processEmbedding` 云函数版本，确保可回滚。
- [ ] 本地自动化测试 18/18 通过。
- [ ] 准备 30～60 分钟连续操作时间，中途不要提前上传新 schema。

## 1. 准备 session 密钥

- [ ] 使用密码管理器生成至少 32 位随机值。
- [ ] 密钥未写入代码、`.env.example`、文档、Git 或聊天记录。
- [ ] 将同一个值配置到：
  - [ ] `login.KB_SESSION_SECRET`
  - [ ] `manageEmbedding.KB_SESSION_SECRET`
  - [ ] `semanticSearch.KB_SESSION_SECRET`
- [ ] 确认 `semanticSearch.ZHIPU_API_KEY` 仍存在。
- [ ] 确认 `processEmbedding.ZHIPU_API_KEY` 仍存在。

## 2. 第一阶段：兼容部署

### 2.1 上传公共模块

- [ ] 上传 `cloudfunctions/common/kb-auth`。
- [ ] 上传 `cloudfunctions/common/kb-vector`。
- [ ] HBuilderX 中确认 `login`、`manageEmbedding`、`semanticSearch`、`processEmbedding` 的公共模块依赖没有红色失效标记。

### 2.2 部署兼容后端

- [ ] 部署新版 `login`。
- [ ] 部署 `manageEmbedding`。
- [ ] 部署新版 `backfillEmbedding`。
- [ ] 部署新版 `getAiStats`。
- [ ] 暂不部署新版 `semanticSearch`。
- [ ] 暂不部署新版 `processEmbedding`。
- [ ] 暂不上传 `note_embedding` / `embed_task_queue` 新 schema。

### 2.3 兼容性冒烟

- [ ] 当前线上旧版小程序仍可登录。
- [ ] 旧版小程序仍可语义搜索。
- [ ] 旧版小程序仍可打开相关笔记。
- [ ] `login` 日志没有 `Cannot find module 'kb-auth'`。

## 3. 发布兼容客户端

新版客户端在过渡期同时发送：

```text
openid        → 旧 semanticSearch 使用
sessionToken  → 新 semanticSearch 使用
```

- [ ] 编译新版小程序。
- [ ] 关闭并重新打开小程序。
- [ ] 旧缓存自动失效后，重新登录一次。
- [ ] 登录成功，没有“登录服务未返回有效凭证”。
- [ ] 搜索“背单词的方法”能命中“记词窍门”。
- [ ] 打开详情页能显示相关笔记。
- [ ] 新建一篇临时测试笔记，保存主流程正常。
- [ ] `manageEmbedding` 日志显示任务投递成功。
- [ ] 当前旧版 `processEmbedding` 能消费新格式任务。

### 第一阶段放行条件

以下条件必须全部满足才能进入第二阶段：

- [ ] 新版客户端登录正常。
- [ ] 搜索与推荐正常。
- [ ] `manageEmbedding` 正常入队。
- [ ] 笔记新增、编辑、删除正常。
- [ ] 没有公共模块缺失错误。

任一项失败：停止发布，不上传 schema；按“回滚”章节处理。

## 4. 第二阶段：安全收口

### 4.1 部署强制鉴权云函数

- [ ] 部署新版 `semanticSearch`。
- [ ] 立即测试语义搜索。
- [ ] 立即测试相关笔记。
- [ ] 云函数日志没有“登录凭证签名无效”或“KB_SESSION_SECRET 必须至少 32 个字符”。
- [ ] 部署新版 `processEmbedding`。
- [ ] 检查 `processEmbedding` 两分钟定时触发器仍然存在。

### 4.2 强制鉴权验证

- [ ] 新版客户端搜索正常。
- [ ] 从云函数运行参数只传伪造 `openid`、不传 `sessionToken`，返回 `code: -401`。
- [ ] 使用正常客户端 token 时搜索正常。
- [ ] 新建笔记后队列记录包含 `create_by`、`claim_token`、`retry_count`。
- [ ] 等待一个周期后任务进入 `done`，向量长度为 512。

## 5. 最后关闭集合权限

只有第二阶段全部通过后才能执行：

- [ ] 上传 `note_embedding.schema.json`。
- [ ] 上传 `embed_task_queue.schema.json`。
- [ ] 上传 `ai_call_logs.schema.json`。
- [ ] 使用客户端数据库调试尝试读取 `note_embedding`，应被权限拒绝。
- [ ] 尝试客户端直接新增 `embed_task_queue`，应被权限拒绝。
- [ ] 正常小程序保存笔记仍能通过 `manageEmbedding` 入队。

## 6. 完整回归

### 登录与缓存

- [ ] 正常登录。
- [ ] 杀掉小程序后重新打开，登录状态能恢复。
- [ ] 游客模式正常，搜索框隐藏。

### 向量一致性

- [ ] 新建笔记后产生向量。
- [ ] 连续编辑三次，最终向量内容对应最后一次编辑。
- [ ] 同一笔记没有重复向量集合。
- [ ] 删除笔记后向量被清理，未完成任务变为 `cancelled`。
- [ ] `backfillEmbedding {"action":"stats"}` 覆盖率正常，队列无异常 failed。

### 搜索与推荐

- [ ] “背单词的方法”命中“记词窍门”。
- [ ] “副作用处理”前十包含“hooks 初学心得”。
- [ ] “图片转文本”前十包含“课件归档”。
- [ ] `withAuth` 精确词命中。
- [ ] 相关笔记区块显示并可跳转。

### 原功能回归

- [ ] 笔记列表、新增、编辑、删除正常。
- [ ] AI 辅导提交、生成、AI 笔记徽章正常。
- [ ] 标签筛选正常。
- [ ] Markdown、图片、Mermaid 渲染正常。
- [ ] 分享链接正常。
- [ ] 更新日志正常。

### 管理端

- [ ] 覆盖上传新版 `admin.html`。
- [ ] 能看到“笔记向量化”和“语义搜索”。
- [ ] `embedding-3` token 数量不为 0。
- [ ] embedding 成本不再固定显示为 0。
- [ ] 原 AI 辅导统计未受影响。

## 7. 回滚

### 第一阶段失败

- [ ] 不上传任何新 schema。
- [ ] 回滚 `login` 到部署前版本，或修正 `KB_SESSION_SECRET` 后重新部署。
- [ ] `manageEmbedding` 可直接下线，不影响旧客户端。
- [ ] 旧版 `semanticSearch`、`processEmbedding` 保持不动。

### 第二阶段鉴权失败

- [ ] 将 `semanticSearch` 回滚到旧版本。
- [ ] 新客户端仍携带兼容 openid，因此搜索会立即恢复。
- [ ] 检查三个 `KB_SESSION_SECRET` 是否完全相同。
- [ ] 不上传关闭权限后的 schema。

### 关闭权限后入队失败

- [ ] 临时把 `note_embedding`、`embed_task_queue` schema 权限恢复为上一版本。
- [ ] 检查 `manageEmbedding` 是否部署、token 是否传递、公共模块是否加载。
- [ ] 修复并验证后再次关闭权限。

## 8. 发布完成判定

- [ ] 新旧代码迁移期间没有出现搜索中断。
- [ ] 新版客户端已完成重新登录。
- [ ] 搜索与推荐只接受有效 session token。
- [ ] 两个内部集合客户端权限已关闭。
- [ ] 队列无长期 pending / processing / failed。
- [ ] 完整回归全部通过。
- [ ] 观察线上日志 24 小时后无异常，再删除客户端发送的兼容 `openid` 字段。
