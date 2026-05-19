<template>
	<view class="record-card" @tap="handleTap" @longpress="handleLongPress">
		<!-- 左侧色条 -->
		<view class="record-card-bar" :style="'background:' + barColor"></view>

		<view class="record-card-header">
			<view class="record-title">
				<text class="cuIcon-creativefill text-primary text-xs margin-right-xs"></text>
				<text class="text-bold">{{ record.title }}</text>
			</view>
		</view>

		<view v-if="record.tags && record.tags.length > 0" class="record-tags">
			<view
				v-for="(tagId, index) in record.tags"
				:key="tagId"
				class="record-tag"
				:style="'background:' + getTagColor(index).bg + ';color:' + getTagColor(index).text"
			>
				<text>{{ getTagName(tagId) }}</text>
			</view>
		</view>

		<view v-if="record.summarizeContent" class="record-summary">
			<text class="record-summary-text">{{ summaryText }}</text>
		</view>

		<view class="record-footer">
			<text class="cuIcon-timefill text-gray text-xs margin-right-xs"></text>
			<text class="record-time text-gray text-xs">{{ formattedTime }}</text>
			<view v-if="aiNoteCount > 0" class="ai-badge" @tap.stop="onAiNoteClick">
				<text class="cuIcon-creativefill text-xs"></text>
				<text class="ai-badge-text text-xs">AI笔记{{ aiNoteCount > 1 ? " " + aiNoteCount + "篇" : "" }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { getTagColor } from "@/utils/tagColors";
import { formatRelativeTime, formatSummaryContent } from "@/utils/format";

export default {
	props: {
		record: {
			type: Object,
			required: true,
		},
		tagMap: {
			type: Object,
			default: () => ({}),
		},
		tagList: {
			type: Array,
			default: () => [],
		},
		aiNoteCount: {
			type: Number,
			default: 0,
		},
	},
	data() {
		return {};
	},
	computed: {
		getTagName() {
			return (tagId) => this.tagMap[tagId] ? this.tagMap[tagId].name : '未知标签';
		},
		formattedTime() {
			return formatRelativeTime(this.record.createTime);
		},
		summaryText() {
			return formatSummaryContent(this.record.summarizeContent);
		},
		barColor() {
			const firstTagId = this.record.tags && this.record.tags[0];
			if (!firstTagId) return getTagColor(0).bar;
			const index = this.tagList.findIndex(t => t._id === firstTagId);
			if (index === -1) return getTagColor(0).bar;
			return getTagColor(index).bar;
		},
	},
	methods: {
		getTagColor,
		handleTap() {
			this.$emit('card-tap', this.record);
		},
		handleLongPress(e) {
			this.$emit('card-longpress', e, this.record);
		},
		onAiNoteClick() {
			this.$emit('ai-note-click', this.record);
		},
	},
};
</script>

<style lang="scss" scoped>
.record-card {
	background: $color-bg-card;
	border-radius: $radius-card;
	padding: $spacing-md $spacing-md $spacing-sm;
	box-shadow: $shadow-card;
	transition: all 0.2s ease;
	position: relative;
	overflow: hidden;
	margin-bottom: $spacing-sm;

	&:active {
		transform: scale(0.98);
	}

	&-bar {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
	}

	&-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: $spacing-sm;

		.record-title {
			display: flex;
			align-items: center;
			font-size: 16px;
			color: $color-text-primary;
			flex: 1;
		}
	}

	.record-tags {
		display: flex;
		flex-wrap: wrap;
		margin-bottom: $spacing-sm;
		gap: $spacing-xs;

		.record-tag {
			display: inline-block;
			padding: 4px 10px;
			border-radius: $radius-pill;
			font-size: 12px;
			font-weight: 500;
		}
	}

	.record-summary {
		margin-bottom: $spacing-sm;
		padding-top: $spacing-xs;

		.record-summary-text {
			font-size: 13px;
			color: $color-text-tertiary;
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
		padding-top: $spacing-sm;
		border-top: 0.5px solid $color-divider;

		.record-time {
			font-size: 12px;
		}

		.ai-badge {
			display: flex;
			align-items: center;
			margin-left: auto;
			padding: 2px 10px;
			border-radius: $radius-pill;
			background: $color-warning-light;
			gap: 4px;

			.cuIcon-creativefill {
				color: $color-warning;
				font-size: 11px;
			}

			.ai-badge-text {
				color: $color-warning;
				font-weight: 500;
				font-size: 11px;
			}
		}
	}
}
</style>
