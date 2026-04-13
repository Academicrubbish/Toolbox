/**
 * 更新日志 API
 * 客户端直接查询 changelog 集合（只读，管理员在控制台手动插入）
 */

/**
 * 获取更新日志列表
 * @param {number} limit 返回条数，默认 20
 */
export const getChangelogList = function(limit = 20) {
  const db = uniCloud.database();
  return db.collection('changelog')
    .orderBy('date desc')
    .limit(limit)
    .get()
    .then(res => {
      return res.result?.data || [];
    });
};
