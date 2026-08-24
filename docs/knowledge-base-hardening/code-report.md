---
title: 知识库专项加固（方案 B）
tasks: ./tasks.md
status: completed
started: 2026-08-24 23:10
finished: 2026-08-24 23:46
author: yuanchuang
---

# 知识库专项加固 Code Report

## 执行概览

| 项目 | 数据 |
|------|------|
| 总 Task 数 | 5 |
| 完成 | 5 |
| 失败 | 0 |
| 跳过 | 0 |
| 总测试用例 | 18 |
| 测试通过 | 18 |
| 测试失败 | 0 |

## Task 执行明细

### Task 1：可信身份与会话

- **状态**：✅ 完成
- **新增文件**：`cloudfunctions/common/kb-auth/`、`tests/kb-auth.test.cjs`
- **修改文件**：`cloudfunctions/login/`、`store/modules/user.js`、`utils/auth-cache.js`、`cloudfunctions/semanticSearch/`、`api/kb.js`
- **测试结果**：5/5 通过（签发、正确验证、篡改、错密钥、过期、短密钥）
- **备注**：知识库云函数从签名 token 取得 openid，不再信任客户端 openid。旧缓存升级后需要重新登录一次。

### Task 2：服务端向量入队与内部集合封闭

- **状态**：✅ 完成
- **新增文件**：`cloudfunctions/manageEmbedding/`
- **修改文件**：`api/embedTask.js`、`note_embedding.schema.json`、`embed_task_queue.schema.json`
- **测试结果**：身份核心由 Task 1 自动化测试覆盖；云函数依赖加载检查通过
- **备注**：两个内部集合客户端 CRUD 权限全部关闭；入队、按 summarizeId 入队和删除索引均走鉴权云函数。

### Task 3：队列原子认领与数据一致性

- **状态**：✅ 完成
- **新增文件**：`common/kb-vector/`、`processEmbedding/task-state.js`、`semanticSearch/search-utils.js`、2 个测试文件
- **修改文件**：`processEmbedding/index.js`、`backfillEmbedding/index.js`、相关 package/lock 文件
- **测试结果**：13/13 通过（切片 5、余弦 3、重试状态 2、混合排序 3）
- **备注**：claim token 防并发重复消费；API 调用后重新读取并哈希比较最新内容；失败最多自动重试 3 次；回填改用 `_id` 游标。

### Task 4：监控与轻量性能修复

- **状态**：✅ 完成
- **修改文件**：`ai_call_logs.schema.json`、`getAiStats/index.js`、`admin.html`、`detail.vue`
- **测试结果**：schema JSON 解析、云函数语法检查通过
- **备注**：embedding-3 按智谱官方 2026-08-24 价格 0.5 元/百万 Token 计费；详情页首次进入不再重复加载。

### Task 5：自动化验证与交付

- **状态**：✅ 完成
- **新增/修改文件**：`docs/knowledge-base-hardening/`、`docs/deployment.md`、`tests/*.test.cjs`
- **测试结果**：18/18 通过；6 个云函数语法检查通过；3 个 schema JSON 校验通过；4 个云函数公共模块依赖加载通过；`git diff --check` 通过
- **备注**：尚需按部署文档完成云端配置与真机人工回归，未在本地写入任何真实密钥。
- **线上发布**：新增 `release-checklist.md`，客户端在迁移窗口同时发送 `openid + sessionToken`，支持先发客户端、后收紧云函数与 schema 的无中断顺序。

## 验收结论

| 验收标准 | 对应 Task | 测试覆盖 | 结果 |
|---------|----------|---------|------|
| 搜索与推荐不信任客户端 openid | Task 1 | token 签发/篡改/过期测试 + 静态审查 | ✅ 通过 |
| 内部集合不可客户端直连 | Task 2 | schema 权限检查 | ✅ 通过 |
| 向量任务只能操作本人笔记 | Task 2 | 服务端归属查询静态审查 | ✅ 通过 |
| 并发消费者不重复处理同一任务 | Task 3 | claim token 条件认领实现审查 | ✅ 通过 |
| 编辑/删除竞态不写回旧向量 | Task 3 | 写入前内容哈希复核实现审查 | ✅ 通过 |
| embedding 成本可观测 | Task 4 | schema、定价、管理端映射检查 | ✅ 通过 |
| 自动化安全网 | Task 5 | Node test 18/18 | ✅ 通过 |

### 整体结论

- **是否可交付**：✅ 代码可交付，进入云端部署验收阶段。
- **遗留边界**：方案 B 只封闭知识库内部集合；旧 `daily_record`、`summarize` 等集合仍沿用历史开放权限，属于未来全项目安全改造范围。
- **上线前置**：三个云函数必须配置同一个 `KB_SESSION_SECRET`；必须先部署云函数和新版客户端，最后再上传关闭权限后的 schema。

## Commit 建议

```bash
git add admin.html api/embedTask.js api/kb.js store/modules/user.js utils/auth-cache.js \
  subpackage/depart/detail.vue docs/deployment.md docs/knowledge-base-hardening tests \
  uniCloud-aliyun/cloudfunctions/common uniCloud-aliyun/cloudfunctions/login \
  uniCloud-aliyun/cloudfunctions/manageEmbedding uniCloud-aliyun/cloudfunctions/processEmbedding \
  uniCloud-aliyun/cloudfunctions/backfillEmbedding uniCloud-aliyun/cloudfunctions/semanticSearch \
  uniCloud-aliyun/cloudfunctions/getAiStats uniCloud-aliyun/database/ai_call_logs.schema.json \
  uniCloud-aliyun/database/embed_task_queue.schema.json uniCloud-aliyun/database/note_embedding.schema.json

git commit -m "feat(kb): 完成知识库身份、队列与监控专项加固"
```

## 变更记录

| 日期 | 作者 | 变更内容 |
|------|------|---------|
| 2026-08-24 | yuanchuang | 完成方案 B 五项任务与 18 项自动化测试 |
