<!--
 * @Description: AI辅导学习结果详情页
-->
<template>
  <view class="detail-container">
    <cu-custom bgColor="bg-gradual-orange" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">学习详情</block>
    </cu-custom>

    <view class="detail-wrapper">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-wrapper">
        <text class="cuIcon-loading2 text-gray text-xl" style="animation: spin 1s linear infinite;"></text>
        <text class="text-gray text-sm margin-top">加载中...</text>
      </view>

      <template v-else-if="resultData">
        <!-- 状态信息 -->
        <view class="status-bar" :class="'status-bar-' + resultData.status">
          <view class="status-dot" :class="statusClass(resultData.status)"></view>
          <text class="status-text">{{ statusText(resultData.status) }}</text>
          <text v-if="resultData.complete_time" class="status-time text-xs">
            {{ formatTime(resultData.complete_time) }}
          </text>
        </view>

        <!-- AI生成内容 -->
        <view v-if="resultData.status === 'success' && towxmlData" class="content-card shadow-warp">
          <view class="content-header">
            <view class="content-icon">
              <text class="cuIcon-creativefill text-orange"></text>
            </view>
            <view class="content-title">
              <text class="text-lg text-bold">AI 辅导内容</text>
            </view>
            <view class="download-btn" @click="downloadDocument">
              <text class="cuIcon-downloadfill text-blue"></text>
              <text class="download-text text-xs">下载</text>
            </view>
          </view>
          <view class="content-body">
            <view class="towxml-wrapper">
              <towxml :nodes="towxmlData" />
            </view>
          </view>
        </view>

        <!-- 错误信息 -->
        <view v-if="resultData.status === 'error'" class="error-card shadow-warp">
          <text class="cuIcon-warnfill text-red" style="font-size: 60rpx;"></text>
          <text class="text-red margin-top">生成失败</text>
          <text class="text-gray text-sm margin-top-sm">{{ resultData.error_msg || '未知错误' }}</text>
          <view class="error-tip margin-top">
            <text class="text-gray text-xs">如持续失败，请通知管理员</text>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script>
import { getLearnResultDetail } from "@/api/aiLearn.js";
import moment from "moment";

export default {
  data() {
    return {
      logId: "",
      resultData: null,
      towxmlData: "",
      loading: false
    };
  },
  onLoad(option) {
    this.logId = option.id || "";
    this.loadDetail();
  },
  methods: {
    loadDetail() {
      if (!this.logId) return;
      this.loading = true;
      getLearnResultDetail(this.logId)
        .then((res) => {
          if (res.result && res.result.data && res.result.data.length > 0) {
            this.resultData = res.result.data[0];
            if (this.resultData.status === 'success' && this.resultData.ai_result) {
              this.towxmlData = this.towxml(this.resultData.ai_result, "markdown", {
                events: {
                  tap: (e) => {
                    console.log("tap", e);
                  },
                },
              });
            }
          } else {
            uni.showToast({ title: '记录不存在', icon: 'none' });
            setTimeout(() => { uni.navigateBack(); }, 1500);
          }
        })
        .catch((err) => {
          console.error("加载详情失败：", err);
          uni.showToast({ title: '加载失败', icon: 'none' });
        })
        .finally(() => {
          this.loading = false;
        });
    },
    statusText(status) {
      const map = { pending: 'AI 生成中...', success: '已完成', error: '生成失败' };
      return map[status] || '';
    },
    statusClass(status) {
      const map = { pending: 'dot-pending', success: 'dot-success', error: 'dot-error' };
      return map[status] || '';
    },
    formatTime(timestamp) {
      if (!timestamp) return '';
      return moment(timestamp).format('YYYY-MM-DD HH:mm');
    },
    downloadDocument() {
      if (!this.resultData || !this.resultData.ai_result) {
        uni.showToast({ title: '暂无内容可下载', icon: 'none' });
        return;
      }

      uni.showLoading({ title: '准备下载...', mask: true });
      const fileName = `AI辅导_${moment().format('YYYYMMDD_HHmmss')}.md`;
      const content = this.resultData.ai_result;

      // 复用 detail.vue 的下载逻辑
      const cloudPath = `downloads/${moment().unix()}_${fileName}`;
      const fs = uni.getFileSystemManager();
      let userDataPath = '';
      try {
        if (typeof wx !== 'undefined' && wx.env && wx.env.USER_DATA_PATH) {
          userDataPath = wx.env.USER_DATA_PATH;
        }
      } catch (e) {
        console.warn('无法获取USER_DATA_PATH：', e);
      }

      if (!userDataPath) {
        this.copyToClipboard(content);
        return;
      }

      const tempFilePath = `${userDataPath}/${fileName}`;
      fs.writeFile({
        filePath: tempFilePath,
        data: content,
        encoding: 'utf8',
        success: () => {
          uniCloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath,
            cloudPathAsRealPath: true,
            success: (uploadRes) => {
              uni.downloadFile({
                url: uploadRes.fileID,
                success: (downloadRes) => {
                  if (downloadRes.statusCode === 200) {
                    this.saveFileToLocal(downloadRes.tempFilePath, fileName);
                  } else {
                    uni.hideLoading();
                    this.copyToClipboard(content);
                  }
                },
                fail: () => {
                  uni.hideLoading();
                  this.copyToClipboard(content);
                }
              });
            },
            fail: () => {
              uni.hideLoading();
              this.copyToClipboard(content);
            }
          });
        },
        fail: () => {
          uni.hideLoading();
          this.copyToClipboard(content);
        }
      });
    },
    copyToClipboard(content) {
      uni.showModal({
        title: '提示',
        content: '由于平台限制，建议复制内容后手动保存。是否复制到剪贴板？',
        success: (res) => {
          uni.hideLoading();
          if (res.confirm) {
            uni.setClipboardData({
              data: content,
              success: () => {
                uni.showToast({ title: '已复制到剪贴板', icon: 'success' });
              }
            });
          }
        }
      });
    },
    saveFileToLocal(tempFilePath, fileName) {
      uni.saveFile({
        tempFilePath: tempFilePath,
        success: (saveRes) => {
          uni.hideLoading();
          uni.showToast({ title: '保存成功', icon: 'success' });
          uni.openDocument({
            filePath: saveRes.savedFilePath,
            showMenu: true,
            fail: () => {
              uni.showToast({ title: '打开文件失败', icon: 'none' });
            }
          });
        },
        fail: () => {
          uni.hideLoading();
          uni.showToast({ title: '保存失败', icon: 'none' });
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.detail-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f5f7fa 0%, #f1f1f1 100%);
}

.detail-wrapper {
  padding: 30rpx;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

/* 状态栏 */
.status-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 28rpx;
  border-radius: 16rpx;
  margin-bottom: 24rpx;

  &.status-bar-success {
    background: rgba(76, 217, 100, 0.1);
  }

  &.status-bar-pending {
    background: rgba(255, 157, 0, 0.1);
  }

  &.status-bar-error {
    background: rgba(255, 59, 48, 0.1);
  }

  .status-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    margin-right: 12rpx;
  }

  .dot-pending {
    background: #ff9d00;
  }

  .dot-success {
    background: #4cd964;
  }

  .dot-error {
    background: #999;
  }

  .status-text {
    font-size: 28rpx;
    font-weight: 500;
    flex: 1;
  }

  .status-time {
    color: #999;
  }
}

/* 内容卡片 */
.content-card {
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
}

.content-header {
  display: flex;
  align-items: center;
  padding: 28rpx 28rpx 20rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);

  .content-icon {
    width: 48rpx;
    height: 48rpx;
    border-radius: 12rpx;
    background: rgba(255, 157, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;

    .cuIcon-creativefill {
      font-size: 28rpx;
    }
  }

  .content-title {
    flex: 1;
  }

  .download-btn {
    display: flex;
    align-items: center;
    padding: 8rpx 16rpx;
    border-radius: 8rpx;
    background: rgba(0, 129, 255, 0.1);

    &:active {
      background: rgba(0, 129, 255, 0.2);
      transform: scale(0.95);
    }

    .cuIcon-downloadfill {
      font-size: 28rpx;
      margin-right: 8rpx;
    }

    .download-text {
      color: #007aff;
      font-weight: 500;
    }
  }
}

.content-body {
  padding: 28rpx;

  .towxml-wrapper {
    font-size: 28rpx;
    line-height: 1.8;
    color: #333;

    ::v-deep img {
      max-width: 100%;
      height: auto;
      border-radius: 8rpx;
    }

    ::v-deep pre {
      background: #f5f5f5;
      padding: 20rpx;
      border-radius: 8rpx;
      overflow-x: auto;
    }

    ::v-deep code {
      background: #f5f5f5;
      padding: 4rpx 8rpx;
      border-radius: 4rpx;
      font-size: 24rpx;
    }

    ::v-deep p {
      margin-bottom: 16rpx;
    }

    ::v-deep h1, ::v-deep h2, ::v-deep h3, ::v-deep h4 {
      margin-top: 32rpx;
      margin-bottom: 16rpx;
      font-weight: bold;
    }
  }
}

/* 错误卡片 */
.error-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 60rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  .error-tip {
    padding-top: 20rpx;
    border-top: 1rpx solid rgba(0, 0, 0, 0.05);
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
