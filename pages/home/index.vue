<template>
	<view>

		<view class="record-container">

			<z-paging ref="paging" v-model="recordList" @query="queryList">
				<view slot="top">
					<cu-custom bgColor="bg-gradual-blue">
						<view slot="left" class="action" @tap="handleShowDrawer">
							<text class="iconfont icon-menus text-white text-bold"></text>
						</view>
						<block slot="content">markdown</block>
					</cu-custom>

				</view>
				<!-- 搜索框 -->
				<view v-if="!isGuest" slot="top" class="search-container">
					<view class="search-box">
						<view class="search-icon">
							<text class="cuIcon-search text-gray"></text>
						</view>
						<input class="search-input" type="text" v-model="searchKeyword" placeholder="搜索标题、时间或内容..."
							@input="onSearchInput" @confirm="handleSearch" :focus="isSearchMode" />
						<view v-if="searchKeyword" class="search-clear" @tap="clearSearch">
							<text class="cuIcon-close text-gray"></text>
						</view>
					</view>
					<view v-if="searchKeyword && searchKeyword.trim()" class="search-reset" @tap="resetSearch">
						<text class="cuIcon-refresh text-gray"></text>
						<text class="search-reset-text">重置</text>
					</view>
				</view>
				<!-- 自定义授权失败页面 -->
				<view slot="empty" slot-scope="{ isLoadFailed: slotIsLoadFailed }">
					<!-- 授权失败时显示自定义页面 -->
					<view v-if="showAuthFailed" class="auth-failed-container auth-failed-container-fixed">
						<view class="auth-failed-main">
							<image class="auth-failed-image-rpx" :src="zStatic.base64Error" mode="aspectFit" />
							<text class="auth-failed-title auth-failed-title-rpx">当前用户未授权，无法查询到信息</text>
							<text class="auth-failed-title auth-failed-title-rpx">请授权后再尝试加载</text>
							<text class="auth-failed-error-btn auth-failed-error-btn-rpx" @click.stop="handleAuthorize">授权登录</text>
						</view>
					</view>
					<!-- 非授权失败时显示默认失败页 -->
					<z-paging-empty-view v-else :isLoadFailed="slotIsLoadFailed || isLoadFailed" @reload="handleDefaultReload" />
				</view>

				<!-- 记录列表 -->
				<view v-for="item in recordList" :key="item.date" class="date-group">
					<!-- 日期标题 -->
					<view class="date-header">
						<view class="date-icon">
							<text class="cuIcon-calendar text-blue"></text>
						</view>
						<view class="date-text">
							<text class="text-lg text-bold">{{ item.date }}</text>
							<text class="text-sm text-gray margin-left-sm">{{ item.count }} 条记录</text>
						</view>
					</view>

					<!-- 记录卡片列表 -->
					<view class="record-card-list">
						<record-card
							v-for="record in item.children"
							:key="record._id"
							:record="record"
							:tagMap="tagMap"
							:aiNoteCount="getAiNoteCount(record)"
							:showMore="!isExampleRecord(record)"
							@tap="goDetail"
							@more-click="onIconClick"
							@ai-note-click="goLearnResult"
						/>
					</view>
				</view>
			</z-paging>

			<!-- 长按弹窗 -->
			<context-popup ref="contextPopup" :buttons="popButton" @select="pickerMenu" />

			<!-- 新增记录按钮 - FAB -->
			<fab-button @click="addRecord" />

			<!-- 删除提示 -->
			<uni-popup ref="alertDialog" type="dialog">
				<uni-popup-dialog type="warn" title="提醒" :content="dialogContent" cancelText="取消" confirmText="确定"
					@confirm="dialogConfirm" @close="dialogClose" />
			</uni-popup>
		</view>

		<!-- 左侧抽屉模态框 -->
		<view class="cu-modal drawer-modal justify-start" :class="modalName == 'DrawerModal' ? 'show' : ''"
			@tap="hideModal">
			<view class="cu-dialog basis-lg" @tap.stop="" :style="drawerStyle">
				<view class="cu-list menu text-left drawer-content">
					<!-- 游客状态显示 -->
					<view v-if="isGuest" class="guest-status-item">
						<view class="guest-status-content">
							<view class="guest-status-icon">
								<text class="cuIcon-info text-orange"></text>
							</view>
							<view class="guest-status-text">
								<text class="text-grey">登录后可保存和管理您的记录</text>
							</view>
						</view>
						<button class="guest-status-btn" @click="handleAuthorizeFromDrawer">
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
					<!-- 更新日志 -->
					<view class="cu-item arrow" @tap="goChangelog">
						<view class="content">
							<text class="cuIcon-newsfill text-blue margin-right-xs"></text>
							<text class="text-grey">更新日志</text>
						</view>
					</view>
					<!-- 联系客服 -->
					<view class="cu-item arrow">
						<button class="cu-btn content" open-type="contact" @tap="hideModal">
							<text class="cuIcon-btn text-olive"></text>
							<text class="text-grey">联系客服</text>
						</button>
					</view>
					<!-- 版本号 -->
					<view class="version-footer">
						<text class="version-text">v{{ appVersion }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 登录授权弹窗 -->
		<login-modal ref="loginModal" @success="handleLoginSuccess" @cancel="handleLoginCancel" />
	</view>
</template>
<script>
import { getRecordList, delRecord, searchRecord } from "@/api/record.js";
import { getDictCategoryList } from "@/api/dictCategory.js";
import { delSummarize } from "@/api/summarize";
import { batchQueryAiResults } from "@/api/aiLearn.js";
import { groupRecordsByDate } from "@/utils/format";
import zStatic from '@/uni_modules/z-paging/components/z-paging/js/z-paging-static.js';
import zPagingEmptyView from '@/uni_modules/z-paging/components/z-paging-empty-view/z-paging-empty-view.vue';

import LoginModal from '@/component/login-modal/index.vue'
import ContextPopup from '@/component/context-popup/index.vue'
import FabButton from '@/component/fab-button/index.vue'
import RecordCard from '@/component/record-card/index.vue'
import { setLoginModalRef } from '@/utils/api-auth.js'

export default {
	components: {
		LoginModal,
		ContextPopup,
		FabButton,
		RecordCard,
		zPagingEmptyView
	},
	data() {
		return {
			StatusBar: this.StatusBar || 0,
			CustomBar: this.CustomBar || 0,
			modalName: null,
			recordList: [],
			tagMap: {},
			popButton: ["编辑", "删除"],
			pickerRecordItem: null,
			dialogContent: "",
			showAuthFailed: false,
			isLoadFailed: false,
			zStatic,
			lastAuthStateVersion: 0,
			lastIsGuest: null,
			searchKeyword: '',
			isSearchMode: false,
			aiResultMap: {},
			appVersion: "1.0.0",
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
		}
	},

	mounted() {
		this.loadTagList();
			this.appVersion = this.getAppVersion();
		this.lastAuthStateVersion = this.$store.state.user.authStateVersion;
		this.lastIsGuest = this.$store.state.user.isGuest;
		this.$nextTick(() => {
			if (this.$refs.loginModal) {
				setLoginModalRef(this.$refs.loginModal);
			}
		});
	},
	onShow() {
		const currentAuthStateVersion = this.$store.state.user.authStateVersion;
		const currentIsGuest = this.$store.state.user.isGuest;

		if (this.lastAuthStateVersion !== currentAuthStateVersion ||
			(this.lastIsGuest === true && currentIsGuest === false)) {
			this.refreshAfterAuthChange();
			this.lastAuthStateVersion = currentAuthStateVersion;
			this.lastIsGuest = currentIsGuest;
		}
	},
	watch: {
		'$store.state.user.authStateVersion': {
			handler(newVersion, oldVersion) {
				if (newVersion !== oldVersion && newVersion > this.lastAuthStateVersion) {
					this.refreshAfterAuthChange();
					this.lastAuthStateVersion = newVersion;
					this.lastIsGuest = this.$store.state.user.isGuest;
				}
			},
			immediate: false
		}
	},
	methods: {
		handleShowDrawer() {
			this.showDrawer();
		},
		loadTagList() {
			getDictCategoryList()
				.then((res) => {
					if (res?.result?.data && Array.isArray(res.result.data)) {
						this.tagMap = res.result.data.reduce((map, tag) => {
							map[tag._id] = tag;
							return map;
						}, {});
					}
				})
				.catch(() => {});
		},
		queryList(pageNo, pageSize) {
			const queryPromise = (this.searchKeyword && this.searchKeyword.trim())
				? searchRecord({
					keyword: this.searchKeyword.trim(),
					pageNum: pageNo,
					pageSize: pageSize,
				}, { autoShowLogin: false })
				: getRecordList({
					pageNum: pageNo,
					pageSize: pageSize,
				}, { autoShowLogin: false });

			queryPromise
				.then((res) => {
					this.showAuthFailed = false;
					this.isLoadFailed = false;
					const list = res.result.data || [];
					this.fetchAiResults(list);
					const groupedRecords = groupRecordsByDate(list);
					this.$refs.paging.complete(groupedRecords);
				})
				.catch((err) => {
					const errorMessage = err?.message || err?.errMsg || String(err || '');
					const isAuthError = errorMessage.includes('未授权') ||
						errorMessage.includes('用户未授权') ||
						errorMessage.includes('用户取消登录');
					this.showAuthFailed = isAuthError;
					this.isLoadFailed = !isAuthError;
					this.$nextTick(() => {
						this.$refs.paging.complete(false);
					});
				});
		},
		getAiNoteCount(record) {
			const item = this.aiResultMap[record._id];
			return (item && item.hasAiNote) ? item.aiNoteCount : 0;
		},
		goLearnResult(record) {
			uni.navigateTo({
				url: `/subpackage/depart/learn-result?recordId=${record._id}`
			});
		},
		fetchAiResults(list) {
			if (!list || list.length === 0) return;
			const recordIds = list.map(item => item._id);
			batchQueryAiResults(recordIds)
				.then((resultMap) => {
					this.aiResultMap = resultMap;
				})
				.catch(() => {
					this.aiResultMap = {};
				});
		},
		isExampleRecord(record) {
			return !record.createBy || record.createBy === '';
		},
		pickerMenu({ action, item }) {
			if (this.isExampleRecord(item)) {
				uni.showToast({ title: '示例记录不支持此操作', icon: 'none' });
				return;
			}
			this.pickerRecordItem = item;
			switch (action) {
				case "编辑":
					uni.navigateTo({ url: `/subpackage/depart/form?type=update&id=${item._id}` });
					break;
				case "删除":
					this.dialogToggle();
					this.dialogContent = `确定删除记录 '${item.title}' 吗？删除后不可恢复！`;
					break;
			}
		},
		onIconClick(record) {
			this.pickerRecordItem = record;
			this.$refs.contextPopup.show(event, record);
		},
		handleAuthorize() {
			if (this.$refs.loginModal) {
				this.$refs.loginModal.open();
			}
		},
		addRecord() {
			uni.navigateTo({ url: "/subpackage/depart/form?type=add" });
		},
		goDetail(row) {
			uni.navigateTo({ url: `/subpackage/depart/detail?id=${row._id}` });
		},
		dialogToggle() {
			this.$refs.alertDialog.open();
		},
		dialogConfirm() {
			const recordId = this.pickerRecordItem._id;
			const summarizeId = this.pickerRecordItem.summarizeId;
			delRecord(recordId)
				.then((res) => {
					if (res.result && (res.result.code === 0 || res.result.code === undefined)) {
						if (summarizeId) {
							delSummarize(summarizeId).finally(() => { this.showDeleteSuccess(); });
						} else {
							this.showDeleteSuccess();
						}
					} else {
						uni.showToast({ title: res.result?.msg || "删除失败", icon: "none" });
					}
				})
				.catch(() => {
					uni.showToast({ title: "删除失败", icon: "none" });
				});
		},
		showDeleteSuccess() {
			uni.showToast({ title: "删除成功", icon: "success" });
			if (this.$refs.paging) {
				this.$refs.paging.refresh();
			}
		},
		dialogClose() { },
		handleAuthorizeFromDrawer() {
			this.hideModal();
			this.handleAuthorize();
		},
		handleLoginSuccess() {
			this.$store.commit('SET_IS_GUEST', false);
			uni.showToast({ title: "登录成功", icon: "success" });
			this.refreshAfterAuthChange();
		},
		refreshAfterAuthChange() {
			this.showAuthFailed = false;
			this.isLoadFailed = false;
			this.loadTagList();
			this.$nextTick(() => {
				if (this.$refs.paging) {
					this.$refs.paging.reload();
				}
			});
		},
		handleDefaultReload() {
			if (this.$refs.paging) {
				this.$refs.paging.reload();
			}
		},
		handleLoginCancel() {},
			goDictCategoryFromDrawer() {
				this.hideModal();
				uni.navigateTo({ url: "/subpackage/dictCategory/index" });
			},
			goChangelog() {
				this.hideModal();
				uni.navigateTo({ url: "/subpackage/changelog/index" });
			},
			showDrawer() {
			this.modalName = 'DrawerModal';
		},
		hideModal() {
			this.modalName = null;
		},
		onSearchInput(e) {
			this.searchKeyword = e.detail.value || '';
		},
		handleSearch() {
			if (!this.searchKeyword || !this.searchKeyword.trim()) {
				uni.showToast({ title: '请输入搜索关键词', icon: 'none' });
				return;
			}
			this.isSearchMode = true;
			if (this.$refs.paging) {
				this.$refs.paging.reload();
			}
		},
		clearSearch() {
			this.searchKeyword = '';
			this.isSearchMode = false;
			if (this.$refs.paging) {
				this.$refs.paging.reload();
			}
		},
		resetSearch() {
			this.clearSearch();
		}
	},
};
</script>

<style lang="scss" scoped>
/* 搜索框容器 */
.search-container {
	padding: 20rpx 30rpx;
	background: #fff;
	border-bottom: 1rpx solid #f0f0f0;
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.search-box {
	flex: 1;
	display: flex;
	align-items: center;
	background: #f5f7fa;
	border-radius: 50rpx;
	padding: 0 24rpx;
	height: 72rpx;
	position: relative;
}

.search-icon {
	width: 40rpx;
	height: 40rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 16rpx;
	flex-shrink: 0;

	.cuIcon-search {
		font-size: 36rpx;
	}
}

.search-input {
	flex: 1;
	font-size: 28rpx;
	color: #333;
	height: 72rpx;
	line-height: 72rpx;
}

.search-clear {
	width: 40rpx;
	height: 40rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-left: 16rpx;
	flex-shrink: 0;

	.cuIcon-close {
		font-size: 32rpx;
	}
}

.search-reset {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 20rpx;
	height: 72rpx;
	background: #f5f7fa;
	border-radius: 36rpx;
	flex-shrink: 0;

	.cuIcon-refresh {
		font-size: 32rpx;
		margin-right: 8rpx;
	}

	.search-reset-text {
		font-size: 26rpx;
		color: #666;
	}
}

/* 抽屉内容上侧内边距 */
.drawer-content {
	padding-top: 120rpx;
	box-sizing: border-box;
}

/* 抽屉中的游客状态项 */
.guest-status-item {
	display: flex;
	flex-direction: column;
	padding: 32rpx 24rpx;
	border-bottom: 1rpx solid #f0f0f0;
	background: linear-gradient(135deg, rgba(255, 193, 7, 0.05) 0%, rgba(255, 152, 0, 0.05) 100%);
}

.guest-status-content {
	display: flex;
	align-items: flex-start;
	margin-bottom: 20rpx;
}

.guest-status-icon {
	width: 36rpx;
	height: 36rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-right: 12rpx;
	margin-top: 2rpx;
}

.guest-status-icon .cuIcon-info {
	font-size: 32rpx;
}

.guest-status-text {
	flex: 1;
	line-height: 1.6;
}

.guest-status-text .text-grey {
	font-size: 26rpx;
	color: #666;
}

.guest-status-btn {
	align-self: flex-start;
	height: 56rpx;
	padding: 0 24rpx;
	line-height: 56rpx;
	font-size: 26rpx;
	font-weight: 400;
	color: #fff;
	background: linear-gradient(135deg, #39b54a 0%, #8dc63f 100%);
	border-radius: 28rpx;
	border: none;
	box-shadow: 0 2rpx 8rpx rgba(57, 181, 74, 0.2);
	transition: all 0.3s ease;
}

.guest-status-btn::after {
	border: none;
}

.guest-status-btn:active {
	opacity: 0.8;
	transform: scale(0.98);
}

.record-container {
	position: relative;
	background: linear-gradient(to bottom, #f5f7fa 0%, #f1f1f1 100%);
	padding-bottom: 160rpx;
}

/* 日期分组 */
.date-group {
	padding: 30rpx 30rpx 0;
}

/* 日期标题 */
.date-header {
	display: flex;
	align-items: center;
	margin-bottom: 24rpx;
	padding: 0 8rpx;

	.date-icon {
		width: 48rpx;
		height: 48rpx;
		border-radius: 12rpx;
		background: linear-gradient(135deg, rgba(0, 129, 255, 0.1) 0%, rgba(28, 187, 180, 0.1) 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 16rpx;

		.cuIcon-calendar {
			font-size: 28rpx;
		}
	}

	.date-text {
		flex: 1;
		display: flex;
		align-items: center;
	}
}

/* 记录卡片列表 */
.record-card-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

/* 授权失败页面 */
.auth-failed-container {
	/* #ifndef APP-NVUE */
	display: flex;
	/* #endif */
	align-items: center;
	justify-content: center;
}

.auth-failed-container-fixed {
	/* #ifndef APP-NVUE */
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	/* #endif */
	/* #ifdef APP-NVUE */
	flex: 1;
	/* #endif */
}

.auth-failed-main {
	/* #ifndef APP-NVUE */
	display: flex;
	/* #endif */
	flex-direction: column;
	align-items: center;
	padding: 50rpx 0rpx;
}

.auth-failed-image-rpx {
	width: 240rpx;
	height: 240rpx;
}

.auth-failed-title {
	color: #aaaaaa;
	text-align: center;
}

.auth-failed-title-rpx {
	font-size: 28rpx;
	margin-top: 10rpx;
	padding: 0rpx 20rpx;
}

.auth-failed-error-btn {
	border: solid 1px #dddddd;
	color: #aaaaaa;
	text-align: center;
	cursor: pointer;
}

.version-footer {
		padding: 40rpx 32rpx 20rpx;
		text-align: center;
	}

	.version-text {
		font-size: 22rpx;
		color: #ccc;
	}

	.auth-failed-error-btn-rpx {
	font-size: 28rpx;
	padding: 8rpx 24rpx;
	border-radius: 6rpx;
	margin-top: 50rpx;
}
</style>
