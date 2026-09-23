const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')

const source = fs.readFileSync(path.join(__dirname, '../uniCloud-aliyun/cloudfunctions/aiLogService/index.js'), 'utf8')

function fixture() {
  const records = [
    { _id: 'rec-private', createBy: 'alice' },
    { _id: 'rec-sample', createBy: '' }
  ]
  const logs = [
    { _id: 'log-1', record_id: 'rec-private', create_by: 'alice', status: 'success', batch_id: 'b1', type: 'note' },
    { _id: 'log-2', record_id: 'rec-sample', create_by: 'bob', status: 'success', batch_id: 'b2', type: 'note' },
    { _id: 'log-3', record_id: 'rec-sample', create_by: 'alice', status: 'pending', batch_id: 'b3', type: 'exercise' }
  ]
  const queue = [
    { _id: 'q-1', batch_id: 'b1' },
    { _id: 'q-2', batch_id: 'b2' },
    { _id: 'q-3', batch_id: 'b3' }
  ]
  const module = { exports: {} }
  const query = items => {
    let selection = items
    return {
      where(condition) {
        selection = items.filter(item => Object.entries(condition).every(([key, value]) =>
          value && typeof value === 'object' && value.in
            ? value.in.includes(item[key])
            : item[key] === value))
        return this
      },
      limit() { return this },
      field() { return this },
      // 云函数数据库 API 要求两参数：orderBy(field, 'asc'|'desc')
      orderBy(field, order) {
        assert.ok(typeof field === 'string' && !/\s/.test(field), `orderBy 字段不合法: ${field}`)
        assert.ok(order === 'asc' || order === 'desc', `orderBy 需两参数 (field, order): ${field}`)
        return this
      },
      skip() { return this },
      async get() { return { data: selection } },
      async remove() {
        const removed = selection.slice()
        removed.forEach(item => { const index = items.indexOf(item); if (index > -1) items.splice(index, 1) })
        selection = []
        return { removed: removed.length }
      }
    }
  }
  vm.runInNewContext(source, {
    module, exports: module.exports, process: { env: { KB_SESSION_SECRET: 'test-secret' } },
    require() {
      return { verifySession(token) {
        if (token !== 'alice-token' && token !== 'bob-token') throw new Error('invalid')
        return { openid: token.slice(0, -6) }
      } }
    },
    uniCloud: { database() { return {
      command: { in: values => ({ in: values }) },
      collection(name) {
        if (name === 'daily_record') return query(records)
        if (name === 'ai_learn_logs') return query(logs)
        if (name === 'ai_task_queue') return query(queue)
        return query([])
      }
    } } },
    console
  })
  return { main: module.exports.main, logs, queue }
}

test('游客可读示例记录的日志，读不到私有记录的日志', async () => {
  const { main } = fixture()
  const sample = await main({ action: 'listByRecord', data: { recordId: 'rec-sample' } })
  const owned = await main({ action: 'listByRecord', data: { recordId: 'rec-private' } })
  assert.equal(sample.data.length, 2)
  assert.equal(owned.data.length, 0)
})

test('他人不能读取私有记录的日志详情', async () => {
  const { main } = fixture()
  const denied = await main({ action: 'getDetail', sessionToken: 'bob-token', data: { logId: 'log-1' } })
  const allowed = await main({ action: 'getDetail', sessionToken: 'alice-token', data: { logId: 'log-1' } })
  assert.equal(denied.data, null)
  assert.equal(allowed.data._id, 'log-1')
})

test('历史查询要求登录且只返回本人日志', async () => {
  const { main } = fixture()
  const guest = await main({ action: 'history', data: {} })
  const mine = await main({ action: 'history', sessionToken: 'alice-token', data: { pageNo: 1, pageSize: 10 } })
  assert.equal(guest.code, -401)
  assert.deepEqual(mine.data.map(log => log._id).sort(), ['log-1', 'log-3'])
})

test('级联删除只删本人日志及其队列，不动他人数据', async () => {
  const { main, logs, queue } = fixture()
  const result = await main({ action: 'deleteByRecord', sessionToken: 'alice-token', data: { recordId: 'rec-sample' } })
  assert.equal(result.data.deleted, 1)
  assert.deepEqual(logs.map(log => log._id).sort(), ['log-1', 'log-2'])
  assert.deepEqual(queue.map(item => item._id).sort(), ['q-1', 'q-2'])
})

test('游客与伪造凭证不能删除', async () => {
  const { main, logs } = fixture()
  const guest = await main({ action: 'deleteByRecord', data: { recordId: 'rec-private' } })
  const forged = await main({ action: 'deleteByRecord', sessionToken: 'invalid', data: { recordId: 'rec-private' } })
  assert.equal(guest.code, -401)
  assert.equal(forged.code, -401)
  assert.equal(logs.length, 3)
})
