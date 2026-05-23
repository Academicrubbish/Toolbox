<template>
  <view v-if="domVisible" class="sidebar-overlay" :class="{ 'sidebar-overlay--visible': showPanel }" @tap="handleClose">
    <view class="sidebar" :class="{ 'sidebar--visible': showPanel }" @tap.stop @transitionend="onTransitionEnd">
      <view class="sidebar-scroll">
        <!-- 游客提示 -->
        <view v-if="isGuest" class="guest-tip">
          <text class="cuIcon-info guest-icon"></text>
          <text class="guest-text">登录后可保存和管理您的记录</text>
          <view class="guest-btn" @tap="handleLogin">登录</view>
        </view>

        <!-- 功能 -->
        <view class="sidebar-section">
          <text class="section-label">功能</text>
          <view class="menu-item" @tap="handleNavigate('/subpackage/depart/ai-history')">
            <view class="menu-icon menu-icon--blue">
              <text class="cuIcon-creativefill"></text>
            </view>
            <text class="menu-text">AI辅导历史</text>
            <text class="cuIcon-right menu-arrow"></text>
          </view>
        </view>

        <!-- 管理 -->
        <view class="sidebar-section">
          <text class="section-label">管理</text>
          <view class="menu-item" @tap="handleNavigate('/subpackage/dictCategory/index')">
            <view class="menu-icon menu-icon--orange">
              <text class="cuIcon-tagfill"></text>
            </view>
            <text class="menu-text">标签管理</text>
            <text class="cuIcon-right menu-arrow"></text>
          </view>
          <view class="menu-item" @tap="handleNavigate('/subpackage/changelog/index')">
            <view class="menu-icon menu-icon--green">
              <text class="cuIcon-newsfill"></text>
            </view>
            <text class="menu-text">更新日志</text>
            <text class="cuIcon-right menu-arrow"></text>
          </view>
          <view class="menu-item">
            <button class="menu-btn" open-type="contact">
              <view class="menu-icon menu-icon--indigo">
                <text class="cuIcon-btn"></text>
              </view>
              <text class="menu-text">联系客服</text>
            </button>
            <text class="cuIcon-right menu-arrow"></text>
          </view>
        </view>

        <!-- 社区 -->
        <view class="sidebar-section">
          <text class="section-label">社区</text>
          <view class="menu-item" @tap="copyGroupNumber">
            <view class="menu-icon menu-icon--purple">
              <text class="cuIcon-group_fill"></text>
            </view>
            <text class="menu-text">QQ 交流群</text>
            <text class="menu-arrow-text">1092487718</text>
          </view>
        </view>
      </view>

      <!-- 版本号 -->
      <view class="sidebar-footer">
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
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  /* #endif */
  box-shadow: $shadow-sidebar;
  transform: translateX(-100%);
  transition: transform $duration-normal $ease-out;
  display: flex;
  flex-direction: column;

  &--visible {
    transform: translateX(0);
  }
}

.sidebar-scroll {
  flex: 1;
  overflow-y: auto;
  padding-top: 50px;
  margin-top: constant(safe-area-inset-top);
  margin-top: env(safe-area-inset-top);
}

// 游客提示
.guest-tip {
  margin: $spacing-xl $spacing-md 0;
  padding: $spacing-sm $spacing-md;
  background: $color-primary-light;
  border-radius: $radius-button;
  display: flex;
  align-items: center;
  gap: $spacing-sm;

  .guest-icon {
    font-size: 18px;
    color: $color-primary;
  }

  .guest-text {
    flex: 1;
    font-size: 13px;
    color: $color-text-secondary;
    line-height: 1.4;
  }

  .guest-btn {
    font-size: 12px;
    color: $color-text-inverse;
    background: $color-primary;
    padding: 8px 16px;
    border-radius: $radius-small;
    font-weight: 500;
    white-space: nowrap;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

// 分区
.sidebar-section {
  margin-top: 8px;
}

.section-label {
  display: block;
  padding: 24px 20px 8px;
  font-size: 12px;
  font-weight: 600;
  color: $color-text-tertiary;
  letter-spacing: 0.5px;
}

// 菜单项
.menu-item {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  margin: 0 12px;
  border-radius: $radius-small;
  transition: background $duration-fast;

  &:active {
    background: $color-primary-light;
  }
}

.menu-icon {
  width: 32px;
  height: 32px;
  border-radius: $radius-small;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;

  text {
    font-size: 15px;
  }

  &--blue {
    background: $color-primary-light;
    text { color: $color-primary; }
  }

  &--orange {
    background: $color-warning-light;
    text { color: $color-warning; }
  }

  &--green {
    background: $color-success-light;
    text { color: $color-success; }
  }

  &--indigo {
    background: rgba($color-primary, 0.10);
    text { color: $color-primary; }
  }

  &--purple {
    background: rgba($color-primary, 0.10);
    text { color: $color-primary; }
  }
}

.menu-text {
  flex: 1;
  font-size: 15px;
  color: $color-text-primary;
  margin-left: 14px;
}

.menu-arrow {
  font-size: 12px;
  color: $color-text-placeholder;
}

.menu-arrow-text {
  font-size: 12px;
  color: $color-text-tertiary;
  opacity: 0.6;
  font-weight: 500;
}

// 联系客服按钮（需要 open-type="contact"）
.menu-btn {
  flex: 1;
  display: flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  line-height: 1;
  text-align: left;
  color: $color-text-primary;

  &::after {
    border: none;
  }
}

// 底部
.sidebar-footer {
  padding: 16px 20px;
  padding-bottom: calc(16px + constant(safe-area-inset-bottom));
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  border-top: 0.5px solid $color-divider;
  text-align: center;
}

.version-text {
  font-size: 11px;
  color: $color-text-tertiary;
  opacity: 0.5;
}
</style>
