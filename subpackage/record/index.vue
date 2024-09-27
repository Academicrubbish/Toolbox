<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-08-01 17:31:22
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2024-09-27 13:32:45
 * @FilePath: \Toolbox\subpackage\record\index.vue
 * @Description: record
 * 
 * Copyright (c) 2024 by 坤智数联科技(宁波), All Rights Reserved. 
-->
<template>
  <view class="record">
    <cu-custom bgColor="bg-gradual-blue" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">表单</block>
    </cu-custom>
    <view class="record_content">
      <uni-section title="记录表单" type="line">
        <uni-forms ref="valiForm" :modelValue="formData" :rules="rules" :label-width="78">
          <uni-forms-item name="recordType" label="记录类型" required>
            <easy-select ref="easySelect" size="small" :value="recordTypeLabel" @selectOne="selectRecordType"
              :options="recordTypeOptions" />
          </uni-forms-item>
          <uni-forms-item name="title" label="标题" required>
            <uni-easyinput v-model="formData.title" :maxlength="20" placeholder="请填写事件标题" />
          </uni-forms-item>

          <uni-forms-item name="summary" label="事件简介" required>
            <uni-easyinput type="textarea" v-model="formData.summary" placeholder="请输入简介" />
          </uni-forms-item>

          <uni-forms-item name="summarizeId" label="总结" required>
            <view style="width: 100%;line-height:18px;" @click="goSummarize()">
              <text>{{ formData.summarizeId ? '查看总结' : '添加富文本总结' }}</text>
              <text style="float: right;" class="cuIcon-right text-grey"></text>
            </view>
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
      </uni-section>
      <button type="primary" @click="submit('valiForm')">提交</button>
    </view>
  </view>
</template>

<script>
import easySelect from "@/component/easy-select/easy-select.vue";
import { addRecord, getRecord, updateRecord } from "@/api/record";
import debounce from "lodash/debounce";
import moment from "moment";
export default {
  components: {
    "easy-select": easySelect,
  },
  data() {
    return {
      type: "add",
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
        summarizeId: '',
        completionType: null,
        completionPeriod: null,
        completionPeriodStart: null,
        completionPeriodEnd: null,
        timeSpent: null,
      },
      // 校验规则
      rules: {
        recordType: {
          rules: [
            {
              required: true,
              errorMessage: "不能为空",
            },
          ],
        },
        title: {
          rules: [
            {
              required: true,
              errorMessage: "不能为空",
            },
          ],
        },
        summary: {
          rules: [
            {
              required: true,
              errorMessage: "不能为空",
            },
          ],
        },
        completionType: {
          rules: [
            {
              required: true,
              errorMessage: "不能为空",
            },
          ],
        },
        completionPeriodStart: {
          rules: [
            {
              required: true,
              errorMessage: "不能为空",
            },
          ],
        },
        completionPeriodEnd: {
          rules: [
            {
              required: true,
              errorMessage: "不能为空",
            },
          ],
        },
        timeSpent: {
          rules: [
            {
              required: true,
              errorMessage: "不能为空",
            },
          ],
        },
      },
    };
  },
  onLoad(option) {
    console.log(option);
    if (option.type === "update") {
      this.type = "update";
      getRecord(option.id).then((res) => {
        let data = res.result.data[0];
        this.formData = data;
        this.formData.completionPeriodStart = data.completionPeriod[0];
        this.formData.completionPeriodEnd = data.completionPeriod[1];
      });
    }
  },
  onShow() {
    console.log('1111');
    let id = this.$store.state.summarize.summarizeId

    if (id && !this.formData.summarizeId) {
      this.formData.summarizeId = id;
      this.$store.dispatch("deleteSummary");
    }
  },
  methods: {
    goSummarize() {
      uni.navigateTo({
        url: `/subpackage/summarize/index?id=${this.formData.summarizeId}`,
      });
    },
    selectRecordType(options) {
      this.recordType = options.value;
      this.recordTypeLabel = options.label;
    },
    submit: debounce(function (form) {
      this.$refs[form]
        .validate()
        .then((res) => {
          let data = {
            recordType: res.recordType,
            title: res.title,
            summary: res.summary,
            completionType: res.completionType,
            completionPeriod: [
              res.completionPeriodStart,
              res.completionPeriodEnd,
            ],
            timeSpent: Number(res.timeSpent),
            createTime: moment().format("YYYY-MM-DD HH:mm:ss"),
            updateTime: moment().format("YYYY-MM-DD HH:mm:ss"),
            createBy: this.$store.state.user.openid,
            summarizeId: res.summarizeId
          };

          if (this.type === "add") {
            addRecord(data).then((res) => {
              if (res.result.code === 0) {
                uni.showToast({
                  title: "添加成功",
                  icon: "none",
                  mask: true,
                });
                setTimeout(() => {
                  uni.navigateBack({
                    delta: 1,
                  });
                }, 1000);
              }
            });
          } else {
            data.createTime = this.formData.createTime;
            console.log('213', data);

            updateRecord(this.formData._id, data).then((res) => {
              if (res.result.code === 0) {
                uni.showToast({
                  title: "修改成功",
                  icon: "none",
                  mask: true,
                });
                setTimeout(() => {
                  uni.navigateBack({
                    delta: 1,
                  });
                }, 1000);
              }
            });
          }
        })
        .catch((err) => {
          console.log("表单错误信息：", err);
        });
    }, 500),
    calculateTimeSpent() {
      const start = moment(this.formData.completionPeriodStart);
      const end = moment(this.formData.completionPeriodEnd);

      if (start.isValid() && end.isValid()) {
        const duration = moment.duration(end.diff(start));
        const minutes = duration.asMinutes();
        this.formData.timeSpent = minutes.toFixed(2); // 设置耗时，保留两位小数
      } else {
        this.formData.timeSpent = ""; // 如果开始时间或结束时间无效，清空耗时字段
      }
    },
  },
  watch: {
    "formData.completionPeriodStart": "calculateTimeSpent",
    "formData.completionPeriodEnd": "calculateTimeSpent",
  },
};
</script>

<style lang="scss" scoped>
::v-deep .uni-forms-item__content {
  display: flex !important;
  align-items: center !important;
}

.record {
  height: 100vh;
  overflow: auto;
  background-color: #fff;
}

::v-deep .uni-section-header {
  padding: 12px 0 !important;
}

.record_content {
  padding: 0 20rpx;
}
</style>