<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-09-03 16:31:36
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2024-09-23 09:55:54
 * @FilePath: \Toolbox\subpackage\dictCategory\index.vue
 * @Description: 类别管理
 * 
-->
<template>
  <view>
    <cu-custom bgColor="bg-gradual-blue" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">标签管理</block>
    </cu-custom>


    <view class='cate-item padding-sm flex flex-wrap'>
      <view class="padding-xs" v-for="(item, index) in dictList" :key="index">
        <view class='cu-tag' @tap="delDictItem(item)">
          {{ item.name }}
        </view>
      </view>
      <view class="padding-xs">
        <view class="cu-tag" @tap="showModal" data-target="Modal">
          添加
        </view>
      </view>
    </view>


    <view class="cu-modal" :class="modalName == 'Modal' ? 'show' : ''">
      <view class="cu-dialog">
        <view class="cu-bar bg-white justify-end">
          <view class="content">添加新标签</view>
          <view class="action" @tap="hideModal">
            <text class="cuIcon-close text-red"></text>
          </view>
        </view>
        <view class="padding-xl">
          <uni-forms ref="valiForm" label-position="top" :modelValue="formData" :rules="rules">
            <uni-forms-item name="name" label="标签" required>
              <uni-easyinput v-model="formData.name" :maxlength="20" placeholder="请填写标签名称" />
            </uni-forms-item>
            <uni-forms-item name="description" label="简介" required>
              <uni-easyinput type="textarea" v-model="formData.description" placeholder="请输入标签介绍/解释" />
            </uni-forms-item>
          </uni-forms>
          <button type="primary" @click="submit('valiForm')">提交</button>
        </view>
      </view>
    </view>

  </view>
</template>

<script>
import { getDictList, getDict, addDict, delDict } from "@/api/dict.js";
import debounce from "lodash/debounce";
import moment from "moment";
export default {
  data() {
    return {
      dictList: [],
      modalName: '',
      formData: {
        name: '',
        description: '',
      },
      // 校验规则
      rules: {
        name: {
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
  onLoad() {
    this.getDict();
  },
  methods: {
    delDictItem(item) {
      // 只允许删除私有标签
      if (item.isPublicVisible) {
        delDict(item._id).then(res => {
          uni.showToast({
            title: "删除成功",
            icon: "none",
            mask: true,
          });
          this.getDict();
        })
      } else {
        uni.showToast({
          title: '公共标签不允许删除',
          icon: 'none'
        })
      }
    },
    getDict() {
      getDictList().then(res => {
        this.dictList = res.result.data
      })
    },
    submit: debounce(function (form) {
      this.$refs[form]
        .validate()
        .then((res) => {
          let data = {
            name: res.name,
            description: res.description,
            isPublicVisible: true,
            createTime: moment().format("YYYY-MM-DD HH:mm:ss"),
            createBy: this.$store.state.user.openid
          };

          addDict(data).then((res) => {
            if (res.result.code === 0) {
              uni.showToast({
                title: "添加成功",
                icon: "none",
                mask: true,
              });
              this.getDict();
            }
          });
          this.hideModal()
        })
        .catch((err) => {
          console.log("表单错误信息：", err);
        });
    }, 500),
    showModal(e) {
      this.modalName = e.currentTarget.dataset.target
    },
    hideModal(e) {
      this.modalName = null
      this.formData = {
        name: '',
        description: '',
      }
    },
  }
}
</script>

<style>
.cate-item {
  background: #fff;
}

.cu-tag {
  border-radius: 25rpx;
}

.switch-sex::after {
  content: "\e716";
}

.switch-sex::before {
  content: "\e7a9";
}

.switch-music::after {
  content: "\e66a";
}

.switch-music::before {
  content: "\e6db";
}
</style>
