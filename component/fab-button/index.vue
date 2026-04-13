<template>
  <view class="fab-button" @tap="$emit('click')">
    <view class="fab-icon">
      <text class="cuIcon-add"></text>
    </view>
  </view>
</template>

<script>
export default {
  name: "FabButton"
};
</script>

<style lang="scss" scoped>
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
</style>
