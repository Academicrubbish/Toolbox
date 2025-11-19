<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-09-03 16:31:36
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2025-11-19 21:00:59
 * @FilePath: \Toolbox\subpackage\dictCategory\index.vue
 * @Description: 标签管理
 * 
-->
<template>
  <view class="tag-container">
    <cu-custom bgColor="bg-gradual-pink" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">标签管理</block>
    </cu-custom>

    <!-- 标签列表 -->
    <view class="tag-list-container">
      <!-- 空状态 -->
      <view v-if="tagList.length === 0" class="empty-state">
        <view class="empty-icon">
          <text class="cuIcon-tagfill text-gray"></text>
        </view>
        <view class="empty-text">
          <text class="text-gray text-lg">暂无标签</text>
          <text class="text-gray text-sm margin-top-xs">点击右下角按钮添加标签</text>
        </view>
      </view>
      
      <!-- 标签卡片列表 -->
      <view v-else class="tag-card-list">
        <view 
          v-for="(item, index) in tagList" 
          :key="item._id" 
          class="tag-card shadow-warp"
          :class="{ 'tag-card-public': isPublicTag(item) }"
          @tap="handleTagClick(item)"
          @longpress="handleLongPress($event, item)"
        >
          <view class="tag-card-header">
            <view class="tag-badge" :class="tagColorClasses[index % tagColorClasses.length]">
              <text class="tag-name">{{ item.name }}</text>
              <text v-if="isPublicTag(item)" class="tag-public-badge">公共</text>
            </view>
          </view>
          <view v-if="item.description" class="tag-card-body">
            <text class="tag-desc text-gray text-sm">{{ item.description }}</text>
          </view>
          <view class="tag-card-footer">
            <text v-if="isPublicTag(item)" class="text-gray text-xs">公共标签，不可操作</text>
            <text v-else class="text-gray text-xs">点击编辑 · 长按删除</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 长按弹窗 -->
    <view class="shade" v-show="showShade" @tap="hidePop">
      <view class="pop" :style="popStyle" :class="{ show: showPop }">
        <view v-for="item in popButton" :key="item" @tap="pickerMenu(item)">
          {{ item }}
        </view>
      </view>
    </view>

    <!-- 新增标签按钮 - FAB -->
    <view class="fab-button" @tap="addTag">
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
import { getDictCategoryList, delDictCategory } from "@/api/dictCategory.js";
import { tagColorClasses } from "@/utils/tagColors";

export default {
  data() {
    return {
      tagList: [],
      /* 显示遮罩 */
      showShade: false,
      /* 显示操作弹窗 */
      showPop: false,
      /* 弹窗按钮列表 */
      popButton: ["编辑", "删除"],
      /* 弹窗定位样式 */
      popStyle: "",
      /* 选择的标签项 */
      pickerTagItem: null,
      /* 删除提醒文本 */
      dialogContent: "",
    };
  },
  computed: {
    // 计算属性：检查 tagList 是否有效
    tagListLength() {
      return this.tagList && Array.isArray(this.tagList) ? this.tagList.length : 0;
    },
    isTagListArray() {
      return Array.isArray(this.tagList);
    },
    // 标签颜色类数组（从公共工具文件导入）
    tagColorClasses() {
      return tagColorClasses;
    },
  },
  onLoad() {
    this.loadTagList();
  },
  onShow() {
    // 从编辑页面返回时刷新列表
    this.loadTagList();
  },
  methods: {
    // 加载标签列表
    loadTagList() {
      getDictCategoryList()
        .then((res) => {
          // uniCloud 返回格式：{ result: { data: [...] } }
          let data = [];
          
          if (res && res.result) {
            // 如果 result.data 存在，使用它
            if (res.result.data !== undefined) {
              data = Array.isArray(res.result.data) ? res.result.data : [];
            } 
            // 如果 result 本身是数组
            else if (Array.isArray(res.result)) {
              data = res.result;
            }
            // 其他情况，返回空数组
            else {
              data = [];
            }
          }
          
          // 使用 Vue.set 确保响应式更新（最可靠的方法）
          this.$set(this, 'tagList', data || []);
        })
        .catch((err) => {
          console.error("加载标签列表失败：", err);
          this.tagList = [];
          uni.showToast({
            title: "加载失败",
            icon: "none",
          });
        });
    },
    // 添加标签
    addTag() {
      uni.navigateTo({
        url: "/subpackage/dictCategory/form?type=add",
      });
    },
    // 判断是否为公共标签（openid为空字符串）
    isPublicTag(item) {
      return item && (item.createBy === '' || item.createBy === null || item.createBy === undefined);
    },
    // 处理标签点击
    handleTagClick(item) {
      // 公共标签不允许编辑
      if (this.isPublicTag(item)) {
        uni.showToast({
          title: "公共标签不可编辑",
          icon: "none",
          duration: 2000,
        });
        return;
      }
      this.editTag(item);
    },
    // 编辑标签
    editTag(item) {
      uni.navigateTo({
        url: `/subpackage/dictCategory/form?type=update&id=${item._id}`,
      });
    },
    // 处理长按
    handleLongPress(e, row) {
      // 公共标签不允许操作
      if (this.isPublicTag(row)) {
        uni.showToast({
          title: "公共标签不可操作",
          icon: "none",
          duration: 2000,
        });
        return;
      }
      this.onLongPress(e, row);
    },
    // 长按监听
    onLongPress(e, row) {
      let [touches, style] = [e.touches[0], ""];

      style = `top:${touches.clientY}px;`;
      style += `left:${touches.clientX}px`;

      this.pickerTagItem = row;
      this.popStyle = style;
      this.showShade = true;
      this.$nextTick(() => {
        setTimeout(() => {
          this.showPop = true;
        }, 10);
      });
    },
    // 隐藏弹窗
    hidePop() {
      this.showPop = false;
      setTimeout(() => {
        this.showShade = false;
      }, 250);
    },
    // 弹窗菜单选择
    pickerMenu(item) {
      this.hidePop();
      // 再次检查是否为公共标签（防止绕过）
      if (this.isPublicTag(this.pickerTagItem)) {
        uni.showToast({
          title: "公共标签不可操作",
          icon: "none",
          duration: 2000,
        });
        return;
      }
      switch (item) {
        case "编辑":
          this.editTag(this.pickerTagItem);
          break;
        case "删除":
          this.dialogToggle();
          this.dialogContent = `确定删除标签 '${this.pickerTagItem.name}' 吗？`;
          break;
      }
    },
    // 显示删除对话框
    dialogToggle() {
      this.$refs.alertDialog.open();
    },
    // 确认删除
    dialogConfirm() {
      // 再次检查是否为公共标签（防止绕过）
      if (this.isPublicTag(this.pickerTagItem)) {
        uni.showToast({
          title: "公共标签不可删除",
          icon: "none",
          duration: 2000,
        });
        return;
      }
      delDictCategory(this.pickerTagItem._id)
        .then((res) => {
          // uniCloud 删除操作成功时通常返回 { result: { ... } }
          if (res.result && (res.result.code === 0 || res.result.code === undefined)) {
            uni.showToast({
              title: "删除成功",
              icon: "success",
            });
            this.loadTagList();
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
.tag-container {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(to bottom, #f5f7fa 0%, #f1f1f1 100%);
  padding-bottom: 160rpx;
}

.tag-list-container {
  padding: 30rpx 30rpx 0;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 60rpx;
  text-align: center;
  
  .empty-icon {
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.02);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 40rpx;
    
    .cuIcon-tagfill {
      font-size: 80rpx;
      opacity: 0.5;
    }
  }
  
  .empty-text {
    display: flex;
    flex-direction: column;
    
    text {
      &:not(:first-child) {
        margin-top: 20rpx;
      }
    }
  }
}

/* 标签卡片列表 */
.tag-card-list {
  display: flex;
  flex-wrap: wrap;
  padding-bottom: 40rpx;
  margin: 0 -12rpx;
  
  .tag-card {
    flex: 0 0 calc(50% - 24rpx);
    max-width: calc(50% - 24rpx);
    margin: 0 12rpx 24rpx;
  }
}

/* 标签卡片 */
.tag-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx 24rpx 24rpx;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  /* 点击效果 */
  &:active {
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
  }
  
  /* 公共标签样式 */
  &.tag-card-public {
    background: #fafafa;
    
    &:active {
      transform: none;
    }
  }
  
  /* 卡片头部 */
  .tag-card-header {
    margin-bottom: 20rpx;
    
    .tag-badge {
      display: inline-flex;
      align-items: center;
      gap: 8rpx;
      padding: 12rpx 24rpx;
      border-radius: 40rpx;
      font-size: 28rpx;
      font-weight: 500;
      box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
      position: relative;
      
      .tag-name {
        font-weight: 600;
      }
      
      .tag-public-badge {
        font-size: 20rpx;
        padding: 2rpx 8rpx;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 8rpx;
        color: #666;
        font-weight: 400;
        margin-left: 4rpx;
      }
    }
  }
  
  /* 卡片主体 */
  .tag-card-body {
    min-height: 60rpx;
    margin-bottom: 16rpx;
    
    .tag-desc {
      line-height: 1.6;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
  
  /* 卡片底部 */
  .tag-card-footer {
    padding-top: 16rpx;
    border-top: 1rpx solid rgba(0, 0, 0, 0.05);
    opacity: 0.6;
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

