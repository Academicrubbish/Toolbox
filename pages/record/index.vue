<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-08-01 17:31:22
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2024-08-01 18:01:43
 * @FilePath: \Toolbox\pages\record\index.vue
 * @Description: 
 * 
 * Copyright (c) 2024 by 坤智数联科技(宁波), All Rights Reserved. 
-->
<template>
  <view>
    <cu-custom bgcolor="bg-gradual-pink" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">表单</block>
    </cu-custom>
    <view style="padding: 0 20rpx;">
      <uni-forms ref="form" :modelValue="formData" :rules="rules" :label-width="78">
        <uni-forms-item name="recordType" label="记录类型" required>
          <easy-select
            ref="easySelect"
            size="small"
            :value="recordTypeLabel"
            @selectOne="selectRecordType"
            :options="recordTypeOptions"
          />
        </uni-forms-item>
        <uni-forms-item name="title" label="标题" required>
          <uni-easyinput v-model="formData.title" :maxlength="20" placeholder="请填写事件标题" />
        </uni-forms-item>

        <uni-forms-item name="summary" label="事件简介" required>
          <uni-easyinput type="textarea" v-model="formData.summary" placeholder="请输入简介" />
        </uni-forms-item>

        <uni-forms-item name="completionType" label="完成方式" required>
          <uni-data-checkbox v-model="formData.completionType" :localdata="completionTypeOptions" />
        </uni-forms-item>

        <uni-forms-item name="completionPeriodStart" label="开始时间" required>
          <uni-datetime-picker type="datetime" v-model="formData.completionPeriodStart" />
        </uni-forms-item>

        <uni-forms-item name="completionPeriodEnd" label="结束时间" required>
          <uni-datetime-picker type="datetime" v-model="formData.completionPeriodEnd" />
        </uni-forms-item>

        <uni-forms-item name="timeSpent" label="耗时(min)" required>
          <uni-easyinput v-model="formData.timeSpent" :maxlength="20" placeholder="耗时" />
        </uni-forms-item>
      </uni-forms>
    </view>
  </view>
</template>

<script>
import easySelect from "@/component/easy-select/easy-select.vue";
export default {
  components: {
    "easy-select": easySelect
  },
  data() {
    return {
      recordType: 0, //默认为小学-高中
      recordTypeLabel: "学习", //默认为学习
      recordTypeOptions: [
        { label: "学习", value: 0 },
        { label: "工作", value: 1 },
        { label: "其他", value: 2 }
      ],
      // 单选数据源
      completionTypeOptions: [
        {
          text: "碎片完成",
          value: 0
        },
        {
          text: "整段完成",
          value: 1
        }
      ],
      formData: {
        recordType: 0,
        title: null,
        summary: null,
        completionType: null,
        completionPeriod: null,
        completionPeriodStart: null,
        completionPeriodEnd: null,
        completionTime: null,
        timeSpent: null
      }
    };
  },
  methods: {
    selectRecordType(options) {
      this.recordType = options.value;
      this.recordTypeLabel = options.label;
    },
    submit(form) {
			this.$refs.form.validate().then(res=>{
				console.log('表单数据信息：', res);
			}).catch(err =>{
				console.log('表单错误信息：', err);
			})
		}
  }
};
</script>

<style scoped>
.uni-forms-item__content {
  display: flex !important;
  align-items: center !important;
}
</style>