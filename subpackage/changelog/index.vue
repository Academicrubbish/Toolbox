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
      <view v-else-if="logList.length > 0" class="log-list">
        <!-- 交流提示 -->
        <view class="qq-group-bar">
          <text class="qq-group-desc">「个人作品，功能建议、Bug 反馈、使用交流都欢迎」</text>
          <view class="qq-group-row">
            <text class="cuIcon-group text-blue margin-right-xs"></text>
            <text class="qq-group-label">QQ 交流群：</text>
            <text class="qq-group-number" @tap="copyGroupNumber">1092487718</text>
          </view>
        </view>
        <view v-for="item in logList" :key="item._id" class="log-card">
          <!-- 顶部：版本号 + 日期 -->
          <view class="log-header">
            <view v-if="item.version" class="version-badge">
              <text class="version-text">v{{ item.version }}</text>
            </view>
            <text class="log-date">{{ item.date || '' }}</text>
          </view>
          <!-- 内容区域 -->
          <view v-if="item.nodes" class="log-body">
            <towxml :nodes="item.nodes" />
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
    copyGroupNumber() {
      uni.setClipboardData({
        data: '1092487718',
        success: () => uni.showToast({ title: '已复制群号', icon: 'success' })
      });
    },
    loadChangelog() {
      this.loading = true;
      getChangelogList()
        .then(list => {
          list.forEach(item => {
            if (item.content) {
              item.nodes = this.towxml(item.content, "markdown", {
                events: {
                  tap: (e) => { console.log("tap", e); }
                }
              });
            }
          });
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

<style lang="scss">
.changelog-container {
  min-height: 100vh;
  background: #ffffff;
}

.changelog-wrapper {
  padding: 24rpx 30rpx;
}

.loading-wrapper,
.empty-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

/* 日志列表 */
.log-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 日志卡片 */
.log-card {
  background: #f7f8fa;
  border-radius: 20rpx;
  padding: 28rpx;
}

/* 卡片头部 */
.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.06);
}

.version-badge {
  background: #007aff;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.version-text {
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 500;
}

/* QQ 交流群提示 */
.qq-group-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx;
  margin-bottom: 24rpx;
  background: #eef6ff;
  border-radius: 16rpx;
}

.qq-group-desc {
  font-size: 26rpx;
  color: #333;
  margin-bottom: 16rpx;
}

.qq-group-row {
  display: flex;
  align-items: center;
}

.qq-group-label {
  font-size: 26rpx;
  color: #666;
}

.qq-group-number {
  font-size: 28rpx;
  font-weight: 600;
  color: #007aff;
}

.log-date {
  font-size: 24rpx;
  color: #999;
}

/* 卡片内容 */
.log-body {
  font-size: 26rpx;
  color: #444;
  line-height: 1.8;

  ::v-deep h1, ::v-deep h2, ::v-deep h3, ::v-deep h4 {
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    margin: 16rpx 0 8rpx;
  }

  ::v-deep p {
    margin-bottom: 8rpx;
    font-size: 26rpx;
  }

  ::v-deep ul, ::v-deep ol {
    padding-left: 32rpx;
    margin-bottom: 8rpx;
  }

  ::v-deep li {
    font-size: 26rpx;
    line-height: 1.8;
  }

  ::v-deep code {
    background: #eef0f4;
    padding: 2rpx 8rpx;
    border-radius: 6rpx;
    font-size: 24rpx;
    color: #e74c3c;
  }

  ::v-deep strong {
    color: #333;
    font-weight: 600;
  }

  ::v-deep blockquote {
    border-left: 6rpx solid #007aff;
    padding-left: 16rpx;
    margin: 12rpx 0;
    color: #666;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
