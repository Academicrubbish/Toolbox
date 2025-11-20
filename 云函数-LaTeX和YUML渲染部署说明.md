# LaTeX 和 YUML 云函数部署说明

## 📦 已创建的文件

### 云函数文件

1. **renderLatex 云函数**：`uniCloud-aliyun/cloudfunctions/renderLatex/`
   - `index.js` - LaTeX 公式渲染逻辑
   - `package.json` - 依赖配置（mathjax-node）

2. **renderYuml 云函数**：`uniCloud-aliyun/cloudfunctions/renderYuml/`
   - `index.js` - YUML 图表渲染逻辑
   - `package.json` - 依赖配置（yuml2svg）

### 已修改的前端文件

1. **latex 组件**：`wxcomponents/towxml/latex/latex.js`
   - 已改为使用云函数渲染，失败时自动降级到外部 API

2. **yuml 组件**：`wxcomponents/towxml/yuml/yuml.js`
   - 已改为使用云函数渲染，失败时自动降级到外部 API

3. **配置文件**：`wxcomponents/towxml/config.js`
   - 添加了云函数配置选项

## 🚀 部署步骤

### 1. 上传云函数依赖

在 HBuilderX 中：

#### renderLatex 云函数
1. 右键点击 `uniCloud-aliyun/cloudfunctions/renderLatex` 文件夹
2. 选择「上传云函数」
3. 等待上传完成（会自动安装 mathjax-node 依赖）

#### renderYuml 云函数
1. 右键点击 `uniCloud-aliyun/cloudfunctions/renderYuml` 文件夹
2. 选择「上传云函数」
3. 等待上传完成（会自动安装 yuml2svg 依赖）

### 2. 验证云函数

在 HBuilderX 中测试云函数：

#### 测试 renderLatex
1. 右键点击 `renderLatex` 云函数
2. 选择「运行云函数」
3. 测试参数：
```json
{
  "tex": "E = mc^2",
  "theme": "light"
}
```

预期返回：
```json
{
  "code": 0,
  "message": "success",
  "data": "data:image/svg+xml;base64,...",
  "svg": "<svg>...</svg>"
}
```

#### 测试 renderYuml
1. 右键点击 `renderYuml` 云函数
2. 选择「运行云函数」
3. 测试参数：
```json
{
  "yuml": "[Customer]<>-orders*>[Order]",
  "theme": "light"
}
```

预期返回：
```json
{
  "code": 0,
  "message": "success",
  "data": "data:image/svg+xml;base64,...",
  "svg": "<svg>...</svg>"
}
```

## 📝 功能说明

### LaTeX 公式渲染

**支持的格式：**
- 行内公式：`$E = mc^2$`
- 块级公式：`$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$`

**主题支持：**
- `light` - 浅色主题（默认）
- `dark` - 深色主题（公式颜色为白色）

### YUML 图表渲染

**支持的格式：**
- 类图：`[Customer]<>-orders*>[Order]`
- 活动图：`[Start]->[End]`
- 用例图等

**主题支持：**
- `light` - 浅色主题（默认）
- `dark` - 深色主题

## ⚙️ 配置说明

### 云函数配置

在 `wxcomponents/towxml/config.js` 中可以配置是否使用云函数：

```javascript
latex: {
    api: 'http://towxml.vvadd.com/?tex',  // 降级备用 API
    useCloudFunction: true  // true 使用云函数，false 使用外部 API
},
yuml: {
    api: 'http://towxml.vvadd.com/?yuml',  // 降级备用 API
    useCloudFunction: true  // true 使用云函数，false 使用外部 API
}
```

### 降级机制

组件实现了自动降级机制：
1. 优先使用云函数渲染
2. 如果云函数调用失败，自动降级到外部 API
3. 确保在任何情况下都能正常显示公式和图表

## 💡 优势

使用云函数渲染的优势：

1. **不依赖外部服务** - 完全自主可控
2. **Base64 格式** - 无需额外网络请求，直接内嵌显示
3. **主题支持** - 支持浅色/深色主题切换
4. **自动降级** - 云函数失败时自动使用外部 API，保证可用性
5. **性能优化** - 云函数可以缓存渲染结果（后续可扩展）

## 🔧 依赖说明

### renderLatex 云函数
- `mathjax-node@^2.1.1` - MathJax 的 Node.js 版本，用于渲染 LaTeX 公式

### renderYuml 云函数
- `yuml2svg@^1.0.0` - YUML 图表转 SVG 工具

## 📌 注意事项

1. **首次部署**：云函数首次上传时，依赖安装可能需要几分钟时间
2. **网络环境**：确保云函数有网络访问权限（用于下载依赖）
3. **主题变量**：组件使用 `global._theme` 获取当前主题，确保全局主题变量已设置
4. **Base64 大小**：复杂公式和图表生成的 Base64 可能较大，但通常不会超过小程序限制

## 🐛 故障排查

### 云函数调用失败

1. 检查云函数是否已正确上传
2. 检查云函数依赖是否已安装（查看云函数日志）
3. 检查网络连接是否正常
4. 查看控制台错误信息

### 渲染结果不正确

1. 检查传入的公式/图表语法是否正确
2. 检查主题参数是否正确（light/dark）
3. 查看云函数返回的原始 SVG（调试用）

### 降级到外部 API

如果云函数持续失败，可以临时修改配置：
```javascript
latex: {
    useCloudFunction: false  // 临时禁用云函数
}
```

