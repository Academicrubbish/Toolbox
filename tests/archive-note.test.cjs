const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const core = require('../uniCloud-aliyun/cloudfunctions/common/ai-archive-core/index.js')
const source = fs.readFileSync(path.join(__dirname, '../uniCloud-aliyun/cloudfunctions/archiveNote/index.js'), 'utf8')

function fixture() {
  const issued = core.issueKey('个人', 'alice')
  const warnings = []
  const tables = {
    ai_archive_keys: [{ ...issued.document, _id: 'key-1' }],
    daily_record: [], summarize: [], dict_category: [], embed_task_queue: []
  }
  let nextId = 1
  let transactionVersion = 0
  function collection(name, state = tables, inTransaction = false) {
    let selected = state[name]
    let byId = false
    return {
      where(condition) { selected = selected.filter(row => Object.entries(condition).every(([field, value]) => row[field] === value)); return this },
      doc(id) { selected = state[name].filter(row => row._id === id); byId = true; return this },
      limit() { return this },
      async get() {
        const data = selected.map(row => ({ ...row }))
        return { data: inTransaction && byId ? data[0] || null : data }
      },
      async add(value) {
        const id = value._id || `new-${nextId++}`
        if (state[name].some(row => row._id === id)) throw new Error('duplicate _id')
        state[name].push({ ...value, _id: id }); return { id }
      },
      async update(patch) { selected.forEach(row => Object.assign(row, patch)); return { updated: selected.length } }
    }
  }
  const db = {
    collection,
    async startTransaction() {
      const snapshot = Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.map(row => ({ ...row }))]))
      const version = transactionVersion
      return {
        collection: name => collection(name, snapshot, true),
        async commit() {
          if (version !== transactionVersion) throw new Error('transaction write conflict')
          for (const name of ['ai_archive_keys', 'daily_record', 'summarize', 'dict_category']) {
            tables[name].splice(0, tables[name].length, ...snapshot[name])
          }
          transactionVersion += 1
        },
        async rollback() {}
      }
    }
  }
  const module = { exports: {} }
  vm.runInNewContext(source, {
    module, exports: module.exports, require(name) { assert.equal(name, 'ai-archive-core'); return core },
    uniCloud: { database: () => db },
    console: { ...console, warn: (...args) => warnings.push(args) },
    setTimeout
  })
  const event = (secret, body) => ({ httpMethod: 'POST', headers: { authorization: 'Bearer ' + secret }, body: JSON.stringify(body) })
  return { main: module.exports.main, event, issued, tables, warnings }
}

function parsed(result) { return JSON.parse(result.body) }

test('HTTP 归档只接受 POST 和有效密钥', async () => {
  const { main, event, issued, tables } = fixture()
  assert.equal((await main({ httpMethod: 'GET' })).statusCode, 405)
  assert.equal((await main(event('an_' + 'x'.repeat(43), { title: '标题', content: '正文', requestId: 'invalid-key' }))).statusCode, 401)
  assert.equal(tables.daily_record.length, 0)
  assert.equal((await main(event(issued.secret, { title: '', content: '正文' }))).statusCode, 400)
})

test('认证失败只记录原因类别，不把密钥写进应用日志', async () => {
  const { main, event, issued, tables, warnings } = fixture()
  const body = { title: '标题', content: '正文', requestId: 'auth-diagnostic' }
  const unknown = 'an_' + 'x'.repeat(43)
  assert.equal((await main(event(unknown, body))).statusCode, 401)
  assert.match(warnings[0][0], /key lookup returned no rows/)
  assert.equal(JSON.stringify(warnings).includes(unknown), false)

  tables.ai_archive_keys[0].revokedAt = Date.now()
  assert.equal((await main(event(issued.secret, body))).statusCode, 401)
  assert.match(warnings[1][0], /matched key unusable/)
  assert.equal(warnings[1][1].revoked, true)
  assert.equal(warnings[1][1].hashMatches, true)
  assert.equal(JSON.stringify(warnings).includes(issued.secret), false)
})

test('归档进入普通笔记和专属标签，同一请求重试不重复写入', async () => {
  const { main, event, issued, tables } = fixture()
  const body = { title: '灵感', content: '# 归档正文', requestId: 'same-1' }
  const created = await main(event(issued.secret, body))
  assert.equal(created.statusCode, 201)
  const recordId = parsed(created).data.recordId
  assert.equal(tables.daily_record[0].createBy, 'alice')
  assert.equal(tables.daily_record[0].summarizeId, tables.summarize[0]._id)
  assert.equal(tables.summarize[0].content, '# 归档正文')
  assert.equal(tables.dict_category[0].name, '外部汇入')
  assert.equal(tables.embed_task_queue[0].source_id, recordId)
  const repeated = await main(event(issued.secret, body))
  assert.equal(parsed(repeated).data.recordId, recordId)
  assert.equal(parsed(repeated).data.existing, true)
  assert.equal(tables.daily_record.length, 1)
})

test('超过限频的归档请求返回 429 且不再写入', async () => {
  const { main, event, issued, tables } = fixture()
  for (let i = 0; i < core.RATE_LIMIT_1H; i++) {
    const created = await main(event(issued.secret, { title: '笔记' + i, content: '正文', requestId: 'rl-' + i }))
    assert.equal(created.statusCode, 201)
  }
  assert.equal(tables.daily_record.length, core.RATE_LIMIT_1H)
  assert.equal(tables.ai_archive_keys[0].useCount1h, core.RATE_LIMIT_1H)
  const blocked = await main(event(issued.secret, { title: '超限', content: '正文', requestId: 'rl-x' }))
  assert.equal(blocked.statusCode, 429)
  assert.match(parsed(blocked).message, /频繁/)
  assert.equal(tables.daily_record.length, core.RATE_LIMIT_1H)
})

test('两次并发使用相同请求标识只生成一篇笔记和一次计数', async () => {
  const { main, event, issued, tables } = fixture()
  const body = { title: '并发笔记', content: '正文', requestId: 'concurrent-same' }
  const results = await Promise.all([main(event(issued.secret, body)), main(event(issued.secret, body))])
  assert.deepEqual(results.map(result => result.statusCode).sort(), [200, 201])
  assert.equal(tables.daily_record.length, 1)
  assert.equal(tables.summarize.length, 1)
  assert.equal(tables.ai_archive_keys[0].useCount1h, 1)
})

test('最后一个额度被并发占用时只有一篇笔记创建成功', async () => {
  const { main, event, issued, tables } = fixture()
  for (let i = 0; i < core.RATE_LIMIT_1H - 1; i++) {
    await main(event(issued.secret, { title: '预占额度' + i, content: '正文', requestId: 'quota-' + i }))
  }
  const results = await Promise.all([
    main(event(issued.secret, { title: '甲', content: '正文', requestId: 'last-a' })),
    main(event(issued.secret, { title: '乙', content: '正文', requestId: 'last-b' }))
  ])
  assert.deepEqual(results.map(result => result.statusCode).sort(), [201, 429])
  assert.equal(tables.daily_record.length, core.RATE_LIMIT_1H)
  assert.equal(tables.ai_archive_keys[0].useCount1h, core.RATE_LIMIT_1H)
})
