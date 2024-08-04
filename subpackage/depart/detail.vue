<template>
  <view>
    <cu-custom bgColor="bg-gradual-blue" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">记录详情</block>
    </cu-custom>
    <uni-section title="记录信息" type="line">
      <view style="padding: 0 20rpx">
        <view>标题：{{ recordData.title }}</view>
        <view>简介：{{ recordData.summary }}</view>
        <view>{{
          recordData.completionPeriod[0] +
          " ~ " +
          recordData.completionPeriod[1]
        }}</view>
      </view>
    </uni-section>
    <uni-section title="总结" type="line">
      <view class="main-content">
        <view class="ql-container ql-snow" style="border: none">
          <view class="ql-editor">
            <rich-text :nodes="summarizeData.content" />
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
.main-content {
  margin: 0 20rpx;
  padding-bottom: 120rpx;
  background-color: #ffffff;
}
</style>