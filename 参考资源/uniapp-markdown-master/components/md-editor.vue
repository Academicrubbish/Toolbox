<template>
	<view class="mdEditor">
		<view class="toolbar">
			<view class="iconfont icon-bold" @click="toolBarClick('bold')"></view>
			<view class="iconfont icon-italic" @click="toolBarClick('italic')"></view>
			<view class="iconfont icon-title" @click="toolBarClick('header')"></view>
			<view class="iconfont icon-underline" @click="toolBarClick('underline')"></view>
			<view class="iconfont icon-strikeThrough" @click="toolBarClick('strike')"></view>
			<view class="iconfont icon-inIndentation" @click="toolBarClick('inIndentation')"></view>
			<view class="iconfont icon-reIndentation" @click="toolBarClick('reIndentation')"></view>
			<view class="iconfont icon-superscript" @click="toolBarClick('sup')"></view>
			<view class="iconfont icon-subscript" @click="toolBarClick('sub')"></view>
			<view class="iconfont icon-ul" @click="toolBarClick('ul')"></view>
			<view class="iconfont icon-ol" @click="toolBarClick('ol')"></view>
			<view class="iconfont icon-dividingLine" @click="toolBarClick('dividingLine')"></view>
			<view class="iconfont icon-hyperlinke" @click="toolBarClick('link')"></view>
			<view class="iconfont icon-image" @click="toolBarClick('img')"></view>
			<view class="iconfont icon-inlineCode" @click="toolBarClick('inlineCode')"></view>
			<view class="iconfont icon-codeBlock" @click="toolBarClick('code')"></view>
			<view class="iconfont icon-table" @click="toolBarClick('table')"></view>
			<view class="iconfont icon-quote" @click="toolBarClick('quote')"></view>
			<view class="iconfont icon-taskList" @click="toolBarClick('taskList')"></view>
			<view class="iconfont icon-empty" @click="toolBarClick('clear')"></view>
			<view class="iconfont icon-toggle" @click="toolBarClick('toggle')"></view>
		</view>
		<view class="input-content">
			<textarea v-if="status" maxlength="-1" v-model="textareaData"></textarea>
			<towxml v-if="!status" :nodes="textareaHtml" />
		</view>
	</view>
</template>

<script>
export default {
	name: "mdEditor",
	data() {
		return {
			textareaData: "",
			textareaHtml: "",
			status: true,
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
								this.textareaData += "\n# 标题1\r";
								return;
							case 1:
								this.textareaData += "\n## 标题2\r";
								return;
							case 2:
								this.textareaData += "\n### 标题3\r";
								return;
							case 3:
								this.textareaData += "\n#### 标题4\r";
								return;
							case 4:
								this.textareaData += "\n##### 标题5\r";
								return;
							case 5:
								this.textareaData += "\n###### 标题6\r";
								return;
						}
					}
				})
			} else if (type == "underline") {
				this.textareaData += "++下划线++ "
			} else if (type == "strike") {
				this.textareaData += "~~删除线~~ "
			} else if (type == "sup") {
				this.textareaData += "^上角标^ "
			} else if (type == "sub") {
				this.textareaData += "~下角标~ "
			} else if (type == "link") {
				this.textareaData += "[在此输入网址描述](在此输入网址) "
			} else if (type == "img") {
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
			}
			else if (type == 'inlineCode') {
				this.textareaData += "`行内代码块`"
			}
			else if (type == 'taskList') {
				this.textareaData += "\n- [ ] 任务列表\n"
			}
			else if (type == "quote") {
				this.textareaData += "\n> 引用内容\n"
			}

			else if (type == "inIndentation") {
				this.textareaData += "增加缩进"
			}
			else if (type == "reIndentation") {
				this.textareaData += "减少缩进"
			}

			else if (type == "dividingLine") {
				this.textareaData += "\n------\n"
			}
			else if (type == 'ul') {
				this.textareaData += "\n- 无序列表1\n"
			}
			else if (type == 'ol') {
				this.textareaData += "\n1. 有序列表\n"
			}

			else if (type == "clear") {
				uni.showModal({
					title: "提示",
					content: "确定清空?",
					success: res => {
						if (res.confirm) {
							this.textareaData = "";
						}
					}
				})
			} else if (type == "toggle") {
				this.status = !this.status;
			}
		},
	},
	watch: {
		"textareaData": function (newValue, oldValue) {
			console.log('111', newValue);
			this.textareaHtml = this.towxml(newValue, 'markdown', {
				theme: 'dark',
				events: {
					tap: (e) => {
						console.log('tap', e);
					}
				}
			})
		}
	}
}
</script>

<style>
@import '../static/markdown.css';

.mdEditor {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
}

.toolbar {
	width: 100%;
	border: none;
	box-shadow: 0 0px 4px rgba(0, 0, 0, 0.157), 0 0px 4px rgba(0, 0, 0, 0.227);
}

.toolbar .iconfont {
	display: inline-block;
	cursor: pointer;
	width: calc(100% / 9);
	/* 固定宽度 */
	aspect-ratio: 1;
	/* 高度与宽度相等 */
	font-size: 33px;
	padding: 10rpx;
	color: #757575;
	text-align: center;
	background: none;
	border: none;
	outline: none;
	line-height: 2.2;
	vertical-align: middle;
	box-sizing: border-box;
}


.input-content {
	width: 100%;
	flex: 1;
	/* 占据剩余空间 */
	overflow: auto;
}

.input-content textarea {
	font-family: PingFang SC, Lantinghei SC, Microsoft Yahei, Hiragino Sans GB, Microsoft Sans Serif, WenQuanYi Micro Hei, sans-serif;
	height: 100%;
	width: 100%;
	padding: 16rpx 25rpx;
	box-sizing: border-box;
	font-size: 30px;
	line-height: 1.5;
}
</style>
