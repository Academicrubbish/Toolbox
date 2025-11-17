<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-08-19 09:34:16
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2025-11-17 23:14:56
 * @FilePath: \Toolbox\subpackage\depart\index.vue
 * @Description: 记录列表（简化版）
 * 
-->

<template>
  <view class="record-container">
    <z-paging ref="paging" v-model="recordList" @query="queryList">
      <view slot="top">
        <cu-custom bgColor="bg-gradual-blue" :isBack="true">
          <block slot="backText">返回</block>
          <block slot="content">在路上</block>
        </cu-custom>
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
          <view 
            v-for="record in item.children" 
            :key="record._id" 
            class="record-card shadow-warp"
            @tap="goDetail(record)"
            @longpress="onLongPress($event, record)"
          >
            <view class="record-card-header">
              <view class="record-title">
                <text class="cuIcon-creativefill text-blue margin-right-xs"></text>
                <text class="text-bold">{{ record.title }}</text>
              </view>
            </view>
            
            <!-- 标签区域 -->
            <view v-if="record.tags && record.tags.length > 0" class="record-tags">
              <view 
                v-for="(tagId, index) in record.tags" 
                :key="tagId"
                class="record-tag"
                :class="getTagColorClass(index)"
              >
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
      <uni-popup-dialog 
        type="warn" 
        title="提醒" 
        :content="dialogContent" 
        cancelText="取消" 
        confirmText="确定"
        @confirm="dialogConfirm" 
        @close="dialogClose" 
      />
    </uni-popup>
  </view>
</template>

<script>
import { getRecordList, delRecord } from "@/api/record.js";
import { getDictCategoryList } from "@/api/dictCategory.js";
import { delSummarize } from "@/api/summarize";
import moment from "moment";

export default {
  data() {
    return {
      recordList: [],
      tagMap: {}, // 标签ID到标签信息的映射
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
    };
  },
  onLoad() {
    this.loadTagList();
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
    // 获取标签颜色类
    getTagColorClass(index) {
      const colors = [
        "bg-red light",
        "bg-orange light",
        "bg-yellow light",
        "bg-olive light",
        "bg-green light",
        "bg-cyan light",
        "bg-blue light",
        "bg-purple light",
        "bg-mauve light",
        "bg-pink light",
        "bg-brown light",
        "bg-grey light",
      ];
      const idx = typeof index === 'number' && !isNaN(index) ? index : 0;
      return colors[Math.abs(idx) % colors.length] || colors[0];
    },
    // 格式化时间
    formatTime(timeStr) {
      if (!timeStr) return '';
      return moment(timeStr).format('HH:mm');
    },
    queryList(pageNo, pageSize) {
      getRecordList({
        pageNum: pageNo,
        pageSize: pageSize,
      })
        .then((res) => {
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
          this.$refs.paging.complete(false);
        });
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
    /* 长按监听 */
    onLongPress(e, row) {
      let [touches, style] = [e.touches[0], ""];

      style = `top:${touches.clientY}px;`;
      style += `left:${touches.clientX}px`;

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
    dialogClose() {},
  },
};
</script>

<style lang="scss" scoped>
.record-container {
  position: relative;
  min-height: 100vh;
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
  
  &:active {
    transform: scale(0.98);
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
  }
  
  .record-card-header {
    margin-bottom: 20rpx;
    
    .record-title {
      display: flex;
      align-items: center;
      font-size: 30rpx;
      color: #333;
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
  
  &:active {
    transform: scale(0.95);
    box-shadow: 0 4rpx 12rpx rgba(57, 181, 74, 0.3);
  }
  
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

    & > view {
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
</style>
