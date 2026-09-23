import store from '@/store'

// 与 embedTask.invalidateExpiredSession 一致：会话过期时清空本地登录态，
// 下一次 withAuth 调用会重新弹出登录弹窗，避免应用停留在永久报错状态。
function invalidateExpiredSession(result) {
  if (!result || result.code !== -401) return
  store.commit('SET_IS_GUEST', true)
  store.commit('SET_OPENID', '')
  store.commit('SET_SESSION_TOKEN', '')
}

// 保持旧 clientDB API 的 { result: { data, id, code } } 返回形状，供现有页面复用。
export function noteRequest(action, data = {}) {
  return uniCloud.callFunction({
    name: 'noteService',
    data: { action, data, sessionToken: store.state.user.sessionToken || '' }
  }).then(response => {
    const result = response.result || {}
    invalidateExpiredSession(result)
    if (result.code !== 0) throw new Error(result.message || '笔记操作失败')
    return { result }
  })
}
