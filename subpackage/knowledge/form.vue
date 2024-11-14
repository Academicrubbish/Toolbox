<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-08-01 17:31:22
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2024-10-09 17:18:08
 * @FilePath: \Toolbox\subpackage\knowledge\form.vue
 * @Description: 知识点模块表单页面
 * 
-->
<template>
  <view class="record">
    <cu-custom bgColor="bg-gradual-blue" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">知识点{{ type === 'add' ? '新增' : '修改' }}</block>
    </cu-custom>
    <view class="record_content">
      <uni-section title="记录表单" type="line">
        <uni-forms ref="valiForm" :modelValue="formData" :rules="rules" :label-width="78">
          <uni-forms-item name="title" label="知识点" required>
            <uni-easyinput v-model="formData.title" :maxlength="20" placeholder="请填写标题" />
          </uni-forms-item>

          <uni-forms-item name="description" label="简介" required>
            <uni-easyinput type="textarea" v-model="formData.description" placeholder="请输入简介" />
          </uni-forms-item>

          <uni-forms-item name="content" label="内容" required>
            <view style="width: 100%;line-height:18px;" @click="goSummarize()">
              <text>{{ formData.content ? '查看内容' : '添加富文本内容' }}</text>
              <text style="float: right;" class="cuIcon-right text-grey"></text>
            </view>
          </uni-forms-item>

          <uni-forms-item name="categories" label="标签" required>
            <view class="categories-box" @tap="showModal" data-target="bottomModal">
              <view class='cate-item flex flex-wrap'>
                <view class="padding-xs" v-for="(item, index) in formData.categories" :key="index">
                  <view class='cu-tag bg-blue'>
                    {{ dictList.find(obj => obj._id === item).name }}
                  </view>
                </view>
              </view>
            </view>
            <!-- <uni-easyinput type="textarea" v-model="formData.categories" placeholder="请输入标签" /> -->
          </uni-forms-item>
        </uni-forms>
      </uni-section>
      <button type="primary" @click="submit('valiForm')">提交</button>
    </view>

    <view class="cu-modal bottom-modal" :class="modalName == 'bottomModal' ? 'show' : ''">
      <view class="cu-dialog">
        <view class="cu-bar bg-white">
          <view class="content">选择标签</view>
          <view class="action text-blue" @tap="hideModal">取消</view>
        </view>
        <view class="padding-sm" style="height: 70vh;">
          <view class='cate-item padding-sm flex flex-wrap'>
            <view class="padding-xs" v-for="(item, index) in dictList" :key="index">
              <view :class="formData.categories.indexOf(item._id) !== -1 ? 'bg-blue' : ''" class='cu-tag'
                @tap="handleDictItem(item)">
                {{ item.name }}
              </view>
            </view>
            <view class="padding-xs">
              <view class="cu-tag" @tap="showModal" data-target="Modal">
                添加
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import easySelect from "@/component/easy-select/easy-select.vue";
import { addKnowledgePoint, getKnowledgePoint, updateKnowledgePoint } from "@/api/knowledge";
import { getDictList } from "@/api/dict.js";
import debounce from "lodash/debounce";
import moment from "moment";
export default {
  components: {
    "easy-select": easySelect,
  },
  data() {
    return {
      type: "add",//默认为小学-高中
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
        title: null,
        description: null,
        content: '',
        categories: [],
      },
      // 校验规则
      rules: {
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
        categories: {
          rules: [
            {
              required: true,
              errorMessage: "不能为空",
            },
          ],
        },
      },
      dictList: [],
      modalName: ''
    };
  },
  onLoad(option) {
    console.log(option);
    getDictList().then(res => {
      this.dictList = res.result.data
    })
    if (option.type === "update") {
      this.type = "update";
      getKnowledgePoint(option.id).then(res => {
        let data = res.result.data[0];
        this.formData = data;
      });
    }
  },
  onShow() {
    console.log('1111');
    let id = this.$store.state.summarize.summarizeId

    if (id && !this.formData.content) {
      this.formData.content = id;
      this.$store.dispatch("deleteSummary");
    }
  },
  methods: {
    goSummarize() {
      uni.navigateTo({
        url: `/subpackage/summarize/index?id=${this.formData.content}`,
      });
    },
    submit: debounce(function (form) {
      this.$refs[form]
        .validate()
        .then((res) => {
          let data = {
            title: res.title,
            description: res.description,
            content: res.content,
            categories: res.categories,
            createTime: moment().format("YYYY-MM-DD HH:mm:ss"),
            updateTime: moment().format("YYYY-MM-DD HH:mm:ss"),
            createBy: this.$store.state.user.openid,

          };

          if (this.type === "add") {
            addKnowledgePoint(data).then((res) => {
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

            updateKnowledgePoint(this.formData._id, data).then((res) => {
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
    handleDictItem(item) {
      console.log('item', item);

      // 查找 id 是否存在于数组中
      const index = this.formData.categories.indexOf(item._id);

      if (index === -1) {
        // 如果 id 不存在，则添加到数组
        this.formData.categories.push(item._id);
      } else {
        // 如果 id 已存在，则从数组中删除
        this.formData.categories.splice(index, 1);
      }
    },
    showModal(e) {
      this.modalName = e.currentTarget.dataset.target
    },
    hideModal(e) {
      this.modalName = null
    },
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

.categories-box {
  display: flex;
  box-sizing: content-box;
  flex-direction: row;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 6px 6px 6px 10px;
  height: 80px;
  width: 100%;
}

.cu-tag {
  border-radius: 25rpx;
}
</style>