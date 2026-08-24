# Toolbox 部署与环境变量配置

本文用于新成员接手项目后，从代码仓库完成微信小程序、uniCloud 阿里云服务空间、云函数和网页托管的配置与部署。

最后更新：2026-08-24

## 1. 技术栈与准备工作

- HBuilderX（用于关联服务空间、上传数据库 Schema 和部署云函数）
- 微信开发者工具和已开通的小程序账号
- DCloud 账号及 uniCloud 阿里云服务空间
- 阿里云百炼 qwen3.6-flash API Key
- 智谱开放平台 API Key
- Node.js/npm（安装前端依赖和本地调试云函数依赖）

首次打开项目后，在项目根目录安装前端依赖：

```powershell
npm install
```

在 HBuilderX 中关联 `uniCloud-aliyun` 到目标阿里云服务空间。不要把生产、测试环境关联到同一个服务空间。

## 2. 必需的云函数环境变量

uniCloud 环境变量按云函数隔离。同名变量不会自动共享，必须逐个云函数配置。

| 云函数 | 环境变量 | 必填 | 来源与用途 |
|--------|----------|------|------------|
| `processOcr` | `QWEN_API_KEY` | 是 | 阿里云百炼凭证，用于 qwen3.6-flash 图片 OCR |
| `parseWechatArticle` | `ZHIPU_API_KEY` | 是 | 智谱凭证，用于网页阅读和 GLM 内容清洗 |
| `processLearnNote` | `ZHIPU_API_KEY` | 是 | 智谱凭证，用于 GLM-5 学习笔记和练习题生成 |
| `login` | `WECHAT_APP_ID` | 是 | 微信小程序 AppID，必须与 `manifest.json` 中的 `mp-weixin.appid` 一致 |
| `login` | `WECHAT_APP_SECRET` | 是 | 微信公众平台的小程序 AppSecret |
| `login` | `KB_SESSION_SECRET` | 是 | 知识库 session 签名密钥，至少 32 位随机值 |
| `manageEmbedding` | `KB_SESSION_SECRET` | 是 | 必须与 `login` 完全相同，用于验证向量操作身份 |
| `semanticSearch` | `KB_SESSION_SECRET` | 是 | 必须与 `login` 完全相同，用于验证搜索与推荐身份 |
| `semanticSearch` | `ZHIPU_API_KEY` | 是 | 智谱 embedding-3 搜索词向量化 |
| `processEmbedding` | `ZHIPU_API_KEY` | 是 | 智谱 embedding-3 笔记向量化 |
| `getAiStats` | `ADMIN_KEY` | 是 | AI 统计管理页访问密钥，使用密码管理器生成至少 32 位随机值 |

其余云函数当前不需要环境变量。禁止为缺失配置重新增加硬编码兜底值。

## 3. 配置环境变量

### 3.1 通过 uniCloud 控制台配置

本项目的云函数环境变量只能通过 uniCloud 控制台配置，不能通过 HBuilderX 的云函数右键菜单配置。

1. 登录 uniCloud 控制台并选择正确的服务空间。
2. 进入“云函数/云对象”。
3. 打开目标云函数详情，在页面底部找到“环境变量”。
4. 点击“编辑”，按 `KEY=VALUE` 添加变量并保存。
5. 对上表中的每个云函数分别完成配置；同名变量不会跨函数共享。
6. 确认代码已上传，再通过控制台运行或真实客户端验证。

需要配置的云函数目录均提供 `.env.example`，其中只列变量名，不包含真实值，仅用于核对变量名称。不要把生产密钥写入或提交到这些示例文件。

官方参考：[uniCloud 云函数环境变量](https://doc.dcloud.net.cn/uniCloud/cf-env-variables.html)

## 4. 凭证申请与轮换

### 阿里云百炼

在与当前 API Host 相同的地域和业务空间创建 Key，并配置为 `processOcr.QWEN_API_KEY`。

参考：[阿里云百炼 API Key 管理](https://help.aliyun.com/zh/model-studio/get-api-key/)

### 智谱开放平台

创建或轮换智谱 API Key，并将同一个值分别配置到：

- `parseWechatArticle.ZHIPU_API_KEY`
- `processLearnNote.ZHIPU_API_KEY`
- `processEmbedding.ZHIPU_API_KEY`
- `semanticSearch.ZHIPU_API_KEY`

### 微信小程序

在微信公众平台获取 AppID 和 AppSecret：

- `WECHAT_APP_ID` 同时填写到 `manifest.json` 的 `mp-weixin.appid`。
- `WECHAT_APP_SECRET` 只配置到 `login` 云函数，禁止放入客户端代码或文档。

### 知识库 session 密钥

使用密码管理器生成至少 32 位随机值，将同一个值分别配置到 `login`、`manageEmbedding`、`semanticSearch` 的 `KB_SESSION_SECRET`。该密钥只存在于云函数环境变量中，禁止写入客户端、仓库或聊天记录。

轮换该密钥会让所有现有登录凭证立即失效，用户需要重新登录。轮换时应同时更新三个云函数，避免出现登录成功但搜索鉴权失败。

### 轮换顺序

1. 创建新 Key。
2. 更新对应云函数的远程环境变量。
3. 上传最新云函数并完成冒烟测试。
4. 立即禁用或删除旧 Key。
5. 检查云函数日志，确认没有 `401`、`403` 或“缺少环境变量”错误。

已经在代码、聊天记录或日志中出现过的 Key 必须视为泄露，不能继续使用。

## 5. 数据库与云函数部署

### 5.1 数据库

在 HBuilderX 中上传 `uniCloud-aliyun/database` 下的全部 `.schema.json`。主要集合包括：

- `daily_record`、`summarize`、`dict_category`、`tb_user`
- `ai_learn_logs`、`ai_task_queue`、`ai_call_logs`、`ai_alerts`
- `learn_ocr_log`、`share_links`、`changelog`
- `note_embedding`、`embed_task_queue`（内部集合，客户端权限必须全部为 false）

上传前先检查 schema 权限；生产环境不要直接套用过于宽松的测试权限。

### 5.2 云函数

在 HBuilderX 中逐个右键云函数并选择“上传部署”。包含 npm 依赖的函数会根据各自的 `package.json` 安装依赖。

建议按以下顺序部署：

1. 先上传公共模块：`common/kb-auth`、`common/kb-vector`
2. 基础功能：`login`、`searchRecord`、`delImage`、`parseMarkdown`
3. 知识库：`manageEmbedding`、`processEmbedding`、`backfillEmbedding`、`semanticSearch`
4. 内容导入：`processOcr`、`parseWechatArticle`
5. AI 学习：`generateLearnNote`、`processLearnNote`
6. 分享：`generateShareLink`、`getShareArticle`
7. 图表渲染：`renderLatex`、`renderYuml`、`renderEcharts`、`renderMermaid`
8. 运维：`getAiStats`、`checkAiAlert`、`cleanupOrphanData`

知识库加固版本首次部署必须遵循以下顺序，不能先关闭集合权限：

1. 上传 `kb-auth`、`kb-vector` 公共模块，并在 HBuilderX 检查依赖它们的云函数已关联公共模块。
2. 配置三个云函数一致的 `KB_SESSION_SECRET`，配置两个 embedding 云函数的 `ZHIPU_API_KEY`。
3. 部署 `login`、`manageEmbedding`、`semanticSearch`、`processEmbedding`、`backfillEmbedding`、`getAiStats`。
4. 编译新版小程序，重新登录一次，验证新建笔记能进入队列、语义搜索正常。
5. 最后上传 `note_embedding`、`embed_task_queue` schema，关闭客户端直连权限。
6. 再次执行新增、编辑、删除、搜索和相关笔记回归。

### 5.3 定时触发器

触发器配置位于对应云函数的 `package.json`，上传后检查控制台是否生效：

| 云函数 | Cron | 含义 |
|--------|------|------|
| `processLearnNote` | `0 */1 * * * * *` | 每分钟消费一条 AI 学习任务 |
| `processEmbedding` | `0 */2 * * * * *` | 每两分钟消费一批向量任务 |
| `checkAiAlert` | `0 7 * * * * *` | 每小时第 7 分钟检查 AI 用量和失败率 |

uniCloud 定时触发使用 UTC+8。阿里云正式版最低触发间隔为一分钟。参考：[uniCloud 定时触发器](https://doc.dcloud.net.cn/uniCloud/trigger.html)

## 6. URL 化云函数与网页托管

分享页和监控页都是仓库根目录下的独立静态 HTML，需要部署到 uniCloud“前端网页托管”；页面使用浏览器 `fetch` 调用 URL 化云函数。部署前先确定两个地址，并在本章中代入对应占位符：

| 占位符 | 含义 | 获取方式 |
|--------|------|----------|
| `<WEB_ORIGIN>` | 静态网页来源地址，包含协议、不以 `/` 结尾 | 前端网页托管测试域名，或自行绑定的正式域名 |
| `<API_ORIGIN>` | 云函数 API 来源地址，包含协议、不以 `/` 结尾 | URL 化默认域名，或自行绑定的 API 域名 |

没有自定义域名时，可以直接使用 uniCloud 控制台显示的两个默认地址进行功能验证；默认地址存在访问频率、来源 IP 或浏览器访问方式等限制，不建议直接用于正式商用。拥有自定义域名时，可以分别绑定网页域名和 API 域名。

本项目当前使用 `doc.coptis.top` 和 `api.coptis.top`，仅作为域名分工示例，不是部署要求，也不能直接复制到其他服务空间。新接手者必须以自己控制台显示的地址或自己拥有的域名替换全部占位符。

前端网页托管地址和云函数 URL 化地址是两套独立配置。使用自定义域名时，需要分别绑定、分别配置 DNS 和 HTTPS。不要把云函数 API 地址当作静态文件上传地址。

### 6.1 配置 URL 化云函数

先部署以下两个云函数，再在 uniCloud Web 控制台配置 HTTP 访问路径：

| 云函数 | 建议路径 | 调用方 |
|--------|----------|--------|
| `getShareArticle` | `/getShareArticle` | `share.html` |
| `getAiStats` | `/getAiStats` | `admin.html` |

操作步骤：

1. 登录 uniCloud Web 控制台，选择本项目的阿里云服务空间。
2. 进入“云函数/云对象”，确认 `getShareArticle` 和 `getAiStats` 已上传为最新版本。
3. 分别打开云函数详情，在 HTTP 访问或访问路径处填写上表路径并保存。
4. 从控制台复制 URL 化默认域名，将其记录为 `<API_ORIGIN>`。没有自定义域名时，本节的域名配置已经完成。
5. 如需正式域名，进入云函数“域名绑定”，添加自己拥有的 API 域名。
6. 按控制台给出的 CNAME 值，在域名 DNS 服务商处添加 CNAME 解析。
7. 上传 API 域名的 SSL 证书并启用 HTTPS；证书、私钥和域名必须匹配。绑定成功后，将正式地址记录为新的 `<API_ORIGIN>`。

生产环境必须使用 HTTPS。`admin.html` 当前通过查询参数发送 `ADMIN_KEY`；如果使用 HTTP，管理密钥可能在传输过程中泄露。HTTPS 网页也不能调用 HTTP API，否则浏览器会因 Mixed Content 拦截请求。

配置后先直接验证接口：

```text
<API_ORIGIN>/getShareArticle?sid=<有效分享ID>
<API_ORIGIN>/getAiStats?key=<ADMIN_KEY>&days=7
```

第一个接口应返回分享内容；第二个接口应返回 `code: 0` 的统计数据。错误管理密钥应返回 HTTP 403，缺少 `ADMIN_KEY` 环境变量应返回 HTTP 503。不要把包含真实 `ADMIN_KEY` 的测试 URL 发送到聊天、工单或截图中。

官方参考：[uniCloud 云函数 URL 化](https://doc.dcloud.net.cn/uniCloud/http)

### 6.2 更新代码中的生产域名

上传网页前，检查并更新以下三个配置：

```js
// share.html
var GET_ARTICLE_URL = '<API_ORIGIN>/getShareArticle'

// admin.html
var API_BASE = '<API_ORIGIN>'

// uniCloud-aliyun/cloudfunctions/generateShareLink/index.js
const HOSTING_DOMAIN = '<WEB_ORIGIN>'
```

`<API_ORIGIN>` 和 `<WEB_ORIGIN>` 是说明用占位符，必须替换为本次部署的真实地址，不能原样保留在代码中。例如，某个部署拥有 `web.example.com` 和 `api.example.com` 时，可以分别替换为 `https://web.example.com` 和 `https://api.example.com`；使用 uniCloud 默认地址时，则替换为控制台复制出的完整地址。

注意：

- `GET_ARTICLE_URL` 包含完整的 `/getShareArticle` 路径。
- `API_BASE` 只填写协议和域名，不要以 `/` 结尾；页面会自行拼接 `/getAiStats`。
- `HOSTING_DOMAIN` 不要以 `/` 结尾；云函数会自行拼接 `/share.html?sid=...`。
- 修改 `HOSTING_DOMAIN` 后必须重新部署 `generateShareLink`，否则小程序仍会生成旧域名链接。
- 不得在 `admin.html` 中写入 `ADMIN_KEY`；管理密钥只配置在 `getAiStats` 云函数环境变量中，由管理员访问页面时输入。

### 6.3 开通并绑定前端网页托管

1. 登录 uniCloud Web 控制台并选择正确的服务空间。
2. 左侧进入“前端网页托管”；如果尚未开通，根据页面提示开通。
3. 复制控制台提供的测试域名，将其记录为 `<WEB_ORIGIN>`。没有自定义域名时可以用它完成测试，然后跳到第 7 步。阿里云测试域名存在访问频率和公网 IP 数量限制，不建议用于正式商用。
4. 如需正式域名，进入“前端网页托管 → 基础设置 → 添加域名”，添加自己拥有的网页域名。
5. 按控制台分配的 CNAME 值配置 DNS 解析，等待控制台显示域名生效。
6. 上传 SSL 证书并开启 HTTP 强制跳转 HTTPS；绑定成功后，将正式地址记录为新的 `<WEB_ORIGIN>`。
7. 再次确认实际的 `<WEB_ORIGIN>` 已加入云函数服务空间的跨域配置。

如果网页托管与云函数不在同一个服务空间，跨域域名必须配置在“部署 URL 化云函数”的那个服务空间。

### 6.4 上传分享页和监控页

推荐直接通过 uniCloud Web 控制台上传：

1. 进入“前端网页托管 → 文件管理”。
2. 将仓库根目录的 `share.html` 上传到托管根目录，远端路径必须是 `/share.html`。
3. 将仓库根目录的 `admin.html` 上传到同一托管根目录，远端路径必须是 `/admin.html`。
4. 如果远端已存在同名文件，确认本地代码已提交或可恢复后覆盖上传。
5. 上传后分别访问：

```text
<WEB_ORIGIN>/share.html?sid=<有效分享ID>
<WEB_ORIGIN>/admin.html
```

也可以通过 HBuilderX 的“前端网页托管”管理器拖拽上传，或选择“发行 → 上传网站到服务器”。本项目是两个独立静态文件，不需要执行 H5 编译，也不要把整个项目目录上传到托管根目录。

两个页面会从公共 CDN 加载前端库：`share.html` 使用 marked、highlight.js、KaTeX 和 Mermaid，`admin.html` 使用 Chart.js。验收时需确认浏览器控制台中这些资源没有加载失败。

官方参考：[uniCloud 前端网页托管](https://doc.dcloud.net.cn/uniCloud/hosting)

### 6.5 更新发布与缓存刷新

后续修改 `share.html` 或 `admin.html` 时：

1. 覆盖上传发生变化的 HTML 文件，不要改变远端文件名和目录。
2. 使用无痕窗口或强制刷新访问页面。
3. 如果仍然显示旧版本，在访问地址后临时添加版本参数，例如 `admin.html?v=20260802`。
4. 加版本参数能看到新页面时，说明 CDN 缓存尚未刷新；进入“前端网页托管”配置页执行“刷新缓存”。
5. 阿里云账号每小时缓存刷新次数有限，不要连续重复提交刷新任务。

### 6.6 托管验收清单

- [ ] `share.html` 和 `admin.html` 均返回 HTTP 200，地址栏使用 HTTPS。
- [ ] 从小程序生成的新分享链接使用本次部署的 `<WEB_ORIGIN>/share.html?sid=...`，没有残留旧项目域名。
- [ ] 分享页能加载标题、正文、代码高亮、公式和 Mermaid 图表。
- [ ] 分享失效或不存在时展示友好错误，而不是空白页。
- [ ] 监控页输入正确 `ADMIN_KEY` 后能加载统计、价格和调用明细。
- [ ] 监控页错误密钥返回“密钥错误”，不会显示后台数据。
- [ ] 浏览器控制台没有 CORS、Mixed Content 或 CDN 静态资源错误。
- [ ] 页面源代码、托管文件和浏览器日志中均没有真实 API Key 或 `ADMIN_KEY`。

前端网页托管本身不会限制谁能打开 `/admin.html`，真正的数据访问控制由 `getAiStats` 的 `ADMIN_KEY` 完成。不要依赖“不公开监控页地址”作为安全措施。

Mermaid 使用独立 Kroki 服务，当前配置位于 `renderMermaid/index.js`。若更换域名，还需更新微信小程序的 `downloadFile` 合法域名。详细部署见 [Mermaid 渲染部署](./mermaid-render/deployment.md)。

## 7. 微信小程序配置

1. 在 `manifest.json` 中确认 `mp-weixin.appid`。
2. 在微信公众平台配置 request 合法域名：`mp.weixin.qq.com`，用于公众号文章抓取。
3. 配置 downloadFile 合法域名：当前 Mermaid/Kroki 渲染域名。
4. 如使用定位功能，检查 `manifest.json` 中的高德地图 Key 是否属于当前应用和包名。
5. 使用 HBuilderX “运行到小程序模拟器 → 微信开发者工具”。

## 8. 上线前验证清单

- [ ] 微信登录成功，`tb_user` 能正确读取或创建用户
- [ ] 加固版本升级后重新登录一次，语义搜索没有“登录凭证无效”错误
- [ ] 记录新增、编辑、删除、搜索正常
- [ ] 一张和多张图片 OCR 成功；故意使用错误 Key 时返回配置/鉴权错误而不是假成功
- [ ] 微信公众号链接可导入并清洗为 Markdown
- [ ] AI 学习任务进入队列，定时函数生成笔记和练习题
- [ ] 新建/编辑笔记由 `manageEmbedding` 安全入队，客户端不能直接读取两个内部集合
- [ ] 分享链接可在未登录浏览器中打开
- [ ] `admin.html` 使用 `ADMIN_KEY` 登录并读取统计
- [ ] LaTeX、YUML、ECharts、Mermaid 渲染正常
- [ ] 云函数代码中没有明文 Key，Git 中没有 `.env`

## 9. 常见问题

### 提示“缺少 XXX 环境变量”

环境变量是按云函数隔离的。确认已在 uniCloud 控制台将变量配置到报错的那个函数，而不是只配置在另一个函数中。

### 本地成功、云端失败

确认当前 HBuilderX 项目关联的是配置过环境变量的服务空间，并检查实际部署的云函数版本。环境变量需要在 uniCloud 控制台配置；保存后通过控制台运行一次函数并查看云端日志。

### AI 学习任务一直 pending

检查 `processLearnNote` 是否已部署、`ZHIPU_API_KEY` 是否配置，以及每分钟定时触发器是否生效。

### 统计页返回 503

检查 `getAiStats` 是否配置 `ADMIN_KEY`。新版代码不再提供默认管理密钥。

### 新成员克隆后缺少云函数

`uniCloud-aliyun` 源码应进入版本控制；只允许忽略云函数的 `node_modules` 和 `.env`。如果目录缺失，先检查分支和仓库提交是否完整。
