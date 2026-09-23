# AI 对话归档：部署和安装

## 部署者

1. 先部署只允许云函数访问的 `ai_archive_keys` 集合 schema。随后部署新增的公共模块 `ai-archive-core` 及 `noteService`、`archiveKeyManager`、`archiveNote`、`aiLogService` 云函数，并更新 `searchRecord`、`generateShareLink`、`generateLearnNote`。`archiveNote` 需要在 uniCloud 控制台设置 URL 化 HTTPS 地址；把实际地址提供给小程序用户。`KB_SESSION_SECRET` 与现有登录云函数保持一致，供以上需要登录的云函数验证登录凭证。
2. 发布更新版小程序，确认旧笔记可查看、编辑、搜索、分享，游客示例可查看，AI 辅导历史与学习结果可打开，密钥页可打开。
3. 最后部署 `daily_record`、`summarize`、`dict_category`、`ai_learn_logs`、`ai_task_queue` 数据库 schema。这五个集合从客户端直连改为只允许云函数访问，旧版小程序客户端需更新后才能读写笔记与 AI 辅导数据。
4. 首次启用后在小程序生成测试密钥，按照下方步骤用 Skill 归档一篇测试笔记并确认它出现在普通笔记列表的「外部汇入」标签下。需要在小程序中撤销测试密钥时可直接撤销。

注意：已有 `summarize` 文档没有 `createBy` 时，服务端通过关联的 `daily_record` 判定归属，因此已有正式笔记无需迁移。未关联任何笔记的旧正文草稿无法可靠确定所有者，权限收紧后不能恢复。

## 使用者

1. 从仓库复制 [`skills/ai-note-archive`](../skills/ai-note-archive) 到所用 AI 客户端的 Skills 目录，并按该客户端方式启用。支持读取 Agent Skills 规范且能运行 Python 3 和发起 HTTPS 请求的客户端可使用；具体安装位置由客户端决定。
2. 在小程序「AI 归档密钥」中命名并生成密钥，保存好只显示一次的完整密钥。每把密钥有效 365 天，可以随时撤销或重新生成；重新生成后旧密钥立即失效。
3. 告诉 AI：使用 `ai-note-archive` 关联这个名称、密钥和部署者提供的 HTTPS 接口地址。可以关联多个名称。归档时让 AI 列出名称并选定目标，再检查整理后的内容并确认保存。
4. 接口按密钥限频：每小时最多 10 篇、每天最多 50 篇，超出会返回 429 及重试时间；这是防止密钥被滥用刷库的防护，正常使用不会触达。

密钥是写入凭证，持有人可向你的笔记库新增内容。不要将密钥写入聊天公开记录、Git 仓库或截图；怀疑泄漏时在小程序撤销或重新生成。
