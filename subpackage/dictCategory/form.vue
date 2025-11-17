<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-12-XX XX:XX:XX
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2024-12-XX XX:XX:XX
 * @FilePath: \Toolbox\subpackage\dictCategory\form.vue
 * @Description: 标签编辑表单页面
 * 
-->
<template>
  <view class="form-container">
    <cu-custom bgColor="bg-gradual-pink" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">标签{{ type === 'add' ? '新增' : '修改' }}</block>
    </cu-custom>
    
    <view class="form-wrapper">
      <!-- 表单卡片 -->
      <view class="form-card shadow-warp">
        <view class="form-header">
          <view class="form-icon">
            <text class="cuIcon-tagfill text-pink"></text>
          </view>
          <view class="form-title">
            <text class="text-lg text-bold">标签信息</text>
            <text class="text-sm text-gray margin-top-xs">填写标签的基本信息</text>
          </view>
        </view>
        
        <view class="form-body">
          <uni-forms ref="valiForm" :modelValue="formData" :rules="rules" :label-width="0">
            <!-- 标签名称 -->
            <view class="form-item">
              <view class="form-item-label">
                <text class="text-bold">标签名称</text>
                <text class="text-red margin-left-xs">*</text>
              </view>
              <view class="form-item-content">
                <uni-easyinput 
                  v-model="formData.name" 
                  :maxlength="20" 
                  placeholder="请输入标签名称" 
                  :inputBorder="true"
                  :styles="inputStyles"
                />
                <view class="char-count">
                  <text class="text-xs text-gray">{{ (formData.name || '').length }}/20</text>
                </view>
              </view>
            </view>

            <!-- 标签描述 -->
            <view class="form-item">
              <view class="form-item-label">
                <text class="text-bold">标签描述</text>
                <text class="text-gray text-xs margin-left-xs">（可选）</text>
              </view>
              <view class="form-item-content">
                <uni-easyinput 
                  type="textarea" 
                  v-model="formData.description" 
                  :maxlength="100"
                  placeholder="请输入标签描述，帮助更好地理解标签用途" 
                  :inputBorder="true"
                  :autoHeight="true"
                  :styles="inputStyles"
                />
                <view class="char-count">
                  <text class="text-xs text-gray">{{ (formData.description || '').length }}/100</text>
                </view>
              </view>
            </view>
          </uni-forms>
        </view>
      </view>
      
      <!-- 提交按钮 -->
      <view class="form-footer">
        <button class="submit-btn bg-gradual-green shadow-lg" @click="submit('valiForm')">
          <text class="cuIcon-check text-white margin-right-xs"></text>
          <text class="text-white text-bold">提交</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import { addDictCategory, getDictCategory, updateDictCategory } from "@/api/dictCategory";
import debounce from "lodash/debounce";
import moment from "moment";

export default {
  data() {
    return {
      type: "add", // add 或 update
      tagId: null, // 标签ID（用于更新）
      formData: {
        name: null,
        description: null,
      },
      // 输入框样式配置
      inputStyles: {
        borderColor: '#e5e5e5',
        backgroundColor: '#ffffff',
        color: '#333333',
        disableColor: '#f5f5f5'
      },
      // 校验规则
      rules: {
        name: {
          rules: [
            {
              required: true,
              errorMessage: "标签名称不能为空",
            },
            {
              minLength: 1,
              maxLength: 20,
              errorMessage: "标签名称长度为1-20个字符",
            },
          ],
        },
        description: {
          rules: [
            {
              maxLength: 100,
              errorMessage: "标签描述最多100个字符",
            },
          ],
        },
      },
    };
  },
  onLoad(option) {
    if (option.type === "update" && option.id) {
      this.type = "update";
      this.loadTagDetail(option.id);
    }
  },
  methods: {
    // 加载标签详情
    loadTagDetail(id) {
      this.tagId = id;
      getDictCategory(id)
        .then((res) => {
          if (res.result && res.result.data && res.result.data.length > 0) {
            let data = res.result.data[0];
            this.formData = {
              name: data.name || "",
              description: data.description || "",
              createTime: data.createTime || "",
            };
          } else {
            uni.showToast({
              title: "加载失败",
              icon: "none",
            });
            setTimeout(() => {
              uni.navigateBack();
            }, 1500);
          }
        })
        .catch((err) => {
          console.error("加载标签详情失败：", err);
          uni.showToast({
            title: "加载失败",
            icon: "none",
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        });
    },
    // 提交表单
    submit: debounce(function (form) {
      this.$refs[form]
        .validate()
        .then((res) => {
          let data = {
            name: res.name.trim(),
            description: res.description ? res.description.trim() : "",
            createTime: this.type === "add" 
              ? moment().format("YYYY-MM-DD HH:mm:ss") 
              : this.formData.createTime,
            createBy: this.$store.state.user.openid,
          };

          if (this.type === "add") {
            addDictCategory(data)
              .then((res) => {
                if (res.result && (res.result.code === 0 || res.result.code === undefined)) {
                  uni.showToast({
                    title: "添加成功",
                    icon: "success",
                    mask: true,
                  });
                  setTimeout(() => {
                    uni.navigateBack({
                      delta: 1,
                    });
                  }, 1000);
                } else {
                  uni.showToast({
                    title: res.result?.msg || "添加失败",
                    icon: "none",
                  });
                }
              })
              .catch((err) => {
                console.error("添加失败：", err);
                uni.showToast({
                  title: "添加失败",
                  icon: "none",
                });
              });
          } else {
            // 更新时保留原始创建时间
            updateDictCategory(this.tagId, data)
              .then((res) => {
                if (res.result && (res.result.code === 0 || res.result.code === undefined)) {
                  uni.showToast({
                    title: "修改成功",
                    icon: "success",
                    mask: true,
                  });
                  setTimeout(() => {
                    uni.navigateBack({
                      delta: 1,
                    });
                  }, 1000);
                } else {
                  uni.showToast({
                    title: res.result?.msg || "修改失败",
                    icon: "none",
                  });
                }
              })
              .catch((err) => {
                console.error("修改失败：", err);
                uni.showToast({
                  title: "修改失败",
                  icon: "none",
                });
              });
          }
        })
        .catch((err) => {
          console.log("表单错误信息：", err);
        });
    }, 500),
  },
};
</script>

<style lang="scss" scoped>
.form-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f5f7fa 0%, #f1f1f1 100%);
  padding-bottom: 40rpx;
}

.form-wrapper {
  padding: 30rpx;
}

/* 表单卡片 */
.form-card {
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  margin-bottom: 30rpx;
}

/* 表单头部 */
.form-header {
  display: flex;
  align-items: center;
  padding: 40rpx 32rpx 32rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
  
  .form-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 16rpx;
    background: linear-gradient(135deg, rgba(236, 0, 140, 0.1) 0%, rgba(103, 57, 182, 0.1) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
    
    .cuIcon-tagfill {
      font-size: 40rpx;
    }
  }
  
  .form-title {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}

/* 表单主体 */
.form-body {
  padding: 32rpx;
}

/* 表单项 */
.form-item {
  margin-bottom: 40rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .form-item-label {
    display: flex;
    align-items: center;
    margin-bottom: 16rpx;
    font-size: 28rpx;
    color: #333;
  }
  
  .form-item-content {
    position: relative;
    width: 100%;
    
    .char-count {
      position: absolute;
      right: 20rpx;
      bottom: 20rpx;
      z-index: 10;
      background: rgba(255, 255, 255, 0.95);
      padding: 6rpx 12rpx;
      border-radius: 8rpx;
      backdrop-filter: blur(4rpx);
    }
  }
}

/* 输入框样式优化 */
::v-deep .uni-forms-item {
  margin-bottom: 0 !important;
}

::v-deep .uni-forms-item__content {
  display: flex !important;
  align-items: flex-start !important;
  flex-direction: column !important;
}

::v-deep .uni-easyinput {
  width: 100%;
  margin-bottom: 0;
}

::v-deep .uni-easyinput__content {
  border-radius: 16rpx !important;
  border: 2rpx solid #e5e5e5 !important;
  transition: all 0.3s ease;
  background: #fafafa !important;
  
  &:focus-within,
  &.is-focused {
    border-color: #39b54a !important;
    background: #ffffff !important;
    box-shadow: 0 0 0 4rpx rgba(57, 181, 74, 0.1);
  }
}

::v-deep .uni-easyinput__content-input,
::v-deep .uni-easyinput__content-textarea {
  font-size: 28rpx !important;
  color: #333 !important;
  padding: 20rpx 24rpx !important;
  line-height: 1.6 !important;
}

::v-deep .uni-easyinput__content-textarea {
  min-height: 160rpx !important;
  padding-bottom: 50rpx !important;
}

::v-deep .uni-easyinput__placeholder-class {
  color: #999 !important;
  font-size: 28rpx !important;
}

::v-deep .is-input-error-border {
  border-color: #e43d33 !important;
  background: #fff5f5 !important;
}

/* 表单底部 */
.form-footer {
  padding: 0 30rpx;
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  border: none;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
    opacity: 0.9;
  }
  
  &::after {
    border: none;
  }
  
  .cuIcon-check {
    font-size: 36rpx;
  }
}

/* 响应式优化 */
@media screen and (max-width: 750rpx) {
  .form-wrapper {
    padding: 20rpx;
  }
  
  .form-card {
    border-radius: 20rpx;
  }
  
  .form-header {
    padding: 32rpx 24rpx 24rpx;
  }
  
  .form-body {
    padding: 24rpx;
  }
}
</style>

