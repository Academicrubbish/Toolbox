<template>
  <view style="height: 100vh; background-color: #fff">
    <cu-custom bgColor="bg-gradual-blue" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">记录详情</block>
    </cu-custom>
    <uni-section :title="recordData.title" type="line">
      <template v-slot:right>
        <view
          v-if="recordData.recordType === 1"
          class="cu-tag round bg-orange light"
          >工作</view
        >
        <view
          v-if="recordData.recordType === 0"
          class="cu-tag round bg-olive light"
          >学习</view
        >
        <view
          v-if="recordData.recordType === 2"
          class="cu-tag round bg-blue light"
          >其他</view
        >
      </template>
      <view class="record-info">
        <view class="item">
          <text class="cuIcon-timefill text-olive">时间：</text>
          <text class="text-grey"
            >{{
              recordData.completionPeriod[0] +
              " ~ " +
              recordData.completionPeriod[1]
            }}
          </text>
        </view>
        <view class="item">
          <text class="cuIcon-commentfill text-green">简介：</text>
          <text class="text-grey">{{ recordData.summary }}</text>
        </view>
        <view class="item">
          <text class="cuIcon-countdownfill text-cyan">耗时：</text>
          <text class="text-grey">{{ recordData.timeSpent }}min</text>
        </view>
        <view
          class="ql-container ql-snow"
          style="border: none; margin-top: 30rpx"
        >
          <view class="ql-editor">
            <rich-text class="text-lg" :nodes="summarizeData.content" />
          </view>
        </view>
      </view>
    </uni-section>
  </view>
</template>
<script>
import { getRecord } from "@/api/record";
import { summarizeRecordInfoById } from "@/api/summarize";
import "@/static/editor/quill.bubble.css";
import "@/static/editor/quill.core.css";
import "@/static/editor/quill.snow.css";
export default {
  data() {
    return {
      recordData: null,
      summarizeData: null,
    };
  },
  async onLoad(option) {
    try {
      // 获取记录数据
      const recordRes = await getRecord(option.id);
      this.recordData = recordRes.result.data[0];

      // 根据记录ID查询并汇总信息
      const summarizeRes = await summarizeRecordInfoById(this.recordData._id);

      // 检查查询结果并更新汇总数据
      if (summarizeRes.result.data.length > 0) {
        this.summarizeData = summarizeRes.result.data[0];
      } else {
        this.summarizeData = null; // 或者其他处理方式，表示没有找到汇总数据
      }
    } catch (error) {
      console.error("Error in onLoad:", error);
      // 处理错误，可以根据实际情况进行适当的处理，例如提示用户或者进行其他操作
      uni.showToast({
        title: "出现问题啦，请稍后重试",
        icon: "none",
      });
    }
  },
};
</script>

<style>
.uni-section-header__decoration {
  height: 18px !important;
}
.uni-section-header__content {
  font-size: 16px !important;
  font-weight: bold !important;
}
.record-info {
  padding: 0 20rpx;
  font-size: 28rpx;
}
.record-info .item {
  line-height: 50rpx;
}
</style>