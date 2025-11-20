<template>
  <view class="mdEditor">
    <view class="toolbar">
      <view class="iconfont icon-bold" @click="toolBarClick('bold')" />
      <view class="iconfont icon-italic" @click="toolBarClick('italic')" />
      <view class="iconfont icon-title" @click="toolBarClick('header')" />
      <view class="iconfont icon-underline" @click="toolBarClick('underline')" />
      <view class="iconfont icon-strikeThrough" @click="toolBarClick('strike')" />
      <view class="iconfont icon-superscript" @click="toolBarClick('sup')" />
      <view class="iconfont icon-subscript" @click="toolBarClick('sub')" />
      <view class="iconfont icon-inIndentation" @click="toolBarClick('inIndentation')" />
      <view class="iconfont icon-reIndentation" @click="toolBarClick('reIndentation')" />
      <view class="iconfont icon-ul" @click="toolBarClick('ul')" />
      <view class="iconfont icon-ol" @click="toolBarClick('ol')" />
      <view class="iconfont icon-dividingLine" @click="toolBarClick('dividingLine')" />
      <view class="iconfont icon-hyperlinke" @click="toolBarClick('link')" />
      <view class="iconfont icon-image" @click="toolBarClick('img')" />
      <view class="iconfont icon-inlineCode" @click="toolBarClick('inlineCode')" />
      <view class="iconfont icon-codeBlock" @click="toolBarClick('code')" />
      <view class="iconfont icon-table" @click="toolBarClick('table')" />
      <view class="iconfont icon-quote" @click="toolBarClick('quote')" />
      <view class="iconfont icon-taskList" @click="toolBarClick('taskList')" />
      <view class="toolbar-btn" @click="toolBarClick('latex')" title="LaTeX公式">∑</view>
      <view class="toolbar-btn" @click="toolBarClick('yuml')" title="YUML图表">◉</view>
      <view class="toolbar-btn" @click="toolBarClick('echarts')" title="ECharts图表">📊</view>
      <view class="iconfont icon-empty" @click="toolBarClick('clear')" />
      <view class="iconfont icon-toggle" @click="toolBarClick('toggle')" />
      <view class="submit">
        <button type="primary" size="mini" @click="submit">保存</button>
      </view>
    </view>
    <view class="input-content">
      <textarea v-if="status" maxlength="-1" v-model="textareaData"></textarea>
      <view v-if="!status && loading" class="loading-wrapper">
        <view class="loading-content">
          <view class="loading-spinner"></view>
          <text class="loading-text">正在渲染中，请稍候...</text>
        </view>
      </view>
      <towxml v-if="!status && !loading" :nodes="towxmlData" />
    </view>
  </view>
</template>

<script>

export default {
  name: "mdEditor",
  data() {
    return {
      textareaData: "",
      towxmlData: "",
      status: true,
      loading: false, // 加载状态
      loadingTimer: null, // 加载定时器（用于延迟显示）
    };
  },
  props: {
    textareaDataProp: {
      type: String,
      default: "",
    },
  },
  methods: {
    submit() {
      this.$emit("submit", {
        textareaData: this.textareaData,
        towxmlData: this.towxmlData,
      });
    },
    updateTextareaContent() {
      // 清除之前的定时器
      if (this.loadingTimer) {
        clearTimeout(this.loadingTimer);
        this.loadingTimer = null;
      }
      
      // 显示加载提示（延迟 200ms 显示，避免快速切换时闪烁）
      this.loadingTimer = setTimeout(() => {
        this.loading = true;
      }, 200);
      
      // 使用 nextTick 确保 DOM 更新后再渲染
      this.$nextTick(() => {
        try {
          this.towxmlData = this.towxml(this.textareaData, "markdown", {
            events: {
              tap: (e) => {
                console.log("tap", e);
              },
            },
          });
          
          // 渲染完成后，等待一段时间确保所有组件都已加载
          // 检查是否包含 latex、yuml 或 echarts 组件
          const hasLatexOrYumlOrEcharts = this.textareaData.includes('$') || 
                                          this.textareaData.includes('```yuml') ||
                                          this.textareaData.includes('```echarts');
          
          if (hasLatexOrYumlOrEcharts) {
            // 如果有 LaTeX、YUML 或 ECharts，等待更长时间（云函数调用需要时间）
            // 设置一个较长的等待时间，确保云函数调用完成
            setTimeout(() => {
              this.loading = false;
              if (this.loadingTimer) {
                clearTimeout(this.loadingTimer);
                this.loadingTimer = null;
              }
            }, 3000); // 3秒后隐藏加载提示（给云函数足够的时间）
          } else {
            // 没有需要云函数渲染的内容，快速隐藏
            setTimeout(() => {
              this.loading = false;
              if (this.loadingTimer) {
                clearTimeout(this.loadingTimer);
                this.loadingTimer = null;
              }
            }, 300);
          }
        } catch (error) {
          console.error('渲染失败：', error);
          this.loading = false;
          if (this.loadingTimer) {
            clearTimeout(this.loadingTimer);
            this.loadingTimer = null;
          }
        }
      });
    },
    toolBarClick(type) {
      const updateTextareaContent = () => {
        this.updateTextareaContent();
      };
      const adjustIndentation = (increase) => {
        const lines = this.textareaData.split("\n");
        if (lines.length > 0) {
          const lastLineIndex = lines.length - 1;
          if (increase) {
            lines[lastLineIndex] = "  " + lines[lastLineIndex]; // 增加两个空格缩进
          } else {
            lines[lastLineIndex] = lines[lastLineIndex].replace(/^ {2}/, ""); // 减少两个空格缩进
          }
          this.textareaData = lines.join("\n");
        }
      };
      const appendText = (text) => {
        this.textareaData += text;
      };

      const headers = ["#", "##", "###", "####", "#####", "######"];

      switch (type) {
        case "bold":
          appendText("**粗体文字** ");
          break;
        case "italic":
          appendText("*斜体* ");
          break;
        case "header":
          uni.showActionSheet({
            itemList: ["标题1", "标题2", "标题3", "标题4", "标题5", "标题6"],
            success: (res) =>
              appendText(
                `\n${headers[res.tapIndex]} 标题${res.tapIndex + 1}\r`
              ),
          });
          break;
        case "underline":
          appendText("++下划线++ ");
          break;
        case "strike":
          appendText("~~删除线~~ ");
          break;
        case "sup":
          appendText("^上角标^ ");
          break;
        case "sub":
          appendText("~下角标~ ");
          break;
        case "link":
          appendText("[在此输入网址描述](在此输入网址) ");
          break;
        case "img":
          uni.chooseImage({
            count: 1,
            success: (res) => {
              appendText(
                `<img src="${res.tempFilePaths[0]}" style="zoom:100%;" />`
              );
              // appendText(`![](${res.tempFilePaths[0]}) `);
            },
          });

          break;
        case "code":
          appendText("\n``` 代码块 \n\n```\n");
          break;
        case "table":
          appendText("\n|列1|列2|列3|\n|-|-|-|\n|单元格1|单元格2|单元格3|\n");
          break;
        case "inlineCode":
          appendText("`行内代码块`");
          break;
        case "taskList":
          appendText("\n- [ ] 任务列表");
          break;
        case "quote":
          appendText("\n> 引用内容");
          break;
        case "latex":
          uni.showActionSheet({
            itemList: ["行内公式", "块级公式"],
            success: (res) => {
              if (res.tapIndex === 0) {
                // 行内公式
                appendText("$E = mc^2$ ");
              } else {
                // 块级公式
                appendText("\n$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$\n");
              }
            },
          });
          break;
        case "yuml":
          uni.showActionSheet({
            itemList: ["类图", "活动图", "用例图"],
            success: (res) => {
              if (res.tapIndex === 0) {
                // 类图
                appendText("\n```yuml\n[Customer]<>-orders*>[Order]\n```\n");
              } else if (res.tapIndex === 1) {
                // 活动图
                appendText("\n```yuml\n[Start]->[End]\n```\n");
              } else {
                // 用例图
                appendText("\n```yuml\n[User]-(Login)\n```\n");
              }
            },
          });
          break;
        case "echarts":
          uni.showActionSheet({
            itemList: ["折线图", "柱状图", "饼图", "散点图", "雷达图", "自定义"],
            success: (res) => {
              let chartTemplate = "";
              if (res.tapIndex === 0) {
                // 折线图
                chartTemplate = `\n\`\`\`echarts\n{
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
}\n\`\`\`\n`;
              } else if (res.tapIndex === 1) {
                // 柱状图
                chartTemplate = `\n\`\`\`echarts\n{
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
}\n\`\`\`\n`;
              } else if (res.tapIndex === 2) {
                // 饼图
                chartTemplate = `\n\`\`\`echarts\n{
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
}\n\`\`\`\n`;
              } else if (res.tapIndex === 3) {
                // 散点图
                chartTemplate = `\n\`\`\`echarts\n{
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
}\n\`\`\`\n`;
              } else if (res.tapIndex === 4) {
                // 雷达图
                chartTemplate = `\n\`\`\`echarts\n{
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
}\n\`\`\`\n`;
              } else {
                // 自定义（空模板）
                chartTemplate = `\n\`\`\`echarts\n{
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
}\n\`\`\`\n`;
              }
              appendText(chartTemplate);
            },
          });
          break;
        case "inIndentation":
          adjustIndentation(true);
          break;
        case "reIndentation":
          adjustIndentation(false);
          break;
        case "dividingLine":
          appendText("\n------");
          break;
        case "ul":
          appendText("\n- 无序列表1");
          break;
        case "ol":
          appendText("\n1. 有序列表");
          break;
        case "clear":
          uni.showModal({
            title: "提示",
            content: "确定清空?",
            success: (res) => {
              if (res.confirm) {
                this.textareaData = "";
              }
            },
          });
          break;
        case "toggle":
          if (this.status) {
            // 切换到预览模式
            updateTextareaContent();
          } else {
            // 切换到编辑模式，清除加载状态
            this.loading = false;
            if (this.loadingTimer) {
              clearTimeout(this.loadingTimer);
              this.loadingTimer = null;
            }
          }
          this.status = !this.status;
          break;
      }
    },
  },
  watch: {
    textareaData: function (newValue, oldValue) {
      console.log("111", newValue);
    },
    textareaDataProp: function (newValue, oldValue) {
      this.textareaData = newValue;
    },
  },
};
</script>

<style>
@import "../../static/mdEditor/markdown.css";

.mdEditor {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.toolbar {
  width: 100%;
  border: none;
  box-shadow: 0 0px 4px rgba(0, 0, 0, 0.157), 0 0px 4px rgba(0, 0, 0, 0.227);
  position: relative;
}

.toolbar .iconfont {
  display: inline-block;
  cursor: pointer;
  width: calc(100% / 9);
  /* 固定宽度 */
  aspect-ratio: 1;
  /* 高度与宽度相等 */
  font-size: 32rpx;
  padding: 10rpx;
  color: #757575;
  text-align: center;
  background: none;
  border: none;
  outline: none;
  line-height: 2.2;
  vertical-align: middle;
  box-sizing: border-box;
}

.toolbar .toolbar-btn {
  display: inline-block;
  cursor: pointer;
  width: calc(100% / 9);
  aspect-ratio: 1;
  font-size: 32rpx;
  padding: 10rpx;
  color: #757575;
  text-align: center;
  background: none;
  border: none;
  outline: none;
  line-height: 2.2;
  vertical-align: middle;
  box-sizing: border-box;
  font-weight: bold;
}

.toolbar .submit {
  height: calc(100% / 3);
  position: absolute;
  bottom: 0;
  right: 30rpx;
  display: flex;
  align-items: center;
}

.input-content {
  width: 100%;
  flex: 1;
  /* 占据剩余空间 */
  overflow: auto;
}

.input-content textarea {
  font-family: PingFang SC, Lantinghei SC, Microsoft Yahei, Hiragino Sans GB,
    Microsoft Sans Serif, WenQuanYi Micro Hei, sans-serif;
  height: 100%;
  width: 100%;
  padding: 16rpx 25rpx;
  box-sizing: border-box;
  font-size: 32rpx;
  line-height: 1.5;
}

.loading-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #f3f3f3;
  border-top: 4rpx solid #007aff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20rpx;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: #666;
  text-align: center;
}
</style>