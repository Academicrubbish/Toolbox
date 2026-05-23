<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-09-03 16:31:36
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2026-05-20 11:27:27
 * @FilePath: \Toolbox\subpackage\dictCategory\index.vue
 * @Description: 标签管理
 * 
-->
<template>
  <view class="tag-container">
    <nav-bar title="标签管理" showBack />

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
      <view v-else class="tag-list">
        <!-- 公共标签区域 -->
        <view v-if="publicTags.length > 0" class="section">
          <text class="section-title text-gray text-xs">公共标签</text>
          <view
            v-for="(item, index) in publicTags"
            :key="item._id"
            class="tag-item"
            @tap="handleTagClick(item)"
          >
            <view class="tag-dot" :style="'background:' + getTagColor(index).bar"></view>
            <view class="tag-item-content">
              <view class="tag-item-header">
                <text class="tag-item-name">{{ item.name }}</text>
                <view class="public-badge">
                  <text class="text-xs">公共</text>
                </view>
              </view>
              <view class="tag-item-meta">
                <text class="text-gray text-xs">公共标签，不可操作</text>
              </view>
            </view>
            <view class="tag-item-arrow">
              <text class="cuIcon-right text-gray"></text>
            </view>
          </view>
        </view>

        <!-- 个人标签区域 -->
        <view v-if="personalTags.length > 0" class="section">
          <text v-if="publicTags.length > 0" class="section-title text-gray text-xs">个人标签（点击编辑 · 长按删除）</text>
          <view
            v-for="(item, index) in personalTags"
            :key="item._id"
            class="tag-item"
            :class="{ 'tag-item-public': isPublicTag(item) }"
            @tap="handleTagClick(item)"
            @longpress="handleLongPress($event, item)"
          >
            <view class="tag-dot" :style="'background:' + getTagColor(index).bar"></view>
            <view class="tag-item-content">
              <view class="tag-item-header">
                <text class="tag-item-name">{{ item.name }}</text>
              </view>
              <view v-if="item.description" class="tag-item-desc">
                <text class="text-gray text-xs">{{ item.description }}</text>
              </view>
            </view>
            <view class="tag-item-arrow">
              <text class="cuIcon-right text-gray"></text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 长按弹窗 -->
    <context-popup ref="contextPopup" :buttons="popButton" @select="pickerMenu" />

    <!-- 新增标签按钮 - FAB -->
    <fab-button @click="addTag" />

    <!-- 删除提示 -->
    <uni-popup ref="alertDialog" type="dialog">
      <uni-popup-dialog 
        type="warn" 
        title="提醒" 
        :content="dialogContent" 
        cancelText="取消" 
        confirmText="确定"
        @confirm="dialogConfirm" 
       
      />
    </uni-popup>
  </view>
</template>

<script>
import { getDictCategoryList, delDictCategory } from "@/api/dictCategory.js";
import { getTagColor } from "@/utils/tagColors";
import ContextPopup from '@/component/context-popup/index.vue';
import FabButton from '@/component/fab-button/index.vue';
import NavBar from '@/component/nav-bar/index.vue';

export default {
  components: {
    ContextPopup,
    FabButton,
    NavBar,
  },
  data() {
    return {
      tagList: [],
      /* 弹窗按钮列表 */
      popButton: ["编辑", "删除"],
      /* 选择的标签项 */
      pickerTagItem: null,
      /* 删除提醒文本 */
      dialogContent: "",
    };
  },
  computed: {
    // 公共标签
    publicTags() {
      return this.tagList.filter(item => this.isPublicTag(item));
    },
    // 个人标签
    personalTags() {
      return this.tagList.filter(item => !this.isPublicTag(item));
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
    getTagColor,
    // 加载标签列表
    loadTagList() {
      getDictCategoryList()
        .then((res) => {
          const data = res?.result?.data;
          this.tagList = Array.isArray(data) ? data : [];
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
      if (this.isPublicTag(row)) {
        uni.showToast({
          title: "公共标签不可操作",
          icon: "none",
          duration: 2000,
        });
        return;
      }
      this.pickerTagItem = row;
      this.$refs.contextPopup.show(e, row);
    },
    // 弹窗菜单选择
    pickerMenu({ action, item }) {
      if (this.isPublicTag(item)) {
        uni.showToast({
          title: "公共标签不可操作",
          icon: "none",
          duration: 2000,
        });
        return;
      }
      this.pickerTagItem = item;
      switch (action) {
        case "编辑":
          this.editTag(item);
          break;
        case "删除":
          this.dialogToggle();
          this.dialogContent = `确定删除标签 '${item.name}' 吗？`;
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
  },
};
</script>

<style lang="scss" scoped>
.tag-container {
  position: relative;
  min-height: 100vh;
  background: $color-bg-page;
  padding-bottom: 80px;
}

.tag-list-container {
  padding: 15px 15px 0;
}

/* 标签列表 - 单列布局 */
.tag-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 20px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  padding: 4px 2px;
  font-weight: 500;
}

/* 标签项 */
.tag-item {
  background: $color-bg-card;
  border-radius: $radius-card;
  padding: 12px 14px;
  min-height: 75px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: $shadow-card;
}

.tag-dot {
  width: 6px;
  height: 20px;
  border-radius: 3px;
  flex-shrink: 0;
}

.tag-item-content {
  flex: 1;
  min-width: 0;
}

.tag-item-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.tag-item-name {
  font-size: 15px;
  font-weight: 600;
  color: $color-text-primary;
}

.public-badge {
  background: $color-bg-input;
  padding: 1px 6px;
  border-radius: $radius-pill;
  color: $color-text-tertiary;
}

.tag-item-desc {
  margin-bottom: 4px;
}

.tag-item-meta {
  font-size: 12px;
}

.tag-item-arrow {
  flex-shrink: 0;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 30px;
  text-align: center;

  .empty-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: $color-bg-input;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;

    .cuIcon-tagfill {
      font-size: 40px;
      color: $color-text-tertiary;
      opacity: 0.5;
    }
  }

  .empty-text {
    display: flex;
    flex-direction: column;

    text {
      &:not(:first-child) {
        margin-top: 10px;
      }
    }
  }
}

</style>

