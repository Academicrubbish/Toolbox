# 知识库专项加固任务清单（方案 B）

状态：approved（用户于 2026-08-24 明确选择方案 B 并授权开始实施）

## Task 1：可信身份与会话

- 新增 `kb-auth` 云函数公共模块，使用 HMAC-SHA256 签发和验证 7 天 session token。
- `login` 返回 `openid + sessionToken + expiresAt`。
- 客户端缓存和 Vuex 恢复 session token。
- `semanticSearch` / 相关笔记只使用 token 中的 openid，不信任客户端 openid。
- 单元测试覆盖签发、验证、篡改、过期。

## Task 2：服务端向量入队与内部集合封闭

- 新增 `manageEmbedding` 云函数，负责 enqueue、enqueueBySummarizeId、deleteIndex。
- 校验调用者身份及笔记归属，服务端去重未完成任务。
- 客户端 `api/embedTask.js` 改为调用云函数。
- `note_embedding`、`embed_task_queue` 客户端权限全部关闭。

## Task 3：队列原子认领与数据一致性

- `processEmbedding` 使用唯一 claim token 条件认领，并只处理实际认领成功的任务。
- 任务增加 `create_by`、`source_version`、`claim_token`、`retry_count`。
- 最多自动重试 3 次；processing 残留可恢复。
- 写向量前二次检查笔记存在、归属及版本；删除/编辑竞态不产生孤儿或旧向量。
- 回填任务写入归属与版本信息，分页改为 `_id` 游标。

## Task 4：监控与轻量性能修复

- `ai_call_logs`、`getAiStats`、`admin.html` 补齐 embedding / embedding_search。
- 增加 embedding-3 定价配置。
- 详情页首次进入避免 onLoad/onShow 重复请求。

## Task 5：自动化验证与交付

- 使用 Node 内置测试框架，不引入依赖。
- 覆盖认证、切片、余弦、融合排序、队列认领相关纯逻辑。
- 运行语法检查和自动化测试。
- 生成 `docs/knowledge-base-hardening/code-report.md`。
- 输出按顺序部署、环境变量配置和人工回归清单。
