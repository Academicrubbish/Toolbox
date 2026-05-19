<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-08-26 09:21:50
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2026-05-19 18:04:59
 * @FilePath: \Toolbox\subpackage\summarize\index.vue
 * @Description: md富文本编辑页
 *
-->

<template>
  <view class="summarize">
    <nav-bar title="内容编辑">
      <template #left>
        <view class="nav-actions">
          <view class="nav-more" @tap="handleMoreMenu">
            <text class="cuIcon-moreandroid"></text>
          </view>
          <view class="nav-done-btn" @tap="handleSave">
            <text>完成</text>
          </view>
        </view>
      </template>
    </nav-bar>
    <view :style="contentHeight">
      <md-editor ref="editor" :textareaDataProp="textareaData" @submit="submit" />
    </view>

    <!-- 登录授权弹窗 -->
    <login-modal ref="loginModal" @success="handleLoginSuccess" @cancel="handleLoginCancel" />
  </view>
</template>

<script>
import mdEditor from "../../component/md-editor/index.vue";
import LoginModal from "@/component/login-modal/index.vue";
import {
  addSummarize,
  updateSummarize,
  getSummarize
} from "@/api/summarize";
import loginMixin from "@/utils/login-mixin.js";
import { debounce } from "lodash-es";
import moment from "moment";
import NavBar from "@/component/nav-bar/index.vue";

export default {
  components: {
    mdEditor,
    LoginModal,
    NavBar,
  },
  mixins: [loginMixin],
  data() {
    return {
      summarizeId: '',
      status: "add",
      form: {},
      textareaData: "# 标题",
    };
  },
  mounted() {
    this.setupLoginModal();
  },
  onLoad(option) {
    this.summarizeId = option.id;
    if (option.id) {
      getSummarize(option.id).then(res => {
        if (res.result && res.result.data && res.result.data.length > 0) {
          this.status = "update";
          this.form = res.result.data[0];
          this.textareaData = this.form.content;
        }
      })
    }
    // 检查是否有预填充内容
    const prefill = this.$store.state.summarize.prefillContent
    if (prefill) {
      if (this.textareaData && this.textareaData !== "# 标题") {
        this.textareaData = this.textareaData + "\n\n---\n\n" + prefill
      } else {
        this.textareaData = prefill
      }
      this.$store.dispatch("clearPrefill")
    }
  },
  methods: {
    handleSave() {
      if (this.$refs.editor) {
        this.$refs.editor.submit();
      }
    },
    handleMoreMenu() {
      uni.showActionSheet({
        itemList: ['上传MD文件', '清空内容'],
        success: (res) => {
          if (res.tapIndex === 0 && this.$refs.editor) {
            this.$refs.editor.uploadMdFile();
          } else if (res.tapIndex === 1 && this.$refs.editor) {
            this.$refs.editor.toolBarClick('clear');
          }
        }
      });
    },
    submit: debounce(async function (e) {
      if (!e.textareaData.trim()) {
        uni.showToast({ title: "内容不能为空", icon: "none" });
        return;
      }

      uni.showLoading({ title: "上传中", mask: true });

      const richText = await this.replaceImageUrlsWithCloudPath(e.textareaData);
      const now = moment().format("YYYY-MM-DD HH:mm:ss");
      const isUpdate = this.status === "update";
      const successMsg = isUpdate ? "修改成功" : "添加成功";
      const errorMsg = isUpdate ? "修改失败" : "添加失败";

      if (isUpdate) {
        this.deleteImageFromCloudStorage(this.form.content);
      }

      const form = isUpdate
        ? { content: richText, createTime: this.form.createTime, updateTime: now }
        : { content: richText, createTime: now, updateTime: now };

      const apiCall = isUpdate
        ? updateSummarize(this.form._id, form)
        : addSummarize(form);

      apiCall
        .then((res) => {
          uni.hideLoading();
          if (res.result && (res.result.code === 0 || res.result.code === undefined)) {
            if (!isUpdate) {
              this.$store.dispatch("cacheSummary", { id: res.result.id, status: 'add' });
            }
            uni.showToast({
              title: successMsg,
              icon: "none",
              mask: true,
              success: () => uni.navigateBack({ delta: 1 }),
            });
          }
        })
        .catch((err) => {
          uni.hideLoading();
          if (err?.message === '用户取消登录') return;
          uni.showToast({ title: errorMsg, icon: "none" });
        });
    }, 500),
    // 修改操作删除之前的图片
    deleteImageFromCloudStorage(htmlString) {
      // 正则表达式匹配所有图片的 src 属性
      const regex = /<img.*?src=["'](.*?)["']/g;

      let matches;
      const imageUrls = [];

      // 使用正则表达式进行匹配
      while ((matches = regex.exec(htmlString)) !== null) {
        imageUrls.push(matches[1]);
      }

      if (imageUrls.length) {
        uniCloud.callFunction({
          name: "delImage",
          data: { imgList: imageUrls },
        });
      }
    },
    // 将图片上传至云存储，返回云存储图片地址
    async uploadImageToCloudStorage(src) {
      let res = await uniCloud.uploadFile({
        cloudPath: "cloudstorage/recordImg/" + moment().unix() + '_' + Math.random().toString(36).substr(2, 6) + '.png',
        filePath: src,
        cloudPathAsRealPath: true,
        fileType: "image",
      });
      if (!res || !res.fileID) {
        throw new Error('图片上传失败：未返回 fileID');
      }
      return res.fileID;
    },
    // 判断是否为云存储路径
    isCloudStorageUrl(url) {
      return /cloudstorage|recordImg/i.test(url);
    },
    // 判断是否为本地临时路径
    isLocalTempPath(url) {
      return /^(tmp|wxfile|ttfile)|^https?:\/\/tmp\//i.test(url);
    },
    // 处理富文本中的图片地址，将富文本中的图片地址替换为云存储的路径
    async replaceImageUrlsWithCloudPath(htmlString) {
      // 使用正则表达式匹配所有的img标签
      const imgRegex = /<img[^>]*src="([^"]*)"[^>]*>/g;

      let richText = htmlString;

      // 匹配所有的img标签，并替换其中的临时地址
      let match;
      while ((match = imgRegex.exec(htmlString)) !== null) {
        const imgUrl = match[1];

        // 云存储路径跳过上传
        if (this.isCloudStorageUrl(imgUrl)) {
          continue;
        }

        // 本地临时路径，上传至云存储
        if (this.isLocalTempPath(imgUrl)) {
          const permanentUrl = await this.uploadImageToCloudStorage(imgUrl);
          richText = richText.replace(imgUrl, permanentUrl);
        }
        // 其他情况视为外部图片，不上传，保留原URL
      }

      return richText;
    },
  },
  computed: {
    contentHeight() {
      return `height:calc(100vh - ${this.CustomBar}px)`;
    },
  },
};
</script>
<style lang="scss" scoped>
.summarize {
  height: 100vh;
  background: #FFFFFF;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-done-btn {
  padding: 4px 14px;
  background: $color-primary;
  color: #fff;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;

  text {
    color: #fff;
  }
}

.nav-more {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;

  .cuIcon-moreandroid {
    font-size: 22px;
    color: #8e8e93;
  }
}
</style>
