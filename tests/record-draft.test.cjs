'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  getRecordDraft,
  saveRecordDraft,
  clearRecordDraft,
} = require('../utils/record-draft.js')

function createStorage() {
  const data = new Map()
  return {
    getStorageSync(key) {
      return data.get(key) || ''
    },
    setStorageSync(key, value) {
      data.set(key, value)
    },
    removeStorageSync(key) {
      data.delete(key)
    },
  }
}

test('正文保存后可按用户恢复未完成记录', () => {
  const storage = createStorage()
  saveRecordDraft({
    openid: 'user-a',
    summarizeId: 'summary-1',
    title: '草稿标题',
    tags: ['tag-1', 'tag-1', 'tag-2'],
  }, storage)

  const draft = getRecordDraft('user-a', storage)
  assert.equal(draft.version, 1)
  assert.equal(draft.openid, 'user-a')
  assert.equal(draft.summarizeId, 'summary-1')
  assert.equal(draft.title, '草稿标题')
  assert.deepEqual(draft.tags, ['tag-1', 'tag-2'])
  assert.equal(typeof draft.savedAt, 'number')
  assert.equal(typeof draft.updatedAt, 'number')
})

test('不同登录用户的草稿互不覆盖', () => {
  const storage = createStorage()
  saveRecordDraft({ openid: 'user-a', summarizeId: 'summary-a' }, storage)
  saveRecordDraft({ openid: 'user-b', summarizeId: 'summary-b' }, storage)

  assert.equal(getRecordDraft('user-a', storage).summarizeId, 'summary-a')
  assert.equal(getRecordDraft('user-b', storage).summarizeId, 'summary-b')
})

test('旧请求不能清除同一用户后来创建的新草稿', () => {
  const storage = createStorage()
  saveRecordDraft({ openid: 'user-a', summarizeId: 'summary-new' }, storage)

  assert.equal(clearRecordDraft('user-a', 'summary-old', storage), false)
  assert.equal(getRecordDraft('user-a', storage).summarizeId, 'summary-new')
})

test('记录完成后按 summarizeId 清除草稿', () => {
  const storage = createStorage()
  saveRecordDraft({ openid: 'user-a', summarizeId: 'summary-1' }, storage)

  assert.equal(clearRecordDraft('user-a', 'summary-1', storage), true)
  assert.equal(getRecordDraft('user-a', storage), null)
})
