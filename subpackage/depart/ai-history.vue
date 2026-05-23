<!--
 * @Description: AI辅导历史页（全局，跨记录）
-->
<template>
  <view class="ai-history-container">
    <z-paging ref="paging" v-model="historyList" @query="queryList">
      <view slot="top">
        <nav-bar title="AI辅导历史" showBack />
      </view>

      <view slot="empty">
        <view class="empty-wrapper">
          <text class="cuIcon-creativefill text-gray" style="font-size: 80rpx;"></text>
          <text class="text-gray margin-top">暂无AI辅导记录</text>
          <text class="text-gray text-sm margin-top-sm">在笔记详情页点击"AI辅导"即可生成</text>
        </view>
      </view>

      <view class="history-list">
        <template v-for="section in sectionedList">
          <view :key="section.date" class="date-section">
            <view class="date-header">
              <text class="date-label">{{ section.date }}</text>
            </view>

            <view v-for="batch in section.items" :key="batch.batchId" class="ai-card">
              <!-- 头部：记录标题 + 时间 -->
              <view class="ai-card-header" @click="goRecordDetail(batch.recordId)">
                <view class="ai-card-header-left">
                  <text class="cuIcon-creativefill text-warning" style="font-size: 18px;"></text>
                  <text class="ai-record-title">{{ batch.recordTitle }}</text>
                </view>
                <text class="ai-card-time text-gray text-xs">{{ formatTime(batch.createTime) }}</text>
              </view>

              <!-- 笔记子卡片 -->
              <view v-if="batch.note && batch.note.status === 'success'" class="ai-result-item"
                @click="goDetail(batch.note._id)">
                <view class="ai-result-title">
                  <text>知识点精讲</text>
                </view>
                <view class="ai-result-preview">
                  <text class="text-sm text-gray">{{ getPreview(batch.note.ai_result) }}</text>
                </view>
                <text class="ai-result-link">查看完整笔记 →</text>
              </view>

              <!-- 练习子卡片 -->
              <view v-if="batch.exercise && batch.exercise.status === 'success'" class="ai-result-item"
                @click="goDetail(batch.exercise._id)">
                <view class="ai-result-title">
                  <text>针对性练习</text>
                </view>
                <view class="ai-result-preview">
                  <text class="text-sm text-gray">{{ getPreview(batch.exercise.ai_result) }}</text>
                </view>
                <text class="ai-result-link">查看完整练习 →</text>
              </view>

              <!-- 处理中 -->
              <view v-if="batch.hasPending" class="ai-result-item ai-loading">
                <view class="ai-loading-inner">
                  <text class="cuIcon-loading2 text-warning"></text>
                  <text class="text-gray text-sm">AI正在生成中...</text>
                </view>
              </view>
            </view>
          </view>
        </template>
      </view>
    </z-paging>
  </view>
</template>

<script>
import { getAiLearnHistory } from "@/api/aiLearn.js";
import { formatSmartDate, formatRelativeTime, formatSummaryContent } from "@/utils/format";
import NavBar from "@/component/nav-bar/index.vue";
import store from "@/store";

export default {
  components: { NavBar },
  data() {
    return {
      historyList: [],
      navigating: false
    };
  },
  computed: {
    sectionedList() {
      const groups = {};
      const order = ['今天', '昨天', '本周', '更早'];

      this.historyList.forEach(batch => {
        const label = formatSmartDate(batch.createTime);
        if (!groups[label]) groups[label] = [];
        groups[label].push(batch);
      });

      return order
        .filter(label => groups[label])
        .map(label => ({ date: label, items: groups[label] }));
    }
  },
  methods: {
    queryList(pageNo, pageSize) {
      if (store.state.user.isGuest) {
        this.$refs.paging.complete([]);
        return;
      }
      getAiLearnHistory({ pageNo, pageSize })
        .then(res => {
          this.$refs.paging.complete(res.data || []);
        })
        .catch(err => {
          console.error('加载AI辅导历史失败：', err);
          this.$refs.paging.complete(false);
        });
    },
    formatTime(timestamp) {
      return formatRelativeTime(timestamp);
    },
    getPreview(aiResult) {
      if (!aiResult) return '';
      const text = formatSummaryContent(aiResult);
      return text.length > 60 ? text.substring(0, 60) + '...' : text;
    },
    goRecordDetail(recordId) {
      if (this.navigating || !recordId) return;
      this.navigating = true;
      uni.navigateTo({
        url: `/subpackage/depart/detail?id=${recordId}`,
        complete: () => {
          setTimeout(() => { this.navigating = false; }, 500);
        }
      });
    },
    goDetail(logId) {
      if (this.navigating || !logId) return;
      this.navigating = true;
      uni.navigateTo({
        url: `/subpackage/depart/learn-result-detail?id=${logId}`,
        complete: () => {
          setTimeout(() => { this.navigating = false; }, 500);
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.ai-history-container {
  min-height: 100vh;
  background: $color-bg-page;
}

.empty-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
}

.history-list {
  padding: 10px 15px 30px;
}

.date-section {
  margin-bottom: 10px;
}

.date-header {
  padding: 10px 4px 6px;

  .date-label {
    font-size: 11px;
    font-weight: 700;
    color: $color-text-tertiary;
    letter-spacing: 0.8px;
  }
}

/* AI Card — 复用详情页 ai-inline-card 样式 */
.ai-card {
  background: $color-warning-light;
  border: 1px solid rgba(255, 149, 0, 0.12);
  border-radius: $radius-card;
  padding: $spacing-md;
  margin-bottom: $spacing-md;
}

.ai-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-sm;

  .ai-card-header-left {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .ai-record-title {
    font-size: 15px;
    font-weight: 600;
    color: $color-text-primary;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ai-card-time {
    flex-shrink: 0;
    margin-left: 8px;
  }
}

.ai-result-item {
  padding: $spacing-sm 0;
  border-top: 0.5px solid rgba(255, 149, 0, 0.1);

  &:first-of-type {
    border-top: none;
  }

  .ai-result-title {
    font-size: 14px;
    font-weight: 600;
    color: $color-text-primary;
    margin-bottom: $spacing-xs;
  }

  .ai-result-preview {
    line-height: 1.6;
    margin-bottom: $spacing-xs;
  }

  .ai-result-link {
    font-size: 13px;
    color: $color-warning;
    font-weight: 500;
  }
}

.ai-loading {
  .ai-loading-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-sm;
    padding: $spacing-sm 0;

    .cuIcon-loading2 {
      font-size: 18px;
      animation: spin 1s linear infinite;
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
