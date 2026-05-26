# Kroki 渲染服务部署文档

## 架构

```
微信小程序 → callFunction → 云函数(zlib编码) → 返回 URL
微信小程序 → <image src="URL"> → 用户手机直连 ECS 加载图片
```

```
微信小程序 → HTTPS(render.coptis.top) → Nginx(Docker) → Kroki网关:8000 → Mermaid引擎:8002
```

## ECS 服务器部署

### 运行的容器

| 容器 | 镜像 | 端口 | 网络位置 |
|------|------|------|----------|
| kroki | yuzutech/kroki | 127.0.0.1:8000 | kroki + bridge |
| kroki-mermaid | yuzutech/kroki-mermaid | 8002(内部) | kroki |

### SSL 证书

域名 `render.coptis.top`，通过 certbot/Let's Encrypt 申请 SSL 证书，Nginx 反向代理 Kroki 容器。

## API 接口

### GET 方式（云函数使用）

```
GET https://render.coptis.top/mermaid/svg/<encoded>
```

编码流程：
1. 原始 Mermaid 代码（UTF-8）
2. `zlib.deflateSync()` 压缩（带 zlibc 头部，非 raw deflate）
3. base64 编码
4. 转为 URL-safe base64：`+` → `-`，`/` → `_`，去掉末尾 `=`

Node.js 示例：
```javascript
const zlib = require('zlib')
function encodeKroki(code) {
  const compressed = zlib.deflateSync(Buffer.from(code, 'utf-8'))
  return compressed.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
const url = 'https://render.coptis.top/mermaid/svg/' + encodeKroki('graph LR\nA --> B')
```

响应：`Content-Type: image/svg+xml`，Body 为 SVG 图片。

### POST 方式

```
POST https://render.coptis.top/mermaid/svg
Content-Type: text/plain

Body: graph LR
    A[开始] --> B[结束]
```

### PNG 端点

将 URL 中的 `/svg/` 替换为 `/png/` 即可获取 PNG 格式图片。小程序预览大图使用此端点（真机 `wx.previewImage` 不支持 SVG）。

## 小程序配置

### 域名白名单

微信小程序后台 → 开发管理 → 服务器域名 → downloadFile 合法域名：

- `render.coptis.top`

### 调用链路

1. 前端组件 `mermaid.js` 调用云函数 `renderMermaid`，传入 mermaid 代码
2. 云函数编码代码，返回 Kroki URL
3. 前端 `<image src="URL">` 直接加载 ECS 上的图片
4. 点击图片预览时，URL 替换 `/svg/` → `/png/`，调用 `wx.previewImage` 查看大图（支持缩放）
