<template>
	<view>
		<Depart @show-drawer="showDrawer" />

		<!-- 左侧抽屉模态框 -->
		<view class="cu-modal drawer-modal justify-start" :class="modalName == 'DrawerModal' ? 'show' : ''"
			@tap="hideModal">
			<view class="cu-dialog basis-lg" @tap.stop="" :style="drawerStyle">
				<view class="cu-list menu text-left drawer-content">
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
	</view>
</template>
<script>
import Depart from '@/component/depart-list/index.vue'
export default {
	components: {
		Depart
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
		}
	},
	methods: {
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

<style>
/* 抽屉内容上侧内边距 */
.drawer-content {
	padding-top: 120rpx;
	box-sizing: border-box;
}
</style>