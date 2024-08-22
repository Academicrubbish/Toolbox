<template>
	<view>
		<view>
			<view class="toolbar">
				<view class="iconfont icon-bold" @click="toolBarClick('bold')"></view>
				<view class="iconfont icon-italic" @click="toolBarClick('italic')"></view>
				<view class="iconfont icon-xiahuaxian1" @click="toolBarClick('header')"></view>
				<view class="iconfont icon-underline" @click="toolBarClick('underline')"></view>
				<view class="iconfont icon-strike" @click="toolBarClick('strike')"></view>
				<view class="iconfont icon-sup" @click="toolBarClick('sup')"></view>
				<view class="iconfont icon-sub" @click="toolBarClick('sub')"></view>
				<view class="iconfont icon-alignleft" @click="toolBarClick('alignleft')"></view>
				<view class="iconfont icon-aligncenter" @click="toolBarClick('aligncenter')"></view>
				<view class="iconfont icon-alignright" @click="toolBarClick('alignright')"></view>
				<view class="iconfont icon-link" @click="toolBarClick('link')"></view>
				<view class="iconfont icon-image" @click="toolBarClick('imgage')"></view>
				<view class="iconfont icon-code" @click="toolBarClick('code')"></view>
				<view class="iconfont icon-table" @click="toolBarClick('table')"></view>
				<view class="iconfont icon-qingkong" @click="toolBarClick('clear')"></view>
				<view class="iconfont icon-qingkong" @click="toolBarClick('yulan')"></view>
			</view>
			<view class="input-content">
				<textarea v-if="status" auto-height maxlength="-1" v-model="textareaData" @blur="getCursor"></textarea>
				<towxml v-if="!status" :nodes="textareaHtml" />
			</view>
		</view>
	</view>
</template>

<script>
import marked from '../components/marked'
import wxParse from '../components/mpvue-wxparse/src/wxParse.vue'
import mpHtml from "mp-html/dist/uni-app/components/mp-html/mp-html";
export default {
	name: "ly-markdown",
	components: {
		wxParse,
		mpHtml
	},
	data: function () {
		return {
			screenHeight: 0,
			cursor: 0,
			textareaData: "",
			textareaHtml: "",
			status: true
		}
	},
	props: {
		textareaDataProp: {
			type: String,
			default: ""
		},
		textareaHtmlProp: {
			type: String,
			default: ""
		},
		showPreview: {
			type: Boolean,
			default: true
		}
	},
	created() {
		this.textareaData = this.textareaDataProp;
		this.textareaHtml = this.textareaHtmlProp;
	},
	methods: {
		preview(src, e) {
			uni.previewImage({
				urls: src,
			})
		},
		navigate(href, e) {
			// 如允许点击超链接跳转，则应该打开一个新页面，并传入href，由新页面内嵌webview组件负责显示该链接内容
			// #ifdef APP-PLUS
			plus.runtime.openURL(href)
			// #endif
			// #ifdef MP-WEIXIN
			uni.setClipboardData({
				data: href,
				success: function () {
					uni.showModal({
						content: "网址已复制,请在浏览器中粘贴打开",
						showCancel: false
					})
				}
			})
			// #endif
		},
		toolBarClick(type) {
			if (type == 'bold') {
				this.textareaData += "**粗体文字** "
			} else if (type == "italic") {
				this.textareaData += "*斜体* "
			} else if (type == "header") {
				uni.showActionSheet({
					itemList: ["标题1", "标题2", "标题3", "标题4", "标题5", "标题6"],
					success: res => {
						switch (res.tapIndex) {
							case 0:
								this.textareaData += "# 标题1\r";
								return;
							case 1:
								this.textareaData += "## 标题2\r";
								return;
							case 2:
								this.textareaData += "### 标题3\r";
								return;
							case 3:
								this.textareaData += "#### 标题4\r";
								return;
							case 4:
								this.textareaData += "##### 标题5\r";
								return;
							case 5:
								this.textareaData += "###### 标题6\r";
								return;
						}
					}
				})
			} else if (type == "underline") {
				this.textareaData += "++下划线++ "
			} else if (type == "strike") {
				this.textareaData += "~~中划线~~ "
			} else if (type == "sup") {
				this.textareaData += "^上角标^ "
			} else if (type == "sub") {
				this.textareaData += "~下角标~ "
			} else if (type == "alignleft") {
				this.textareaData += "\n::: hljs-left\n\n左对齐\n\n:::\n"
			} else if (type == "aligncenter") {
				this.textareaData += "\n::: hljs-center\n\n居中对齐\n\n:::\n"
			} else if (type == "alignright") {
				this.textareaData += "\n::: hljs-right\n\n\n\n右对齐\n\n:::\n"
			} else if (type == "link") {
				this.textareaData += "[在此输入网址描述](在此输入网址) "
			} else if (type == "imgage") {
				uni.chooseImage({
					count: 1,
					success: chooseImageRes => {
						const tempFilePaths = chooseImageRes.tempFilePaths;
						uni.showLoading({
							mask: true,
							title: "上传中",
						})
						uni.uploadFile({
							url: '', //在此填写图片上传地址
							filePath: tempFilePaths[0],
							name: 'file',
							formData: {},
							complete: function () {
								uni.hideLoading();
							},
							success: uploadFileRes => {
								var data = JSON.parse(uploadFileRes.data);
								this.textareaData += "![](" + data.data + ") "
							}
						});
					}
				})
				this.textareaData += "![](在此输入图片地址) "
			} else if (type == "code") {
				this.textareaData += "\n``` 代码块 \n\n```\n"
			} else if (type == "table") {
				this.textareaData += "\n|列1|列2|列3|\n|-|-|-|\n|单元格1|单元格2|单元格3|\n"
			} else if (type == "clear") {
				uni.showModal({
					title: "提示",
					content: "确定清空?",
					success: res => {
						if (res.confirm) {
							this.textareaData = "";
						}
					}
				})
			}else if(type == "yulan") {
				this.status = !this.status;
			}
		},
		getCursor(e) {
			//安卓失去焦点获取不到cursor位置,暂不使用
			//this.cursor = e.detail.cursor; 
		}
	},
	watch: {
		"textareaData": function (newValue, oldValue) {
			console.log('111', newValue);
			// this.textareaHtml = marked(newValue)
			// this.textareaHtml = marked(newValue).replace(/<pre>/g, "<pre class='hljs'>");
			// console.log(this.textareaHtml);
			// this.$emit('update:textareaData', newValue)
			// this.$emit('update:textareaHtml', this.textareaHtml)
			this.textareaHtml = this.towxml(newValue, 'markdown', {
				theme: 'dark',
				events: {
					tap: (e) => {
						console.log('tap', e);
					}
				}
			})
		}
	},
	onLoad: function () {
		uni.getSystemInfo({
			success: res => {
				this.screenHeight = res.screenHeight
			}
		})
	}
}
</script>

<style>
@import '../static/markdown.css';
@import url("../components/mpvue-wxparse/src/wxParse.css");

.input-content {
	width: 100%;
}

.input-content textarea {
	padding: 16px 25px 15px 25px;
	font-size: 30px;
	min-height: 500px;
	line-height: 1.5;
}

.preview {
	border-top: 1px solid #e0e0e0;
	width: 100%;
}

.toolbar {
	width: 100%;
	border: none;
	box-shadow: 0 0px 4px rgba(0, 0, 0, 0.157), 0 0px 4px rgba(0, 0, 0, 0.227);
}

.toolbar .iconfont {
	display: inline-block;
	cursor: pointer;
	height: 61.6px;
	width: 61.6px;
	margin: 13px 0 11px 0px;
	font-size: 33px;
	padding: 10px 13px 11px 8px;
	color: #757575;
	border-radius: 11px;
	text-align: center;
	background: none;
	border: none;
	outline: none;
	line-height: 2.2;
	vertical-align: middle;
}

.input-content {
	min-height: ;
}
</style>
