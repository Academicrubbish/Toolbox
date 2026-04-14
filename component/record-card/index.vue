<template>
	<view class="record-card shadow-warp" @tap="handleTap">
		<view class="record-card-header">
			<view class="record-title">
				<text class="cuIcon-creativefill text-blue margin-right-xs"></text>
				<text class="text-bold">{{ record.title }}</text>
			</view>
			<view v-if="showMore" class="record-more-icon" @tap.stop="onMoreClick">
				<text class="cuIcon-moreandroid text-gray"></text>
			</view>
		</view>

		<view v-if="record.tags && record.tags.length > 0" class="record-tags">
			<view v-for="(tagId, index) in record.tags" :key="tagId" class="record-tag"
				:class="tagColorClasses[index % 12]">
				<text>{{ getTagName(tagId) }}</text>
			</view>
		</view>

		<view v-if="record.summarizeContent" class="record-summary">
			<text class="record-summary-text">{{ summaryText }}</text>
		</view>

		<view class="record-footer">
			<text class="cuIcon-timefill text-gray text-xs margin-right-xs"></text>
			<text class="text-gray text-xs">{{ formattedTime }}</text>
			<view v-if="aiNoteCount > 0" class="ai-note-tag" @tap.stop="onAiNoteClick">
				<text class="cuIcon-creativefill text-xs"></text>
				<text class="ai-note-tag-text text-xs">AI笔记{{ aiNoteCount > 1 ? " " + aiNoteCount + "篇" : "" }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { tagColorClasses } from "@/utils/tagColors";
import { formatTime, formatSummaryContent } from "@/utils/format";

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
		aiNoteCount: {
			type: Number,
			default: 0,
		},
		showMore: {
			type: Boolean,
			default: true,
		},
	},
	data() {
		return {
			tagColorClasses,
		};
	},
	computed: {
		getTagName() {
			return (tagId) => this.tagMap[tagId] ? this.tagMap[tagId].name : '未知标签';
		},
		formattedTime() {
			return formatTime(this.record.createTime, 'HH:mm');
		},
		summaryText() {
			return formatSummaryContent(this.record.summarizeContent);
		},
	},
	methods: {
		handleTap() {
			this.$emit('card-tap', this.record);
		},
		onMoreClick(e) {
			this.$emit('more-click', e, this.record);
		},
		onAiNoteClick() {
			this.$emit('ai-note-click', this.record);
		},
	},
};
</script>

<style lang="scss" scoped>
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
			margin-left: 16rpx;

			.cuIcon-moreandroid {
				font-size: 40rpx;
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

		.ai-note-tag {
			display: flex;
			align-items: center;
			margin-left: auto;
			padding: 4rpx 14rpx;
			border-radius: 16rpx;
			background: rgba(255, 157, 0, 0.1);
			opacity: 1;

			.cuIcon-creativefill {
				color: #ff9d00;
				margin-right: 4rpx;
				font-size: 22rpx;
			}

			.ai-note-tag-text {
				color: #ff9d00;
				font-weight: 500;
			}
		}
	}
}
</style>
