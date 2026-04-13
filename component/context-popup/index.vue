<template>
  <view>
    <!-- 遮罩 -->
    <view class="shade" v-show="showShade" @tap="hide">
      <view class="pop" :style="popStyle" :class="{ show: showPop }">
        <view v-for="item in buttons" :key="item" @tap="onMenuClick(item)">
          {{ item }}
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
      const clientX = (e.detail?.x ?? e.touches?.[0]?.clientX ?? 300) - 100;
      const clientY = e.detail?.y ?? e.touches?.[0]?.clientY ?? 200;

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
  }
};
</script>

<style lang="scss" scoped>
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

      &:last-child {
        border-bottom: none;
      }
    }
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
