<template>
	<view>

		<Depart @show-drawer="showDrawer" @authorize="handleAuthorize" ref="departList" />

		<!-- 左侧抽屉模态框 -->
		<view class="cu-modal drawer-modal justify-start" :class="modalName == 'DrawerModal' ? 'show' : ''"
			@tap="hideModal">
			<view class="cu-dialog basis-lg" @tap.stop="" :style="drawerStyle">
				<view class="cu-list menu text-left drawer-content">
					<!-- 游客状态显示 -->
					<view v-if="isGuest" class="guest-status-item">
						<view class="content">
							<text class="cuIcon-info text-orange margin-right-xs"></text>
							<text class="text-grey">登录后可保存和管理您的记录</text>
						</view>
						<button class="cu-btn bg-green shadow-blur round sm" @click="handleAuthorizeFromDrawer">
							授权登录
						</button>
					</view>
					<!-- 标签管理 -->
					<view class="cu-item arrow" @tap="goDictCategoryFromDrawer">
						<view class="content">
							<text class="cuIcon-tagfill text-red margin-right-xs"></text>
							<text class="text-grey">标签管理</text>
						</view>
					</view>
					<!-- 联系客服 -->
					<view class="cu-item arrow">
						<button class="cu-btn content" open-type="contact" @tap="hideModal">
							<text class="cuIcon-btn text-olive"></text>
							<text class="text-grey">联系客服</text>
						</button>
					</view>
				</view>
			</view>
		</view>

		<!-- 登录授权弹窗 -->
		<login-modal ref="loginModal" @success="handleLoginSuccess" @cancel="handleLoginCancel" />
	</view>
</template>
<script>
import Depart from '@/component/depart-list/index.vue'
import LoginModal from '@/component/login-modal/index.vue'
import { setLoginModalRef } from '@/utils/api-auth.js'

export default {
	components: {
		Depart,
		LoginModal
	},
	data() {
		return {
			StatusBar: this.StatusBar || 0,
			CustomBar: this.CustomBar || 0,
			modalName: null
		};
	},
	computed: {
		drawerStyle() {
			const CustomBar = this.CustomBar || 0;
			return {
				top: CustomBar + 'px',
				height: `calc(100vh - ${CustomBar}px)`
			};
		},
		isGuest() {
			return this.$store.state.user.isGuest;
		},
		guestContainerStyle() {
			const CustomBar = this.CustomBar || 0;
			return {
				top: CustomBar + 'px',
				height: `calc(100vh - ${CustomBar}px)`
			};
		}
	},
	mounted() {
		// 设置登录弹窗的全局引用，供API授权检查使用
		this.$nextTick(() => {
			if (this.$refs.loginModal) {
				setLoginModalRef(this.$refs.loginModal);
			}
		});
	},
	methods: {
		// 授权登录
		handleAuthorize() {
			if (this.$refs.loginModal) {
				this.$refs.loginModal.open();
			}
		},
		// 从抽屉中授权登录
		handleAuthorizeFromDrawer() {
			this.hideModal();
			this.handleAuthorize();
		},
		// 登录成功处理
		handleLoginSuccess() {
			// 清除游客状态
			this.$store.commit('SET_IS_GUEST', false);
			uni.showToast({
				title: "登录成功",
				icon: "success"
			});
			// 刷新列表
			if (this.$refs.departList && this.$refs.departList.$refs && this.$refs.departList.$refs.paging) {
				this.$refs.departList.$refs.paging.reload();
			}
		},
		// 登录取消处理
		handleLoginCancel() {
			// 用户取消登录，保持游客状态
		},
		goDepart() {
			uni.navigateTo({
				url: "/subpackage/depart/index",
			});
		},
		goDictCategory() {
			uni.navigateTo({
				url: "/subpackage/dictCategory/index",
			});
		},
		goDictCategoryFromDrawer() {
			this.hideModal();
			this.goDictCategory();
		},
		showDrawer() {
			this.modalName = 'DrawerModal';
		},
		hideModal() {
			this.modalName = null;
		}
	},
};
</script>

<style lang="scss" scoped>
/* 抽屉内容上侧内边距 */
.drawer-content {
	padding-top: 120rpx;
	box-sizing: border-box;
}

/* 游客状态容器 - 垂直居中 */
.guest-container {
	position: fixed;
	left: 0;
	right: 0;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 40rpx 30rpx;
	box-sizing: border-box;
	z-index: 1;
}

.guest-content {
	width: 100%;
	max-width: 600rpx;
	text-align: center;

	.guest-tips {
		margin-bottom: 40rpx;
	}

	.guest-buttons {
		.guest-btn {
			width: 100%;
			height: 88rpx;
			line-height: 88rpx;
			font-size: 32rpx;
		}
	}
}

/* 抽屉中的游客状态项 */
.guest-status-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 30rpx;
	border-bottom: 1rpx solid #f0f0f0;
}
</style>