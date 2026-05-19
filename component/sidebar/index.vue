<template>
  <view v-if="domVisible" class="sidebar-overlay" :class="{ 'sidebar-overlay--visible': showPanel }" @tap="handleClose">
    <view class="sidebar" :class="{ 'sidebar--visible': showPanel }" @tap.stop @transitionend="onTransitionEnd">
      <!-- 游客提示 -->
      <view v-if="isGuest" class="guest-tip">
        <view class="guest-tip-content">
          <text class="cuIcon-info text-warning"></text>
          <text class="guest-tip-text">登录后可保存和管理您的记录</text>
        </view>
        <view class="guest-tip-btn" @tap="handleLogin">授权登录</view>
      </view>

      <!-- 快捷操作 -->
      <view class="sidebar-section" style="margin-top: 80rpx;">
        <view class="sidebar-section-title">
          <text class="text-gray text-xs">快捷操作</text>
        </view>
        <view class="sidebar-menu-item" @tap="handleQuickAction('ocr')">
          <text class="cuIcon-scan text-primary"></text>
          <text class="sidebar-menu-text">拍照识别</text>
          <text class="cuIcon-right text-gray text-xs"></text>
        </view>
        <view class="sidebar-menu-item" @tap="handleQuickAction('link')">
          <text class="cuIcon-link text-primary"></text>
          <text class="sidebar-menu-text">导入链接</text>
          <text class="cuIcon-right text-gray text-xs"></text>
        </view>
        <view class="sidebar-menu-item" @tap="handleQuickAction('ai-history')">
          <text class="cuIcon-creativefill text-warning"></text>
          <text class="sidebar-menu-text">AI辅导历史</text>
          <text class="cuIcon-right text-gray text-xs"></text>
        </view>
      </view>

      <!-- 其他 -->
      <view class="sidebar-section">
        <view class="sidebar-section-title">
          <text class="text-gray text-xs">其他</text>
        </view>
        <view class="sidebar-menu-item" @tap="handleNavigate('/subpackage/dictCategory/index')">
          <text class="cuIcon-tagfill text-cyan"></text>
          <text class="sidebar-menu-text">标签管理</text>
          <text class="cuIcon-right text-gray text-xs"></text>
        </view>
        <view class="sidebar-menu-item" @tap="handleNavigate('/subpackage/changelog/index')">
          <text class="cuIcon-newsfill text-blue"></text>
          <text class="sidebar-menu-text">更新日志</text>
          <text class="cuIcon-right text-gray text-xs"></text>
        </view>
        <view class="sidebar-menu-item">
          <button class="sidebar-menu-btn" open-type="contact">
            <text class="cuIcon-btn text-olive"></text>
            <text class="sidebar-menu-text">联系客服</text>
          </button>
          <text class="cuIcon-right text-gray text-xs"></text>
        </view>
      </view>

      <!-- QQ交流群 -->
      <view class="sidebar-qq-group">
        <text class="qq-group-desc">「个人作品，功能建议、Bug 反馈、使用交流都欢迎」</text>
        <text class="qq-group-label">QQ 交流群：</text>
        <text class="qq-group-number" @tap="copyGroupNumber">1092487718</text>
      </view>

      <!-- 版本号 -->
      <view class="sidebar-version">
        <text class="version-text">v{{ appVersion }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'Sidebar',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    isGuest: {
      type: Boolean,
      default: true
    },
    appVersion: {
      type: String,
      default: '1.0.0'
    }
  },
  data() {
    return {
      domVisible: false,
      showPanel: false
    };
  },
  methods: {
    handleClose() {
      this.showPanel = false;
      this.$emit('close');
    },
    /** 动画结束后销毁 DOM */
    onTransitionEnd(e) {
      if (e.propertyName === 'transform' && !this.showPanel) {
        this.domVisible = false;
      }
    },
    handleQuickAction(action) {
      this.$emit('quick-action', action);
      this.$emit('close');
    },
    handleNavigate(url) {
      this.$emit('navigate', url);
      this.$emit('close');
    },
    handleLogin() {
      this.$emit('login');
      this.$emit('close');
    },
    copyGroupNumber() {
      uni.setClipboardData({
        data: '1092487718',
        success: () => {
          uni.showToast({ title: '已复制群号', icon: 'success' });
        }
      });
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.domVisible = true;
        this.$nextTick(() => { this.showPanel = true });
      } else {
        this.showPanel = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-overlay;
  background: $color-bg-mask;
  opacity: 0;
  visibility: hidden;
  transition: opacity $duration-normal $ease-out, visibility $duration-normal $ease-out;

  &--visible {
    opacity: 1;
    visibility: visible;
  }
}

.sidebar {
  position: absolute;
  top: 0;
  left: 0;
  width: $sidebar-width;
  max-width: 290px;
  height: 100%;
  background: $color-bg-sidebar;
  /* #ifndef APP-PLUS-NVUE */
  backdrop-filter: blur(48px);
  -webkit-backdrop-filter: blur(48px);
  /* #endif */
  box-shadow: $shadow-sidebar;
  transform: translateX(-100%);
  transition: transform $duration-normal $ease-out;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  &--visible {
    transform: translateX(0);
  }

  // 游客提示
  .guest-tip {
    margin: $spacing-md $spacing-md 0;
    padding: $spacing-md;
    background: $color-warning-light;
    border-radius: $radius-card;

    .guest-tip-content {
      display: flex;
      align-items: center;
      gap: $spacing-sm;

      .cuIcon-info {
        color: $color-warning;
        font-size: 16px;
      }
    }

    .guest-tip-text {
      flex: 1;
      font-size: 13px;
      color: $color-text-secondary;
      line-height: 1.5;
    }

    .guest-tip-btn {
      margin-top: $spacing-sm;
      align-self: flex-start;
      padding: 6px 16px;
      background: $color-warning;
      color: #fff;
      font-size: 13px;
      font-weight: 500;
      border-radius: $radius-button;
    }
  }

  &-section {
    margin-top: $spacing-lg;
    padding: 0 $spacing-md;

    &-title {
      padding: 0 $spacing-sm;
      margin-bottom: $spacing-sm;
    }
  }

  &-menu-item {
    display: flex;
    align-items: center;
    padding: $spacing-sm $spacing-sm;
    border-radius: $radius-button;
    transition: background $duration-fast;

    &:active {
      background: $color-bg-input;
    }

    .cuIcon-scan,
    .cuIcon-link,
    .cuIcon-creativefill,
    .cuIcon-tagfill,
    .cuIcon-newsfill,
    .cuIcon-btn {
      font-size: 18px;
      width: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sidebar-menu-text {
      flex: 1;
      font-size: 15px;
      color: $color-text-primary;
      margin-left: $spacing-sm;
    }

    .sidebar-menu-btn {
      flex: 1;
      display: flex;
      align-items: center;
      background: none;
      border: none;
      padding: 0;
      font-size: 15px;
      color: inherit;
      margin: 0;
      line-height: 1;
      text-align: left;

      &::after {
        border: none;
      }
    }
  }

  &-qq-group {
    margin: auto $spacing-md $spacing-md;
    padding: $spacing-md;
    background: $color-bg-input;
    border-radius: $radius-card;

    .qq-group-desc {
      font-size: 12px;
      color: $color-text-tertiary;
      display: block;
      margin-bottom: 4px;
    }

    .qq-group-label {
      font-size: 12px;
      color: $color-text-tertiary;
    }

    .qq-group-number {
      font-size: 12px;
      color: $color-primary;
      font-weight: 500;
    }
  }

  &-version {
    padding: $spacing-md 0 $spacing-lg;
    text-align: center;
    border-top: 0.5px solid $color-divider;

    .version-text {
      font-size: 12px;
      color: $color-text-placeholder;
    }
  }
}
</style>
