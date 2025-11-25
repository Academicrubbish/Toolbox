# ECharts 图表渲染云函数部署说明

## 📦 已创建的文件

1. **云函数**：`uniCloud-aliyun/cloudfunctions/renderEcharts/`
   - `index.js` - 云函数主文件
   - `package.json` - 依赖配置

2. **Markdown 插件**：`wxcomponents/towxml/parse/markdown/plugins/echarts.js`
   - 识别 `\`\`\`echarts` 代码块

3. **前端组件**：`wxcomponents/towxml/echarts/echarts-simple.js`
   - 轻量级组件，调用云函数渲染图表

4. **API 封装**：`api/render.js`
   - 添加了 `renderEcharts` 函数

## ✅ 可行性分析

### 优势
- ✅ **大幅减少代码包体积**：不再需要引入完整的 echarts 库（wx-echarts.js 文件很大）
- ✅ **统一渲染逻辑**：与 LaTeX、YUML 保持一致
- ✅ **服务端渲染**：性能更好，不受客户端限制

### 劣势
- ❌ **失去交互性**：渲染为静态图片，无法进行缩放、点击等交互
- ❌ **需要网络请求**：每次渲染都需要调用云函数，有延迟
- ❌ **依赖安装**：`canvas` 包在某些环境下可能安装困难

## 🚀 部署步骤

### 1. 上传云函数依赖

在 HBuilderX 中：
1. 右键点击 `uniCloud-aliyun/cloudfunctions/renderEcharts` 文件夹
2. 选择「上传云函数」
3. 等待上传完成（会自动安装依赖）

**注意**：如果 `canvas` 包安装失败，可能需要：
- 检查 Node.js 版本（建议 16+）
- 或者考虑使用替代方案（见下方）

### 2. 验证云函数

在 HBuilderX 中：
1. 右键点击 `renderEcharts` 云函数
2. 选择「运行云函数」
3. 测试参数：
```json
{
  "option": {
    "title": {
      "text": "测试图表"
    },
    "xAxis": {
      "type": "category",
      "data": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    },
    "yAxis": {
      "type": "value"
    },
    "series": [{
      "data": [120, 200, 150, 80, 70, 110, 130],
      "type": "bar"
    }]
  },
  "theme": "light",
  "width": 800,
  "height": 400
}
```

## 📝 使用说明

### Markdown 中使用

```markdown
\`\`\`echarts
{
  "option": {
    "title": {
      "text": "销售数据"
    },
    "xAxis": {
      "type": "category",
      "data": ["一月", "二月", "三月"]
    },
    "yAxis": {
      "type": "value"
    },
    "series": [{
      "data": [120, 200, 150],
      "type": "bar"
    }]
  },
  "height": 400
}
\`\`\`
```

### 配置说明

- `option`: ECharts 配置对象（必需）
- `height`: 图表高度（可选，默认 400）
- `width`: 图表宽度（可选，默认 800）

## ⚠️ 注意事项

### 1. Canvas 依赖问题

如果 `canvas` 包在 uniCloud 环境中安装失败，可以考虑：

**方案 A：使用 puppeteer（更重但更稳定）**
```json
{
  "dependencies": {
    "echarts": "^5.4.3",
    "puppeteer": "^21.0.0"
  }
}
```

**方案 B：使用第三方服务**
- 使用 ECharts 官方提供的图片导出服务
- 或使用其他图表渲染服务

**方案 C：保留客户端渲染**
- 如果交互性很重要，可以保留原来的客户端渲染方案
- 将 echarts 放到分包中，减少主包体积

### 2. 性能优化

- 图表配置尽量简洁，减少渲染时间
- 考虑添加缓存机制，相同配置的图表可以复用
- 设置合理的超时时间

### 3. 文件大小对比

- **原方案**：wx-echarts.js 约 500KB+（压缩后）
- **云函数方案**：前端组件 < 5KB
- **节省**：约 500KB 代码包体积

## 🔄 迁移建议

如果当前使用的是客户端渲染的 echarts：

1. **保留原组件**：暂时不删除 `echarts/echarts.js` 等文件
2. **逐步迁移**：新内容使用云函数方案
3. **测试验证**：确保云函数渲染效果符合预期
4. **完全切换**：确认无误后，可以删除原 echarts 相关文件

## 💡 替代方案

如果云函数方案不可行，可以考虑：

1. **分包加载**：将 echarts 放到分包中
2. **按需引入**：只引入需要的图表类型
3. **CDN 加载**：从 CDN 动态加载（小程序可能不支持）
4. **简化图表库**：使用更轻量的图表库（如 Chart.js 的小程序版本）

