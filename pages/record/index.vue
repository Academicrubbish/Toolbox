<template>
  <view>
    <cu-custom bgColor="bg-gradual-pink" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">表单</block>
    </cu-custom>
    <uni-forms
      ref="form"
      :modelValue="formData"
      :rules="rules"
      :label-width="77"
    >
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
        <uni-easyinput
          v-model="formData.title"
          :maxlength="20"
          placeholder="请填写事件标题"
        />
      </uni-forms-item>

      <uni-forms-item name="summary" label="事件简介" required>
        <uni-easyinput
          type="textarea"
          v-model="formData.summary"
          placeholder="请输入简介"
        />
      </uni-forms-item>

      <uni-forms-item name="completionType" label="完成方式" required>
        <uni-data-checkbox
          v-model="formData.completionType"
          :localdata="completionTypeOptions"
        />
      </uni-forms-item>

      <uni-forms-item name="timeSpent" label="耗时(min)" required>
        <uni-easyinput
          v-model="formData.timeSpent"
          :maxlength="20"
          placeholder="耗时"
        />
      </uni-forms-item>
    </uni-forms>
  </view>
</template>

<script>
import easySelect from "@/component/easy-select/easy-select.vue";
export default {
  components: {
    "easy-select": easySelect,
  },
  data() {
    return {
      recordType: 0, //默认为小学-高中
      recordTypeLabel: "学习", //默认为学习
      recordTypeOptions: [
        { label: "学习", value: 0 },
        { label: "工作", value: 1 },
        { label: "其他", value: 2 },
      ],
      // 单选数据源
      completionTypeOptions: [
        {
          text: "碎片完成",
          value: 0,
        },
        {
          text: "整段完成",
          value: 1,
        },
      ],
      formData: {
        recordType: 0,
        title: null,
        summary: null,
        completionType: null,
        completionPeriod: null,
        completionTime: null,
        timeSpent: null,
      },
    };
  },
  methods: {
    selectRecordType(options) {
      this.recordType = options.value;
      this.recordTypeLabel = options.label;
    },
    radioChange(e) {
      this.form.completionType = Number(e.detail.value);
    },
    TimeChange(e) {
      this.form.completionTime = e.detail.value;
    },
    recordTypePickerChange(e) {
      this.form.recordType = e.detail.value;
    },
  },
};
</script>

<style>
.cu-form-group .title {
  min-width: calc(4em + 15px);
}
</style>