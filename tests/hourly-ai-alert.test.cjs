const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const functions = path.join(__dirname, '../uniCloud-aliyun/cloudfunctions')
const noteSource = fs.readFileSync(path.join(functions, 'processLearnNote/index.js'), 'utf8')
const alertSource = fs.readFileSync(path.join(functions, 'common/ai-alert-check/index.js'), 'utf8')
const quiet = { log() {}, warn() {}, error() {} }
const seventh = { Time: '2026-11-16T04:07:00Z' }

function noteWorker({ check, tasks = [], post }) {
  const table = {
    where() { return this }, limit() { return this }, doc() { return this },
    async get() { return { data: tasks } }, async update() {}, async add() {}
  }
  const api = {}
  vm.runInNewContext(noteSource, {
    exports: api, process: { env: { ZHIPU_API_KEY: 'test' } }, console: quiet,
    uniCloud: { database: () => ({ collection: () => table }) },
    require(name) {
      if (name === 'axios') return { post }
      assert.equal(name, 'ai-alert-check')
      return { checkAlerts: check }
    }
  })
  return api.main
}

test('普通分钟及手动调用只消费笔记，定时第七分钟即使无任务也完成检查', async () => {
  let checks = 0
  const main = noteWorker({ check: async () => { checks++; return { data: { alerts: 0 } } } })
  await main({ Time: '2026-11-16T04:06:00Z' }, { SOURCE: 'timing' })
  await main(seventh, { SOURCE: 'server' })
  assert.equal(checks, 0)
  for (const event of [seventh, { triggerTime: seventh.Time }]) {
    const result = await main(event, { SOURCE: 'timing' })
    assert.equal(result.message, '无待处理任务')
  }
  assert.equal(checks, 2)
})

test('告警仍在进行时笔记已开始生成，告警查询失败也能完成笔记', { timeout: 2000 }, async () => {
  let failAlert, started
  const modelStarted = new Promise(resolve => { started = resolve })
  const main = noteWorker({
    tasks: [{ _id: 'task', note_log_id: 'note', exercise_log_id: 'exercise', content: 'test' }],
    check: () => new Promise((_, reject) => { failAlert = reject }),
    post: async () => {
      started()
      return { data: { choices: [{ message: { content: '笔记\n## 二、针对性练习题\n练习' } }] } }
    }
  })
  const result = main(seventh, { SOURCE: 'timing' })
  await modelStarted
  failAlert(new Error('数据库暂时不可用'))
  assert.equal((await result).message, '生成成功')
})

test('同时触发的扫描每个用户每天、全局失败率每小时各只写一条', async () => {
  const records = new Map()
  const logs = { aggregate() { return this }, match() { return this },
    group(spec) { return { end: async () => ({ data: spec._id === '$openid'
      ? [{ _id: 'user', totalTokens: 200000, count: 1 }]
      : [{ _id: 'error', count: 6 }] }) } }
  }
  const alerts = {
    where(condition) { return { limit() { return this }, async get() {
      // 模拟并发检查都发生在插入前；主键冲突后按 ID 可读到已落库记录。
      return { data: records.has(condition._id) ? [records.get(condition._id)] : [] }
    } } },
    async add(value) {
      if (records.has(value._id)) throw Error('duplicate key')
      records.set(value._id, value)
    }
  }
  const identity = x => x
  const db = { command: { gte: identity, neq: identity, aggregate: { first: identity, sum: identity } },
    collection: name => name === 'ai_call_logs' ? logs : alerts }
  const api = {}
  vm.runInNewContext(alertSource, { exports: api, require, console: quiet, uniCloud: { database: () => db } })
  const stamp = Date.parse(seventh.Time)
  const results = await Promise.all([api.checkAlerts(stamp), api.checkAlerts(stamp)])
  assert.equal(results.reduce((n, r) => n + r.data.alerts, 0), 2)
  assert.deepEqual([...records.values()].map(r => r.rule).sort(), ['daily_quota', 'error_rate'])
})
