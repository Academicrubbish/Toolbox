<template>
  <view v-if="domVisible" class="sheet-overlay" :class="{ 'sheet-overlay--visible': showSheet }" @tap="handleClose">
    <view class="sheet" :class="{ 'sheet--visible': showSheet }" @tap.stop @transitionend="onTransitionEnd">
      <!-- 顶部把手 -->
      <view class="sheet-handle"></view>

      <!-- 标题 -->
      <view class="sheet-title">
        <text class="text-bold">新建记录</text>
      </view>

      <!-- Phase 1：选择输入方式 -->
      <view v-if="!contentReady" class="sheet-form">
        <view class="form-row">
          <view class="form-label">
            <text class="text-bold">选择输入方式</text>
          </view>
          <view class="method-grid">
            <view class="method-card" @tap="handleMethodTap('manual')">
              <view class="method-icon">
                <text class="cuIcon-writefill"></text>
              </view>
              <text class="method-name">手动输入</text>
            </view>
            <view class="method-card" @tap="handleMethodTap('ocr')">
              <view class="method-icon">
                <text class="cuIcon-scan"></text>
              </view>
              <text class="method-name">拍照识别</text>
            </view>
            <view class="method-card method-card--disabled" @tap="handleMethodTap('link')">
              <view class="method-icon">
                <text class="cuIcon-link"></text>
              </view>
              <text class="method-name">导入链接</text>
              <text class="method-badge">即将上线</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Phase 2：填写标题 + 标签 + 总结状态 -->
      <view v-else class="sheet-form">
        <view class="form-row">
          <view class="form-label">
            <text class="text-bold">标题</text>
            <text class="text-red">*</text>
          </view>
          <view class="form-input-wrapper">
            <input
              class="form-input"
              type="text"
              v-model="title"
              placeholder="请输入记录标题"
              maxlength="50"
            />
            <text class="char-count text-gray text-xs">{{ title.length }}/50</text>
          </view>
        </view>

        <view class="form-row">
          <view class="form-label">
            <text class="text-bold">标签</text>
            <text class="text-red">*</text>
          </view>
          <view class="tag-select-area">
            <view
              v-for="(tag, index) in tagArray"
              :key="tag._id"
              class="tag-chip"
              :class="{ 'tag-chip--selected': selectedTags.includes(tag._id) }"
              :style="tagStyles[tag._id]"
              @tap="toggleTag(tag._id)"
            >
              <text>{{ tag.name }}</text>
            </view>
          </view>
        </view>

        <view class="form-row">
          <view class="form-label">
            <text class="text-bold">总结</text>
          </view>
          <view class="content-ready">
            <view class="content-ready-info">
              <text class="cuIcon-roundcheckfill text-success"></text>
              <text class="content-ready-text">已完成</text>
            </view>
            <view class="content-ready-reedit" @tap="handleMethodTap('reedit')">重新编辑</view>
          </view>
          <view v-if="summaryPreview" class="summary-preview">
            <text class="summary-preview-text">{{ summaryPreview }}</text>
          </view>
        </view>
      </view>

      <!-- Phase 2：保存按钮 -->
      <view v-if="contentReady" class="sheet-footer">
        <button
          class="submit-btn"
          :class="{ 'submit-btn--disabled': !canSubmit }"
          :disabled="!canSubmit"
          @tap="handleSubmit"
        >保存记录</button>
      </view>
    </view>
  </view>
</template>

<script>
import { getTagColor } from '@/utils/tagColors.js';

export default {
  name: 'CreateSheet',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    tagMap: {
      type: Object,
      default: () => ({})
    },
    /** 编辑器保存后的总结 ID，有值表示内容已就绪 */
    summarizeId: {
      type: String,
      default: ''
    },
    /** 总结内容预览文字 */
    summaryPreview: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      title: '',
      selectedTags: [],
      domVisible: false,
      showSheet: false
    };
  },
  computed: {
    tagArray() {
      return Object.values(this.tagMap || {});
    },
    contentReady() {
      return !!this.summarizeId;
    },
    canSubmit() {
      return this.title.trim() !== ''
        && this.selectedTags.length > 0
        && this.contentReady;
    },
    tagStyles() {
      const styles = {};
      this.tagArray.forEach((tag, index) => {
        const color = getTagColor(index);
        if (this.selectedTags.includes(tag._id)) {
          styles[tag._id] = `background:${color.text};color:#ffffff`;
        } else {
          styles[tag._id] = `background:${color.bg};color:${color.text}`;
        }
      });
      return styles;
    }
  },
  methods: {
    handleClose() {
      this.showSheet = false;
      this.$emit('close');
    },
    toggleTag(tagId) {
      const idx = this.selectedTags.indexOf(tagId);
      if (idx > -1) {
        this.selectedTags.splice(idx, 1);
      } else {
        this.selectedTags.push(tagId);
      }
    },
    handleMethodTap(method) {
      if (method === 'link') {
        uni.showToast({ title: '链接导入即将上线，敬请期待', icon: 'none' });
        return;
      }
      this.$emit('method-select', method);
    },
    handleSubmit() {
      if (!this.canSubmit) return;
      this.$emit('submit', {
        title: this.title.trim(),
        tags: [...this.selectedTags]
      });
      this.reset();
    },
    onTransitionEnd(e) {
      if (e.propertyName === 'transform' && !this.showSheet) {
        this.domVisible = false;
      }
    },
    reset() {
      this.title = '';
      this.selectedTags = [];
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.domVisible = true;
        this.$nextTick(() => { this.showSheet = true });
      } else {
        this.showSheet = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.sheet-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-sheet;
  background: $color-bg-mask;
  opacity: 0;
  visibility: hidden;
  transition: opacity $duration-normal $ease-out, visibility $duration-normal $ease-out;

  &--visible {
    opacity: 1;
    visibility: visible;
  }
}

.sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 75vh;
  background: $color-bg-card;
  border-radius: $radius-card $radius-card 0 0;
  box-shadow: $shadow-sheet;
  transform: translateY(100%);
  transition: transform $duration-slow $ease-out;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &--visible {
    transform: translateY(0);
  }

  &-handle {
    width: 36px;
    height: 5px;
    background: rgba(60, 60, 67, 0.16);
    border-radius: 3px;
    margin: $spacing-sm auto $spacing-xs;
  }

  &-title {
    text-align: center;
    padding: $spacing-xs $spacing-md $spacing-md;
    font-size: 17px;
    color: $color-text-primary;
  }

  &-form {
    flex: 1;
    overflow-y: auto;
    padding: 0 $spacing-md;
  }
}

.form-row {
  margin-bottom: $spacing-lg;

  .form-label {
    font-size: 15px;
    color: $color-text-secondary;
    margin-bottom: $spacing-sm;
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.form-input-wrapper {
  display: flex;
  align-items: center;
  background: $color-bg-input;
  border-radius: $radius-input;
  padding: $spacing-sm $spacing-md;
  position: relative;
}

.form-input {
  flex: 1;
  font-size: 15px;
  color: $color-text-primary;
}

.char-count {
  flex-shrink: 0;
  margin-left: $spacing-xs;
}

.tag-select-area {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
}

.tag-chip {
  padding: 10px 16px;
  min-height: 44px;
  border-radius: $radius-pill;
  background: $color-bg-input;
  border: 1px solid transparent;
  font-size: 13px;
  color: $color-text-secondary;
  transition: all $duration-fast;
}

.tag-chip--selected {
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.method-grid {
  display: flex;
  gap: $spacing-sm;
}

.method-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-md $spacing-sm;
  background: $color-bg-input;
  border-radius: $radius-card;
  transition: all $duration-fast;
  position: relative;

  &:active {
    background: $color-primary-light;
  }

  &--disabled {
    opacity: 0.6;

    &:active {
      background: $color-bg-input;
    }
  }

  .method-icon {
    font-size: 24px;
    color: $color-primary;
    margin-bottom: $spacing-xs;
  }

  .method-name {
    font-size: 13px;
    color: $color-text-secondary;
  }

  .method-badge {
    position: absolute;
    top: -6px;
    right: -4px;
    font-size: 10px;
    color: $color-text-inverse;
    background: $color-primary;
    padding: 1px 6px;
    border-radius: 8px;
    transform: scale(0.85);
  }
}

.sheet-footer {
  padding: $spacing-md $spacing-md;
  padding-bottom: calc(#{$spacing-md} + env(safe-area-inset-bottom));
  border-top: 0.5px solid $color-divider;
}

.submit-btn {
  width: 100%;
  height: 48px;
  background: $color-primary;
  color: $color-text-inverse;
  font-size: 16px;
  font-weight: 600;
  border-radius: $radius-pill;
  border: none;
  transition: opacity $duration-fast;

  &--disabled {
    opacity: 0.5;
  }

  &::after {
    border: none;
  }
}

.content-ready {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md;
  background: $color-success-light;
  border: 1.5px solid rgba(52, 199, 89, 0.15);
  border-radius: $radius-card;

  .content-ready-info {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    .cuIcon-roundcheckfill {
      font-size: 18px;
      color: $color-success;
    }
  }

  .content-ready-text {
    font-size: 15px;
    font-weight: 600;
    color: $color-success;
  }

  .content-ready-reedit {
    font-size: 13px;
    color: $color-primary;
    font-weight: 500;
  }
}

.summary-preview {
  margin-top: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  background: $color-bg-input;
  border-radius: $radius-input;
  max-height: 100px;
  overflow: hidden;

  .summary-preview-text {
    font-size: 13px;
    color: $color-text-tertiary;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-all;
  }
}
</style>
