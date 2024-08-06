<template>
  <view class="container">
    <cu-custom bgColor="bg-gradual-blue" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">{{ status == 'add' ? '新增总结' : '修改总结' }}</block>
    </cu-custom>
    <view class="toolbar" @tap="format">
      <view :class="formats.bold ? 'ql-active' : ''" class="iconfont icon-zitijiacu" data-name="bold"></view>
      <view :class="formats.italic ? 'ql-active' : ''" class="iconfont icon-zitixieti" data-name="italic"></view>
      <view :class="formats.underline ? 'ql-active' : ''" class="iconfont icon-zitixiahuaxian" data-name="underline">
      </view>
      <view :class="formats.strike ? 'ql-active' : ''" class="iconfont icon-zitishanchuxian" data-name="strike"></view>
      <!-- #ifndef MP-BAIDU -->
      <view :class="formats.align === 'left' ? 'ql-active' : ''" class="iconfont icon-zuoduiqi" data-name="align"
        data-value="left"></view>
      <!-- #endif -->
      <view :class="formats.align === 'center' ? 'ql-active' : ''" class="iconfont icon-juzhongduiqi" data-name="align"
        data-value="center"></view>
      <view :class="formats.align === 'right' ? 'ql-active' : ''" class="iconfont icon-youduiqi" data-name="align"
        data-value="right"></view>
      <view :class="formats.align === 'justify' ? 'ql-active' : ''" class="iconfont icon-zuoyouduiqi" data-name="align"
        data-value="justify"></view>
      <!-- #ifndef MP-BAIDU -->
      <view :class="formats.lineHeight ? 'ql-active' : ''" class="iconfont icon-line-height" data-name="lineHeight"
        data-value="2"></view>
      <view :class="formats.letterSpacing ? 'ql-active' : ''" class="iconfont icon-Character-Spacing"
        data-name="letterSpacing" data-value="2em"></view>
      <view :class="formats.marginTop ? 'ql-active' : ''" class="iconfont icon-722bianjiqi_duanqianju"
        data-name="marginTop" data-value="20px"></view>
      <view :class="formats.marginBottom ? 'ql-active' : ''" class="iconfont icon-723bianjiqi_duanhouju"
        data-name="marginBottom" data-value="20px"></view>
      <!-- #endif -->

      <view class="iconfont icon-clearedformat" @tap="removeFormat"></view>

      <!-- #ifndef MP-BAIDU -->
      <view :class="formats.fontFamily ? 'ql-active' : ''" class="iconfont icon-font" data-name="fontFamily"
        data-value="Pacifico"></view>
      <view :class="formats.fontSize === '24px' ? 'ql-active' : ''" class="iconfont icon-fontsize" data-name="fontSize"
        data-value="24px"></view>
      <!-- #endif -->
      <view :class="formats.color === '#0000ff' ? 'ql-active' : ''" class="iconfont icon-text_color" data-name="color"
        data-value="#0000ff"></view>
      <view :class="formats.backgroundColor === '#00ff00' ? 'ql-active' : ''" class="iconfont icon-fontbgcolor"
        data-name="backgroundColor" data-value="#00ff00"></view>
      <view class="iconfont icon-date" @tap="insertDate"></view>
      <view class="iconfont icon--checklist" data-name="list" data-value="check"></view>
      <view :class="formats.list === 'ordered' ? 'ql-active' : ''" class="iconfont icon-youxupailie" data-name="list"
        data-value="ordered"></view>
      <view :class="formats.list === 'bullet' ? 'ql-active' : ''" class="iconfont icon-wuxupailie" data-name="list"
        data-value="bullet"></view>

      <view class="iconfont icon-undo" @tap="undo"></view>
      <view class="iconfont icon-redo" @tap="redo"></view>

      <view class="iconfont icon-outdent" data-name="indent" data-value="-1"></view>
      <view class="iconfont icon-indent" data-name="indent" data-value="+1"></view>
      <view class="iconfont icon-fengexian" @tap="insertDivider"></view>
      <view class="iconfont icon-charutupian" @tap="insertImage"></view>
      <view :class="formats.header === 1 ? 'ql-active' : ''" class="iconfont icon-format-header-1" data-name="header"
        :data-value="1"></view>
      <view :class="formats.script === 'sub' ? 'ql-active' : ''" class="iconfont icon-zitixiabiao" data-name="script"
        data-value="sub"></view>
      <view :class="formats.script === 'super' ? 'ql-active' : ''" class="iconfont icon-zitishangbiao"
        data-name="script" data-value="super"></view>

      <view class="iconfont icon-shanchu" @tap="clear"></view>

      <view :class="formats.direction === 'rtl' ? 'ql-active' : ''" class="iconfont icon-direction-rtl"
        data-name="direction" data-value="rtl"></view>
    </view>

    <view class="editor-wrapper" :style="[{ height: 'calc(100vh - 290rpx - ' + CustomBar + 'px)' }]">
      <editor id="editor" class="ql-container" placeholder="正文内容..." show-img-size show-img-toolbar show-img-resize
        @statuschange="onStatusChange" :read-only="readOnly" @ready="onEditorReady" />
    </view>

    <!-- 新增记录 -->
    <view class="submit">
      <button class="cu-btn cuIcon-upload bg-green shadow" @tap="submitContent">
        保存
      </button>
    </view>
  </view>
</template>
<script>
import {
  summarizeRecordInfoById,
  addSummarize,
  updateSummarize,
} from "@/api/summarize";
import debounce from "lodash/debounce";
import moment from "moment";
export default {
  data() {
    return {
      recordId: null,
      CustomBar: this.CustomBar,
      readOnly: false,
      formats: {},
      status: "add",
      form: {},
    };
  },
  onLoad(option) {
    this.recordId = option.recordId;
    summarizeRecordInfoById(option.recordId).then((res) => {
      if (res.result.data.length > 0) {
        this.status = "update";
        this.form = res.result.data[0];
        this.$nextTick(() => {
          this.editorCtx.setContents({
            html: this.form.content,
          });
        });
      }
    });
  },
  methods: {
    deleteImg(htmlString) {
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
          name: 'delImage',
          data: { imgList: imageUrls }
        })
      }
    },
    // 图片上传方法
    async uploadImg(src) {
      let res = await uniCloud.uploadFile({
        cloudPath: 'cloudstorage/recordImg/' + moment().unix() + '.png', // 上传至云端的路径
        filePath: src, // 小程序临时文件路径
        cloudPathAsRealPath: true,
        fileType: 'image'
      })
      console.log('img', res);
      return res.fileID
    },
    // 处理富文本中的图片地址，将富文本中的图片地址替换为云存储的路径
    async handleImg(htmlString) {
      // 使用正则表达式匹配所有的img标签
      const imgRegex = /<img[^>]*src="([^"]*)"[^>]*>/g;

      let richText = htmlString;

      // 匹配所有的img标签，并替换其中的临时地址
      let match;
      while ((match = imgRegex.exec(htmlString)) !== null) {
        const imgTag = match[0]; // 完整的img标签
        const imgUrl = match[1]; // 图片的临时地址

        // 调用上传图片方法，获取永久地址
        const permanentUrl = await this.uploadImg(imgUrl);

        // 替换临时地址为永久地址
        richText = richText.replace(imgUrl, permanentUrl);
      }

      return richText;
    },
    submitContent: debounce(function () {
      let _this = this;
      uni.showLoading({
        title: "上传中",
        mask: true,
      })
      this.editorCtx.getContents({
        success: async function (data) {
          console.log('上传信息', data);

          // 将富文本中的图片地址替换为云存储的路径
          let richText = await _this.handleImg(data.html);

          if (data.text.trim()) {

            if (_this.form._id) {

              // 修改操作，删除云存储中图片，重新添加
              _this.deleteImg(_this.form.content);

              let form = {
                recordId: _this.form.recordId,
                content: richText,
                createTime: _this.form.createTime,
                updateTime: moment().format("YYYY-MM-DD HH:mm:ss"),
              };
              updateSummarize(_this.form._id, form).then((res) => {
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
              }).catch(err => {
                uni.showToast({
                  title: "修改失败",
                  icon: "none",
                });
              })
            } else {
              let form = {
                recordId: _this.recordId,
                content: richText,
                createTime: moment().format("YYYY-MM-DD HH:mm:ss"),
                updateTime: moment().format("YYYY-MM-DD HH:mm:ss"),
              };
              addSummarize(form).then((res) => {
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
              }).catch(err => {
                uni.showToast({
                  title: "添加失败",
                  icon: "none",
                });
              })
            }
          } else {
            uni.showToast({
              title: "内容不能为空",
              icon: "none",
            });
          }
        },
      });
    }, 500),
    onEditorReady() {
      // #ifdef MP-BAIDU
      this.editorCtx =
        requireDynamicLib("editorLib").createEditorContext("editor");
      // #endif

      // #ifdef APP-PLUS || MP-WEIXIN || H5
      uni
        .createSelectorQuery()
        .select("#editor")
        .context((res) => {
          this.editorCtx = res.context;
        })
        .exec();
      // #endif
    },
    undo() {
      this.editorCtx.undo();
    },
    redo() {
      this.editorCtx.redo();
    },
    format(e) {
      let { name, value } = e.target.dataset;
      if (!name) return;
      // console.log('format', name, value)
      this.editorCtx.format(name, value);
    },
    onStatusChange(e) {
      const formats = e.detail;
      this.formats = formats;
    },
    insertDivider() {
      this.editorCtx.insertDivider({
        success: function () {
          console.log("insert divider success");
        },
      });
    },
    clear() {
      uni.showModal({
        title: "清空编辑器",
        content: "确定清空编辑器全部内容？",
        success: (res) => {
          if (res.confirm) {
            this.editorCtx.clear({
              success: function (res) {
                console.log("clear success");
              },
            });
          }
        },
      });
    },
    removeFormat() {
      this.editorCtx.removeFormat();
    },
    insertDate() {
      const date = new Date();
      const formatDate = `${date.getFullYear()}/${date.getMonth() + 1
        }/${date.getDate()}`;
      this.editorCtx.insertText({
        text: formatDate,
      });
    },
    insertImage() {
      uni.chooseImage({
        count: 1,
        success: (res) => {
          this.editorCtx.insertImage({
            src: res.tempFilePaths[0],
            alt: "图像",
            success: function () {
              console.log("insert image success");
            },
          });
        },
      });
    },
  },
};
</script>
<style>
@import "@/static/editor-icon.css";

.container {
  background: #fff;
}

.editor-wrapper {
  background: #fff;
}

.iconfont {
  display: inline-block;
  padding: 8px 8px;
  width: 20px;
  height: 20px;
  cursor: pointer;
  font-size: 20px;
  box-sizing: content-box;
}

.toolbar {
  height: 290rpx;
  box-sizing: border-box;
  border-bottom: 0;
  font-family: "Helvetica Neue", "Helvetica", "Arial", sans-serif;
  border-bottom: 1px solid #0003;
  background: #fff;
  margin: 0 14rpx;
}

.ql-container {
  box-sizing: border-box;
  padding: 20rpx;
  width: 100%;
  min-height: 30vh;
  height: 100%;
  font-size: 16px;
  line-height: 1.5;
}

.ql-active {
  color: #06c;
}

.submit {
  position: fixed;
  bottom: 20px;
  right: 20px;
}
</style>