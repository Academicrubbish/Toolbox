<!--
 * @Description: AI辅导学习结果详情页（沉浸式重构版）
-->
<template>
  <view class="detail-container">
    <nav-bar title="学习详情">
      <template #left>
        <view class="nav-left-actions">
          <view class="nav-back-btn" @tap="handleBack">
            <text class="cuIcon-back"></text>
          </view>
          <view v-if="resultData && resultData.status === 'success'" class="nav-more-btn" @tap="showMoreMenu">
            <text class="cuIcon-moreandroid"></text>
          </view>
        </view>
      </template>
    </nav-bar>

    <view class="detail-wrapper">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-wrapper">
        <text class="cuIcon-loading2 text-gray text-xl" style="animation: spin 1s linear infinite;"></text>
        <text class="text-gray text-sm margin-top">加载中...</text>
      </view>

      <template v-else-if="resultData">
        <!-- 状态标签 -->
        <view class="status-pill" :class="'status-pill-' + resultData.status">
          <view class="status-dot"></view>
          <text class="status-text">{{ statusText(resultData.status) }}</text>
          <text v-if="resultData.complete_time" class="status-time">{{ formatTime(resultData.complete_time) }}</text>
        </view>

        <!-- AI生成内容（沉浸式） -->
        <view v-if="resultData.status === 'success' && towxmlData" class="article-body">
          <view class="towxml-wrapper">
            <towxml :nodes="towxmlData" />
          </view>
        </view>

        <!-- 错误信息 -->
        <view v-if="resultData.status === 'error'" class="error-section">
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
    handleBack() {
      uni.navigateBack({ delta: 1 });
    },
    showMoreMenu() {
      uni.showActionSheet({
        itemList: ['下载', '分享'],
        success: (res) => {
          if (res.tapIndex === 0) this.downloadDocument();
          else if (res.tapIndex === 1) this.showShareModal = true;
        }
      });
    },
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
  background: $color-bg-card;
}

.nav-left-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-back-btn {
  width: 44px;
  height: 44px;
  background: $color-primary-light;
  border-radius: $radius-small;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 18px;
    color: $color-primary;
  }
}

.nav-more-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-button;

  text {
    font-size: 20px;
    color: $color-text-tertiary;
  }
}

.detail-wrapper {
  padding: 0 $spacing-md $spacing-xl;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

/* 状态标签 */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 12rpx 28rpx;
  border-radius: $radius-pill;
  margin-top: $spacing-md;
  margin-bottom: $spacing-lg;

  &.status-pill-success {
    background: $color-success-light;
  }

  &.status-pill-pending {
    background: $color-warning-light;
  }

  &.status-pill-error {
    background: $color-error-light;
  }

  .status-dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
  }

  &.status-pill-pending .status-dot {
    background: $color-warning;
    animation: pulse 1.5s ease infinite;
  }

  &.status-pill-success .status-dot {
    background: $color-success;
  }

  &.status-pill-error .status-dot {
    background: $color-text-tertiary;
  }

  .status-text {
    font-size: 26rpx;
    font-weight: 600;
  }

  &.status-pill-success .status-text {
    color: $color-success;
  }

  &.status-pill-pending .status-text {
    color: $color-warning;
  }

  &.status-pill-error .status-text {
    color: $color-text-tertiary;
  }

  .status-time {
    font-size: 22rpx;
    color: $color-text-tertiary;
    margin-left: 8rpx;
  }
}

/* 正文内容（沉浸式） */
.article-body {
  padding: 0;
  padding-bottom: $spacing-xl;

  .towxml-wrapper {
    font-size: 34rpx;
    line-height: 1.8;
    color: $color-text-primary;

    ::v-deep img {
      max-width: 100%;
      height: auto;
      border-radius: $radius-button;
      margin: $spacing-sm 0;
    }

    ::v-deep pre {
      background: #1C1C1E;
      color: #E5E5EA;
      padding: $spacing-md;
      border-radius: $radius-button;
      overflow-x: auto;
      font-size: 28rpx;
      line-height: 1.6;
      margin: $spacing-sm 0;
    }

    ::v-deep code {
      background: rgba(118, 118, 128, 0.12);
      padding: 4rpx 12rpx;
      border-radius: $radius-tag;
      font-size: 26rpx;
      color: $color-error;
    }

    ::v-deep pre code {
      background: none;
      color: inherit;
      padding: 0;
      font-size: 28rpx;
    }

    ::v-deep p {
      margin-bottom: $spacing-md;
    }

    ::v-deep h1,
    ::v-deep h2,
    ::v-deep h3 {
      margin-top: $spacing-lg;
      margin-bottom: $spacing-sm;
      font-weight: 700;
      color: $color-text-primary;
      letter-spacing: -0.3px;
    }

    ::v-deep h4,
    ::v-deep h5,
    ::v-deep h6 {
      margin-top: $spacing-md;
      margin-bottom: $spacing-xs;
      font-weight: 600;
      color: $color-text-primary;
    }

    ::v-deep ul,
    ::v-deep ol {
      padding-left: $spacing-lg;
      margin-bottom: $spacing-md;
    }

    ::v-deep blockquote {
      border-left: 3px solid $color-primary;
      padding-left: $spacing-md;
      color: $color-text-tertiary;
      margin: $spacing-md 0;
    }
  }
}

/* 错误区域 */
.error-section {
  background: $color-bg-card;
  border-radius: $radius-card;
  padding: 80rpx 40rpx;
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

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* 分享弹窗 */
.share-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: $color-bg-mask;
  z-index: $z-modal;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.share-modal {
  width: 100%;
  background: $color-bg-card;
  border-radius: $radius-card $radius-card 0 0;
  padding: $spacing-xl $spacing-md;
  padding-bottom: calc(#{$spacing-xl} + env(safe-area-inset-bottom));

  .share-modal-title {
    font-size: 32rpx;
    font-weight: 600;
    color: $color-text-primary;
    text-align: center;
    margin-bottom: 8rpx;
  }

  .share-modal-subtitle {
    font-size: 26rpx;
    color: $color-text-tertiary;
    text-align: center;
    margin-bottom: $spacing-lg;
  }

  .share-options {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;
    justify-content: center;
    margin-bottom: $spacing-xl;
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
    gap: $spacing-md;
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
    color: $color-text-inverse;
    font-weight: 500;
  }
}
</style>
