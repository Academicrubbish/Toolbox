/**
 * Markdown 编辑器 - 图表模板数据
 * 包含 ECharts 各类型图表的默认模板
 */

export const chartTemplates = {
  // 折线图
  line: `\n\`\`\`echarts
{
  "title": {
    "text": "折线图示例"
  },
  "tooltip": {
    "trigger": "axis"
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
    "type": "line"
  }]
}\n\`\`\`\n`,

  // 柱状图
  bar: `\n\`\`\`echarts
{
  "title": {
    "text": "柱状图示例"
  },
  "tooltip": {
    "trigger": "axis"
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
}\n\`\`\`\n`,

  // 饼图
  pie: `\n\`\`\`echarts
{
  "title": {
    "text": "饼图示例",
    "left": "center"
  },
  "tooltip": {
    "trigger": "item"
  },
  "series": [{
    "name": "访问来源",
    "type": "pie",
    "radius": "50%",
    "data": [
      {"value": 1048, "name": "搜索引擎"},
      {"value": 735, "name": "直接访问"},
      {"value": 580, "name": "邮件营销"},
      {"value": 484, "name": "联盟广告"},
      {"value": 300, "name": "视频广告"}
    ],
    "emphasis": {
      "itemStyle": {
        "shadowBlur": 10,
        "shadowOffsetX": 0,
        "shadowColor": "rgba(0, 0, 0, 0.5)"
      }
    }
  }]
}\n\`\`\`\n`,

  // 散点图
  scatter: `\n\`\`\`echarts
{
  "title": {
    "text": "散点图示例"
  },
  "tooltip": {
    "trigger": "item"
  },
  "xAxis": {
    "type": "value"
  },
  "yAxis": {
    "type": "value"
  },
  "series": [{
    "symbolSize": 20,
    "data": [
      [10.0, 8.04],
      [8.0, 6.95],
      [13.0, 7.58],
      [9.0, 8.81],
      [11.0, 8.33],
      [14.0, 9.96],
      [6.0, 7.24],
      [4.0, 4.26],
      [12.0, 10.84],
      [7.0, 4.82],
      [5.0, 5.68]
    ],
    "type": "scatter"
  }]
}\n\`\`\`\n`,

  // 雷达图
  radar: `\n\`\`\`echarts
{
  "title": {
    "text": "雷达图示例"
  },
  "radar": {
    "indicator": [
      {"name": "销售", "max": 6500},
      {"name": "管理", "max": 16000},
      {"name": "信息技术", "max": 30000},
      {"name": "客服", "max": 38000},
      {"name": "研发", "max": 52000},
      {"name": "市场", "max": 25000}
    ]
  },
  "series": [{
    "name": "预算 vs 开销",
    "type": "radar",
    "data": [
      {
        "value": [4200, 3000, 20000, 35000, 50000, 18000],
        "name": "预算分配"
      },
      {
        "value": [5000, 14000, 28000, 26000, 42000, 21000],
        "name": "实际开销"
      }
    ]
  }]
}\n\`\`\`\n`,

  // 自定义（空模板）
  custom: `\n\`\`\`echarts
{
  "title": {
    "text": "自定义图表"
  },
  "tooltip": {},
  "xAxis": {
    "data": ["数据1", "数据2", "数据3", "数据4", "数据5"]
  },
  "yAxis": {},
  "series": [{
    "name": "销量",
    "type": "bar",
    "data": [5, 20, 36, 10, 10]
  }]
}\n\`\`\`\n`
};

// ECharts 图表类型选项列表（用于 showActionSheet）
export const echartsOptions = ['折线图', '柱状图', '饼图', '散点图', '雷达图', '自定义'];

// 根据 tapIndex 获取对应的图表模板
export function getChartTemplate(tapIndex) {
  const keys = ['line', 'bar', 'pie', 'scatter', 'radar', 'custom'];
  return chartTemplates[keys[tapIndex]] || chartTemplates.custom;
}
