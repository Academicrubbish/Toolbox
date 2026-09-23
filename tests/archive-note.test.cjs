const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const core = require('../uniCloud-aliyun/cloudfunctions/common/ai-archive-core/index.js')
const source = fs.readFileSync(path.join(__dirname, '../uniCloud-aliyun/cloudfunctions/archiveNote/index.js'), 'utf8')

function fixture() {
  const issued = core.issueKey('个人', 'alice')
  const tables = {
    ai_archive_keys: [{ ...issued.document, _id: 'key-1' }],
    daily_record: [], summarize: [], dict_category: [], embed_task_queue: []
  }
  let nextId = 1
  function collection(name) {
    let selected = tables[name]
    return {
      where(condition) { selected = selected.filter(row => Object.entries(condition).every(([field, value]) => row[field] === value)); return this },
      doc(id) { selected = tables[name].filter(row => row._id === id); return this },
      limit() { return this },
      async get() { return { data: selected } },
      async add(value) { const id = `new-${nextId++}`; tables[name].push({ ...value, _id: id }); return { id } },
      async update(patch) { selected.forEach(row => Object.assign(row, patch)); return {} }
    }
  }
  const db = { collection, async startTransaction() { return { collection, async commit() {}, async rollback() {} } } }
  const module = { exports: {} }
  vm.runInNewContext(source, {
    module, exports: module.exports, require(name) { assert.equal(name, 'ai-archive-core'); return core },
    uniCloud: { database: () => db }, console
  })
  const event = (secret, body) => ({ httpMethod: 'POST', headers: { authorization: 'Bearer ' + secret }, body: JSON.stringify(body) })
  return { main: module.exports.main, event, issued, tables }
}

function parsed(result) { return JSON.parse(result.body) }

test('HTTP 归档只接受 POST 和有效密钥', async () => {
  const { main, event, issued, tables } = fixture()
  assert.equal((await main({ httpMethod: 'GET' })).statusCode, 405)
  assert.equal((await main(event('an_' + 'x'.repeat(43), { title: '标题', content: '正文' }))).statusCode, 401)
  assert.equal(tables.daily_record.length, 0)
  assert.equal((await main(event(issued.secret, { title: '', content: '正文' }))).statusCode, 400)
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
