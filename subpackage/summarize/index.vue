<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-08-26 09:21:50
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2024-10-09 15:51:49
 * @FilePath: \Toolbox\subpackage\summarize\index.vue
 * @Description: md富文本编辑页
 * 
-->

<template>
  <view class="summarize">
    <cu-custom bgColor="bg-gradual-blue" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">
        {{ status == "add" ? "新增总结" : "修改总结" }}
      </block>
    </cu-custom>
    <view :style="contentHeight">
      <md-editor :textareaDataProp="textareaData" @submit="submit" />
    </view>
  </view>
</template>

<script>
import mdEditor from "../../component/md-editor/index.vue";
import {
  addSummarize,
  updateSummarize,
  getSummarize
} from "@/api/summarize";
import debounce from "lodash/debounce";
import moment from "moment";
export default {
  components: {
    mdEditor,
  },
  data() {
    return {
      summarizeId: '',
      status: "add",
      form: {},
      textareaData: "# 标题",
    };
  },
  onLoad(option) {
    console.log('111', option);
    this.summarizeId = option.id;
    // 修改操作
    if (option.id) {
      let _this = this;
      getSummarize(option.id).then(res => {
        console.log("res", res);
        if (res.result.data.length > 0) {
          this.status = "update";
          this.form = res.result.data[0];
          this.$nextTick(() => {
            _this.textareaData = this.form.content;
          });
        }
      })
    }
  },
  methods: {
    submit: debounce(async function (e) {
      let _this = this;
      uni.showLoading({
        title: "上传中",
        mask: true,
      });
      // 将富文本中的图片地址替换为云存储的路径
      let richText = await _this.replaceImageUrlsWithCloudPath(e.textareaData);

      if (e.textareaData.trim()) {
        if (this.status === "update") {
          // 修改操作，删除云存储中图片，重新添加
          _this.deleteImageFromCloudStorage(_this.form.content);

          let form = {
            content: richText,
            createTime: _this.form.createTime,
            updateTime: moment().format("YYYY-MM-DD HH:mm:ss"),
          };

          updateSummarize(_this.form._id, form)
            .then((res) => {
              if (res.result.code === 0) {
                uni.showToast({
                  title: "修改成功",
                  icon: "none",
                  mask: true,
                  success: () => {
                    uni.navigateBack({
                      delta: 1,
                    });
                  }
                });
              }
            })
            .catch((err) => {
              uni.showToast({
                title: "修改失败",
                icon: "none",
              });
            });

        } else {

          let form = {
            content: richText,
            createTime: moment().format("YYYY-MM-DD HH:mm:ss"),
            updateTime: moment().format("YYYY-MM-DD HH:mm:ss"),
          };

          addSummarize(form)
            .then((res) => {
              if (res.result.code === 0) {
                // 添加成功后，将总结id缓存到store
                _this.$store.dispatch("cacheSummary", {
                  id: res.result.id,
                  status: 'add'
                });
                uni.showToast({
                  title: "添加成功",
                  icon: "none",
                  mask: true,
                  success: () => {
                    uni.navigateBack({
                      delta: 1,
                    });
                  }
                });
              }
            })
            .catch((err) => {
              uni.showToast({
                title: "添加失败",
                icon: "none",
              });
            });
        }

      } else {

        uni.showToast({
          title: "内容不能为空",
          icon: "none",
        });

      }
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
      console.log("222", imageUrls);

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
        cloudPath: "cloudstorage/recordImg/" + moment().unix() + ".png", // 上传至云端的路径
        filePath: src, // 小程序临时文件路径
        cloudPathAsRealPath: true,
        fileType: "image",
      });
      return res.fileID;
    },
    // 处理富文本中的图片地址，将富文本中的图片地址替换为云存储的路径
    async replaceImageUrlsWithCloudPath(htmlString) {
      // 使用正则表达式匹配所有的img标签
      const imgRegex = /<img[^>]*src="([^"]*)"[^>]*>/g;

      let richText = htmlString;

      // 匹配所有的img标签，并替换其中的临时地址
      let match;
      while ((match = imgRegex.exec(htmlString)) !== null) {
        const imgTag = match[0]; // 完整的img标签
        const imgUrl = match[1]; // 图片的临时地址

        console.log("111", imgUrl);

        // 调用上传图片方法，获取永久地址
        const permanentUrl = await this.uploadImageToCloudStorage(imgUrl);

        // 替换临时地址为永久地址
        richText = richText.replace(imgUrl, permanentUrl);
      }

      return richText;
    },
  },
  computed: {
    contentHeight() {
      var CustomBar = this.CustomBar;
      var style = `height:calc(100vh - ${CustomBar}px)`;
      return style;
    },
  },
};
</script>
<style>
.summarize {
  height: 100vh;
}
</style>