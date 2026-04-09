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
          <!-- 按批次分组展示 -->
          <view v-for="group in batchGroups" :key="group.batchId" class="batch-group">
            <view class="batch-header">
              <text class="batch-time text-gray text-xs">{{ group.createTime }}</text>
              <view class="batch-status" :class="group.statusClass">
                <view class="status-dot" :class="group.dotClass"></view>
                <text class="text-xs">{{ group.statusText }}</text>
              </view>
            </view>

            <view v-for="item in group.items" :key="item._id" class="result-card shadow-warp"
              @click="handleItemClick(item)">
              <view class="result-card-header">
                <view class="type-badge" :class="item.type === 'note' ? 'type-note' : 'type-exercise'">
                  <text class="type-badge-text text-xs">{{ item.type === 'note' ? '知识点精讲' : '针对性练习' }}</text>
                </view>
                <text class="result-status-text" :class="item.status === 'pending' ? 'text-orange' : item.status === 'success' ? 'text-green' : 'text-gray'">{{ item.status === 'pending' ? '生成中...' : item.status === 'success' ? '已完成' : '失败' }}</text>
              </view>
              <view class="result-card-body">
                <text class="result-preview text-sm">{{ getPreview(item) }}</text>
              </view>
              <!-- 错误信息 -->
              <view v-if="item.status === 'error' && item.error_msg" class="result-error">
                <text class="text-xs text-red">{{ item.error_msg }}</text>
              </view>
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
      isLoading: false
    };
  },
  computed: {
    // 按 batch_id 分组，每组内按 type 排序（note 在前）
    batchGroups() {
      const groupMap = {};

      this.resultList.forEach(item => {
        const bid = item.batch_id || item._id;
        if (!groupMap[bid]) {
          groupMap[bid] = {
            batchId: bid,
            createTime: this.formatTime(item.create_time),
            items: [],
            statusClass: '',
            dotClass: '',
            statusText: ''
          };
        }
        groupMap[bid].items.push(item);
      });

      // 组内排序：note 在前，exercise 在后
      const groups = Object.values(groupMap);
      groups.forEach(group => {
        group.items.sort((a, b) => {
          if (a.type === 'note' && b.type !== 'note') return -1;
          if (a.type !== 'note' && b.type === 'note') return 1;
          return 0;
        });

        // 预计算批次状态 class
        const hasPending = group.items.some(i => i.status === 'pending');
        const allSuccess = group.items.every(i => i.status === 'success');
        const allError = group.items.every(i => i.status === 'error');
        if (hasPending) {
          group.statusClass = 'batch-pending';
          group.dotClass = 'dot-pending';
          group.statusText = '生成中';
        } else if (allSuccess) {
          group.statusClass = 'batch-success';
          group.dotClass = 'dot-success';
          group.statusText = '全部完成';
        } else if (allError) {
          group.statusClass = 'batch-error';
          group.dotClass = 'dot-error';
          group.statusText = '全部失败';
        } else {
          group.statusClass = 'batch-success';
          group.dotClass = 'dot-success';
          group.statusText = '部分完成';
        }
      });

      return groups;
    }
  },
  onLoad(option) {
    this.recordId = option.recordId || "";
  },
  onShow() {
    this.loadResultList();
  },
  methods: {
    loadResultList() {
      if (!this.recordId) return;
      // 防重入：上一次请求未完成时忽略新请求，彻底避免刷新死循环
      if (this.isLoading) return;
      this.isLoading = true;
      // 仅首次加载（无数据时）显示loading，避免scroll-view被销毁重建
      if (this.resultList.length === 0) {
        this.loading = true;
      }
      getLearnResultList({ recordId: this.recordId })
        .then((res) => {
          this.resultList = res.result?.data || [];
        })
        .catch((err) => {
          console.error("加载学习结果失败：", err);
          uni.showToast({ title: '加载失败', icon: 'none' });
        })
        .finally(() => {
          this.loading = false;
          this.refreshing = false;
          this.isLoading = false;
        });
    },
    onPullRefresh() {
      this.refreshing = true;
      this.loadResultList();
    },
    formatTime(timestamp) {
      if (!timestamp) return '';
      return moment(timestamp).format('MM-DD HH:mm');
    },
    getPreview(item) {
      if (item.status === 'pending') return '正在为您生成内容，请稍后下拉刷新查看...';
      if (item.status === 'error') return '生成失败，请重试';
      if (item.ai_result) {
        const text = item.ai_result.replace(/[#*`>\-\[\]]/g, '').trim();
        return text.length > 100 ? text.substring(0, 100) + '...' : text;
      }
      return '点击查看详情';
    },
    handleItemClick(item) {
      if (item.status === 'pending') {
        uni.showToast({ title: 'AI正在生成中，请稍后下拉刷新查看', icon: 'none' });
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
  gap: 32rpx;
}

/* 批次分组 */
.batch-group {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.batch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8rpx;
}

.batch-status {
  display: flex;
  align-items: center;
  gap: 8rpx;

  &.batch-success .status-dot { background: #4cd964; }
  &.batch-pending .status-dot { background: #ff9d00; }
  &.batch-error .status-dot { background: #999; }

  .status-dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
  }
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

  .type-badge {
    padding: 4rpx 16rpx;
    border-radius: 8rpx;
    margin-right: 16rpx;

    &.type-note {
      background: rgba(0, 129, 255, 0.1);

      .type-badge-text { color: #007aff; }
    }

    &.type-exercise {
      background: rgba(255, 157, 0, 0.1);

      .type-badge-text { color: #ff9d00; }
    }
  }

  .result-status-text {
    font-size: 24rpx;
    font-weight: 500;
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
