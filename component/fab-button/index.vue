<template>
  <view class="fab-button" role="button" aria-label="新建记录" @tap="$emit('click')">
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
  bottom: $spacing-xl;
  right: $spacing-xl;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: $color-primary;
  box-shadow: $shadow-fab;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-fab;
  transition: transform $duration-fast $ease-out;

  &:active {
    transform: scale(0.95);
  }

  .fab-icon {
    color: $color-text-inverse;
    font-size: 28px;
    font-weight: 300;
  }
}
</style>
