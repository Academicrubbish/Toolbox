<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-08-19 09:34:16
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2025-11-21 18:32:19
 * @FilePath: \Toolbox\component\depart-list\index.vue
 * @Description: 记录列表（简化版）
 * 
-->

<template>
  <view class="record-container">

    <z-paging ref="paging" v-model="recordList" @query="queryList" :hideEmptyView="showAuthFailed">
      <view slot="top">
        <cu-custom bgColor="bg-gradual-blue">
          <view slot="left" class="action" @tap="handleShowDrawer">
            <text class="iconfont icon-menus text-white text-bold"></text>
          </view>
          <block slot="content">首页</block>
        </cu-custom>
      </view>
      <!-- 自定义授权失败页面 -->
      <view slot="empty" v-if="showAuthFailed" class="auth-failed-container">
        <view class="auth-failed-main">
          <image class="auth-failed-image-rpx" :src="errorImage" mode="aspectFit" />
          <text class="auth-failed-title auth-failed-title-rpx">当前用户未授权，无法查询到信息，请授权后再尝试加载</text>
          <text class="auth-failed-error-btn auth-failed-error-btn-rpx" @click.stop="handleAuthorize">授权登录</text>
        </view>
      </view>

      <!-- 记录列表 -->
      <view v-for="item in recordList" :key="item.date" class="date-group">
        <!-- 日期标题 -->
        <view class="date-header">
          <view class="date-icon">
            <text class="cuIcon-calendar text-blue"></text>
          </view>
          <view class="date-text">
            <text class="text-lg text-bold">{{ item.date }}</text>
            <text class="text-sm text-gray margin-left-sm">{{ item.count }} 条记录</text>
          </view>
        </view>

        <!-- 记录卡片列表 -->
        <view class="record-card-list">
          <view v-for="record in item.children" :key="record._id" class="record-card shadow-warp"
            @tap="goDetail(record)">
            <view class="record-card-header">
              <view class="record-title">
                <text class="cuIcon-creativefill text-blue margin-right-xs"></text>
                <text class="text-bold">{{ record.title }}</text>
              </view>
              <view class="record-more-icon" @tap.stop="onIconClick($event, record)">
                <text class="cuIcon-moreandroid text-gray"></text>
              </view>
            </view>

            <!-- 标签区域 -->
            <view v-if="record.tags && record.tags.length > 0" class="record-tags">
              <view v-for="(tagId, index) in record.tags" :key="tagId" class="record-tag"
                :class="tagColorClasses[index % 12]">
                <text>{{ getTagName(tagId) }}</text>
              </view>
            </view>

            <!-- 时间信息 -->
            <view class="record-footer">
              <text class="cuIcon-timefill text-gray text-xs margin-right-xs"></text>
              <text class="text-gray text-xs">{{ formatTime(record.createTime) }}</text>
            </view>
          </view>
        </view>
      </view>
    </z-paging>

    <!-- 长按弹窗 -->
    <view class="shade" v-show="showShade" @tap="hidePop">
      <view class="pop" :style="popStyle" :class="{ show: showPop }">
        <view v-for="item in popButton" :key="item" @tap="pickerMenu(item)">
          {{ item }}
        </view>
      </view>
    </view>

    <!-- 新增记录按钮 - FAB -->
    <view class="fab-button" @tap="addRecord">
      <view class="fab-icon">
        <text class="cuIcon-add"></text>
      </view>
    </view>

    <!-- 删除提示 -->
    <uni-popup ref="alertDialog" type="dialog">
      <uni-popup-dialog type="warn" title="提醒" :content="dialogContent" cancelText="取消" confirmText="确定"
        @confirm="dialogConfirm" @close="dialogClose" />
    </uni-popup>
  </view>
</template>

<script>
import { getRecordList, delRecord } from "@/api/record.js";
import { getDictCategoryList } from "@/api/dictCategory.js";
import { delSummarize } from "@/api/summarize";
import { tagColorClasses } from "@/utils/tagColors";
import moment from "moment";
import zStatic from '@/uni_modules/z-paging/components/z-paging/js/z-paging-static.js';

export default {
  data() {
    return {
      recordList: [],
      tagMap: {}, // 标签ID到标签信息的映射
      tagColorClasses, // 从公共工具文件导入
      /* 显示遮罩 */
      showShade: false,
      /* 显示操作弹窗 */
      showPop: false,
      /* 弹窗按钮列表 */
      popButton: ["编辑", "删除"],
      /* 弹窗定位样式 */
      popStyle: "",
      /* 选择的记录内容 */
      pickerRecordItem: null,
      /* 删除提醒文本 */
      dialogContent: "",
      /* 是否显示授权失败页面 */
      showAuthFailed: false,
      /* z-paging 默认错误图片 */
      errorImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAMAAAAL34HQAAALeGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDg4LCAyMDIwLzA3LzEwLTIyOjA2OjUzICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczpwaG90b3Nob3A9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGhvdG9zaG9wLzEuMC8iIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIiB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIyLTAyLTIyVDIxOjIxOjQ1KzA4OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDI0LTAxLTEzVDE5OjEwOjEwKzA4OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyNC0wMS0xM1QxOToxMDoxMCswODowMCIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MTQ3NTExNjAtZDY5MC00ZTkzLWFhNGUtNGMwYTViNGU1ZGFjIiB4bXBNTTpEb2N1bWVudElEPSJhZG9iZTpkb2NpZDpwaG90b3Nob3A6YzRiNzlkYWMtZTJmYS1iNzQ0LWIxM2ItOWU1N2VjMDhhM2YwIiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6ZDA4MDI4MDItMzUyYS04NTRhLTkxYjctNmRlNmQ1MmViM2QwIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiIHRpZmY6T3JpZW50YXRpb249IjEiIHRpZmY6WFJlc29sdXRpb249IjMwMDAwMDAvMTAwMDAiIHRpZmY6WVJlc29sdXRpb249IjMwMDAwMDAvMTAwMDAiIHRpZmY6UmVzb2x1dGlvblVuaXQ9IjIiIGV4aWY6Q29sb3JTcGFjZT0iMSIgZXhpZjpQaXhlbFhEaW1lbnNpb249IjMwMCIgZXhpZjpQaXhlbFlEaW1lbnNpb249IjMwMCI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6ZDA4MDI4MDItMzUyYS04NTRhLTkxYjctNmRlNmQ1MmViM2QwIiBzdEV2dDp3aGVuPSIyMDIyLTAyLTIyVDIxOjIxOjQ1KzA4OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjQwNjg2NzJkLWY5NDMtOTU0Mi1iMDBiLTVlMDExNmE1NmIzZSIgc3RFdnQ6d2hlbj0iMjAyNC0wMS0xM1QxMDoyNjoxNiswODowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKFdpbmRvd3MpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjZjk1NTE1OC04MjFiLTA4NDUtYWJmNS05YTE1NGM1ZTY4NjEiIHN0RXZ0OndoZW49IjIwMjQtMDEtMTNUMTE6MDQ6MDQrMDg6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY29udmVydGVkIiBzdEV2dDpwYXJhbWV0ZXJzPSJmcm9tIGFwcGxpY2F0aW9uL3ZuZC5hZG9iZS5waG90b3Nob3AgdG8gaW1hZ2UvcG5nIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJkZXJpdmVkIiBzdEV2dDpwYXJhbWV0ZXJzPSJjb252ZXJ0ZWQgZnJvbSBhcHBsaWNhdGlvbi92bmQuYWRvYmUucGhvdG9zaG9wIHRvIGltYWdlL3BuZyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6ZGM1Y2IyNWItZDZlNC0yZjQ2LTgyODQtZmUwOTNlY2M2ZTkxIiBzdEV2dDp3aGVuPSIyMDI0LTAxLTEzVDExOjA0OjA0KzA4OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjE0NzUxMTYwLWQ2OTAtNGU5My1hYTRlLTRjMGE1YjRlNWRhYyIgc3RFdnQ6d2hlbj0iMjAyNC0wMS0xM1QxOToxMDoxMCswODowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIyLjAgKE1hY2ludG9zaCkiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDx4bXBNTTpEZXJpdmVkRnJvbSBz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',
    };
  },
  mounted() {
    this.loadTagList();
  },
  methods: {
    handleShowDrawer() {
      this.$emit('show-drawer');
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
    // 格式化时间
    formatTime(timeStr) {
      if (!timeStr) return '';
      return moment(timeStr).format('HH:mm');
    },
    queryList(pageNo, pageSize) {
      // 调用接口，不自动弹出登录弹窗，失败时显示失败页面
      getRecordList({
        pageNum: pageNo,
        pageSize: pageSize,
      }, { autoShowLogin: false })
        .then((res) => {
          // 加载成功，重置失败状态
          this.showAuthFailed = false;
          let list = res.result.data || [];
          let groupedRecords = [];

          list.forEach((element) => {
            // 使用 createTime 进行分组
            let groupDate = moment(element.createTime).format("YYYY-MM-DD");

            // 查找是否已存在该日期分组
            let existingGroup = groupedRecords.find(
              (group) => group.date === groupDate
            );

            if (existingGroup) {
              existingGroup.children.push(element);
              existingGroup.count++;
            } else {
              groupedRecords.push({
                date: groupDate,
                children: [element],
                count: 1,
              });
            }
          });

          // 调用 z-paging 组件的 complete 方法
          this.$refs.paging.complete(groupedRecords);
        })
        .catch((err) => {
          console.error("加载记录列表失败：", err);
          // 判断是否是未授权错误
          const errorMessage = err?.message || err?.errMsg || '';
          if (errorMessage.includes('未授权') || errorMessage.includes('用户未授权') || errorMessage.includes('用户取消登录')) {
            this.showAuthFailed = true;
          } else {
            this.showAuthFailed = false;
          }
          // 调用 z-paging 组件的 complete 方法，传入 false 表示加载失败
          this.$refs.paging.complete(false);
        });
    },
    // 处理授权登录
    handleAuthorize() {
      // 触发父组件的授权事件
      this.$emit('authorize');
    },
    addRecord() {
      uni.navigateTo({
        url: "/subpackage/depart/form?type=add",
      });
    },
    goDetail(row) {
      uni.navigateTo({
        url: `/subpackage/depart/detail?id=${row._id}`,
      });
    },
    pickerMenu(item) {
      this.hidePop();
      // 编辑和删除操作会通过API拦截器自动检查登录，这里不需要手动检查
      switch (item) {
        case "编辑":
          uni.navigateTo({
            url: `/subpackage/depart/form?type=update&id=${this.pickerRecordItem._id}`,
          });
          break;
        case "删除":
          this.dialogToggle();
          this.dialogContent = `确定删除记录 '${this.pickerRecordItem.title}' 吗？删除后不可恢复！`;
          break;
      }
    },
    /* 图标点击监听 */
    onIconClick(e, row) {
      // 获取点击位置，uni-app 中 tap 事件使用 e.detail.x 和 e.detail.y
      let clientX = (e.detail ? e.detail.x : (e.touches ? e.touches[0].clientX : 300)) - 100;
      let clientY = e.detail ? e.detail.y : (e.touches ? e.touches[0].clientY : 200);

      let style = `top:${clientY}px;`;
      style += `left:${clientX}px`;

      this.pickerRecordItem = row;
      this.popStyle = style;
      this.showShade = true;
      this.$nextTick(() => {
        setTimeout(() => {
          this.showPop = true;
        }, 10);
      });
    },
    /* 隐藏弹窗 */
    hidePop() {
      this.showPop = false;
      setTimeout(() => {
        this.showShade = false;
      }, 250);
    },
    dialogToggle() {
      this.$refs.alertDialog.open();
    },
    // 确认删除
    dialogConfirm() {
      let _this = this;
      delRecord(_this.pickerRecordItem._id)
        .then((res) => {
          if (res.result && (res.result.code === 0 || res.result.code === undefined)) {
            // 删除关联的富文本内容
            if (_this.pickerRecordItem.summarizeId) {
              delSummarize(_this.pickerRecordItem.summarizeId)
                .then(() => {
                  uni.showToast({
                    title: "删除成功",
                    icon: "success",
                  });
                  _this.$refs.paging.refresh();
                })
                .catch(() => {
                  uni.showToast({
                    title: "删除成功",
                    icon: "success",
                  });
                  _this.$refs.paging.refresh();
                });
            } else {
              uni.showToast({
                title: "删除成功",
                icon: "success",
              });
              _this.$refs.paging.refresh();
            }
          } else {
            uni.showToast({
              title: res.result?.msg || "删除失败",
              icon: "none",
            });
          }
        })
        .catch((err) => {
          console.error("删除失败：", err);
          uni.showToast({
            title: "删除失败",
            icon: "none",
          });
        });
    },
    dialogClose() { },
  },
};
</script>

<style lang="scss" scoped>
.record-container {
  position: relative;
  background: linear-gradient(to bottom, #f5f7fa 0%, #f1f1f1 100%);
  padding-bottom: 160rpx;
}

/* 日期分组 */
.date-group {
  padding: 30rpx 30rpx 0;
}

/* 日期标题 */
.date-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
  padding: 0 8rpx;

  .date-icon {
    width: 48rpx;
    height: 48rpx;
    border-radius: 12rpx;
    background: linear-gradient(135deg, rgba(0, 129, 255, 0.1) 0%, rgba(28, 187, 180, 0.1) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;

    .cuIcon-calendar {
      font-size: 28rpx;
    }
  }

  .date-text {
    flex: 1;
    display: flex;
    align-items: center;
  }
}

/* 记录卡片列表 */
.record-card-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* 记录卡片 */
.record-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx 24rpx 24rpx;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  .record-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;

    .record-title {
      display: flex;
      align-items: center;
      font-size: 30rpx;
      color: #333;
      flex: 1;
    }

    .record-more-icon {
      width: 56rpx;
      height: 56rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
      margin-left: 16rpx;

      .cuIcon-moreandroid {
        font-size: 40rpx;
      }

      &:active {
        background-color: rgba(0, 0, 0, 0.05);
      }
    }
  }

  .record-tags {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 16rpx;
    gap: 12rpx;

    .record-tag {
      display: inline-block;
      padding: 8rpx 16rpx;
      border-radius: 20rpx;
      font-size: 24rpx;
      font-weight: 500;
      box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.08);
    }
  }

  .record-footer {
    display: flex;
    align-items: center;
    padding-top: 16rpx;
    border-top: 1rpx solid rgba(0, 0, 0, 0.05);
    opacity: 0.7;
  }
}

/* 浮动操作按钮 FAB */
.fab-button {
  position: fixed;
  bottom: 40rpx;
  right: 40rpx;
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #39b54a 0%, #8dc63f 100%);
  box-shadow: 0 8rpx 24rpx rgba(57, 181, 74, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
  transition: all 0.3s ease;

  .fab-icon {
    color: #ffffff;
    font-size: 48rpx;
    font-weight: 300;
  }
}

/* 遮罩 */
.shade {
  position: fixed;
  z-index: 100;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4rpx);
  -webkit-touch-callout: none;
  animation: fadeIn 0.2s ease;

  .pop {
    position: fixed;
    z-index: 101;
    min-width: 240rpx;
    box-sizing: border-box;
    font-size: 28rpx;
    text-align: left;
    color: #333;
    background-color: #fff;
    border-radius: 16rpx;
    box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
    overflow: hidden;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    user-select: none;
    -webkit-touch-callout: none;
    transform: scale(0, 0);
    transform-origin: center;

    &.show {
      transform: scale(1, 1);
    }

    &>view {
      padding: 24rpx 32rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      user-select: none;
      -webkit-touch-callout: none;
      border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
      transition: background-color 0.2s ease;

      &:last-child {
        border-bottom: none;
      }

      &:active {
        background-color: #f5f7fa;
      }
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

/* 授权失败页面 - 参考 z-paging 默认样式 */
.auth-failed-container {
  /* #ifndef APP-NVUE */
  display: flex;
  /* #endif */
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
}

.auth-failed-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50rpx 0rpx;
}

.auth-failed-image-rpx {
  width: 240rpx;
  height: 240rpx;
}

.auth-failed-title {
  color: #aaaaaa;
  text-align: center;
}

.auth-failed-title-rpx {
  font-size: 28rpx;
  margin-top: 10rpx;
  padding: 0rpx 20rpx;
}

.auth-failed-error-btn {
  border: solid 1px #dddddd;
  color: #aaaaaa;
  text-align: center;
  cursor: pointer;
}

.auth-failed-error-btn-rpx {
  font-size: 28rpx;
  padding: 8rpx 24rpx;
  border-radius: 6rpx;
  margin-top: 50rpx;
}
</style>
