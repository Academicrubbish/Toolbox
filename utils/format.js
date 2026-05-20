import moment from "moment";

/**
 * 格式化时间
 * @param {string} timeStr - 时间字符串
 * @param {string} format - 格式化模板，默认 'HH:mm'
 * @returns {string}
 */
export function formatTime(timeStr, format = 'HH:mm') {
	if (!timeStr) return '';
	return moment(timeStr).format(format);
}

/**
 * 智能日期分组：今天/昨天/本周/更早
 * @param {string} dateStr - 日期字符串
 * @returns {string}
 */
export function formatSmartDate(dateStr) {
	if (!dateStr) return '更早';

	const date = moment(dateStr);
	const today = moment().startOf('day');
	const diff = today.diff(date.startOf('day'), 'days');

	if (diff <= 0) return '今天';
	if (diff === 1) return '昨天';
	if (diff < 7) return '本周';
	return '更早';
}

/**
 * 相对时间格式化
 * - <1分钟 → '刚刚'
 * - <60分钟 → 'X分钟前'
 * - 今天 → 'HH:mm'
 * - 昨天 → '昨天 HH:mm'
 * - <7天 → 'X天前'
 * - 更早 → 'MM-DD'
 * @param {string} dateStr - 日期字符串
 * @returns {string}
 */
export function formatRelativeTime(dateStr) {
	if (!dateStr) return '';

	const date = moment(dateStr);
	const now = moment();
	const diffMinutes = now.diff(date, 'minutes');
	const diffDays = moment().startOf('day').diff(date.clone().startOf('day'), 'days');

	if (diffMinutes < 1) return '刚刚';
	if (diffMinutes < 60) return `${diffMinutes}分钟前`;
	if (diffDays === 0) return date.format('HH:mm');
	if (diffDays === 1) return `昨天 ${date.format('HH:mm')}`;
	if (diffDays < 7) return `${diffDays}天前`;
	return date.format('MM-DD');
}

/**
 * 格式化总结内容（简单处理markdown，保留文本内容）
 * @param {string} content - Markdown 内容
 * @returns {string}
 */
export function formatSummaryContent(content) {
	if (!content) return '';
	let text = content
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/^\*\s+/gm, '')
		.replace(/^\d+\.\s+/gm, '')
		.replace(/```[\s\S]*?```/g, '')
		.replace(/`[^`]+`/g, '')
		.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
		.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
		.replace(/\*\*([^\*]+)\*\*/g, '$1')
		.replace(/\*([^\*]+)\*/g, '$1')
		.replace(/~~([^~]+)~~/g, '$1')
		.replace(/^\s*[-*+]\s+/gm, '')
		.replace(/^\s*\d+\.\s+/gm, '')
		.replace(/\n+/g, ' ')
		.trim();
	return text;
}

/**
 * 按日期分组记录（智能分组：今天/昨天/本周/更早）
 * @param {Array} list - 记录列表
 * @returns {Array} 分组后的记录 [{ date, children, count }]
 */
export function groupRecordsByDate(list) {
	const groups = {};
	const order = ['今天', '昨天', '本周', '更早'];

	list.forEach(element => {
		const group = formatSmartDate(element.createTime);
		if (!groups[group]) {
			groups[group] = [];
		}
		groups[group].push(element);
	});

	return order
		.filter(label => groups[label])
		.map(label => ({
			date: label,
			children: groups[label],
			count: groups[label].length
		}));
}
