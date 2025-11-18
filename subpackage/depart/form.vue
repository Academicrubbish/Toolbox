<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-08-01 17:31:22
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2025-11-17 22:38:08
 * @FilePath: \Toolbox\subpackage\depart\form.vue
 * @Description: 记录模块表单页面（简化版）
 * 
-->
<template>
  <view class="form-container">
    <cu-custom bgColor="bg-gradual-blue" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">记录{{ type === 'add' ? '新增' : '修改' }}</block>
    </cu-custom>

    <view class="form-wrapper">
      <!-- 表单卡片 -->
      <view class="form-card shadow-warp">
        <view class="form-header">
          <view class="form-icon">
            <text class="cuIcon-creativefill text-blue"></text>
          </view>
          <view class="form-title">
            <text class="text-lg text-bold">记录信息</text>
            <text class="text-sm text-gray margin-top-xs">填写记录的基本信息</text>
          </view>
        </view>

        <view class="form-body">
          <uni-forms ref="valiForm" :modelValue="formData" :rules="rules" :label-width="0">
            <!-- 标题 -->
            <view class="form-item">
              <view class="form-item-label">
                <text class="text-bold">标题</text>
                <text class="text-red margin-left-xs">*</text>
              </view>
              <view class="form-item-content">
                <uni-easyinput v-model="formData.title" :maxlength="50" placeholder="请输入记录标题" :inputBorder="true"
                  :styles="inputStyles" />
                <view class="char-count">
                  <text class="text-xs text-gray">{{ getTitleLength }}/50</text>
                </view>
              </view>
            </view>

            <!-- 标签选择 -->
            <view class="form-item">
              <view class="form-item-label">
                <text class="text-bold">标签</text>
                <text class="text-gray text-xs margin-left-xs">（可选，可多选）</text>
              </view>
              <view class="form-item-content">
                <view v-if="tagList.length === 0" class="tag-empty-tip">
                  <text class="text-gray text-sm">暂无标签，</text>
                  <text class="text-blue text-sm" @tap="goToTagManage">去创建标签</text>
                </view>
                <view v-else class="tag-select-wrapper">
                  <view v-for="(tag, index) in tagList" :key="tag._id" class="tag-option"
                    :class="isTagSelected(tag._id) ? 'tag-selected' : ''" @tap="toggleTag(tag._id)">
                    <view class="tag-option-badge" :class="tagColorClasses[index % 12]">
                      <text class="tag-option-name">{{ tag.name }}</text>
                    </view>
                    <view v-if="isTagSelected(tag._id)" class="tag-check-icon">
                      <text class="cuIcon-check text-white"></text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <!-- 富文本总结 -->
            <view class="form-item">
              <view class="form-item-label">
                <text class="text-bold">总结</text>
                <text class="text-red margin-left-xs">*</text>
              </view>
              <view class="form-item-content">
                <view class="rich-text-entry" @tap="goSummarize">
                  <view class="rich-text-content">
                    <text v-if="formData.summarizeId" class="text-gray">查看/编辑总结内容</text>
                    <text v-else class="text-gray">点击添加富文本总结</text>
                  </view>
                  <view class="rich-text-icon">
                    <text class="cuIcon-right text-gray"></text>
                  </view>
                </view>
              </view>
            </view>
          </uni-forms>
        </view>
      </view>

      <!-- 提交按钮 -->
      <view class="form-footer">
        <button class="submit-btn bg-gradual-blue shadow-lg" @click="submit('valiForm')">
          <text class="cuIcon-check text-white margin-right-xs"></text>
          <text class="text-white text-bold">提交</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import { addRecord, getRecord, updateRecord } from "@/api/record";
import { getDictCategoryList } from "@/api/dictCategory";
import { tagColorClasses } from "@/utils/tagColors";
import debounce from "lodash/debounce";
import moment from "moment";

export default {
  data() {
    return {
      type: "add",
      recordId: null,
      tagList: [],
      tagColorClasses, // 从公共工具文件导入
      formData: {
        title: '', // 初始化为空字符串，避免显示 undefined
        tags: [],
        summarizeId: '',
        createTime: '', // 用于保存原始创建时间
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
        title: {
          rules: [
            {
              required: true,
              errorMessage: "标题不能为空",
            },
            {
              minLength: 1,
              maxLength: 50,
              errorMessage: "标题长度为1-50个字符",
            },
          ],
        },
      },
    };
  },
  onLoad(option) {
    if (option.type === "update" && option.id) {
      this.type = "update";
      this.recordId = option.id;
      this.loadRecordDetail(option.id);
    }
    this.loadTagList();
  },
  onShow() {
    // 从富文本编辑页面返回时，检查是否有新的 summarizeId
    let summarizeId = this.$store.state.summarize.summarizeId;
    if (summarizeId) {
      // 如果有新的 summarizeId，更新表单数据（新增或编辑都适用）
      this.formData.summarizeId = summarizeId;
      this.$store.dispatch("deleteSummary");
    }
    // 从标签管理页面返回时，刷新标签列表
    this.loadTagList();
  },
  computed: {
    // 获取标题长度（安全处理 null/undefined）
    getTitleLength() {
      const title = this.formData.title;
      if (title === null || title === undefined) {
        return 0;
      }
      return String(title).length;
    },
  },
  methods: {
    // 加载标签列表
    loadTagList() {
      getDictCategoryList()
        .then((res) => {
          console.log("标签列表API返回：", res);
          if (res && res.result) {
            // uniCloud 返回格式：{ result: { data: [...] } }
            const data = res.result.data;
            if (Array.isArray(data)) {
              this.tagList = data;
              console.log("标签列表加载成功，共", data.length, "个标签");
            } else {
              console.warn("标签数据格式不正确：", data);
              this.tagList = [];
            }
          } else {
            console.warn("标签列表返回数据格式异常：", res);
            this.tagList = [];
          }
        })
        .catch((err) => {
          console.error("加载标签列表失败：", err);
          uni.showToast({
            title: "加载标签失败",
            icon: "none",
            duration: 2000,
          });
          this.tagList = [];
        });
    },
    // 加载记录详情
    loadRecordDetail(id) {
      getRecord(id)
        .then((res) => {
          if (res.result && res.result.data && res.result.data.length > 0) {
            let data = res.result.data[0];
            this.formData = {
              title: data.title || "",
              tags: data.tags || [],
              summarizeId: data.summarizeId || "",
              createTime: data.createTime || "", // 保存原始创建时间，用于更新时保留
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
          console.error("加载记录详情失败：", err);
          uni.showToast({
            title: "加载失败",
            icon: "none",
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        });
    },
    // 跳转到标签管理
    goToTagManage() {
      uni.navigateTo({
        url: "/subpackage/dictCategory/index",
      });
    },
    // 跳转到富文本编辑
    goSummarize() {
      uni.navigateTo({
        url: `/subpackage/summarize/index?id=${this.formData.summarizeId || ''}`,
      });
    },
    // 切换标签选择
    toggleTag(tagId) {
      const index = this.formData.tags.indexOf(tagId);
      if (index > -1) {
        // 已选中，取消选择
        this.formData.tags.splice(index, 1);
      } else {
        // 未选中，添加选择
        this.formData.tags.push(tagId);
      }
      // 触发响应式更新
      this.$set(this.formData, 'tags', [...this.formData.tags]);
    },
    // 判断标签是否已选中
    isTagSelected(tagId) {
      return this.formData.tags.indexOf(tagId) > -1;
    },
    // 提交表单
    submit: debounce(function (form) {
      this.$refs[form]
        .validate()
        .then((res) => {
          // 验证富文本是否已填写
          if (!this.formData.summarizeId) {
            uni.showToast({
              title: "请添加总结内容",
              icon: "none",
            });
            return;
          }

          let data = {
            title: (res.title || this.formData.title || '').trim(),
            tags: this.formData.tags || [],
            summarizeId: this.formData.summarizeId,
            createTime: this.type === "add"
              ? moment().format("YYYY-MM-DD HH:mm:ss")
              : this.formData.createTime,
            updateTime: moment().format("YYYY-MM-DD HH:mm:ss"),
            createBy: this.$store.state.user.openid,
          };

          if (this.type === "add") {
            addRecord(data)
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
            updateRecord(this.recordId, data)
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
    background: linear-gradient(135deg, rgba(0, 129, 255, 0.1) 0%, rgba(28, 187, 180, 0.1) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
    
    .cuIcon-creativefill {
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
  }
}

/* 字符计数 */
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

/* 标签选择区域 */
.tag-empty-tip {
  padding: 40rpx 0;
  text-align: center;
  
  .text-blue {
    text-decoration: underline;
  }
}

.tag-select-wrapper {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -8rpx;
}

.tag-option {
  position: relative;
  margin: 0 8rpx 16rpx;
  transition: all 0.3s ease;
  
  &.tag-selected {
    .tag-option-badge {
      transform: scale(1.05);
      box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
    }
    
    .tag-check-icon {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  .tag-option-badge {
    display: inline-block;
    padding: 12rpx 24rpx;
    border-radius: 40rpx;
    font-size: 26rpx;
    font-weight: 500;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    position: relative;
    
    .tag-option-name {
      font-weight: 600;
    }
  }
  
  .tag-check-icon {
    position: absolute;
    top: -8rpx;
    right: -8rpx;
    width: 32rpx;
    height: 32rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #39b54a 0%, #8dc63f 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 8rpx rgba(57, 181, 74, 0.4);
    opacity: 0;
    transform: scale(0);
    transition: all 0.3s ease;
    
    .cuIcon-check {
      font-size: 20rpx;
    }
  }
  
  &:active {
    transform: scale(0.95);
  }
}

/* 富文本入口 */
.rich-text-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #fafafa;
  border: 2rpx solid #e5e5e5;
  border-radius: 16rpx;
  transition: all 0.3s ease;
  
  &:active {
    background: #f0f0f0;
    border-color: #39b54a;
  }
  
  .rich-text-content {
    flex: 1;
    font-size: 28rpx;
  }
  
  .rich-text-icon {
    margin-left: 16rpx;
    font-size: 32rpx;
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
    border-color: #0081ff !important;
    background: #ffffff !important;
    box-shadow: 0 0 0 4rpx rgba(0, 129, 255, 0.1);
  }
}

::v-deep .uni-easyinput__content-input {
  font-size: 28rpx !important;
  color: #333 !important;
  padding: 20rpx 24rpx !important;
  line-height: 1.6 !important;
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