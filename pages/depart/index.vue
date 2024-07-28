<template>
  <view class="depart">
    <cu-custom bgColor="bg-gradual-blue">
      <block slot="content">在路上</block>
    </cu-custom>
    <view class="add">
      <button class="cu-btn cuIcon-add bg-green shadow" @tap="addRecord"></button>
    </view>
    <view class="cu-bar bg-white solid-bottom margin-top">
      <view class="action">
        <text class="cuIcon-title text-orange"></text> 完成日期
      </view>
    </view>
    <view class="cu-list menu sm-border">
      <view class="cu-item">
        <view class="content padding-tb-sm">
          <view>
            <text class="cuIcon-clothesfill text-blue margin-right-xs" />
            标题
          </view>
          <view class="text-gray text-sm">
            <text class="cuIcon-infofill margin-right-xs" />
            简介：小目标还没有实现！
          </view>
        </view>
        <view class="action"> 完成时间 </view>
      </view>
      <view class="cu-item">
        <view class="content padding-tb-sm">
          <view>
            <text class="cuIcon-clothesfill text-blue margin-right-xs" />
            标题
          </view>
          <view class="text-gray text-sm">
            <text class="cuIcon-infofill margin-right-xs" />
            简介：小目标还没有实现！
          </view>
        </view>
        <view class="action"> 完成时间 </view>
      </view>
      <view class="cu-item">
        <view class="content padding-tb-sm">
          <view>
            <text class="cuIcon-clothesfill text-blue margin-right-xs" />
            标题
          </view>
          <view class="text-gray text-sm">
            <text class="cuIcon-infofill margin-right-xs" />
            简介：小目标还没有实现！
          </view>
        </view>
        <view class="action"> 完成时间 </view>
      </view>
    </view>
    <view class="cu-bar bg-white solid-bottom margin-top">
      <view class="action">
        <text class="cuIcon-title text-orange"></text> 完成日期
      </view>
    </view>
    <view class="cu-list menu sm-border">
      <view class="cu-item">
        <view class="content padding-tb-sm">
          <view>
            <text class="cuIcon-clothesfill text-blue margin-right-xs" />
            标题
          </view>
          <view class="text-gray text-sm">
            <text class="cuIcon-infofill margin-right-xs" />
            简介：小目标还没有实现！
          </view>
        </view>
        <view class="action"> 完成时间 </view>
      </view>
      <view class="cu-item">
        <view class="content padding-tb-sm">
          <view>
            <text class="cuIcon-clothesfill text-blue margin-right-xs" />
            标题
          </view>
          <view class="text-gray text-sm">
            <text class="cuIcon-infofill margin-right-xs" />
            简介：小目标还没有实现！
          </view>
        </view>
        <view class="action"> 完成时间 </view>
      </view>

    </view>
  </view>
</template>
<script>
export default {
  methods: {
    addRecord() {
      uni.navigateTo({
        url: "/pages/record/index",
      });
    }
  }
}
</script>
<style>
.depart {
  position: relative;
  height: 100%;
}

.add {
  position: fixed;
  bottom: 20px;
  right: 20px;
}
</style>