<template>
  <view class="nav-bar" :style="'height:' + customBar + 'px'">
    <view
      class="nav-bar__fixed"
      :class="{ 'nav-bar--android': isAndroid }"
      :style="'padding-top:' + statusBarHeight + 'px'"
    >
      <view class="nav-bar__content" :style="'height:' + (customBar - statusBarHeight) + 'px'">
        <!-- 左侧区域 -->
        <view class="nav-bar__left">
          <slot name="left">
            <view v-if="showMenu" class="nav-bar__menu" @tap="handleMenuClick">
              <text class="iconfont icon-menus"></text>
            </view>
            <view v-if="showBack" class="nav-bar__back" @tap="handleBack">
              <text class="cuIcon-back"></text>
            </view>
          </slot>
        </view>

        <!-- 标题 -->
        <view class="nav-bar__title">
          <slot name="content">{{ title }}</slot>
        </view>

        <!-- 右侧区域 -->
        <view class="nav-bar__right">
          <slot name="right"></slot>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'NavBar',
  props: {
    /** 页面标题 */
    title: {
      type: String,
      default: ''
    },
    /** 是否显示返回按钮 */
    showBack: {
      type: Boolean,
      default: false
    },
    /** 是否显示菜单按钮（首页专用） */
    showMenu: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      statusBarHeight: 0,
      customBar: 44,
      isAndroid: false
    };
  },
  created() {
    const sysInfo = uni.getSystemInfoSync();
    this.statusBarHeight = sysInfo.statusBarHeight || 20;
    this.isAndroid = sysInfo.platform === 'android';

    // #ifdef MP-WEIXIN
    try {
      const menuButton = wx.getMenuButtonBoundingClientRect();
      this.customBar = menuButton.bottom + menuButton.top - this.statusBarHeight;
    } catch (e) {
      this.customBar = this.statusBarHeight + 44;
    }
    // #endif
    // #ifndef MP-WEIXIN
    this.customBar = sysInfo.platform === 'android'
      ? this.statusBarHeight + 50
      : this.statusBarHeight + 45;
    // #endif
  },
  methods: {
    handleBack() {
      uni.navigateBack({ delta: 1 });
      this.$emit('back-click');
    },
    handleMenuClick() {
      this.$emit('menu-click');
    }
  }
};
</script>

<style lang="scss" scoped>
.nav-bar {
  /* 占位层：在文档流中撑开高度，把下方内容挤下来 */

  &__fixed {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: $z-nav;
    @include glass-bg;
    border-bottom: 0.5px solid $color-divider;
  }

  &--android {
    @include glass-bg-android;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  &__content {
    position: relative;
    display: flex;
    align-items: center;
    padding-left: $spacing-md;
    padding-right: $spacing-md;
  }

  &__left {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  &__menu {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $radius-button;
    font-size: 15px;
    color: $color-primary;

    &:active {
      background: $color-primary-light;
    }
  }

  &__back {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $color-primary;
    font-size: 20px;
    border-radius: $radius-button;

    &:active {
      background: $color-primary-light;
    }
  }

  &__title {
    position: absolute;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 17px;
    font-weight: 600;
    color: $color-text-primary;
    pointer-events: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 80px;
  }

  &__right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-shrink: 0;
  }
}
</style>
