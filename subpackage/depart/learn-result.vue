<!--
 * @Description: AI辅导学习结果列表页
-->
<template>
  <view class="learn-result-container">
    <z-paging ref="paging" v-model="resultList" @query="queryList">
      <view slot="top">
        <nav-bar title="学习结果" showBack />
      </view>

      <view slot="empty">
        <view class="empty-wrapper">
          <text class="cuIcon-text text-gray" style="font-size: 80rpx;"></text>
          <text class="text-gray margin-top">暂无学习结果</text>
          <text class="text-gray text-sm margin-top-sm">在笔记详情页点击"AI辅导"即可生成</text>
        </view>
      </view>

      <view class="result-list">
        <view v-for="group in batchGroups" :key="group.batchId" class="batch-group">
          <view class="batch-header">
            <text class="batch-time text-gray text-xs">{{ group.createTime }}</text>
            <view class="batch-status" :class="group.statusClass">
              <view class="status-dot" :class="group.dotClass"></view>
              <text class="text-xs">{{ group.statusText }}</text>
            </view>
          </view>

          <view v-for="item in group.items" :key="item._id" class="result-card"
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
            <view v-if="item.status === 'error' && item.error_msg" class="result-error">
              <text class="text-xs text-red">{{ item.error_msg }}</text>
            </view>
          </view>
        </view>
      </view>
    </z-paging>
  </view>
</template>

<script>
import { getLearnResultList } from "@/api/aiLearn.js";
import { formatTime } from "@/utils/format";
import NavBar from "@/component/nav-bar/index.vue";

export default {
  components: {
    NavBar,
  },
  data() {
    return {
      recordId: "",
      resultList: [],
      navigating: false
    };
  },
  computed: {
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

      const groups = Object.values(groupMap);
      groups.forEach(group => {
        group.items.sort((a, b) => {
          if (a.type === 'note' && b.type !== 'note') return -1;
          if (a.type !== 'note' && b.type === 'note') return 1;
          return 0;
        });

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
  methods: {
    queryList(pageNo, pageSize) {
      if (!this.recordId) {
        this.$refs.paging.complete([]);
        return;
      }
      getLearnResultList({ recordId: this.recordId })
        .then((res) => {
          this.$refs.paging.complete(res.result?.data || []);
        })
        .catch((err) => {
          console.error("加载学习结果失败：", err);
          this.$refs.paging.complete(false);
        });
    },
    formatTime(timestamp) {
      return formatTime(timestamp, 'MM-DD HH:mm');
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
      if (this.navigating) return;
      if (item.status === 'pending') {
        uni.showToast({ title: 'AI正在生成中，请稍后下拉刷新查看', icon: 'none' });
        return;
      }
      if (item.status === 'error') {
        uni.showToast({ title: '生成失败，请重试', icon: 'none' });
        return;
      }
      this.navigating = true;
      uni.navigateTo({
        url: `/subpackage/depart/learn-result-detail?id=${item._id}`,
        complete: () => {
          setTimeout(() => { this.navigating = false; }, 500);
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.learn-result-container {
  min-height: 100vh;
  background: $color-bg-page;
}

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
  padding: 30rpx;
}

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

  &.batch-success .status-dot { background: $color-success; }
  &.batch-pending .status-dot { background: $color-warning; }
  &.batch-error .status-dot { background: $color-text-tertiary; }

  .status-dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
  }
}

.result-card {
  background: $color-bg-card;
  border-radius: $radius-card;
  padding: 28rpx 32rpx;
  box-shadow: $shadow-card;
}

.result-card-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;

  .type-badge {
    padding: 4rpx 16rpx;
    border-radius: $radius-small;
    margin-right: 16rpx;

    &.type-note {
      background: $color-primary-light;
      .type-badge-text { color: $color-primary; }
    }

    &.type-exercise {
      background: $color-warning-light;
      .type-badge-text { color: $color-warning; }
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
</style>
