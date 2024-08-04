<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-08-01 17:31:22
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2024-08-02 16:59:00
 * @FilePath: \Toolbox\subpackage\depart\index.vue
 * @Description: 
 * 
 * Copyright (c) 2024 by 坤智数联科技(宁波), All Rights Reserved. 
-->
<template>
  <view class="depart">
    <z-paging ref="paging" v-model="recordList" @query="queryList">
      <view slot="top">
        <cu-custom bgColor="bg-gradual-blue" :isBack="true">
          <block slot="backText">返回</block>
          <block slot="content">在路上</block>
        </cu-custom>
      </view>

      <!-- 记录列表 -->
      <view v-for="item in recordList" :key="item.date">
        <view class="cu-bar bg-white solid-bottom margin-top">
          <view class="action">
            <text class="cuIcon-title text-orange"></text>
            {{ item.date }}
          </view>
        </view>
        <view class="cu-list menu sm-border">
          <view
            class="cu-item"
            v-for="citem in item.children"
            :key="citem._id"
            @longpress="onLongPress($event, citem)"
            @tap="goDetail(citem)"
          >
            <view class="content padding-tb-sm">
              <view>
                <text class="cuIcon-clothesfill text-blue margin-right-xs" />
                {{ citem.title }}
              </view>
              <view class="text-gray text-sm">
                <text class="cuIcon-infofill margin-right-xs" />
                {{ citem.summary }}
              </view>
            </view>
            <view class="action">
              <text class="text-grey text-sm">{{
                citem.completionPeriod[1]
              }}</text>
            </view>
          </view>
        </view>
      </view>
    </z-paging>

    <!-- 长按弹窗 -->
    <view class="shade" v-show="showShade" @tap="hidePop">
      <view class="pop" :style="popStyle" :class="{ show: showPop }">
        <view v-for="item in popButton" :key="item" @tap="pickerMenu(item)">{{
          item
        }}</view>
      </view>
    </view>

    <!-- 新增记录 -->
    <view class="add">
      <button
        class="cu-btn cuIcon-add bg-green shadow"
        @tap="addRecord"
      ></button>
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
      ></uni-popup-dialog>
    </uni-popup>
  </view>
</template>
<script>
import { getRecordList, delRecord } from "@/api/record.js";
import moment from "moment";
export default {
  data() {
    return {
      recordList: [],
      //test
      /* 显示遮罩 */
      showShade: false,
      /* 显示操作弹窗 */
      showPop: false,
      /* 弹窗按钮列表 */
      popButton: ["添加总结", "编辑", "删除"],
      /* 弹窗定位样式 */
      popStyle: "",
      /* 选择的记录内容下标 */
      pickerRecordItem: null,
      /* 删除提醒文本 */
      dialogContent: "",
    };
  },
  methods: {
    queryList(pageNo, pageSize) {
      getRecordList({
        pageNum: pageNo,
        pageSize: pageSize,
      })
        .then((res) => {
          let list = res.result.data;
          let groupedRecords = [];
          list.forEach((element) => {
            let groupDate = moment(element.completionPeriod[0]).format(
              "YYYY-MM-DD"
            );

            // 查找是否已存在该日期分组
            let existingGroup = groupedRecords.find(
              (group) => group.date === groupDate
            );

            if (existingGroup) {
              // 如果已存在该日期分组，则将当前元素添加到该分组的children中
              existingGroup.children.push(element);
            } else {
              // 如果不存在该日期分组，则创建新的分组对象并添加到groupedRecords中
              groupedRecords.push({
                date: groupDate,
                children: [element],
              });
            }
          });
          // 调用 z-paing 组件的 complete 方法，将数据传入组件，并完成分页显示
          this.$refs.paging.complete(groupedRecords);
        })
        .catch((err) => {
          this.$refs.paging.complete(false);
        });
    },
    addRecord() {
      uni.navigateTo({
        url: "/subpackage/record/index?type=add",
      });
    },
    goDetail(row) {
      uni.navigateTo({
        url: `/subpackage/depart/detail?&id=${row._id}`,
      });
    },
    pickerMenu(item) {
      console.log(item);
      switch (item) {
        case "添加总结":
          uni.navigateTo({
            url: `/subpackage/summarize/index?recordId=${this.pickerRecordItem._id}`,
          });
          break;
        case "编辑":
          uni.navigateTo({
            url: `/subpackage/record/index?type=update&id=${this.pickerRecordItem._id}`,
          });
          break;
        case "删除":
          this.dialogToggle();
          this.dialogContent = `确定删除名为 '${this.pickerRecordItem.title}' 的记录？`;
          break;
      }
    },
    /* 长按监听 */
    onLongPress(e, row) {
      let [touches, style] = [e.touches[0], "", e.currentTarget.dataset.index];

      /* 因 非H5端不兼容 style 属性绑定 Object ，所以拼接字符 */
      // if (touches.clientY > this.winSize.height / 2) {
      //   style = `bottom:${this.winSize.height - touches.clientY}px;`;
      // } else {
      style = `top:${touches.clientY}px;`;
      // }
      // if (touches.clientX > this.winSize.witdh / 2) {
      //   style += `right:${this.winSize.witdh - touches.clientX}px`;
      // } else {
      style += `left:${touches.clientX}px`;
      // }

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
      delRecord(this.pickerRecordItem._id).then((res) => {
        if (res.result.code === 0) {
          uni.showToast({
            title: "删除成功",
            icon: "none",
          });
          this.$refs.paging.refresh();
        }
      });
    },
    dialogClose() {},
  },
};
</script>
<style lang="scss" scoped>
.depart {
  position: relative;
  height: 100%;
}

.add {
  position: fixed;
  bottom: 20px;
  right: 20px;
}

/* 遮罩 */
.shade {
  position: fixed;
  z-index: 100;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  -webkit-touch-callout: none;

  .pop {
    position: fixed;
    z-index: 101;
    width: 200upx;
    box-sizing: border-box;
    font-size: 28upx;
    text-align: left;
    color: #333;
    background-color: #fff;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
    line-height: 80upx;
    transition: transform 0.15s ease-in-out 0s;
    user-select: none;
    -webkit-touch-callout: none;
    transform: scale(0, 0);

    &.show {
      transform: scale(1, 1);
    }

    & > view {
      padding: 0 20upx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      user-select: none;
      -webkit-touch-callout: none;

      &:active {
        background-color: #f3f3f3;
      }
    }
  }
}
</style>