<!--
 * @Description: AI辅导学习结果详情页
-->
<template>
  <view class="detail-container">
    <nav-bar title="学习详情" showBack />

    <view class="detail-wrapper">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-wrapper">
        <text class="cuIcon-loading2 text-gray text-xl" style="animation: spin 1s linear infinite;"></text>
        <text class="text-gray text-sm margin-top">加载中...</text>
      </view>

      <template v-else-if="resultData">
        <!-- 状态信息 -->
        <view class="status-bar" :class="'status-bar-' + resultData.status">
          <view class="status-dot" :class="{ 'dot-pending': resultData.status === 'pending', 'dot-success': resultData.status === 'success', 'dot-error': resultData.status === 'error' }"></view>
          <text class="status-text">{{ statusText(resultData.status) }}</text>
          <text v-if="resultData.complete_time" class="status-time text-xs">
            {{ formatTime(resultData.complete_time) }}
          </text>
        </view>

        <!-- AI生成内容 -->
        <view v-if="resultData.status === 'success' && towxmlData" class="content-card">
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
            <view class="share-btn" :class="{ 'share-btn-disabled': shareLoading }" @click="showShareModal = true">
              <text class="share-btn-icon" :class="shareLoading ? 'cuIcon-loading1 text-gray' : 'cuIcon-share text-green'"></text>
              <text class="share-btn-text text-xs">{{ shareLoading ? '生成中...' : '分享' }}</text>
            </view>
          </view>
          <view class="content-body">
            <view class="towxml-wrapper">
              <towxml :nodes="towxmlData" />
            </view>
          </view>
        </view>

        <!-- 错误信息 -->
        <view v-if="resultData.status === 'error'" class="error-card">
          <text class="cuIcon-warnfill text-red" style="font-size: 60rpx;"></text>
          <text class="text-red margin-top">生成失败</text>
          <text class="text-gray text-sm margin-top-sm">{{ resultData.error_msg || '未知错误' }}</text>
          <view class="error-tip margin-top">
            <text class="text-gray text-xs">如持续失败，请通知管理员</text>
          </view>
        </view>
      </template>
    </view>

    <!-- 分享有效期选择弹窗 -->
    <view v-if="showShareModal" class="share-modal-mask" @click="showShareModal = false">
      <view class="share-modal" @click.stop>
        <view class="share-modal-title">分享 AI 辅导内容</view>
        <view class="share-modal-subtitle">选择链接有效期</view>
        <view class="share-options">
          <view class="share-option" :class="{ 'share-option-active': selectedExpire === '1h' }" @click="selectedExpire = '1h'">
            <text>1小时</text>
          </view>
          <view class="share-option" :class="{ 'share-option-active': selectedExpire === '1d' }" @click="selectedExpire = '1d'">
            <text>1天</text>
          </view>
          <view class="share-option" :class="{ 'share-option-active': selectedExpire === '1w' }" @click="selectedExpire = '1w'">
            <text>1周</text>
          </view>
          <view class="share-option" :class="{ 'share-option-active': selectedExpire === '1y' }" @click="selectedExpire = '1y'">
            <text>1年</text>
          </view>
          <view class="share-option" :class="{ 'share-option-active': selectedExpire === 'forever' }" @click="selectedExpire = 'forever'">
            <text>永久</text>
          </view>
        </view>
        <view class="share-modal-actions">
          <view class="share-modal-cancel" @click="showShareModal = false">
            <text>取消</text>
          </view>
          <view class="share-modal-confirm" @click="handleShare">
            <text>生成链接</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getLearnResultDetail } from "@/api/aiLearn.js";
import { callGenerateShareLink } from "@/api/share.js";
import { downloadMarkdown } from "@/utils/download";
import { formatTime } from "@/utils/format";
import NavBar from "@/component/nav-bar/index.vue";

export default {
  components: {
    NavBar,
  },
  data() {
    return {
      logId: "",
      resultData: null,
      towxmlData: "",
      loading: false,
      showShareModal: false,
      selectedExpire: '1d',
      shareLoading: false
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
    handleShare() {
      if (this.shareLoading) return;
      this.shareLoading = true;

      callGenerateShareLink({
        recordId: this.resultData.record_id || '',
        expireType: this.selectedExpire,
        shareType: 'ai_learn',
        logId: this.logId
      }).then((res) => {
        uni.setClipboardData({
          data: res.data.shareUrl,
          success: () => {
            uni.showToast({ title: '链接已复制', icon: 'success' });
          }
        });
        this.showShareModal = false;
      }).catch((err) => {
        uni.showToast({ title: err.message || '生成失败', icon: 'none' });
      }).finally(() => {
        this.shareLoading = false;
      });
    },
    statusText(status) {
      const map = { pending: 'AI 生成中...', success: '已完成', error: '生成失败' };
      return map[status] || '';
    },
    formatTime(timestamp) {
      return formatTime(timestamp, 'YYYY-MM-DD HH:mm');
    },
    downloadDocument() {
      if (!this.resultData || !this.resultData.ai_result) {
        uni.showToast({ title: '暂无内容可下载', icon: 'none' });
        return;
      }
      downloadMarkdown('AI辅导', this.resultData.ai_result);
    }
  }
};
</script>

<style lang="scss" scoped>
.detail-container {
  min-height: 100vh;
  background: $color-bg-page;
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
  border-radius: $radius-small;
  margin-bottom: 24rpx;

  &.status-bar-success {
    background: $color-success-light;
  }

  &.status-bar-pending {
    background: $color-warning-light;
  }

  &.status-bar-error {
    background: $color-error-light;
  }

  .status-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    margin-right: 12rpx;
  }

  .dot-pending {
    background: $color-warning;
  }

  .dot-success {
    background: $color-success;
  }

  .dot-error {
    background: $color-text-tertiary;
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
  background: $color-bg-card;
  border-radius: $radius-card;
  overflow: hidden;
  box-shadow: $shadow-card;
}

.content-header {
  display: flex;
  align-items: center;
  padding: 28rpx 28rpx 20rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);

  .content-icon {
    width: 48rpx;
    height: 48rpx;
    border-radius: $radius-button;
    background: $color-warning-light;
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
    border-radius: $radius-small;
    background: $color-primary-light;

    .cuIcon-downloadfill {
      font-size: 28rpx;
      margin-right: 8rpx;
    }

    .download-text {
      color: $color-primary;
      font-weight: 500;
    }
  }

  .share-btn {
    display: flex;
    align-items: center;
    padding: 8rpx 16rpx;
    border-radius: $radius-small;
    background: $color-success-light;
    margin-left: 12rpx;

    &.share-btn-disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    .share-btn-icon {
      font-size: 28rpx;
      margin-right: 8rpx;
    }

    .share-btn-text {
      color: $color-success;
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
      border-radius: $radius-small;
    }

    ::v-deep pre {
      background: #1C1C1E;
      color: #E5E5EA;
      padding: 20rpx;
      border-radius: $radius-button;
      overflow-x: auto;
    }

    ::v-deep code {
      background: rgba(118, 118, 128, 0.12);
      padding: 4rpx 8rpx;
      border-radius: $radius-tag;
      font-size: 24rpx;
      color: $color-error;
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
  background: $color-bg-card;
  border-radius: $radius-card;
  padding: 60rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: $shadow-card;

  .error-tip {
    padding-top: 20rpx;
    border-top: 1rpx solid rgba(0, 0, 0, 0.05);
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 分享弹窗 */
.share-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.share-modal {
  width: 100%;
  background: #fff;
  border-radius: $radius-card $radius-card 0 0;
  padding: 40rpx 32rpx;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));

  .share-modal-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
    text-align: center;
    margin-bottom: 8rpx;
  }

  .share-modal-subtitle {
    font-size: 26rpx;
    color: #999;
    text-align: center;
    margin-bottom: 32rpx;
  }

  .share-options {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    justify-content: center;
    margin-bottom: 40rpx;
  }

  .share-option {
    padding: 16rpx 32rpx;
    border-radius: $radius-pill;
    background: $color-bg-page;
    border: 2rpx solid transparent;
    font-size: 28rpx;
    color: $color-text-secondary;

    &.share-option-active {
      background: $color-success-light;
      border-color: $color-success;
      color: $color-success;
      font-weight: 500;
    }
  }

  .share-modal-actions {
    display: flex;
    gap: 24rpx;
  }

  .share-modal-cancel {
    flex: 1;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $radius-button;
    background: $color-bg-page;
    font-size: 28rpx;
    color: $color-text-tertiary;
  }

  .share-modal-confirm {
    flex: 1;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $radius-button;
    background: $color-success;
    font-size: 28rpx;
    color: #fff;
    font-weight: 500;
  }
}
</style>
