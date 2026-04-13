<!--
 * @Description: 更新日志页面
-->
<template>
  <view class="changelog-container">
    <cu-custom bgColor="bg-gradual-blue" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">更新日志</block>
    </cu-custom>

    <view class="changelog-wrapper">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-wrapper">
        <text class="cuIcon-loading2 text-gray text-xl" style="animation: spin 1s linear infinite;"></text>
        <text class="text-gray text-sm margin-top">加载中...</text>
      </view>

      <!-- 日志列表 -->
      <view v-else-if="logList.length > 0" class="cu-timeline">
        <view v-for="item in logList" :key="item._id" class="cu-item text-blue">
          <view class="cu-time">{{ item.date || '' }}</view>
          <view class="content">
            <view v-if="item.version" class="log-version">
              <text class="text-bold text-blue">v{{ item.version }}</text>
            </view>
            <view class="log-content">
              <text class="text-sm">{{ item.content }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-wrapper">
        <text class="cuIcon-text text-gray" style="font-size: 80rpx;"></text>
        <text class="text-gray margin-top">暂无更新记录</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getChangelogList } from "@/api/changelog.js";

export default {
  data() {
    return {
      logList: [],
      loading: false
    };
  },
  onLoad() {
    this.loadChangelog();
  },
  methods: {
    loadChangelog() {
      this.loading = true;
      getChangelogList()
        .then(list => {
          this.logList = list;
        })
        .catch(err => {
          console.error("加载更新日志失败：", err);
          uni.showToast({ title: '加载失败', icon: 'none' });
        })
        .finally(() => {
          this.loading = false;
        });
    }
  }
};
</script>

<style lang="scss" scoped>
.changelog-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f5f7fa 0%, #f1f1f1 100%);
}

.changelog-wrapper {
  padding: 30rpx;
}

.loading-wrapper,
.empty-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.cu-timeline {
  background: transparent;
  padding: 0;

  ::v-deep .cu-item {
    padding: 30rpx 30rpx 30rpx 140rpx;

    &::before {
      color: #007aff;
    }

    &::after {
      background: #007aff;
    }
  }

  .content {
    padding: 24rpx 28rpx;
    border-radius: 16rpx;
    background: #ffffff;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  }
}

.log-version {
  margin-bottom: 12rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
}

.log-content {
  color: #666;
  line-height: 1.8;

  text {
    white-space: pre-wrap;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
