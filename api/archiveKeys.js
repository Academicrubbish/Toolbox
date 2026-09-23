import store from '@/store'
import { withAuth } from '@/utils/api-auth.js'

function call(action, data = {}) {
  return uniCloud.callFunction({
    name: 'archiveKeyManager',
    data: { action, ...data, sessionToken: store.state.user.sessionToken }
  }).then(response => {
    const result = response.result || {}
    if (result.code !== 0) throw new Error(result.message || '密钥操作失败')
    return result.data
  })
}

export const listArchiveKeys = withAuth(() => call('list'), store)
export const createArchiveKey = withAuth(name => call('create', { name }), store)
export const rotateArchiveKey = withAuth(id => call('rotate', { id }), store)
export const revokeArchiveKey = withAuth(id => call('revoke', { id }), store)
