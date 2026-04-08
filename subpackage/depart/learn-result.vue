<!--
 * @Description: AI辅导学习结果列表页
-->
<template>
  <view class="learn-result-container">
    <cu-custom bgColor="bg-gradual-orange" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">学习结果</block>
    </cu-custom>

    <view class="result-wrapper">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-wrapper">
        <text class="cuIcon-loading2 text-gray text-xl" style="animation: spin 1s linear infinite;"></text>
        <text class="text-gray text-sm margin-top">加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="resultList.length === 0" class="empty-wrapper">
        <text class="cuIcon-text text-gray" style="font-size: 80rpx;"></text>
        <text class="text-gray margin-top">暂无学习记录</text>
        <text class="text-gray text-sm margin-top-sm">在笔记详情页点击"AI辅导"即可生成</text>
      </view>

      <!-- 结果列表（支持下拉刷新） -->
      <scroll-view v-else scroll-y class="result-scroll" @refresherrefresh="onPullRefresh" :refresher-enabled="true" :refresher-triggered="refreshing">
        <view class="result-list">
          <view v-for="item in resultList" :key="item._id" class="result-card shadow-warp"
            @click="handleItemClick(item)">
            <view class="result-card-header">
              <view class="status-dot" :class="item.status === 'pending' ? 'dot-pending' : item.status === 'success' ? 'dot-success' : 'dot-error'"></view>
              <text class="result-status-text" :class="item.status === 'pending' ? 'text-orange' : item.status === 'success' ? 'text-green' : 'text-gray'">{{ item.status === 'pending' ? 'AI 生成中...' : item.status === 'success' ? '已完成' : '生成失败' }}</text>
              <text class="result-time text-gray text-xs">{{ formatTime(item.create_time) }}</text>
            </view>
            <view class="result-card-body">
              <text class="result-preview text-sm">{{ getPreview(item) }}</text>
            </view>
            <!-- 错误信息 -->
            <view v-if="item.status === 'error' && item.error_msg" class="result-error">
              <text class="text-xs text-red">{{ item.error_msg }}，通知管理员</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { getLearnResultList } from "@/api/aiLearn.js";
import moment from "moment";

export default {
  data() {
    return {
      recordId: "",
      resultList: [],
      loading: false,
      refreshing: false,
      pollTimer: null
    };
  },
  onLoad(option) {
    this.recordId = option.recordId || "";
  },
  onShow() {
    this.loadResultList();
    this.startPolling();
  },
  onHide() {
    this.stopPolling();
  },
  onUnload() {
    this.stopPolling();
  },
  methods: {
    loadResultList() {
      if (!this.recordId) return;
      this.loading = true;
      getLearnResultList({ recordId: this.recordId })
        .then((res) => {
          this.resultList = res.result?.data || [];
          const hasPending = this.resultList.some(item => item.status === 'pending');
          if (hasPending) {
            this.startPolling();
          } else {
            this.stopPolling();
          }
        })
        .catch((err) => {
          console.error("加载学习结果失败：", err);
          uni.showToast({ title: '加载失败', icon: 'none' });
        })
        .finally(() => {
          this.loading = false;
          this.refreshing = false;
        });
    },
    onPullRefresh() {
      this.refreshing = true;
      this.loadResultList();
    },
    startPolling() {
      if (this.pollTimer) return;
      this.pollTimer = setInterval(() => {
        this.loadResultList();
      }, 10000);
    },
    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    },
    formatTime(timestamp) {
      if (!timestamp) return '';
      return moment(timestamp).format('MM-DD HH:mm');
    },
    getPreview(item) {
      if (item.status === 'pending') return '正在为您生成精讲笔记和练习题...';
      if (item.status === 'error') return '生成失败，请重试';
      if (item.ai_result) {
        const text = item.ai_result.replace(/[#*`>\-\[\]]/g, '').trim();
        return text.length > 100 ? text.substring(0, 100) + '...' : text;
      }
      return '点击查看详情';
    },
    handleItemClick(item) {
      if (item.status === 'pending') {
        uni.showToast({ title: 'AI正在生成中，请稍候...', icon: 'none' });
        return;
      }
      if (item.status === 'error') {
        uni.showToast({ title: '生成失败，请重试', icon: 'none' });
        return;
      }
      uni.navigateTo({
        url: `/subpackage/depart/learn-result-detail?id=${item._id}`
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.learn-result-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f5f7fa 0%, #f1f1f1 100%);
}

.result-wrapper {
  padding: 30rpx;
}

.result-scroll {
  height: calc(100vh - 200rpx);
}

.loading-wrapper,
.empty-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.result-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  cursor: pointer;
  transition: all 0.3s;

  &:active {
    transform: scale(0.98);
    opacity: 0.9;
  }
}

.result-card-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;

  .status-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    margin-right: 12rpx;
    flex-shrink: 0;
  }

  .dot-pending {
    background: #ff9d00;
    box-shadow: 0 0 8rpx rgba(255, 157, 0, 0.5);
  }

  .dot-success {
    background: #4cd964;
    box-shadow: 0 0 8rpx rgba(76, 217, 100, 0.5);
  }

  .dot-error {
    background: #999;
  }

  .result-status-text {
    font-size: 26rpx;
    font-weight: 500;
    margin-right: auto;
  }

  .result-time {
    flex-shrink: 0;
  }
}

.result-card-body {
  .result-preview {
    color: #666;
    line-height: 1.6;
  }
}

.result-error {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid rgba(255, 0, 0, 0.1);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
