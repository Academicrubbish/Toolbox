<template>
	<view>

		<view class="record-container">

			<z-paging ref="paging" v-model="recordList" @query="queryList">
				<view slot="top">
					<cu-custom bgColor="bg-gradual-blue">
						<view slot="left" class="action" @tap="handleShowDrawer">
							<text class="iconfont icon-menus text-white text-bold"></text>
						</view>
						<block slot="content">首页</block>
					</cu-custom>
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
						<view v-for="record in item.children" :key="record._id" class="record-card shadow-warp"
							@tap="goDetail(record)">
							<view class="record-card-header">
								<view class="record-title">
									<text class="cuIcon-creativefill text-blue margin-right-xs"></text>
									<text class="text-bold">{{ record.title }}</text>
								</view>
								<view class="record-more-icon" @tap.stop="onIconClick($event, record)">
									<text class="cuIcon-moreandroid text-gray"></text>
								</view>
							</view>

							<!-- 标签区域 -->
							<view v-if="record.tags && record.tags.length > 0" class="record-tags">
								<view v-for="(tagId, index) in record.tags" :key="tagId" class="record-tag"
									:class="tagColorClasses[index % 12]">
									<text>{{ getTagName(tagId) }}</text>
								</view>
							</view>

							<!-- 总结内容 -->
							<view v-if="record.summarizeContent" class="record-summary">
								<text class="record-summary-text">{{ formatSummaryContent(record.summarizeContent) }}</text>
							</view>

							<!-- 时间信息 -->
							<view class="record-footer">
								<text class="cuIcon-timefill text-gray text-xs margin-right-xs"></text>
								<text class="text-gray text-xs">{{ formatTime(record.createTime) }}</text>
							</view>
						</view>
					</view>
				</view>
			</z-paging>

			<!-- 长按弹窗 -->
			<view class="shade" v-show="showShade" @tap="hidePop">
				<view class="pop" :style="popStyle" :class="{ show: showPop }">
					<view v-for="item in popButton" :key="item" @tap="pickerMenu(item)">
						{{ item }}
					</view>
				</view>
			</view>

			<!-- 新增记录按钮 - FAB -->
			<view class="fab-button" @tap="addRecord">
				<view class="fab-icon">
					<text class="cuIcon-add"></text>
				</view>
			</view>

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
import { getRecordList, delRecord } from "@/api/record.js";
import { getDictCategoryList } from "@/api/dictCategory.js";
import { delSummarize } from "@/api/summarize";
import { tagColorClasses } from "@/utils/tagColors";
import moment from "moment";
import zStatic from '@/uni_modules/z-paging/components/z-paging/js/z-paging-static.js';
import zPagingEmptyView from '@/uni_modules/z-paging/components/z-paging-empty-view/z-paging-empty-view.vue';

import LoginModal from '@/component/login-modal/index.vue'
import { setLoginModalRef } from '@/utils/api-auth.js'

export default {
	components: {
		LoginModal,
		zPagingEmptyView
	},
	data() {
		return {
			StatusBar: this.StatusBar || 0,
			CustomBar: this.CustomBar || 0,
			modalName: null,
			recordList: [],
			tagMap: {}, // 标签ID到标签信息的映射
			tagColorClasses, // 从公共工具文件导入
			showShade: false, // 显示遮罩
			showPop: false, // 显示操作弹窗
			popButton: ["编辑", "删除"], // 弹窗按钮列表
			popStyle: "", // 弹窗定位样式
			pickerRecordItem: null, // 选择的记录内容
			dialogContent: "", // 删除提醒文本
			showAuthFailed: false, // 是否显示授权失败页面
			isLoadFailed: false, // 是否加载失败（用于显示默认失败页）
			zStatic, // 导入 z-paging 静态资源
			lastAuthStateVersion: 0, // 记录上一次的授权状态版本号
			lastIsGuest: null, // 记录上一次的游客状态
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
		// 加载标签列表
		this.loadTagList();
		// 初始化授权状态版本号和游客状态
		this.lastAuthStateVersion = this.$store.state.user.authStateVersion;
		this.lastIsGuest = this.$store.state.user.isGuest;
		// 设置登录弹窗的全局引用，供API授权检查使用
		this.$nextTick(() => {
			if (this.$refs.loginModal) {
				setLoginModalRef(this.$refs.loginModal);
			}
		});
	},
	onShow() {
		// 检查授权状态版本号是否变化
		const currentAuthStateVersion = this.$store.state.user.authStateVersion;
		const currentIsGuest = this.$store.state.user.isGuest;
		
		// 如果版本号变化，或者从游客状态变为已登录状态，都刷新
		if (this.lastAuthStateVersion !== currentAuthStateVersion || 
			(this.lastIsGuest === true && currentIsGuest === false)) {
			// 授权状态已改变，刷新列表和标签
			this.refreshAfterAuthChange();
			// 更新状态记录
			this.lastAuthStateVersion = currentAuthStateVersion;
			this.lastIsGuest = currentIsGuest;
		}
	},
	watch: {
		// 监听 store 中的授权状态版本号变化（实时响应，不依赖页面生命周期）
		'$store.state.user.authStateVersion': {
			handler(newVersion, oldVersion) {
				if (newVersion !== oldVersion && newVersion > this.lastAuthStateVersion) {
					// 授权状态已改变，刷新列表和标签
					this.refreshAfterAuthChange();
					// 更新状态记录
					this.lastAuthStateVersion = newVersion;
					this.lastIsGuest = this.$store.state.user.isGuest;
				}
			},
			immediate: false
		}
	},
	methods: {
		// 显示抽屉
		handleShowDrawer() {
			this.showDrawer();
		},
		// 加载标签列表
		loadTagList() {
			getDictCategoryList()
				.then((res) => {
					if (res?.result?.data && Array.isArray(res.result.data)) {
						// 构建标签映射
						this.tagMap = res.result.data.reduce((map, tag) => {
							map[tag._id] = tag;
							return map;
						}, {});
					}
				})
				.catch(() => {
					// 加载标签列表失败，静默处理
				});
		},
		// 获取标签名称
		getTagName(tagId) {
			return this.tagMap[tagId] ? this.tagMap[tagId].name : '未知标签';
		},
		// 格式化时间
		formatTime(timeStr) {
			if (!timeStr) return '';
			return moment(timeStr).format('HH:mm');
		},
		// 格式化总结内容（简单处理markdown，保留文本内容）
		formatSummaryContent(content) {
			if (!content) return '';
			// 去除markdown的标题符号、列表符号等，保留文本内容
			let text = content
				.replace(/^#{1,6}\s+/gm, '') // 去除标题符号
				.replace(/^\*\s+/gm, '') // 去除无序列表符号
				.replace(/^\d+\.\s+/gm, '') // 去除有序列表符号
				.replace(/```[\s\S]*?```/g, '') // 去除代码块
				.replace(/`[^`]+`/g, '') // 去除行内代码
				.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 将链接转换为文本
				.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '') // 去除图片
				.replace(/\*\*([^\*]+)\*\*/g, '$1') // 去除加粗
				.replace(/\*([^\*]+)\*/g, '$1') // 去除斜体
				.replace(/~~([^~]+)~~/g, '$1') // 去除删除线
				.replace(/^\s*[-*+]\s+/gm, '') // 去除列表符号
				.replace(/^\s*\d+\.\s+/gm, '') // 去除有序列表
				.replace(/\n+/g, ' ') // 将换行符替换为空格
				.trim();
			return text;
		},
		// 查询列表
		queryList(pageNo, pageSize) {
			// 调用接口，不自动弹出登录弹窗，失败时显示失败页面
			getRecordList({
				pageNum: pageNo,
				pageSize: pageSize,
			}, { autoShowLogin: false })
				.then((res) => {
					// 加载成功，重置失败状态
					this.showAuthFailed = false;
					this.isLoadFailed = false;
					const list = res.result.data || [];
					
					// 按日期分组
					const groupedRecords = list.reduce((groups, element) => {
						const groupDate = moment(element.createTime).format("YYYY-MM-DD");
						const existingGroup = groups.find(group => group.date === groupDate);
						
						if (existingGroup) {
							existingGroup.children.push(element);
							existingGroup.count++;
						} else {
							groups.push({
								date: groupDate,
								children: [element],
								count: 1,
							});
						}
						return groups;
					}, []);

					// 调用 z-paging 组件的 complete 方法
					this.$refs.paging.complete(groupedRecords);
				})
				.catch((err) => {
					// 判断是否是未授权错误
					const errorMessage = err?.message || err?.errMsg || String(err || '');
					const isAuthError = errorMessage.includes('未授权') ||
						errorMessage.includes('用户未授权') ||
						errorMessage.includes('用户取消登录');

					this.showAuthFailed = isAuthError;
					this.isLoadFailed = !isAuthError; // 非授权错误时，显示默认失败页

					// 确保状态更新后再调用 complete
					this.$nextTick(() => {
						// 调用 z-paging 组件的 complete 方法，传入 false 表示加载失败
						this.$refs.paging.complete(false);
					});
				});
		},
		// 处理授权登录
		handleAuthorize() {
			if (this.$refs.loginModal) {
				this.$refs.loginModal.open();
			}
		},
		// 新增记录
		addRecord() {
			uni.navigateTo({
				url: "/subpackage/depart/form?type=add",
			});
		},
		// 跳转到详情页
		goDetail(row) {
			uni.navigateTo({
				url: `/subpackage/depart/detail?id=${row._id}`,
			});
		},
		// 处理菜单选择
		pickerMenu(item) {
			this.hidePop();
			// 编辑和删除操作会通过API拦截器自动检查登录，这里不需要手动检查
			switch (item) {
				case "编辑":
					uni.navigateTo({
						url: `/subpackage/depart/form?type=update&id=${this.pickerRecordItem._id}`,
					});
					break;
				case "删除":
					this.dialogToggle();
					this.dialogContent = `确定删除记录 '${this.pickerRecordItem.title}' 吗？删除后不可恢复！`;
					break;
			}
		},
		// 图标点击监听
		onIconClick(e, row) {
			// 获取点击位置，uni-app 中 tap 事件使用 e.detail.x 和 e.detail.y
			const clientX = (e.detail?.x ?? e.touches?.[0]?.clientX ?? 300) - 100;
			const clientY = e.detail?.y ?? e.touches?.[0]?.clientY ?? 200;

			this.pickerRecordItem = row;
			this.popStyle = `top:${clientY}px;left:${clientX}px`;
			this.showShade = true;
			this.$nextTick(() => {
				setTimeout(() => {
					this.showPop = true;
				}, 10);
			});
		},
		// 隐藏弹窗
		hidePop() {
			this.showPop = false;
			setTimeout(() => {
				this.showShade = false;
			}, 250);
		},
		// 打开删除确认对话框
		dialogToggle() {
			this.$refs.alertDialog.open();
		},
		// 确认删除
		dialogConfirm() {
			const recordId = this.pickerRecordItem._id;
			const summarizeId = this.pickerRecordItem.summarizeId;
			
			delRecord(recordId)
				.then((res) => {
					if (res.result && (res.result.code === 0 || res.result.code === undefined)) {
						// 删除关联的富文本内容（如果存在）
						if (summarizeId) {
							delSummarize(summarizeId)
								.finally(() => {
									this.showDeleteSuccess();
								});
						} else {
							this.showDeleteSuccess();
						}
					} else {
						uni.showToast({
							title: res.result?.msg || "删除失败",
							icon: "none",
						});
					}
				})
				.catch((err) => {
					uni.showToast({
						title: "删除失败",
						icon: "none",
					});
				});
		},
		// 显示删除成功提示并刷新列表
		showDeleteSuccess() {
			uni.showToast({
				title: "删除成功",
				icon: "success",
			});
			if (this.$refs.paging) {
				this.$refs.paging.refresh();
			}
		},
		// 关闭删除确认对话框
		dialogClose() { },
		// 从抽屉中授权登录
		handleAuthorizeFromDrawer() {
			this.hideModal();
			this.handleAuthorize();
		},
		// 登录成功处理
		handleLoginSuccess() {
			// 清除游客状态（会自动递增 authStateVersion）
			this.$store.commit('SET_IS_GUEST', false);
			uni.showToast({
				title: "登录成功",
				icon: "success"
			});
			// 刷新列表和标签
			this.refreshAfterAuthChange();
		},
		// 授权状态改变后的刷新操作
		refreshAfterAuthChange() {
			// 重置授权失败状态
			this.showAuthFailed = false;
			this.isLoadFailed = false;
			// 重新加载标签列表（授权状态改变后，标签接口返回的数据会不同）
			this.loadTagList();
			// 刷新列表
			this.$nextTick(() => {
				if (this.$refs.paging) {
					this.$refs.paging.reload();
				}
			});
		},
		// 处理默认失败页的重新加载
		handleDefaultReload() {
			if (this.$refs.paging) {
				this.$refs.paging.reload();
			}
		},
		// 登录取消处理
		handleLoginCancel() {
			// 用户取消登录，保持游客状态
		},
		// 跳转到标签管理页面
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

/* 记录卡片 */
.record-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx 24rpx 24rpx;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  .record-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;

    .record-title {
      display: flex;
      align-items: center;
      font-size: 30rpx;
      color: #333;
      flex: 1;
    }

    .record-more-icon {
      width: 56rpx;
      height: 56rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
      margin-left: 16rpx;

      .cuIcon-moreandroid {
        font-size: 40rpx;
      }

      &:active {
        background-color: rgba(0, 0, 0, 0.05);
      }
    }
  }

  .record-tags {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 16rpx;
    gap: 12rpx;

    .record-tag {
      display: inline-block;
      padding: 8rpx 16rpx;
      border-radius: 20rpx;
      font-size: 24rpx;
      font-weight: 500;
      box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.08);
    }
  }

  .record-summary {
    margin-bottom: 16rpx;
    padding: 12rpx 0;
    border-top: 1rpx solid rgba(0, 0, 0, 0.05);
    border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);

    .record-summary-text {
      font-size: 26rpx;
      color: #666;
      line-height: 1.6;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-all;
    }
  }

  .record-footer {
    display: flex;
    align-items: center;
    padding-top: 16rpx;
    border-top: 1rpx solid rgba(0, 0, 0, 0.05);
    opacity: 0.7;
  }
}

/* 浮动操作按钮 FAB */
.fab-button {
  position: fixed;
  bottom: 40rpx;
  right: 40rpx;
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #39b54a 0%, #8dc63f 100%);
  box-shadow: 0 8rpx 24rpx rgba(57, 181, 74, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
  transition: all 0.3s ease;

  .fab-icon {
    color: #ffffff;
    font-size: 48rpx;
    font-weight: 300;
  }
}

/* 遮罩 */
.shade {
  position: fixed;
  z-index: 100;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4rpx);
  -webkit-touch-callout: none;
  animation: fadeIn 0.2s ease;

  .pop {
    position: fixed;
    z-index: 101;
    min-width: 240rpx;
    box-sizing: border-box;
    font-size: 28rpx;
    text-align: left;
    color: #333;
    background-color: #fff;
    border-radius: 16rpx;
    box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
    overflow: hidden;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    user-select: none;
    -webkit-touch-callout: none;
    transform: scale(0, 0);
    transform-origin: center;

    &.show {
      transform: scale(1, 1);
    }

    &>view {
      padding: 24rpx 32rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      user-select: none;
      -webkit-touch-callout: none;
      border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
      transition: background-color 0.2s ease;

      &:last-child {
        border-bottom: none;
      }

      &:active {
        background-color: #f5f7fa;
      }
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

/* 授权失败页面 - 参考 z-paging 默认样式 */
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

.auth-failed-error-btn-rpx {
  font-size: 28rpx;
  padding: 8rpx 24rpx;
  border-radius: 6rpx;
  margin-top: 50rpx;
}

</style>