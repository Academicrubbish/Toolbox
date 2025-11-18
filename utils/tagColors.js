/**
 * 标签颜色类数组
 * 用于统一管理标签的颜色样式类
 */
export const tagColorClasses = [
  "bg-red light",
  "bg-orange light",
  "bg-yellow light",
  "bg-olive light",
  "bg-green light",
  "bg-cyan light",
  "bg-blue light",
  "bg-purple light",
  "bg-mauve light",
  "bg-pink light",
  "bg-brown light",
  "bg-grey light",
];

/**
 * 根据索引获取标签颜色类
 * @param {number} index - 标签索引
 * @returns {string} 颜色类名
 */
export function getTagColorClass(index) {
  const idx = typeof index === 'number' && !isNaN(index) ? index : 0;
  return tagColorClasses[Math.abs(idx) % tagColorClasses.length] || tagColorClasses[0];
}

