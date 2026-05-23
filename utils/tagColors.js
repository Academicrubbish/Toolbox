/**
 * 标签色板 — 独立色值对象
 * 基于 Apple HIG 设计语言的 8 色系统
 */

/**
 * 标签色板数组（8 色循环）
 * 每个对象包含：bg（标签背景色）、text（标签文字色）、bar（卡片左侧色条颜色）
 */
export const tagColors = [
  { bg: 'rgba(0, 122, 255, 0.10)',  text: '#007AFF', bar: '#007AFF' },  // 蓝
  { bg: 'rgba(175, 82, 222, 0.10)', text: '#AF52DE', bar: '#AF52DE' },  // 紫
  { bg: 'rgba(255, 149, 0, 0.10)',  text: '#FF9500', bar: '#FF9500' },  // 橙
  { bg: 'rgba(52, 199, 89, 0.10)',  text: '#34C759', bar: '#34C759' },  // 绿
  { bg: 'rgba(255, 59, 48, 0.10)',  text: '#FF3B30', bar: '#FF3B30' },  // 红
  { bg: 'rgba(90, 200, 250, 0.10)', text: '#5AC8FA', bar: '#5AC8FA' },  // 青
  { bg: 'rgba(255, 45, 85, 0.10)',  text: '#FF2D55', bar: '#FF2D55' },  // 粉
  { bg: 'rgba(88, 86, 214, 0.10)',  text: '#5856D6', bar: '#5856D6' },  // 靛
];

/**
 * 根据索引获取标签颜色对象
 * @param {number} index - 标签索引
 * @returns {{ bg: string, text: string, bar: string }} 颜色对象
 */
export function getTagColor(index) {
  const idx = typeof index === 'number' && !isNaN(index) ? index : 0;
  return tagColors[Math.abs(idx) % tagColors.length] || tagColors[0];
}
