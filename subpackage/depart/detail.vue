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
import { tagColorClasses } from "@/utils/tagColors";
import moment from "moment";

export default {
  data() {
    return {
      recordData: null,
      towxmlData: "",
      summaryContent: "", // 原始Markdown内容，用于下载
      tagMap: {}, // 标签ID到标签信息的映射
      tagColorClasses, // 从公共工具文件导入
    };
  },
  onLoad(option) {
    this.loadTagList();
    this.loadRecordDetail(option.id);
  },
  methods: {
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
    // 格式化时间
    formatTime(timeStr) {
      if (!timeStr) return '';
      return moment(timeStr).format('YYYY-MM-DD HH:mm');
    },
    // 下载文档
    downloadDocument() {
      if (!this.summaryContent) {
        uni.showToast({
          title: '暂无内容可下载',
          icon: 'none'
        });
        return;
      }

      uni.showLoading({
        title: '准备下载...',
        mask: true
      });

      // 生成文件名
      const fileName = `${this.recordData.title || '文档'}_${moment().format('YYYYMMDD_HHmmss')}.md`;

      // 将Markdown内容转换为Blob并上传到云存储
      this.uploadMarkdownToCloud(fileName, this.summaryContent);
    },
    // 上传Markdown到云存储
    uploadMarkdownToCloud(fileName, content) {
      // 使用uniCloud上传文件
      const cloudPath = `downloads/${moment().unix()}_${fileName}`;

      // 由于uniCloud.uploadFile需要filePath，我们需要先将内容写入临时文件
      // 微信小程序中，使用文件系统管理器写入临时文件
      const fs = uni.getFileSystemManager();
      // 使用临时文件路径（微信小程序临时目录）
      // wx.env.USER_DATA_PATH 在微信小程序基础库 2.10.0+ 可用
      let userDataPath = '';
      try {
        if (typeof wx !== 'undefined' && wx.env && wx.env.USER_DATA_PATH) {
          userDataPath = wx.env.USER_DATA_PATH;
        }
      } catch (e) {
        console.warn('无法获取USER_DATA_PATH：', e);
      }

      // 如果无法获取USER_DATA_PATH，使用备用方案
      if (!userDataPath) {
        this.downloadMarkdownDirect(fileName, content);
        return;
      }

      const tempFilePath = `${userDataPath}/${fileName}`;

      // 写入临时文件
      fs.writeFile({
        filePath: tempFilePath,
        data: content,
        encoding: 'utf8',
        success: () => {
          // 上传到云存储
          uniCloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath,
            cloudPathAsRealPath: true,
            success: (uploadRes) => {
              // 获取云存储文件的下载URL
              const fileID = uploadRes.fileID;
              // 下载文件
              this.downloadFileFromCloud(fileID, fileName);
            },
            fail: (err) => {
              uni.hideLoading();
              console.error('上传文件失败：', err);
              // 如果上传失败，尝试备用方案
              this.downloadMarkdownDirect(fileName, content);
            }
          });
        },
        fail: (err) => {
          uni.hideLoading();
          console.error('写入临时文件失败：', err);
          // 如果写入失败，尝试直接使用备用方案
          this.downloadMarkdownDirect(fileName, content);
        }
      });
    },
    // 直接从云存储下载文件
    downloadFileFromCloud(fileID, fileName) {
      // 获取云存储文件的下载URL
      // fileID 就是云存储的路径，需要转换为可访问的URL
      // 对于微信小程序，fileID 可以直接用于下载
      uni.downloadFile({
        url: fileID,
        success: (downloadRes) => {
          if (downloadRes.statusCode === 200) {
            // 保存文件到本地
            this.saveFileToLocal(downloadRes.tempFilePath, fileName);
          } else {
            uni.hideLoading();
            uni.showToast({
              title: '下载失败',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          uni.hideLoading();
          console.error('下载文件失败：', err);
          uni.showToast({
            title: '下载失败',
            icon: 'none'
          });
        }
      });
    },
    // 直接下载Markdown（备用方案）
    downloadMarkdownDirect(fileName, content) {
      // 如果云存储方案失败，尝试使用其他方式
      // 对于微信小程序，我们可以提示用户复制内容
      uni.showModal({
        title: '提示',
        content: '由于平台限制，建议您复制内容后手动保存。是否复制内容到剪贴板？',
        success: (res) => {
          uni.hideLoading();
          if (res.confirm) {
            uni.setClipboardData({
              data: content,
              success: () => {
                uni.showToast({
                  title: '内容已复制到剪贴板',
                  icon: 'success'
                });
              }
            });
          }
        }
      });
    },
    // 保存文件到本地
    saveFileToLocal(tempFilePath, fileName) {
      uni.saveFile({
        tempFilePath: tempFilePath,
        success: (saveRes) => {
          uni.hideLoading();
          uni.showToast({
            title: '保存成功',
            icon: 'success',
            duration: 2000
          });
          console.log('文件保存路径：', saveRes.savedFilePath);
          // 3. 打开文件（可选，支持 PDF/文档等）
          this.openFile(saveRes.savedFilePath);
        },
        fail: (err) => {
          uni.hideLoading();
          console.error('保存文件失败：', err);
          uni.showToast({
            title: '保存失败',
            icon: 'none'
          });
        }
      });
    },
    // 打开已下载的文件
    openFile(filePath) {
      uni.openDocument({
        filePath: filePath,
        showMenu: true, // 显示右上角菜单（支持转发、保存到手机）
        success: () => console.log('文件打开成功'),
        fail: (err) => {
          uni.showToast({ title: '打开文件失败', icon: 'none' });
          console.error('打开失败：', err);
        }
      });
    },
    loadRecordDetail(id) {
      // 使用 Promise 链式调用，避免 async/await 依赖 regenerator-runtime
      getRecord(id)
        .then((recordRes) => {
          if (recordRes.result && recordRes.result.data && recordRes.result.data.length > 0) {
            this.recordData = recordRes.result.data[0];

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
    cursor: pointer;
    transition: all 0.3s;

    &:active {
      background: rgba(0, 129, 255, 0.2);
      transform: scale(0.95);
    }

    .cuIcon-downloadfill {
      font-size: 28rpx;
      margin-right: 8rpx;
    }

    .download-text {
      color: #007aff;
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