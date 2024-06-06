<template>
	<view class="open">
		<view class="text-center text-xxl animation-slide-bottom open_title">
			<text class="text-black text-bold">番薯工具箱</text>
		</view>
		<view class="text-center margin-top text-bold animation-slide-bottom open_comment">
			<text>- 为你而准备 -</text>
		</view>
		<view class="animation-slide-bottom open_login">
			<view class="cu-bar btn-group login_btn">
				<button class="cu-btn bg-green shadow-blur round lg" @click="judgeUser">登录</button>
			</view>
			<!-- <view class="text-center text-grey margin-top" @tap="browse"><text style="text-decoration: underline">先看看</text> -->
		</view>

		<!-- 		<view class="text-xs text-gray animation-slide-bottom open_bottom">
			<view>
				<image src="../../static/open/me.jpg" />
				致谢那个嘴里卡着灯泡的自己
			</view>
		</view> -->
	</view>
</template>

<script>
	import moment from 'moment'
	const db = uniCloud.database() //创建数据库连接
	import store from '../../store'
	export default {
		methods: {
			//第一步，先判断是否注册过
			//第二步，注册过就去数据库拿用户信息；没有注册过就跳转注册页
			async judgeUser() {
				try {
					uni.showLoading({
						title: '登录中'
					});

					const codeRes = await new Promise((resolve, reject) => {
						uni.login({
							provider: 'weixin',
							success: resolve,
							fail: reject
						});
					});

					const openId = await this.getOpenId(codeRes.code);
					store.commit('setUserOpenId', openId);

					const userInfo = await this.getUserInfo(openId);
					if (userInfo.length > 0) {
						// 用户已注册，处理逻辑
						uni.navigateTo({
							url: '/pages/home/index'
						})
					} else {
						// 用户未注册，跳转注册页
						this.addUserInfo(openId)
					}
				} catch (error) {
					console.error('发生错误：', error);
				} finally {
					uni.hideLoading();
				}
			},
			//获取openid
			async getOpenId(code) {
				const res = await uniCloud.callFunction({
					name: 'login',
					data: {
						code: code
					}
				});
				return res.result.data.openid;
			},

			//获取用户信息
			async getUserInfo(openId) {
				const res = await db.collection('tb_user').where({
					_openid: openId
				}).get();
				return res.result.data;
			},

			//云数据库用户表新增
			async addUserInfo(openId) {
				const data = {
					_openid: openId,
					createTime: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
					updateTime: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
				}
				const res = await db.collection('tb_user').add(data)
				store.commit('setUserData', data)
				uni.navigateTo({
					url: '/pages/home/index'
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.open {
		height: 100%;

		.open_title {
			animation-delay: 0.2s;
			margin-top: 300rpx;
		}

		.open_comment {
			animation-delay: 0.3s;
		}

		.open_login {
			animation-delay: 0.4s;

			.login_btn {
				margin-top: 280rpx;
			}
		}

		.open_bottom {
			animation-delay: 0.5s;
			position: fixed;
			bottom: 100rpx;
			width: 100%;
			text-align: center;

			image {
				display: inline-block;
				vertical-align: middle;
				width: 40rpx;
				height: 40rpx;
				border-radius: 40rpx;
				margin-right: 10rpx;
			}
		}
	}
</style>