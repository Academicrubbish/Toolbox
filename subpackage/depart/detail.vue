<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-08-19 09:34:16
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2025-11-29 20:19:23
 * @FilePath: \Toolbox\subpackage\depart\detail.vue
 * @Description: 记录详情页面（UI 重构版）
 *
-->
<template>
  <view class="detail-container">
    <nav-bar title="记录详情">
      <template #left>
        <view class="nav-left-actions">
          <view class="nav-back-btn" @tap="handleBack">
            <text class="cuIcon-back"></text>
          </view>
          <view v-if="!isGuest" class="nav-more-btn" @tap="showMoreMenu">
            <text class="cuIcon-moreandroid"></text>
          </view>
        </view>
      </template>
    </nav-bar>

    <view class="detail-wrapper" v-if="recordData">
      <!-- 标题区域 -->
      <view class="title-section">
        <text class="detail-title">{{ recordData.title }}</text>
        <view class="detail-meta">
          <text class="meta-item text-gray text-xs">{{ formatTime(recordData.createTime) }}</text>
          <text class="meta-divider">·</text>
          <text class="meta-item text-gray text-xs">{{ readingTime }}</text>
        </view>
      </view>

      <!-- 标签区域 -->
      <view v-if="recordData.tags && recordData.tags.length > 0" class="tag-section">
        <view
          v-for="(tagId, index) in recordData.tags"
          :key="tagId"
          class="tag-chip"
          :style="'background:' + getTagColor(index).bg + ';color:' + getTagColor(index).text"
        >
          <text>{{ getTagName(tagId) }}</text>
        </view>
      </view>

      <!-- AI 笔记内联卡片 -->
      <view v-if="noteResults.length || exerciseResults.length || isAiProcessing" class="ai-inline-card">
        <view v-if="isAiProcessing" class="ai-loading">
          <text class="cuIcon-loading2 text-warning"></text>
          <text class="text-gray text-xs margin-left-sm">AI 正在生成中...</text>
        </view>
        <template v-else>
          <view class="ai-card-header">
            <text class="cuIcon-creativefill text-warning margin-right-xs"></text>
            <text class="text-bold">✨ AI 学习笔记</text>
          </view>
          <view v-for="note in noteResults" :key="note._id" class="ai-result-item">
            <view class="ai-result-title">📖 知识点精讲</view>
            <view class="ai-result-preview">{{ getAiSummary(note.ai_result) }}</view>
            <view class="ai-result-link" @tap="goToAiDetail(note._id)">查看完整笔记 →</view>
          </view>
          <view v-for="ex in exerciseResults" :key="ex._id" class="ai-result-item">
            <view class="ai-result-title">📝 针对性练习</view>
            <view class="ai-result-preview">{{ getAiSummary(ex.ai_result) }}</view>
            <view class="ai-result-link" @tap="goToAiDetail(ex._id)">查看完整练习 →</view>
          </view>
        </template>
      </view>

      <!-- 正文内容（沉浸式，无缝衔接） -->
      <view v-if="summaryContent" class="article-body">
        <view v-if="towxmlData" class="towxml-wrapper">
          <towxml :nodes="towxmlData" />
        </view>
      </view>
    </view>

    <!-- 分享有效期选择弹窗 -->
    <view v-if="showShareModal" class="share-modal-mask" @click="closeShareModal">
      <view class="share-modal" @click.stop>
        <view class="share-modal-title">分享文章</view>
        <view class="share-modal-subtitle">选择链接有效期</view>
        <view class="share-options">
          <view class="share-option" :class="{ 'share-option-active': selectedExpire === '1h' }" @click="selectedExpire = '1h'">
            <text class="share-option-text">1小时</text>
          </view>
          <view class="share-option" :class="{ 'share-option-active': selectedExpire === '1d' }" @click="selectedExpire = '1d'">
            <text class="share-option-text">1天</text>
          </view>
          <view class="share-option" :class="{ 'share-option-active': selectedExpire === '1w' }" @click="selectedExpire = '1w'">
            <text class="share-option-text">1周</text>
          </view>
          <view class="share-option" :class="{ 'share-option-active': selectedExpire === '1y' }" @click="selectedExpire = '1y'">
            <text class="share-option-text">1年</text>
          </view>
          <view class="share-option" :class="{ 'share-option-active': selectedExpire === 'forever' }" @click="selectedExpire = 'forever'">
            <text class="share-option-text">永久</text>
          </view>
        </view>
        <view class="share-modal-actions">
          <view class="share-modal-cancel" @click="closeShareModal">
            <text>取消</text>
          </view>
          <view class="share-modal-confirm" @click="handleShare">
            <text>生成链接</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 删除确认弹窗 -->
    <uni-popup ref="alertDialog" type="dialog">
      <uni-popup-dialog type="warn" title="提醒" :content="dialogContent" cancelText="取消" confirmText="确定"
        @confirm="dialogConfirm" />
    </uni-popup>
  </view>
</template>

<script>
import { getRecord, delRecord } from "@/api/record";
import { getSummarize, delSummarize } from "@/api/summarize";
import { getDictCategoryList } from "@/api/dictCategory.js";
import { callGenerateLearnNote, getLearnResultList, deleteAiLogsByRecordId } from "@/api/aiLearn.js";
import { callGenerateShareLink } from "@/api/share.js";
import { getTagColor } from "@/utils/tagColors";
import { downloadMarkdown } from "@/utils/download";
import { formatTime, formatRelativeTime } from "@/utils/format";
import NavBar from "@/component/nav-bar/index.vue";

export default {
  components: {
    NavBar,
  },
  computed: {
    isGuest() {
      return this.$store.state.user.isGuest;
    },
    isExampleRecord() {
      return this.recordData && (!this.recordData.createBy || this.recordData.createBy === '');
    },
    readingTime() {
      const content = this.summaryContent || '';
      const charCount = content.replace(/\s/g, '').length;
      const minutes = Math.max(1, Math.ceil(charCount / 300));
      return `${minutes} 分钟阅读`;
    }
  },
  data() {
    return {
      recordId: '',
      recordData: null,
      towxmlData: "",
      summaryContent: "",
      tagMap: {},
      aiLoading: false,
      showShareModal: false,
      selectedExpire: '1d',
      shareLoading: false,
      // AI 结果
      aiResults: [],
      noteResults: [],
      exerciseResults: [],
      isAiProcessing: false,
      // 删除
      dialogContent: "",
      pickerRecordItem: null,
    };
  },
  onLoad(option) {
    this.recordId = option.id;
    this.loadTagList();
    this.loadRecordDetail(option.id);
  },
  onShow() {
    if (this.recordId) {
      this.loadRecordDetail(this.recordId);
    }
  },
  methods: {
    getTagColor,
    handleBack() {
      uni.navigateBack({ delta: 1 });
    },
    handleEdit() {
      if (!this.recordData || !this.recordData._id) return;
      uni.navigateTo({
        url: `/subpackage/depart/form?type=update&id=${this.recordData._id}`
      });
    },
    handleAiLearn() {
      if (this.aiLoading || this.isAiProcessing) return;
      if (!this.summaryContent || this.summaryContent.trim() === '') {
        uni.showToast({ title: '暂无总结内容，无法生成', icon: 'none' });
        return;
      }

      this.aiLoading = true;
      callGenerateLearnNote({
        content: this.summaryContent,
        recordId: this.recordData._id
      }).then(() => {
        this.isAiProcessing = true;
        uni.showToast({ title: '已提交，AI正在生成中...', icon: 'none' });
      }).catch((err) => {
        uni.showToast({ title: err.message || '提交失败', icon: 'none' });
      }).finally(() => {
        setTimeout(() => { this.aiLoading = false; }, 3000);
      });
    },
    handleDelete() {
      if (this.isExampleRecord) {
        uni.showToast({ title: '示例记录不支持删除', icon: 'none' });
        return;
      }
      this.pickerRecordItem = this.recordData;
      this.dialogContent = `确定删除记录 '${this.recordData.title}' 吗？删除后不可恢复！`;
      this.$refs.alertDialog.open();
    },
    dialogConfirm() {
      const recordId = this.pickerRecordItem._id;
      const summarizeId = this.pickerRecordItem.summarizeId;
      delRecord(recordId)
        .then((res) => {
          if (res.result && (res.result.code === 0 || res.result.code === undefined)) {
            deleteAiLogsByRecordId(recordId);
            if (summarizeId) {
              delSummarize(summarizeId).finally(() => { this.showDeleteSuccess(); });
            } else {
              this.showDeleteSuccess();
            }
          } else {
            uni.showToast({ title: res.result?.msg || "删除失败", icon: "none" });
          }
        })
        .catch(() => {
          uni.showToast({ title: "删除失败", icon: "none" });
        });
    },
    showDeleteSuccess() {
      uni.showToast({ title: "删除成功", icon: "success" });
      uni.$emit('record-changed');
      setTimeout(() => uni.navigateBack(), 1500);
    },
    showMoreMenu() {
      uni.showActionSheet({
        itemList: ['编辑', 'AI辅导', '下载', '分享', '删除'],
        success: (res) => {
          const actions = ['edit', 'ai', 'download', 'share', 'delete'];
          const action = actions[res.tapIndex];
          if (action === 'edit') this.handleEdit();
          else if (action === 'ai') this.handleAiLearn();
          else if (action === 'download') this.downloadDocument();
          else if (action === 'share') this.showShareModal = true;
          else if (action === 'delete') this.handleDelete();
        }
      });
    },
    goLearnResult() {
      if (!this.recordData || !this.recordData._id) return;
      uni.navigateTo({
        url: `/subpackage/depart/learn-result?recordId=${this.recordData._id}`
      });
    },
    closeShareModal() {
      this.showShareModal = false;
    },
    handleShare() {
      if (this.shareLoading) return;
      this.shareLoading = true;

      callGenerateShareLink({
        recordId: this.recordData._id,
        expireType: this.selectedExpire
      }).then((res) => {
        const shareUrl = res.data.shareUrl;
        uni.setClipboardData({
          data: shareUrl,
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
    downloadDocument() {
      if (!this.summaryContent) {
        uni.showToast({ title: '暂无内容可下载', icon: 'none' });
        return;
      }
      downloadMarkdown(this.recordData.title, this.summaryContent);
    },
    goToAiDetail(logId) {
      uni.navigateTo({
        url: `/subpackage/depart/learn-result-detail?id=${logId}`
      });
    },
    getAiSummary(content, maxLen = 80) {
      if (!content) return '';
      const text = content.replace(/[#*`>\-\[\]]/g, '').trim();
      return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
    },
    loadAiResults() {
      if (!this.recordData || !this.recordData._id) return;
      getLearnResultList({ recordId: this.recordData._id })
        .then((res) => {
          this.aiResults = res.result?.data || [];
          this.noteResults = this.aiResults.filter(r => r.type === 'note' && r.status === 'success');
          this.exerciseResults = this.aiResults.filter(r => r.type === 'exercise' && r.status === 'success');
          this.isAiProcessing = this.aiResults.some(r => r.status === 'pending' || r.status === 'processing');
        })
        .catch(() => {
          this.aiResults = [];
          this.noteResults = [];
          this.exerciseResults = [];
          this.isAiProcessing = false;
        });
    },
    loadTagList() {
      getDictCategoryList()
        .then((res) => {
          if (res && res.result && res.result.data) {
            const tags = Array.isArray(res.result.data) ? res.result.data : [];
            this.tagMap = {};
            tags.forEach(tag => {
              this.tagMap[tag._id] = tag;
            });
          }
        })
        .catch((err) => {
          console.error("加载标签列表失败：", err);
        });
    },
    getTagName(tagId) {
      return this.tagMap[tagId] ? this.tagMap[tagId].name : '未知标签';
    },
    formatTime(timeStr) {
      return formatTime(timeStr, 'YYYY-MM-DD HH:mm');
    },
    loadRecordDetail(id) {
      getRecord(id)
        .then((recordRes) => {
          if (!recordRes.result?.data?.length) {
            this.showNotFound();
            return;
          }

          this.recordData = recordRes.result.data[0];
          this.loadAiResults();

          if (this.recordData.summarizeId) {
            this.loadSummarize(this.recordData.summarizeId);
          }
        })
        .catch((error) => {
          console.error("Error in loadRecordDetail:", error);
          uni.showToast({ title: "加载失败，请稍后重试", icon: "none" });
          setTimeout(() => uni.navigateBack(), 1500);
        });
    },
    loadSummarize(summarizeId) {
      getSummarize(summarizeId).then((res) => {
        const data = res.result?.data;
        if (data?.length) {
          const content = data[0].content || "";
          this.summaryContent = content;
          this.towxmlData = this.towxml(content, "markdown", {
            events: { tap: (e) => console.log("tap", e) }
          });
        }
      });
    },
    showNotFound() {
      uni.showToast({ title: "记录不存在", icon: "none" });
      setTimeout(() => uni.navigateBack(), 1500);
    },
  },
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
  width: 32px;
  height: 32px;
  background: rgba(0, 122, 255, 0.08);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 18px;
    color: $color-primary;
  }
}

.nav-more-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-button;

  text {
    font-size: 20px;
    color: #8e8e93;
  }
}

.detail-wrapper {
  padding: 0 $spacing-md $spacing-xl;
}

/* 标题区域 */
.title-section {
  margin-top: $spacing-md;
  margin-bottom: $spacing-md;

  .detail-title {
    font-size: 28px;
    font-weight: 700;
    color: $color-text-primary;
    line-height: 1.3;
    display: block;
    margin-bottom: $spacing-xs;
  }

  .detail-meta {
    display: flex;
    align-items: center;

    .meta-divider {
      margin: 0 $spacing-xs;
      color: $color-text-placeholder;
    }
  }
}

/* 标签区域 */
.tag-section {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  margin-bottom: $spacing-md;

  .tag-chip {
    padding: 4px 12px;
    border-radius: $radius-pill;
    font-size: 12px;
    font-weight: 500;
  }
}


/* AI 内联卡片 */
.ai-inline-card {
  background: $color-warning-light;
  border: 1px solid rgba(255, 149, 0, 0.12);
  border-radius: $radius-card;
  padding: $spacing-md;
  margin-bottom: $spacing-md;

  .ai-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: $spacing-md;

    .cuIcon-loading2 {
      font-size: 20px;
      animation: spin 1s linear infinite;
    }
  }

  .ai-card-header {
    display: flex;
    align-items: center;
    margin-bottom: $spacing-sm;
    font-size: 15px;
    color: $color-text-primary;

    .cuIcon-creativefill {
      font-size: 18px;
      color: $color-warning;
    }
  }

  .ai-result-item {
    padding: $spacing-sm 0;
    border-top: 0.5px solid rgba(255, 149, 0, 0.1);

    &:first-child {
      border-top: none;
    }

    .ai-result-title {
      font-size: 14px;
      font-weight: 600;
      color: $color-text-primary;
      margin-bottom: $spacing-xs;
    }

    .ai-result-preview {
      font-size: 13px;
      color: $color-text-secondary;
      line-height: 1.6;
      margin-bottom: $spacing-xs;
    }

    .ai-result-link {
      font-size: 13px;
      color: $color-warning;
      font-weight: 500;
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 正文内容（沉浸式） */
.article-body {
  padding: 0;
  padding-bottom: $spacing-xl;

  .towxml-wrapper {
    font-size: 17px;
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
      font-size: 14px;
      line-height: 1.6;
      margin: $spacing-sm 0;
    }

    ::v-deep code {
      background: rgba(118, 118, 128, 0.12);
      padding: 2px 6px;
      border-radius: $radius-tag;
      font-size: 14px;
      color: $color-error;
    }

    ::v-deep pre code {
      background: none;
      color: inherit;
      padding: 0;
      font-size: 14px;
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
  padding: $spacing-xl $spacing-md;
  padding-bottom: calc(#{$spacing-xl} + env(safe-area-inset-bottom));

  .share-modal-title {
    font-size: 18px;
    font-weight: 600;
    color: $color-text-primary;
    text-align: center;
    margin-bottom: 4px;
  }

  .share-modal-subtitle {
    font-size: 13px;
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
    padding: 10px 24px;
    border-radius: $radius-pill;
    background: $color-bg-page;
    border: 2px solid transparent;

    .share-option-text {
      font-size: 14px;
      color: $color-text-secondary;
    }

    &.share-option-active {
      background: $color-success-light;
      border-color: $color-success;

      .share-option-text {
        color: $color-success;
        font-weight: 500;
      }
    }
  }

  .share-modal-actions {
    display: flex;
    gap: $spacing-md;
  }

  .share-modal-cancel {
    flex: 1;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $radius-button;
    background: $color-bg-page;

    text {
      font-size: 15px;
      color: $color-text-tertiary;
    }
  }

  .share-modal-confirm {
    flex: 1;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $radius-button;
    background: $color-success;

    text {
      font-size: 15px;
      color: #fff;
      font-weight: 500;
    }
  }
}
</style>
