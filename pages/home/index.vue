<template>
  <view class="home-page">
    <view class="record-container">
      <z-paging
        ref="paging"
        v-model="flatRecordList"
        :auto="false"
        @query="queryList"
      >
        <view slot="top">
          <nav-bar
            showMenu
            :showMenuBadge="showGuestLoginHint"
            @menu-click="sidebarVisible = true"
            title="Markdown"
          >
          </nav-bar>
        </view>

        <!-- 搜索框（游客模式隐藏：搜索依赖登录态，游客无可搜的个人数据） -->
        <view v-if="!isGuest" slot="top" class="search-container">
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

        <!-- 语义服务降级提示 -->
        <view
          v-if="searchDegraded && searchKeyword && searchKeyword.trim()"
          slot="top"
          class="degraded-tip"
        >
          <text class="cuIcon-infofill text-gray text-xs"></text>
          <text class="degraded-tip-text">当前为普通搜索（语义服务暂不可用）</text>
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
                class="auth-failed-image"
                :src="zStatic.base64Error"
                mode="aspectFit"
              />
              <text class="auth-title">需要授权才能查看</text>
              <text class="auth-failed-text">登录后可保存和管理您的记录</text>
              <button
                class="auth-btn"
                @click.stop="handleAuthorize"
              >授权登录</button>
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
              :matchType="record.matchType || ''"
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
        ref="createSheet"
        :visible="sheetVisible"
        :tagMap="tagMap"
        :summarizeId="pendingSummarizeId"
        :summaryPreview="summaryPreview"
        :submitting="recordSaving"
        @close="handleSheetClose"
        @method-select="handleMethodSelect"
        @submit="handleSheetSubmit"
        @draft-change="handleDraftChange"
      />
    </view>

    <!-- 登录授权弹窗 -->
    <login-modal
      ref="loginModal"
      @success="handleLoginSuccess"
      @cancel="handleLoginCancel"
    />
  </view>
</template>
<script>
import {
  getRecordList,
  getRecordBySummarizeId,
  addRecord,
} from "@/api/record.js";
import { semanticSearch } from "@/api/kb.js";
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
import { setLoginModalRef, notifyLoginResult } from "@/utils/api-auth.js";
import { processOcr, processLinkImport } from "@/utils/record-create.js";
import moment from "moment";

const {
  buildRecordScopeKey,
  shouldAcceptRecordQuery,
} = require("../../utils/record-query-state.js");
const {
  saveRecordDraft,
  getRecordDraft,
  clearRecordDraft,
} = require("../../utils/record-draft.js");

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
      searchKeyword: "",
      isSearchMode: false,
      searchDegraded: false,
      aiResultMap: {},
      appVersion: "1.0.0",
      sidebarVisible: false,
      sheetVisible: false,
      selectedTagId: "",
      totalRecordCount: 0,
      sheetCreationMode: false,
      pendingSummarizeId: "",
      summaryPreview: "",
      recordQueryId: 0,
      loadedRecordScope: "",
      pendingRecordScopeReload: false,
      recordReloadScheduled: false,
      isPageVisible: false,
      initialRecordLoadStarted: false,
      recordSaving: false,
      draftRecoveryScope: "",
      draftRecoveryChecking: false,
      draftRecoveryPromptVisible: false,
    };
  },
  computed: {
    isGuest() {
      return this.$store.state.user.isGuest;
    },
    authInitialized() {
      return this.$store.state.user.authInitialized;
    },
    showGuestLoginHint() {
      return this.authInitialized && this.isGuest;
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
    recordScopeKey() {
      return buildRecordScopeKey(this.$store.state.user);
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
    this.$nextTick(() => {
      if (this.$refs.loginModal) {
        setLoginModalRef(this.$refs.loginModal);
      }
      this.ensureInitialRecordLoad();
    });
  },
  onShow() {
    this.isPageVisible = true;
    this.ensureInitialRecordLoad();

    // 子页面（表单/详情）修改数据后设置脏标记，返回首页时统一刷新
    // 说明：原事件总线方案在首页 onHide 后监听器已注销，收不到子页面事件，改用 globalData 脏标记
    let recordDirty = false;
    if (getApp().globalData && getApp().globalData.recordDirty) {
      getApp().globalData.recordDirty = false;
      recordDirty = true;
    }

    // 登录可能发生在编辑子页。返回首页时必须核对当前列表是否仍属于同一身份。
    const scopeChanged = this.loadedRecordScope
      && this.loadedRecordScope !== this.recordScopeKey;
    if (this.pendingRecordScopeReload || scopeChanged) {
      this.refreshAfterAuthChange();
    } else if (recordDirty && this.$refs.paging) {
      this.$refs.paging.refresh();
    }

    // Sheet 创建模式：编辑器返回后持有 summarizeId，Sheet 自动进入 Phase 2
    if (this.sheetCreationMode) {
      const sid = this.$store.state.summarize.summarizeId;
      if (sid) {
        const storedDraft = getRecordDraft(this.$store.state.user.openid);
        const draft = storedDraft?.summarizeId === sid
          ? storedDraft
          : saveRecordDraft({
            openid: this.$store.state.user.openid,
            summarizeId: sid,
          });
        this.activateRecordDraft(draft || { summarizeId: sid });
        this.$store.dispatch("deleteSummary");
      }
      this.sheetCreationMode = false;
    }

    this.checkUnfinishedRecordDraft();
  },
  onHide() {
    this.isPageVisible = false;
  },
  watch: {
    authInitialized: {
      handler(initialized) {
        if (initialized) {
          this.ensureInitialRecordLoad();
          this.checkUnfinishedRecordDraft();
        }
      },
      immediate: false,
    },
    recordScopeKey: {
      handler(newScope, oldScope) {
        if (newScope !== oldScope) {
          this.handleRecordScopeChange();
        }
      },
      immediate: false,
    },
  },
  methods: {
    ensureInitialRecordLoad() {
      if (!this.authInitialized || this.initialRecordLoadStarted) return;
      if (!this.$refs.paging) {
        this.pendingRecordScopeReload = true;
        return;
      }
      this.initialRecordLoadStarted = true;
      this.pendingRecordScopeReload = true;
      this.refreshAfterAuthChange();
    },
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
      const requestId = ++this.recordQueryId;
      const requestScope = this.recordScopeKey;
      const queryPromise =
        this.searchKeyword && this.searchKeyword.trim()
          ? semanticSearch(
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
          if (!shouldAcceptRecordQuery({
            requestId,
            latestRequestId: this.recordQueryId,
            requestScope,
            currentScope: this.recordScopeKey,
          })) {
            return;
          }

          this.showAuthFailed = false;
          this.isLoadFailed = false;
          // 语义服务不可用时云函数返回 degraded，结果仍是关键词搜索
          this.searchDegraded = !!res.result.degraded;
          const list = res.result.data || [];
          this.loadedRecordScope = requestScope;
          this.pendingRecordScopeReload = false;
          this.totalRecordCount = list.length;
          this.fetchAiResults(list);
          if (this.$refs.paging) {
            this.$refs.paging.complete(list);
          }
        })
        .catch((err) => {
          if (!shouldAcceptRecordQuery({
            requestId,
            latestRequestId: this.recordQueryId,
            requestScope,
            currentScope: this.recordScopeKey,
          })) {
            return;
          }

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
          // 合并而非整体替换：z-paging 列表跨页累加，替换会把已加载页的 AI 徽章清掉
          this.aiResultMap = Object.assign({}, this.aiResultMap, resultMap);
        })
        .catch(() => {
          // 查询失败保留旧数据，避免已显示的徽章闪烁消失
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
      const draft = this.getCurrentRecordDraft();
      if (draft) {
        this.offerRecordDraftRecovery(draft, true);
        return;
      }
      this.startNewRecord();
    },
    startNewRecord() {
      this.pendingSummarizeId = "";
      this.summaryPreview = "";
      this.sheetVisible = true;
    },
    handleSheetClose() {
      this.sheetVisible = false;
      if (!this.pendingSummarizeId) {
        this.summaryPreview = "";
        return;
      }

      const summarizeId = this.pendingSummarizeId;
      uni.showModal({
        title: "记录尚未完成",
        content: "正文已经保存，还需要填写标题和标签。确定放弃将删除刚才保存的正文。",
        confirmText: "放弃内容",
        confirmColor: "#FF3B30",
        cancelText: "继续填写",
        success: (res) => {
          if (res.confirm) {
            clearRecordDraft(
              this.$store.state.user.openid,
              summarizeId,
            );
            this.pendingSummarizeId = "";
            this.summaryPreview = "";
            if (this.$refs.createSheet) {
              this.$refs.createSheet.reset();
            }
            delSummarize(summarizeId).catch(() => {
              uni.showToast({ title: "草稿清理失败", icon: "none" });
            });
          } else {
            this.sheetVisible = true;
          }
        },
        fail: () => {
          this.sheetVisible = true;
        },
      });
    },
    getCurrentRecordDraft() {
      const openid = this.$store.state.user.openid;
      if (this.isGuest || !openid) return null;
      return getRecordDraft(openid);
    },
    handleDraftChange({ title, tags }) {
      const openid = this.$store.state.user.openid;
      if (!openid || !this.pendingSummarizeId) return;
      const current = getRecordDraft(openid);
      saveRecordDraft({
        openid,
        summarizeId: this.pendingSummarizeId,
        title,
        tags,
        savedAt: current?.summarizeId === this.pendingSummarizeId
          ? current.savedAt
          : Date.now(),
      });
    },
    activateRecordDraft(draft) {
      if (!draft || !draft.summarizeId) return;
      this.pendingSummarizeId = draft.summarizeId;
      this.sheetVisible = true;
      this.draftRecoveryScope = this.recordScopeKey;
      this.fetchSummaryPreview(draft.summarizeId);
      this.$nextTick(() => {
        if (this.$refs.createSheet) {
          this.$refs.createSheet.restoreDraft(draft);
        }
      });
    },
    checkUnfinishedRecordDraft() {
      if (
        !this.authInitialized
        || this.isGuest
        || !this.isPageVisible
        || this.pendingSummarizeId
        || this.draftRecoveryScope === this.recordScopeKey
      ) {
        return;
      }

      this.draftRecoveryScope = this.recordScopeKey;
      const draft = this.getCurrentRecordDraft();
      if (draft) {
        this.offerRecordDraftRecovery(draft, false);
      }
    },
    offerRecordDraftRecovery(draft, fromCreateAction) {
      if (this.draftRecoveryChecking || this.draftRecoveryPromptVisible) return;
      this.draftRecoveryChecking = true;
      getRecordBySummarizeId(draft.summarizeId)
        .then((recordRes) => {
          const existingRecord = recordRes?.result?.data?.[0];
          if (existingRecord) {
            clearRecordDraft(draft.openid, draft.summarizeId);
            if (this.$refs.paging) this.$refs.paging.refresh();
            if (fromCreateAction) this.startNewRecord();
            return null;
          }
          return getSummarize(draft.summarizeId);
        })
        .then((res) => {
          if (!res) return;
          const summary = res?.result?.data?.[0];
          if (!summary) {
            clearRecordDraft(draft.openid, draft.summarizeId);
            if (fromCreateAction) this.startNewRecord();
            return;
          }
          this.showDraftRecoveryPrompt(draft);
        })
        .catch(() => {
          if (fromCreateAction) {
            uni.showToast({ title: "草稿检查失败，请重试", icon: "none" });
          }
        })
        .finally(() => {
          this.draftRecoveryChecking = false;
        });
    },
    showDraftRecoveryPrompt(draft) {
      this.draftRecoveryPromptVisible = true;
      uni.showModal({
        title: "发现未完成记录",
        content: "上次的正文已经保存，是否继续填写标题和标签？",
        confirmText: "继续完成",
        cancelText: "稍后处理",
        success: (res) => {
          if (res.confirm) this.activateRecordDraft(draft);
        },
        complete: () => {
          this.draftRecoveryPromptVisible = false;
        },
      });
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
      if (this.recordSaving) return;
      this.recordSaving = true;
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
            clearRecordDraft(
              this.$store.state.user.openid,
              this.pendingSummarizeId,
            );
            this.sheetVisible = false;
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
        .catch((err) => {
          const errorMessage = err?.message || err?.errMsg || "保存失败，请重试";
          uni.showToast({ title: errorMessage, icon: "none" });
        })
        .finally(() => {
          this.recordSaving = false;
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
      notifyLoginResult(true);
    },
    handleRecordScopeChange() {
      // 立即作废登录前仍在飞行中的游客请求，并清空不属于当前身份的旧列表。
      this.recordQueryId += 1;
      this.loadedRecordScope = "";
      this.flatRecordList = [];
      this.aiResultMap = {};
      this.totalRecordCount = 0;
      this.searchKeyword = "";
      this.isSearchMode = false;
      this.searchDegraded = false;
      this.pendingRecordScopeReload = true;
      this.draftRecoveryScope = "";

      if (this.isPageVisible) {
        this.refreshAfterAuthChange();
        this.$nextTick(() => this.checkUnfinishedRecordDraft());
      }
    },
    refreshAfterAuthChange() {
      this.showAuthFailed = false;
      this.isLoadFailed = false;
      this.loadTagList();
      this.pendingRecordScopeReload = false;

      if (this.recordReloadScheduled) return;
      this.recordReloadScheduled = true;
      this.$nextTick(() => {
        this.recordReloadScheduled = false;
        if (!this.isPageVisible || !this.$refs.paging) {
          this.pendingRecordScopeReload = true;
          return;
        }

        const reloadPromise = this.$refs.paging.reload();
        if (reloadPromise && typeof reloadPromise.catch === "function") {
          reloadPromise.catch(() => {});
        }
      });
    },
    handleDefaultReload() {
      if (this.$refs.paging) {
        this.$refs.paging.reload();
      }
    },
    handleLoginCancel() {
      notifyLoginResult(false);
    },
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
      this.searchDegraded = false;
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
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: $spacing-xs;
  margin-right: -10px;
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

/* 语义降级提示条 */
.degraded-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: $spacing-xs $spacing-md;
  background: $color-bg-input;
  border-bottom: 0.5px solid $color-divider;

  .degraded-tip-text {
    font-size: 12px;
    color: $color-text-tertiary;
  }
}

/* 标签筛选横滑条 */
.tag-filter-bar {
  background: $color-bg-card;
  padding: $spacing-xs $spacing-md $spacing-sm;
  border-bottom: 0.5px solid $color-divider;
  position: relative;
}

.tag-filter-bar::after {
  content: '';
  position: absolute;
  right: 0;
  top: $spacing-xs;
  bottom: $spacing-sm;
  width: 40px;
  background: linear-gradient(to right, transparent, $color-bg-card);
  pointer-events: none;
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
    color: $color-text-inverse;
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
    color: $color-text-secondary;
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
  padding: 80px $spacing-xl;
}

.auth-failed-image {
  width: 120px;
  height: 120px;
  margin-bottom: $spacing-lg;
}

.auth-title {
  font-size: 16px;
  font-weight: 600;
  color: $color-text-secondary;
  margin-bottom: $spacing-sm;
}

.auth-failed-text {
  font-size: 13px;
  color: $color-text-secondary;
  text-align: center;
}

.auth-btn {
  margin-top: $spacing-xxl;
  height: 44px;
  padding: 0 $spacing-xl;
  background: $color-primary;
  color: $color-text-inverse;
  border: none;
  border-radius: $radius-pill;
  font-size: 15px;
  font-weight: 600;

  &::after {
    border: none;
  }
}
</style>
