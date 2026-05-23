<template>
  <view>
    <!-- 遮罩 -->
    <view class="shade" v-show="showShade" @tap="hide">
      <view class="pop" :style="popStyle" :class="{ show: showPop }">
        <view v-for="btn in menuItems" :key="btn.label" class="pop-item" :class="btn.danger ? 'pop-item--danger' : ''" @tap="onMenuClick(btn.label)">
          <text class="pop-icon" :class="btn.icon"></text>
          <text>{{ btn.label }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: "ContextPopup",
  props: {
    buttons: {
      type: Array,
      default: () => ["编辑", "删除"]
    }
  },
  data() {
    return {
      showShade: false,
      showPop: false,
      popStyle: "",
      currentItem: null
    };
  },
  methods: {
    /**
     * 显示弹窗
     * @param {Event} e - 点击事件
     * @param {*} item - 当前操作的数据项
     */
    show(e, item) {
      const sysInfo = uni.getSystemInfoSync();
      const screenWidth = sysInfo.windowWidth || 375;
      const rawX = e.detail?.x ?? e.touches?.[0]?.clientX ?? 300;
      const rawY = e.detail?.y ?? e.touches?.[0]?.clientY ?? 200;
      const clientX = Math.max(8, Math.min(rawX - 70, screenWidth - 160));
      const clientY = Math.max(8, rawY);

      this.currentItem = item;
      this.popStyle = `top:${clientY}px;left:${clientX}px`;
      this.showShade = true;
      this.$nextTick(() => {
        setTimeout(() => {
          this.showPop = true;
        }, 10);
      });
    },
    /**
     * 隐藏弹窗
     */
    hide() {
      this.showPop = false;
      setTimeout(() => {
        this.showShade = false;
      }, 250);
    },
    onMenuClick(item) {
      this.$emit("select", { action: item, item: this.currentItem });
      this.hide();
    }
  },
  computed: {
    menuItems() {
      const iconMap = {
        '编辑': 'cuIcon-edit',
        '删除': 'cuIcon-delete',
        '分享': 'cuIcon-share',
        '复制': 'cuIcon-copy',
        '收藏': 'cuIcon-favor',
      };
      return this.buttons.map(label => ({
        label,
        icon: iconMap[label] || 'cuIcon-round',
        danger: label === '删除'
      }));
    }
  }
};
</script>

<style lang="scss" scoped>
.shade {
  position: fixed;
  z-index: $z-modal;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: $color-bg-overlay;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  -webkit-touch-callout: none;
  animation: fadeIn $duration-fast $ease-out;

  .pop {
    position: fixed;
    z-index: $z-modal + 1;
    min-width: 140px;
    box-sizing: border-box;
    font-size: 15px;
    text-align: left;
    color: $color-text-primary;
    background-color: $color-bg-card;
    border-radius: $radius-card;
    box-shadow: $shadow-modal;
    overflow: hidden;
    transition: transform $duration-fast $ease-spring;
    user-select: none;
    -webkit-touch-callout: none;
    transform: scale(0, 0);
    transform-origin: center;

    &.show {
      transform: scale(1, 1);
    }

    .pop-item {
      padding: 12px 20px;
      min-height: 44px;
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      user-select: none;
      -webkit-touch-callout: none;
      border-bottom: 0.5px solid $color-divider;

      &:last-child {
        border-bottom: none;
      }

      &:active {
        background: $color-primary-light;
      }

      &--danger {
        color: $color-error;

        .pop-icon {
          color: $color-error;
        }
      }
    }

    .pop-icon {
      font-size: 16px;
      color: $color-text-tertiary;
    }
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
