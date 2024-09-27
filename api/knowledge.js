import store from '@/store';

const request = uniCloud.database().collection("knowledge_point") //创建数据库连接
const user = store.state.user

// 将传统分页 {pageSize, pageNum} 转换为 JQL 分页 {skip, limit}
function convertPagination(pageSize, pageNum) {
  // 计算需要跳过的条目数
  const skipCount = (pageNum - 1) * pageSize;

  // 返回 JQL 可用的 skip 和 limit 参数
  return {
    skip: skipCount,
    limit: pageSize
  };
}

// 查询记录列表
export function getKnowledgePointList(data) {
  const { pageSize, pageNum } = data;
  const { skip, limit } = convertPagination(pageSize, pageNum);
  return request.where({ createBy: user.openid }).orderBy('createTime desc').skip(skip).limit(limit).get()
}

// 查询记录详情
export function getKnowledgePoint(id) {
  return request.doc(id).get()
}

// 添加记录
export function addKnowledgePoint(data) {
  return request.add(data)
}


// 更新记录
export function updateKnowledgePoint(id,data) {
  return request.doc(id).update(data)
}


//删除记录
export function delKnowledgePoint(id) {
  return request.doc(id).remove()
}