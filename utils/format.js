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
 * 按日期分组记录
 * @param {Array} list - 记录列表
 * @returns {Array} 分组后的记录 [{ date, children, count }]
 */
export function groupRecordsByDate(list) {
	return list.reduce((groups, element) => {
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
}
