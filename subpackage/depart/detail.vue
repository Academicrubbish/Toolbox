<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-08-19 09:34:16
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2025-11-29 20:19:23
 * @FilePath: \Toolbox\subpackage\depart\detail.vue
 * @Description: 记录详情页面（简化版）
 * 
-->
<template>
  <view class="detail-container">
    <cu-custom bgColor="bg-gradual-blue" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">记录详情</block>
    </cu-custom>

    <view class="detail-wrapper">
      <!-- 记录信息卡片 -->
      <view class="detail-card shadow-warp" v-if="recordData">
        <view class="detail-header">
          <view class="detail-icon">
            <text class="cuIcon-creativefill text-blue"></text>
          </view>
          <view class="detail-title-wrapper">
            <text class="detail-title text-lg text-bold">{{ recordData.title }}</text>
            <view class="detail-meta">
              <text class="cuIcon-timefill text-gray text-xs margin-right-xs"></text>
              <text class="text-gray text-xs">{{ formatTime(recordData.createTime) }}</text>
            </view>
          </view>
        </view>

        <!-- 标签区域 -->
        <view v-if="recordData.tags && recordData.tags.length > 0" class="detail-tags">
          <view v-for="(tagId, index) in recordData.tags" :key="tagId" class="detail-tag"
            :class="tagColorClasses[index % 12]">
            <text>{{ getTagName(tagId) }}</text>
          </view>
        </view>
      </view>

      <!-- AI学习结果入口（有成功结果或正在生成中时显示） -->
      <view v-if="hasAiResult || hasPendingAi" class="learn-result-entry shadow-warp" @click="goLearnResult">
        <view class="entry-icon">
          <text class="cuIcon-creativefill text-orange"></text>
        </view>
        <view class="entry-content">
          <text class="entry-title">AI 学习笔记</text>
          <text class="entry-desc text-gray text-xs">{{ hasPendingAi && !hasAiResult ? 'AI 正在生成中，点击查看进度' : aiResultCount > 1 ? '查看 ' + aiResultCount + ' 条学习结果' : '查看学习结果' }}</text>
        </view>
        <text class="cuIcon-right text-gray"></text>
      </view>

      <!-- 总结内容卡片 -->
      <view class="summary-card shadow-warp">
        <view class="summary-header">
          <view class="summary-icon">
            <text class="cuIcon-commentfill text-blue"></text>
          </view>
          <view class="summary-title">
            <text class="text-lg text-bold">总结内容</text>
          </view>
          <view v-if="summaryContent" class="download-btn" @click="downloadDocument">
            <text class="cuIcon-downloadfill text-blue"></text>
            <text class="download-text text-xs">下载</text>
          </view>
          <view v-if="summaryContent" class="ai-btn" :class="{ 'ai-btn-disabled': aiLoading || hasPendingAi }" @click="handleAiLearn">
            <text class="ai-btn-icon" :class="(aiLoading || hasPendingAi) ? 'cuIcon-loading1 text-gray' : 'cuIcon-creativefill text-orange'"></text>
            <text class="ai-btn-text text-xs">{{ (aiLoading || hasPendingAi) ? '生成中...' : 'AI辅导' }}</text>
          </view>
        </view>
        <view class="summary-content">
          <view v-if="towxmlData" class="towxml-wrapper">
            <towxml :nodes="towxmlData" />
          </view>
          <view v-else class="summary-empty">
            <text class="text-gray text-sm">暂无总结内容</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getRecord } from "@/api/record";
import { getSummarize } from "@/api/summarize";
import { getDictCategoryList } from "@/api/dictCategory.js";
import { callGenerateLearnNote, getAiResultCount } from "@/api/aiLearn.js";
import { tagColorClasses } from "@/utils/tagColors";
import { downloadMarkdown } from "@/utils/download";
import { formatTime } from "@/utils/format";

export default {
  data() {
    return {
      recordData: null,
      towxmlData: "",
      summaryContent: "", // 原始Markdown内容，用于下载
      tagMap: {}, // 标签ID到标签信息的映射
      tagColorClasses, // 从公共工具文件导入
      aiLoading: false, // AI辅导按钮loading状态
      hasPendingAi: false, // 是否有正在生成中的AI结果
      hasAiResult: false, // 是否有成功的AI学习结果
      aiResultCount: 0, // 成功的AI学习结果数量
    };
  },
  onLoad(option) {
    this.loadTagList();
    this.loadRecordDetail(option.id);
  },
  methods: {
    // AI辅导
    handleAiLearn() {
      if (this.aiLoading || this.hasPendingAi) return;
      if (!this.summaryContent || this.summaryContent.trim() === '') {
        uni.showToast({ title: '暂无总结内容，无法生成', icon: 'none' });
        return;
      }

      this.aiLoading = true;
      callGenerateLearnNote({
        content: this.summaryContent,
        recordId: this.recordData._id
      }).then(() => {
        this.hasPendingAi = true;
        uni.showToast({ title: '已提交，AI正在生成中...', icon: 'none' });
      }).catch((err) => {
        uni.showToast({ title: err.message || '提交失败', icon: 'none' });
      }).finally(() => {
        setTimeout(() => { this.aiLoading = false; }, 3000);
      });
    },
    // 跳转学习结果列表
    goLearnResult() {
      if (!this.recordData || !this.recordData._id) return;
      uni.navigateTo({
        url: `/subpackage/depart/learn-result?recordId=${this.recordData._id}`
      });
    },
    // 加载AI学习结果数量
    loadAiResultCount(recordId) {
      getAiResultCount(recordId)
        .then((res) => {
          this.hasAiResult = res.hasAiResult;
          this.aiResultCount = res.aiResultCount;
          this.hasPendingAi = res.hasPending;
        })
        .catch(() => {
          this.hasAiResult = false;
          this.aiResultCount = 0;
          this.hasPendingAi = false;
        });
    },
    // 加载标签列表
    loadTagList() {
      getDictCategoryList()
        .then((res) => {
          if (res && res.result && res.result.data) {
            const tags = Array.isArray(res.result.data) ? res.result.data : [];
            // 构建标签映射
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
    // 获取标签名称
    getTagName(tagId) {
      return this.tagMap[tagId] ? this.tagMap[tagId].name : '未知标签';
    },
    // 格式化时间（复用 utils/format.js）
    formatTime(timeStr) {
      return formatTime(timeStr, 'YYYY-MM-DD HH:mm');
    },
    // 下载文档
    downloadDocument() {
      downloadMarkdown(this.recordData.title, this.summaryContent);
    },
    loadRecordDetail(id) {
      // 使用 Promise 链式调用，避免 async/await 依赖 regenerator-runtime
      getRecord(id)
        .then((recordRes) => {
          if (recordRes.result && recordRes.result.data && recordRes.result.data.length > 0) {
            this.recordData = recordRes.result.data[0];

            // 查询该记录的AI学习结果数量
            this.loadAiResultCount(this.recordData._id);

            // 根据总结ID查询并汇总信息
            if (this.recordData.summarizeId) {
              return getSummarize(this.recordData.summarizeId).then((summarizeRes) => {
                // 检查查询结果并更新汇总数据
                if (summarizeRes.result && summarizeRes.result.data && summarizeRes.result.data.length > 0) {
                  let summarizeData = summarizeRes.result.data[0];

                  // 保存原始Markdown内容，用于下载
                  this.summaryContent = summarizeData.content || "";

                  // 直接使用 towxml 解析 Markdown，支持所有插件（latex、yuml、echarts 等）
                  // 与 md-editor 保持一致，确保所有功能都能正常渲染
                  this.towxmlData = this.towxml(summarizeData.content, "markdown", {
                    events: {
                      tap: (e) => {
                        console.log("tap", e);
                      },
                    },
                  });
                } else {
                  // 表示没有找到汇总数据
                  this.summaryContent = "";
                  this.towxmlData = this.towxml("", "markdown");
                }
              });
            } else {
              // 没有总结ID
              this.summaryContent = "";
              this.towxmlData = "";
            }
          } else {
            uni.showToast({
              title: "记录不存在",
              icon: "none",
            });
            setTimeout(() => {
              uni.navigateBack();
            }, 1500);
          }
        })
        .catch((error) => {
          console.error("Error in loadRecordDetail:", error);
          uni.showToast({
            title: "加载失败，请稍后重试",
            icon: "none",
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        });
    },
  },
};
</script>

<style lang="scss" scoped>
.detail-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f5f7fa 0%, #f1f1f1 100%);
  padding-bottom: 40rpx;
}

.detail-wrapper {
  padding: 30rpx;
}

/* 详情卡片 */
.detail-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 30rpx;
}

/* 详情头部 */
.detail-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 24rpx;

  .detail-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 16rpx;
    background: linear-gradient(135deg, rgba(0, 129, 255, 0.1) 0%, rgba(28, 187, 180, 0.1) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
    flex-shrink: 0;

    .cuIcon-creativefill {
      font-size: 40rpx;
    }
  }

  .detail-title-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;

    .detail-title {
      margin-bottom: 12rpx;
      color: #333;
      word-break: break-all;
    }

    .detail-meta {
      display: flex;
      align-items: center;
      opacity: 0.7;
    }
  }
}

/* 标签区域 */
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(0, 0, 0, 0.05);

  .detail-tag {
    display: inline-block;
    padding: 8rpx 16rpx;
    border-radius: 20rpx;
    font-size: 24rpx;
    font-weight: 500;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.08);
  }
}

/* 总结卡片 */
.summary-card {
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
}

/* 总结头部 */
.summary-header {
  display: flex;
  align-items: center;
  padding: 32rpx 32rpx 24rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);

  .summary-icon {
    width: 48rpx;
    height: 48rpx;
    border-radius: 12rpx;
    background: linear-gradient(135deg, rgba(0, 129, 255, 0.1) 0%, rgba(28, 187, 180, 0.1) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;

    .cuIcon-commentfill {
      font-size: 28rpx;
    }
  }

  .summary-title {
    flex: 1;
  }

  .download-btn {
    display: flex;
    align-items: center;
    padding: 8rpx 16rpx;
    border-radius: 8rpx;
    background: rgba(0, 129, 255, 0.1);

    .cuIcon-downloadfill {
      font-size: 28rpx;
      margin-right: 8rpx;
    }

    .download-text {
      color: #007aff;
      font-weight: 500;
    }
  }

  .ai-btn {
    display: flex;
    align-items: center;
    padding: 8rpx 16rpx;
    border-radius: 8rpx;
    background: rgba(255, 157, 0, 0.1);
    margin-left: 12rpx;

    &.ai-btn-disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    .ai-btn-icon {
      font-size: 28rpx;
      margin-right: 8rpx;
    }

    .ai-btn-text {
      color: #ff9d00;
      font-weight: 500;
    }
  }
}

/* 总结内容 */
.summary-content {
  padding: 32rpx;
  min-height: 200rpx;

  .towxml-wrapper {
    font-size: 28rpx;
    line-height: 1.8;
    color: #333;

    // 优化 towxml 渲染样式
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

    ::v-deep h1,
    ::v-deep h2,
    ::v-deep h3,
    ::v-deep h4,
    ::v-deep h5,
    ::v-deep h6 {
      margin-top: 32rpx;
      margin-bottom: 16rpx;
      font-weight: bold;
    }
  }

  .summary-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80rpx 0;
    text-align: center;
  }
}

/* 查看学习结果入口 */
.learn-result-entry {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx 32rpx;
  margin-bottom: 24rpx;
  .entry-icon {
    width: 48rpx;
    height: 48rpx;
    border-radius: 12rpx;
    background: rgba(255, 157, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;
    flex-shrink: 0;

    .cuIcon-creativefill {
      font-size: 28rpx;
    }
  }

  .entry-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .entry-title {
    font-size: 28rpx;
    font-weight: 500;
    color: #333;
  }

  .entry-desc {
    margin-top: 4rpx;
  }

  .cuIcon-right {
    font-size: 28rpx;
    color: #999;
    flex-shrink: 0;
    margin-left: 12rpx;
  }
}

/* 响应式优化 */
@media screen and (max-width: 750rpx) {
  .detail-wrapper {
    padding: 20rpx;
  }

  .detail-card,
  .summary-card {
    border-radius: 20rpx;
  }

  .detail-header {
    .detail-icon {
      width: 64rpx;
      height: 64rpx;
      margin-right: 20rpx;

      .cuIcon-creativefill {
        font-size: 32rpx;
      }
    }
  }

  .summary-content {
    padding: 24rpx;
  }
}
</style>