<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-08-19 09:34:16
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2024-10-09 17:23:44
 * @FilePath: \Toolbox\subpackage\knowledge\index.vue
 * @Description: 知识点
 * 
-->

<template>
  <view class="depart">
    <z-paging ref="paging" v-model="KnowledgePointList" @query="queryList">
      <view slot="top">
        <cu-custom bgColor="bg-gradual-blue" :isBack="true">
          <block slot="backText">返回</block>
          <block slot="content">知识点列表</block>
        </cu-custom>
      </view>

      <!-- <view class="cu-bar bg-red search">
        <view class="search-form radius">
          <text class="cuIcon-search"></text>
          <input @focus="InputFocus" @blur="InputBlur" :adjust-position="false" type="text" placeholder="搜索图片、文章、视频"
            confirm-type="search" />
        </view>
        <view class="action">
          <text>广州</text>
          <text class="cuIcon-triangledownfill"></text>
        </view>
      </view> -->

      <!-- 记录列表 -->
      <view v-for="item in KnowledgePointList" :key="item._id" class="padding-lr-sm">
        <view class="cu-bar bg-white solid-bottom margin-top">
          <view class="action">
            <text class="text-gray text-sm">{{ item.categories }}</text>
          </view>
        </view>
        <view class="cu-list menu sm-border">
          <view class="cu-item" @longpress="onLongPress($event, item)" @tap="goDetail(item)">
            <view class="content padding-tb-sm">
              <view>
                <text class="cuIcon-creativefill text-orange margin-right-xs" />
                {{ item.title }}
              </view>
              <view class="text-sm">
                <text class="cuIcon-activityfill text-blue margin-right-xs" />
                <text>{{ item.description }}</text>
              </view>
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

    <!-- 新增记录 -->
    <view class="add">
      <button class="cu-btn cuIcon-add bg-green shadow" @tap="addKnowledgePoint"></button>
    </view>

    <!-- 删除提示 -->
    <uni-popup ref="alertDialog" type="dialog">
      <uni-popup-dialog type="warn" title="提醒" :content="dialogContent" cancelText="取消" confirmText="确定"
        @confirm="dialogConfirm" @close="dialogClose" />
    </uni-popup>
  </view>
</template>
<script>
import { getKnowledgePointList, delKnowledgePoint } from "@/api/knowledge.js";
import { delSummarize } from "@/api/summarize";
export default {
  data() {
    return {
      KnowledgePointList: [],
      //test
      /* 显示遮罩 */
      showShade: false,
      /* 显示操作弹窗 */
      showPop: false,
      /* 弹窗按钮列表 */
      popButton: ["编辑", "删除"],
      /* 弹窗定位样式 */
      popStyle: "",
      /* 选择的记录内容下标 */
      pickerKnowledgePointItem: null,
      /* 删除提醒文本 */
      dialogContent: "",
    };
  },
  methods: {
    InputFocus() { },
    InputBlur() { },
    queryList(pageNo, pageSize) {
      getKnowledgePointList({
        pageNum: pageNo,
        pageSize: pageSize,
      })
        .then((res) => {
          let list = res.result.data;
          // 调用 z-paing 组件的 complete 方法，将数据传入组件，并完成分页显示
          this.$refs.paging.complete(list);
        })
        .catch((err) => {
          this.$refs.paging.complete(false);
        });
    },
    addKnowledgePoint() {
      uni.navigateTo({
        url: "/subpackage/knowledge/form?type=add",
      });
    },
    goDetail(row) {
      uni.navigateTo({
        url: `/subpackage/knowledge/detail?&id=${row._id}`,
      });
    },
    pickerMenu(item) {
      console.log(item);
      switch (item) {
        case "编辑":
          uni.navigateTo({
            url: `/subpackage/knowledge/form?type=update&id=${this.pickerKnowledgePointItem._id}`,
          });
          break;
        case "删除":
          this.dialogToggle();
          this.dialogContent = `确定删除名为 '${this.pickerKnowledgePointItem.title}' 的记录？`;
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

      this.pickerKnowledgePointItem = row;
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
      delKnowledgePoint(this.pickerKnowledgePointItem._id).then((res) => {
        if (res.result.code === 0) {
          delSummarize(this.pickerKnowledgePointItem.content).then((cres) => {
            uni.showToast({
              title: "删除成功",
              icon: "none",
            });
            _this.$refs.paging.refresh();
          });
        }
      });
    },
    dialogClose() { },
  },
};
</script>
<style lang="scss" scoped>
.cu-bar {
  min-height: 70rpx;
}

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

    &>view {
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