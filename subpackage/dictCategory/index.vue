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
				<view :class="item.isPublicVisible?'cu-tag bg-blue light':'cu-tag'" @tap="delDictItem(item)">
					{{ item.name }}
				</view>
			</view>
			<view class="padding-xs">
				<view class="cu-tag bg-blue" @tap="showModal" data-target="Modal">
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
					<uni-forms ref="valiForm" label-position="top" :modelValue="formData">
						<uni-forms-item name="name" label="标签" required
							:rules="[{required: true,errorMessage: '标签名不能为空'},{ validateFunction: validateName}]">
							<uni-easyinput v-model="formData.name" :maxlength="8" placeholder="请填写标签名称" />
						</uni-forms-item>
						<uni-forms-item name="description" label="简介">
							<uni-easyinput type="textarea" v-model="formData.description" :maxlength="40"
								placeholder="请输入标签介绍/解释" />
						</uni-forms-item>
					</uni-forms>
					<button type="primary" @click="submit('valiForm')">提交</button>
				</view>
			</view>
		</view>

	</view>
</template>

<script>
	import {
		getDictList,
		getDict,
		addDict,
		delDict
	} from "@/api/dict.js";
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
			};
		},
		onLoad() {
			this.getDict();
		},
		methods: {
			validateName(rule, value, data, callback) {
				// 正则表达式：匹配汉字、字母（包括大小写）和数字
				const regex = /^[a-zA-Z0-9\u4e00-\u9fa5]+$/;

				// 如果输入的值不符合正则表达式规则
				if (!regex.test(value)) {
					callback("名称只能包含汉字、字母和数字");
				} else {
					return true; // 校验通过
				}
			},
			delDictItem(item) {
				// 不允许删除公共标签
				if (!item.isPublicVisible) {
					return uni.showToast({
						title: '公共标签不允许删除',
						icon: 'none'
					})
				}
				let _this = this;
				uni.showModal({
					title: '提示',
					content: `确认删除【${item.name} 】类型标签吗？`,
					success: function(res) {
						if (res.confirm) {
							delDict(item._id).then(res => {
								uni.showToast({
									title: "删除成功",
									icon: "none",
									mask: true,
								});
								_this.getDict();
							})
						} else if (res.cancel) {
							console.log('用户点击取消');
						}
					}
				});

			},
			getDict() {
				getDictList().then(res => {
					this.dictList = res.result.data
				})
			},
			submit: debounce(function(form) {
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
			// 添加公共组件方法，不对用户开放
			aaa() {
				// 定义公共类型名称
				let arr = [];

				let currentTime = moment(); // 获取当前时间（初始时间）

				// 遍历活动类型数组
				arr.forEach(item => {
					let data = {
						name: item, // 活动名称
						description: 'nothing', // 留空项
						isPublicVisible: false, // 默认不公开
						createTime: currentTime.format("YYYY-MM-DD HH:mm:ss"), // 当前时间
					};

					// 更新当前时间：每次加一秒
					currentTime.add(1, 'second'); // 在当前时间基础上增加1秒

					// 调用添加字典的方法
					addDict(data).then((res) => {
						if (res.result.code === 0) {
							uni.showToast({
								title: "添加成功", // 弹出提示
								icon: "none",
								mask: true,
							});
							this.getDict(); // 获取字典数据
						}
					}).catch((error) => {
						uni.showToast({
							title: "添加失败", // 弹出失败提示
							icon: "none",
							mask: true,
						});
					});
				});
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