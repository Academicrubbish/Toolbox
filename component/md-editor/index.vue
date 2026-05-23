<template>
  <view class="mdEditor">
    <view class="input-content">
      <textarea v-if="status" maxlength="-1" v-model="textareaData" :focus="autoFocus" />
      <view v-if="!status && loading" class="loading-wrapper">
        <view class="loading-content">
          <view class="loading-spinner"></view>
          <text class="loading-text">正在渲染中，请稍候...</text>
        </view>
      </view>
      <towxml v-if="!status && !loading" :nodes="towxmlData" />
    </view>

    <!-- 底部工具栏 -->
    <view class="toolbar">
      <view class="toolbar-main">
        <view class="toolbar-btn" @click="toolBarClick('bold')"><view class="iconfont icon-bold" /></view>
        <view class="toolbar-btn" @click="toolBarClick('italic')"><view class="iconfont icon-italic" /></view>
        <view class="toolbar-btn" @click="toolBarClick('header')"><view class="iconfont icon-title" /></view>
        <view class="toolbar-btn" @click="toolBarClick('link')"><view class="iconfont icon-hyperlinke" /></view>
        <view class="toolbar-btn" @click="toolBarClick('img')"><view class="iconfont icon-image" /></view>
        <view class="toolbar-btn" @click="toolBarClick('code')"><view class="iconfont icon-codeBlock" /></view>
        <view class="toolbar-btn" @click="toolBarClick('ul')"><view class="iconfont icon-ul" /></view>
        <view class="mode-switch">
          <view class="mode-opt" :class="{ 'mode-opt--active': status }" @click="switchMode('edit')">
            <text>编辑</text>
          </view>
          <view class="mode-opt" :class="{ 'mode-opt--active': !status }" @click="switchMode('preview')">
            <text>预览</text>
          </view>
        </view>
        <view class="toolbar-btn" @click="showMore = !showMore"><text class="cuIcon-moreandroid" style="font-family:cuIcon !important;font-size:36rpx;color:#007AFF;"></text></view>
      </view>
    </view>

    <!-- 更多操作面板 -->
    <view v-if="showMore" class="more-mask" @tap="showMore = false">
      <view class="more-panel" @tap.stop>
        <view class="more-grid">
          <view class="more-item" @click="onMoreAction('strike')"><view class="iconfont icon-strikeThrough more-icon" /><text class="more-label">删除线</text></view>
          <view class="more-item" @click="onMoreAction('underline')"><view class="iconfont icon-underline more-icon" /><text class="more-label">下划线</text></view>
          <view class="more-item" @click="onMoreAction('quote')"><view class="iconfont icon-quote more-icon" /><text class="more-label">引用</text></view>
          <view class="more-item" @click="onMoreAction('taskList')"><view class="iconfont icon-taskList more-icon" /><text class="more-label">任务列表</text></view>
          <view class="more-item" @click="onMoreAction('table')"><view class="iconfont icon-table more-icon" /><text class="more-label">表格</text></view>
          <view class="more-item" @click="onMoreAction('dividingLine')"><view class="iconfont icon-dividingLine more-icon" /><text class="more-label">分割线</text></view>
          <view class="more-item" @click="onMoreAction('inlineCode')"><view class="iconfont icon-inlineCode more-icon" /><text class="more-label">行内代码</text></view>
          <view class="more-item" @click="onMoreAction('ol')"><view class="iconfont icon-ol more-icon" /><text class="more-label">有序列表</text></view>
          <view class="more-item" @click="onMoreAction('sup')"><view class="iconfont icon-superscript more-icon" /><text class="more-label">上标</text></view>
          <view class="more-item" @click="onMoreAction('sub')"><view class="iconfont icon-subscript more-icon" /><text class="more-label">下标</text></view>
          <view class="more-item" @click="onMoreAction('inIndentation')"><view class="iconfont icon-inIndentation more-icon" /><text class="more-label">增加缩进</text></view>
          <view class="more-item" @click="onMoreAction('reIndentation')"><view class="iconfont icon-reIndentation more-icon" /><text class="more-label">减少缩进</text></view>
          <view class="more-item" @click="onMoreAction('latex')"><view class="iconfont icon-latex more-icon" /><text class="more-label">LaTeX</text></view>
          <view class="more-item" @click="onMoreAction('yuml')"><view class="iconfont icon-yuml more-icon" /><text class="more-label">YUML</text></view>
          <view class="more-item" @click="onMoreAction('echarts')"><view class="iconfont icon-echarts more-icon" /><text class="more-label">ECharts</text></view>
          <view v-if="showExtraActions" class="more-item" @click="onMoreAction('clear')"><view class="iconfont icon-empty more-icon" /><text class="more-label">清空</text></view>
          <view v-if="showExtraActions" class="more-item" @click="onMoreAction('upload')"><text class="cuIcon-upload more-icon" style="font-family:cuIcon !important" /><text class="more-label">上传MD</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { executeToolbarAction } from './toolbar-actions.js';

export default {
  name: "mdEditor",
  data() {
    return {
      textareaData: "",
      towxmlData: "",
      status: true,
      loading: false,
      loadingTimer: null,
      autoFocus: false,
      showMore: false,
    };
  },
  props: {
    textareaDataProp: {
      type: String,
      default: "",
    },
    /** 是否显示更多面板中的上传和清空操作 */
    showExtraActions: {
      type: Boolean,
      default: true,
    },
  },
  methods: {
    submit() {
      this.$emit("submit", {
        textareaData: this.textareaData,
        towxmlData: this.towxmlData,
      });
    },
    onMoreAction(type) {
      this.showMore = false;
      this.toolBarClick(type);
    },
    switchMode(mode) {
      if (mode === 'edit' && !this.status) {
        this.status = true;
      } else if (mode === 'preview' && this.status) {
        this.toolBarClick('toggle');
      }
    },
    updateTextareaContent() {
      if (this.loadingTimer) {
        clearTimeout(this.loadingTimer);
        this.loadingTimer = null;
      }

      this.loadingTimer = setTimeout(() => {
        this.loading = true;
      }, 200);

      this.$nextTick(() => {
        try {
          this.towxmlData = this.towxml(this.textareaData, "markdown", {
            events: {
              tap: () => {},
            },
          });

          const hasLatexOrYumlOrEcharts = this.textareaData.includes('$') ||
                                          this.textareaData.includes('```yuml') ||
                                          this.textareaData.includes('```echarts');

          if (hasLatexOrYumlOrEcharts) {
            setTimeout(() => {
              this.loading = false;
              if (this.loadingTimer) {
                clearTimeout(this.loadingTimer);
                this.loadingTimer = null;
              }
            }, 3000);
          } else {
            setTimeout(() => {
              this.loading = false;
              if (this.loadingTimer) {
                clearTimeout(this.loadingTimer);
                this.loadingTimer = null;
              }
            }, 300);
          }
        } catch (error) {
          this.loading = false;
          if (this.loadingTimer) {
            clearTimeout(this.loadingTimer);
            this.loadingTimer = null;
          }
        }
      });
    },
    uploadMdFile() {
      const chooseMessageFile = wx.chooseMessageFile || uni.chooseMessageFile;
      if (typeof chooseMessageFile === 'function') {
        chooseMessageFile({
          count: 1,
          type: 'file',
          success: (res) => {
            if (res.tempFiles && res.tempFiles.length > 0) {
              const file = res.tempFiles[0];
              const fileName = file.name || '';
              if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
                const filePath = file.path || file.tempFilePath || file.filePath;
                if (filePath) {
                  this.readMdFile(filePath);
                } else {
                  uni.showToast({ title: '无法获取文件路径', icon: 'none' });
                }
              } else {
                uni.showToast({ title: '请选择 .md 或 .markdown 文件', icon: 'none', duration: 2000 });
              }
            }
          },
          fail: (err) => {
            if (err.errMsg && err.errMsg.includes('cancel')) return;
            uni.showToast({ title: '选择文件失败', icon: 'none' });
          }
        });
      } else {
        uni.showToast({ title: '当前微信版本过低，请升级微信', icon: 'none', duration: 2000 });
      }
    },
    readMdFile(filePath) {
      uni.showLoading({ title: '读取文件中...', mask: true });
      this.readFileWithFileSystem(filePath);
    },
    readFileWithFileSystem(filePath) {
      const fs = uni.getFileSystemManager();
      fs.readFile({
        filePath: filePath,
        encoding: 'utf8',
        success: (res) => {
          uni.hideLoading();
          this.textareaData = res.data;
          uni.showToast({ title: '文件读取成功', icon: 'success', duration: 1500 });
        },
        fail: (err) => {
          uni.hideLoading();
          uni.showToast({ title: '读取文件失败', icon: 'none' });
        }
      });
    },
    toolBarClick(type) {
      executeToolbarAction(type, this);
    },
  },
  watch: {
    textareaDataProp: function (newValue) {
      this.textareaData = newValue;
    },
  },
  mounted() {
    this.autoFocus = true;
  },
  beforeDestroy() {
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
  },
};
</script>

<style lang="scss">
.mdEditor {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #FFFFFF;
  position: relative;
}

.input-content {
  flex: 1;
  overflow: auto;
  padding-bottom: 100rpx;

  textarea {
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
    height: 100%;
    width: 100%;
    padding: 20rpx 24rpx;
    box-sizing: border-box;
    font-size: 34rpx;
    line-height: 1.7;
    color: #1C1C1E;
  }
}

/* 底部工具栏 */
.toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: 0.5px solid rgba(60, 60, 67, 0.08);
  padding-bottom: env(safe-area-inset-bottom);
}

.toolbar-main {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 8rpx;
}

.toolbar-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;

  &:active {
    opacity: 0.5;
  }

  .iconfont {
    font-size: 36rpx;
    color: $color-primary;
  }
}

/* 编辑/预览切换器 */
.mode-switch {
  display: flex;
  background: rgba(118, 118, 128, 0.12);
  border-radius: 8px;
  padding: 3px;
  margin: 0 4px;
  flex-shrink: 0;
}

.mode-opt {
  padding: 6rpx 20rpx;
  border-radius: 6px;
  font-size: 24rpx;
  font-weight: 600;
  color: #8e8e93;
  transition: all 0.15s;

  &--active {
    background: #ffffff;
    color: $color-primary;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
}

.loading-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #FFFFFF;
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

/* 更多操作面板 */
.more-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.3);
}

.more-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx 16rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}

.more-grid {
  display: flex;
  flex-wrap: wrap;
}

.more-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 0;

  &:active {
    opacity: 0.5;
  }
}

.more-icon {
  font-size: 44rpx;
  color: #007AFF;
  margin-bottom: 8rpx;
}

.more-label {
  font-size: 22rpx;
  color: #3C3C43;
}
</style>
