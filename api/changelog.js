/**
 * 更新日志 API
 * 客户端直接查询 changelog 集合（只读，管理员在控制台手动插入）
 */

/**
 * 获取更新日志列表
 * @param {number} limit 返回条数，默认 20
 */
const compareVersion = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return nb - na;
  }
  return 0;
};

export const getChangelogList = function(limit = 20) {
  const db = uniCloud.database();
  return db.collection('changelog')
    .orderBy('date desc')
    .limit(limit)
    .get()
    .then(res => {
      const list = res.result?.data || [];
      list.sort((a, b) => {
        if (a.date !== b.date) return a.date > b.date ? -1 : 1;
        return compareVersion(a.version, b.version);
      });
      return list;
    });
};
