<template>
  <view class="home-page">
    <view class="record-container">
      <z-paging ref="paging" v-model="flatRecordList" @query="queryList">
        <view slot="top">
          <nav-bar
            showMenu
            @menu-click="sidebarVisible = true"
            title="markdown"
          >
          </nav-bar>
        </view>

        <!-- 搜索框 -->
        <view slot="top" class="search-container">
          <view class="search-box">
            <view class="search-icon">
              <text class="cuIcon-search text-gray"></text>
            </view>
            <input
              class="search-input"
              type="text"
              v-model="searchKeyword"
              placeholder="搜索标题、时间或内容..."
              @input="onSearchInput"
              @confirm="handleSearch"
              :focus="isSearchMode"
            />
            <view v-if="searchKeyword" class="search-clear" @tap="clearSearch">
              <text class="cuIcon-close text-gray"></text>
            </view>
          </view>
          <view
            v-if="searchKeyword && searchKeyword.trim()"
            class="search-reset"
            @tap="clearSearch"
          >
            <text class="cuIcon-refresh text-gray"></text>
            <text class="search-reset-text">重置</text>
          </view>
        </view>

        <!-- 标签筛选横滑条 -->
        <view slot="top" class="tag-filter-bar">
          <scroll-view scroll-x class="tag-scroll" show-scrollbar="false">
            <view class="tag-scroll-content">
              <view
                class="tag-filter-item"
                :class="{ 'tag-filter-item--active': selectedTagId === '' }"
                @tap="handleTagFilter('')"
              >
                <text>全部</text>
              </view>
              <view
                v-for="tag in tagList"
                :key="tag._id"
                class="tag-filter-item"
                :class="{
                  'tag-filter-item--active': selectedTagId === tag._id,
                }"
                @tap="handleTagFilter(tag._id)"
              >
                <text>{{ tag.name }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 自定义授权失败页面 -->
        <view slot="empty" slot-scope="{ isLoadFailed: slotIsLoadFailed }">
          <view
            v-if="showAuthFailed"
            class="auth-failed-container auth-failed-container-fixed"
          >
            <view class="auth-failed-main">
              <image
                class="auth-failed-image-rpx"
                :src="zStatic.base64Error"
                mode="aspectFit"
              />
              <text class="auth-failed-title auth-failed-title-rpx"
                >当前用户未授权，无法查询到信息</text
              >
              <text class="auth-failed-title auth-failed-title-rpx"
                >请授权后再尝试加载</text
              >
              <text
                class="auth-failed-error-btn auth-failed-error-btn-rpx"
                @click.stop="handleAuthorize"
                >授权登录</text
              >
            </view>
          </view>
          <z-paging-empty-view
            v-else
            :isLoadFailed="slotIsLoadFailed || isLoadFailed"
            @reload="handleDefaultReload"
          />
        </view>

        <!-- 记录列表 -->
        <view
          v-for="item in groupedRecordList"
          :key="item.date"
          class="date-group"
        >
          <!-- 日期标题 -->
          <view class="date-header">
            <text class="section-date-title">{{ item.date }}</text>
            <text class="date-count text-gray text-xs"
              >{{ item.count }} 条记录</text
            >
          </view>

          <!-- 记录卡片列表 -->
          <view class="record-card-list">
            <record-card
              v-for="record in item.children"
              :key="record._id"
              :record="record"
              :tagMap="tagMap"
              :tagList="tagList"
              :aiNoteCount="getAiNoteCount(record)"
              @card-tap="goDetail"
              @card-longpress="onCardLongPress"
              @ai-note-click="goLearnResult"
            />
          </view>
        </view>
      </z-paging>

      <!-- 长按弹窗 -->
      <context-popup
        ref="contextPopup"
        :buttons="popButton"
        @select="pickerMenu"
      />

      <!-- 新增记录按钮 - FAB -->
      <fab-button @click="addRecord" />

      <!-- 删除提示 -->
      <uni-popup ref="alertDialog" type="dialog">
        <uni-popup-dialog
          type="warn"
          title="提醒"
          :content="dialogContent"
          cancelText="取消"
          confirmText="确定"
          @confirm="dialogConfirm"
        />
      </uni-popup>

      <!-- 侧边栏 -->
      <sidebar
        :visible="sidebarVisible"
        :isGuest="isGuest"
        :appVersion="appVersion"
        @close="sidebarVisible = false"
        @navigate="handleNavigate"
        @login="handleAuthorize"
      />

      <!-- 快速创建 Sheet -->
      <create-sheet
        :visible="sheetVisible"
        :tagMap="tagMap"
        :summarizeId="pendingSummarizeId"
        :summaryPreview="summaryPreview"
        @close="handleSheetClose"
        @method-select="handleMethodSelect"
        @submit="handleSheetSubmit"
      />
    </view>

    <!-- 登录授权弹窗 -->
    <login-modal ref="loginModal" @success="handleLoginSuccess" />
  </view>
</template>
<script>
import { getRecordList, searchRecord, addRecord } from "@/api/record.js";
import { getDictCategoryList } from "@/api/dictCategory.js";
import { batchQueryAiResults } from "@/api/aiLearn.js";
import { deleteRecordCascade } from "@/utils/record-delete.js";
import { delSummarize, getSummarize } from "@/api/summarize";
import { groupRecordsByDate } from "@/utils/format";
import zStatic from "@/uni_modules/z-paging/components/z-paging/js/z-paging-static.js";
import zPagingEmptyView from "@/uni_modules/z-paging/components/z-paging-empty-view/z-paging-empty-view.vue";

import LoginModal from "@/component/login-modal/index.vue";
import ContextPopup from "@/component/context-popup/index.vue";
import FabButton from "@/component/fab-button/index.vue";
import RecordCard from "@/component/record-card/index.vue";
import NavBar from "@/component/nav-bar/index.vue";
import Sidebar from "@/component/sidebar/index.vue";
import CreateSheet from "@/component/create-sheet/index.vue";
import { setLoginModalRef } from "@/utils/api-auth.js";
import { processOcr, processLinkImport } from "@/utils/record-create.js";
import moment from "moment";

export default {
  components: {
    LoginModal,
    ContextPopup,
    FabButton,
    RecordCard,
    NavBar,
    Sidebar,
    CreateSheet,
    zPagingEmptyView,
  },
  data() {
    return {
      StatusBar: this.StatusBar || 0,
      CustomBar: this.CustomBar || 0,
      modalName: null,
      flatRecordList: [],
      tagMap: {},
      tagList: [],
      popButton: ["编辑", "删除"],
      pickerRecordItem: null,
      dialogContent: "",
      showAuthFailed: false,
      isLoadFailed: false,
      zStatic,
      lastAuthStateVersion: 0,
      lastIsGuest: null,
      searchKeyword: "",
      isSearchMode: false,
      aiResultMap: {},
      appVersion: "1.0.0",
      sidebarVisible: false,
      sheetVisible: false,
      selectedTagId: "",
      totalRecordCount: 0,
      sheetCreationMode: false,
      pendingSummarizeId: "",
      summaryPreview: "",
    };
  },
  computed: {
    isGuest() {
      return this.$store.state.user.isGuest;
    },
    filteredRecordList() {
      if (!this.selectedTagId) return this.flatRecordList;
      return this.flatRecordList.filter(
        (record) => record.tags && record.tags.includes(this.selectedTagId),
      );
    },
    groupedRecordList() {
      return groupRecordsByDate(this.filteredRecordList);
    },
  },

  mounted() {
    this.loadTagList();
    try {
      const accountInfo = uni.getAccountInfoSync();
      this.appVersion = accountInfo.miniProgram.version || "开发版";
    } catch (e) {
      this.appVersion = "开发版";
    }
    this.lastAuthStateVersion = this.$store.state.user.authStateVersion;
    this.lastIsGuest = this.$store.state.user.isGuest;
    this.$nextTick(() => {
      if (this.$refs.loginModal) {
        setLoginModalRef(this.$refs.loginModal);
      }
    });
  },
  onShow() {
    // 监听记录变更事件（详情页删除/编辑后触发）
    if (!this._onRecordChanged) {
      this._onRecordChanged = () => {
        if (this.$refs.paging) this.$refs.paging.refresh();
      };
    }
    uni.$on("record-changed", this._onRecordChanged);

    const currentAuthStateVersion = this.$store.state.user.authStateVersion;
    const currentIsGuest = this.$store.state.user.isGuest;

    if (
      this.lastAuthStateVersion !== currentAuthStateVersion ||
      (this.lastIsGuest === true && currentIsGuest === false)
    ) {
      this.refreshAfterAuthChange();
      this.lastAuthStateVersion = currentAuthStateVersion;
      this.lastIsGuest = currentIsGuest;
    }

    // Sheet 创建模式：编辑器返回后持有 summarizeId，Sheet 自动进入 Phase 2
    if (this.sheetCreationMode) {
      const sid = this.$store.state.summarize.summarizeId;
      if (sid) {
        this.pendingSummarizeId = sid;
        this.fetchSummaryPreview(sid);
        this.$store.dispatch("deleteSummary");
        this.sheetCreationMode = false;
      }
    }
  },
  onHide() {
    uni.$off("record-changed", this._onRecordChanged);
  },
  watch: {
    "$store.state.user.authStateVersion": {
      handler(newVersion, oldVersion) {
        if (
          newVersion !== oldVersion &&
          newVersion > this.lastAuthStateVersion
        ) {
          this.refreshAfterAuthChange();
          this.lastAuthStateVersion = newVersion;
          this.lastIsGuest = this.$store.state.user.isGuest;
        }
      },
      immediate: false,
    },
  },
  methods: {
    loadTagList() {
      getDictCategoryList()
        .then((res) => {
          if (res?.result?.data && Array.isArray(res.result.data)) {
            this.tagList = res.result.data;
            this.tagMap = res.result.data.reduce((map, tag) => {
              map[tag._id] = tag;
              return map;
            }, {});
          }
        })
        .catch(() => {});
    },
    queryList(pageNo, pageSize) {
      const queryPromise =
        this.searchKeyword && this.searchKeyword.trim()
          ? searchRecord(
              {
                keyword: this.searchKeyword.trim(),
                pageNum: pageNo,
                pageSize: pageSize,
              },
              { autoShowLogin: false },
            )
          : getRecordList(
              {
                pageNum: pageNo,
                pageSize: pageSize,
              },
              { autoShowLogin: false },
            );

      queryPromise
        .then((res) => {
          this.showAuthFailed = false;
          this.isLoadFailed = false;
          const list = res.result.data || [];
          this.totalRecordCount = list.length;
          this.fetchAiResults(list);
          this.$refs.paging.complete(list);
        })
        .catch((err) => {
          const errorMessage = err?.message || err?.errMsg || String(err || "");
          const isAuthError =
            errorMessage.includes("未授权") ||
            errorMessage.includes("用户未授权") ||
            errorMessage.includes("用户取消登录");
          this.showAuthFailed = isAuthError;
          this.isLoadFailed = !isAuthError;
          this.$nextTick(() => {
            this.$refs.paging.complete(false);
          });
        });
    },
    getAiNoteCount(record) {
      const item = this.aiResultMap[record._id];
      return item && item.hasAiNote ? item.aiNoteCount : 0;
    },
    goLearnResult(record) {
      uni.navigateTo({
        url: `/subpackage/depart/learn-result?recordId=${record._id}`,
      });
    },
    fetchAiResults(list) {
      if (!list || list.length === 0) return;
      const recordIds = list.map((item) => item._id);
      batchQueryAiResults(recordIds)
        .then((resultMap) => {
          this.aiResultMap = resultMap;
        })
        .catch(() => {
          this.aiResultMap = {};
        });
    },
    isExampleRecord(record) {
      return !record.createBy || record.createBy === "";
    },
    pickerMenu({ action, item }) {
      if (this.isExampleRecord(item)) {
        uni.showToast({ title: "示例记录不支持此操作", icon: "none" });
        return;
      }
      this.pickerRecordItem = item;
      switch (action) {
        case "编辑":
          uni.navigateTo({
            url: `/subpackage/depart/form?type=update&id=${item._id}`,
          });
          break;
        case "删除":
          this.dialogToggle();
          this.dialogContent = `确定删除记录 '${item.title}' 吗？删除后不可恢复！`;
          break;
      }
    },
    onCardLongPress(e, record) {
      this.pickerRecordItem = record;
      this.$refs.contextPopup.show(e, record);
    },
    handleAuthorize() {
      if (this.$refs.loginModal) {
        this.$refs.loginModal.open();
      }
    },
    addRecord() {
      this.pendingSummarizeId = "";
      this.summaryPreview = "";
      this.sheetVisible = true;
    },
    handleSheetClose() {
      this.sheetVisible = false;
      if (this.pendingSummarizeId) {
        delSummarize(this.pendingSummarizeId);
      }
      this.pendingSummarizeId = "";
      this.summaryPreview = "";
    },
    fetchSummaryPreview(summarizeId) {
      getSummarize(summarizeId)
        .then((res) => {
          const d = res.result && res.result.data && res.result.data[0];
          const content = d ? d.content : "";
          const text = content
            .replace(/[#*`\[\]()>_~-]/g, "")
            .replace(/\n+/g, " ")
            .trim();
          this.summaryPreview =
            text.substring(0, 60) + (text.length > 60 ? "..." : "");
        })
        .catch(() => {
          this.summaryPreview = "";
        });
    },
    async handleMethodSelect(method) {
      // 游客只能使用手动输入
      if ((method === "ocr" || method === "link") && this.isGuest) {
        uni.showToast({
          title: "请先登录后再使用此功能",
          icon: "none",
          duration: 2000,
        });
        return;
      }
      this.sheetCreationMode = true;
      if (method === "manual") {
        uni.navigateTo({ url: "/subpackage/summarize/index?id=" });
      } else if (method === "ocr") {
        const ok = await processOcr(this.$store);
        if (ok) {
          uni.navigateTo({ url: "/subpackage/summarize/index?id=" });
        } else {
          this.sheetCreationMode = false;
        }
      } else if (method === "link") {
        const result = await processLinkImport(this.$store);
        if (result) {
          uni.navigateTo({ url: "/subpackage/summarize/index?id=" });
        } else {
          this.sheetCreationMode = false;
        }
      } else if (method === "reedit") {
        this.sheetCreationMode = true;
        uni.navigateTo({
          url: `/subpackage/summarize/index?id=${this.pendingSummarizeId}`,
        });
      }
    },
    handleSheetSubmit({ title, tags }) {
      this.sheetVisible = false;
      const data = {
        title,
        tags,
        summarizeId: this.pendingSummarizeId,
        createTime: moment().format("YYYY-MM-DD HH:mm:ss"),
        updateTime: moment().format("YYYY-MM-DD HH:mm:ss"),
        createBy: this.$store.state.user.openid,
      };
      addRecord(data)
        .then((res) => {
          if (
            res.result &&
            (res.result.code === 0 || res.result.code === undefined)
          ) {
            this.pendingSummarizeId = "";
            this.summaryPreview = "";
            uni.showToast({ title: "保存成功", icon: "success" });
            if (this.$refs.paging) {
              this.$refs.paging.refresh();
            }
          } else {
            uni.showToast({
              title: res.result?.msg || "保存失败",
              icon: "none",
            });
          }
        })
        .catch(() => {
          uni.showToast({ title: "保存失败", icon: "none" });
        });
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
      deleteRecordCascade(recordId, summarizeId)
        .then(() => {
          this.showDeleteSuccess();
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
    dialogClose() {},
    handleLoginSuccess() {
      this.$store.commit("SET_IS_GUEST", false);
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
    onSearchInput(e) {
      this.searchKeyword = e.detail.value || "";
    },
    handleSearch() {
      if (!this.searchKeyword || !this.searchKeyword.trim()) {
        uni.showToast({ title: "请输入搜索关键词", icon: "none" });
        return;
      }
      this.isSearchMode = true;
      if (this.$refs.paging) {
        this.$refs.paging.reload();
      }
    },
    clearSearch() {
      this.searchKeyword = "";
      this.isSearchMode = false;
      if (this.$refs.paging) {
        this.$refs.paging.reload();
      }
    },
    handleTagFilter(tagId) {
      this.selectedTagId = tagId;
    },
    handleQuickAction(action) {
      if (action === "ocr" || action === "link") {
        this.addRecord();
      } else if (action === "ai-history") {
        uni.navigateTo({ url: "/subpackage/depart/ai-history" });
      }
    },
    handleNavigate(url) {
      uni.navigateTo({ url });
    },
  },
};
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background: $color-bg-page;
}

.record-container {
  position: relative;
  min-height: 100vh;
  padding-bottom: 80px;
}

/* 搜索框容器 */
.search-container {
  padding: $spacing-sm $spacing-md;
  background: $color-bg-card;
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: $color-bg-input;
  border-radius: $radius-pill;
  padding: 0 $spacing-md;
  height: 36px;
  position: relative;

  .search-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: $spacing-xs;
    flex-shrink: 0;

    .cuIcon-search {
      font-size: 16px;
    }
  }
}

.search-input {
  flex: 1;
  font-size: 14px;
  color: $color-text-primary;
  height: 36px;
  line-height: 36px;
}

.search-clear {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: $spacing-xs;
  flex-shrink: 0;

  .cuIcon-close {
    font-size: 14px;
  }
}

.search-reset {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 $spacing-sm;
  height: 36px;
  background: $color-bg-input;
  border-radius: $radius-pill;
  flex-shrink: 0;

  .cuIcon-refresh {
    font-size: 14px;
    margin-right: 4px;
  }

  .search-reset-text {
    font-size: 13px;
    color: $color-text-tertiary;
  }
}

/* 标签筛选横滑条 */
.tag-filter-bar {
  background: $color-bg-card;
  padding: $spacing-xs $spacing-md $spacing-sm;
  border-bottom: 0.5px solid $color-divider;
}

.tag-scroll {
  white-space: nowrap;
}

.tag-scroll-content {
  display: inline-flex;
  gap: $spacing-xs;
}

.tag-filter-item {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: $radius-pill;
  background: $color-bg-input;
  font-size: 13px;
  color: $color-text-secondary;
  transition: all $duration-fast;
  white-space: nowrap;

  &--active {
    background: $color-primary;
    color: #fff;
  }

  :active {
    opacity: 0.8;
  }
}

/* 日期分组 */
.date-group {
  padding: $spacing-md $spacing-md 0;
}

/* 日期标题 */
.date-header {
  display: flex;
  align-items: center;
  margin-bottom: $spacing-sm;
  padding: 0 $spacing-xs;

  .section-date-title {
    font-size: 11px;
    font-weight: 700;
    color: $color-text-tertiary;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .date-count {
    margin-left: $spacing-xs;
  }
}

/* 记录卡片列表 */
.record-card-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

/* 授权失败页面 */
.auth-failed-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-failed-container-fixed {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.auth-failed-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50rpx 0;
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
  padding: 0 20rpx;
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
