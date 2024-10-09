<template>
  <view style="height: 100vh; background-color: #fff">
    <cu-custom bgColor="bg-gradual-blue" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">知识点</block>
    </cu-custom>
    <uni-section :title="detailData.title" type="line">
      <view class="record-info">

        <view class="item">
          <text class="cuIcon-commentfill text-green">简介：</text>
          <text class="text-grey">{{ detailData.description }}</text>
        </view>

        <towxml :nodes="towxmlData" />
      </view>
    </uni-section>
  </view>
</template>
<script>
import { getKnowledgePoint } from "@/api/knowledge";
import { getSummarize } from "@/api/summarize";
export default {
  data() {
    return {
      detailData: null,
      towxmlData: "",
    };
  },
  async onLoad(option) {
    try {
      // 获取详情数据
      const recordRes = await getKnowledgePoint(option.id);
      this.detailData = recordRes.result.data[0];

      // 根据总结ID查询并汇总信息
      const summarizeRes = await getSummarize(this.detailData.content);

      // 检查查询结果并更新汇总数据
      if (summarizeRes.result.data.length > 0) {
        let summarizeData = summarizeRes.result.data[0];
        this.towxmlData = this.towxml(summarizeData.content, "markdown", {
          // theme: "dark",
          events: {
            tap: (e) => {
              console.log("tap", e);
            },
          },
        });
      } else {
        // 表示没有找到汇总数据
        this.towxmlData = this.towxml("", "markdown");
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