<template>
  <view class="record">
    <cu-custom bgColor="bg-gradual-blue" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">表单</block>
    </cu-custom>
    <view class="record_content">
      <uni-section title="记录表单" type="line">
        <uni-forms
          ref="valiForm"
          :modelValue="formData"
          :rules="rules"
          :label-width="78"
        >
          <uni-forms-item name="title" label="标题" required>
            <uni-easyinput
              v-model="formData.title"
              :maxlength="20"
              placeholder="请填写知识点标题"
            />
          </uni-forms-item>

          <uni-forms-item name="description" label="知识点描述" required>
            <uni-easyinput
              type="textarea"
              v-model="formData.description"
              placeholder="请输入简介"
            />
          </uni-forms-item>

          <uni-forms-item name="content" label="知识点内容" required>
            
            <!-- 富文本组件 -->

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
        description: null,
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
        description: {
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
  methods: {
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
            description: res.description,
            completionType: res.completionType,
            completionPeriod: [
              res.completionPeriodStart,
              res.completionPeriodEnd,
            ],
            timeSpent: Number(res.timeSpent),
            createTime: moment().format("YYYY-MM-DD HH:mm:ss"),
            updateTime: moment().format("YYYY-MM-DD HH:mm:ss"),
            createBy: this.$store.state.user.openid,
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