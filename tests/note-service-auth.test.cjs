const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')

const source = fs.readFileSync(path.join(__dirname, '../uniCloud-aliyun/cloudfunctions/noteService/index.js'), 'utf8')
const records = [
  { _id: 'private-1', createBy: 'alice', title: '私有', summarizeId: 'sum-1' },
  { _id: 'sample-1', createBy: '', title: '示例', summarizeId: 'sum-public' }
]
const summaries = [
  { _id: 'sum-1', content: '私有正文', createBy: 'alice' },
  { _id: 'sum-public', content: '公共正文' }
]

function query(items) {
  let selection = items
  return {
    where(condition) {
      selection = selection.filter(item => Object.entries(condition).every(([key, value]) => item[key] === value))
      return this
    },
    doc(id) { selection = items.filter(item => item._id === id); return this },
    limit() { return this },
    field() { return this },
    orderBy() { return this },
    skip() { return this },
    async get() { return { data: selection } },
    async update() { throw new Error('不应写入') },
    async remove() { throw new Error('不应删除') }
  }
}

function load() {
  const module = { exports: {} }
  const context = {
    module, exports: module.exports, process: { env: { KB_SESSION_SECRET: 'test-secret' } },
    require(name) {
      assert.equal(name, 'kb-auth')
      return { verifySession(token) {
        if (token !== 'alice-token' && token !== 'bob-token') throw new Error('invalid')
        return { openid: token.slice(0, -6) }
      } }
    },
    uniCloud: { database() { return {
      command: { in: values => ({ in: values }) },
      collection(name) {
        if (name === 'daily_record') return query(records)
        if (name === 'summarize') return query(summaries)
        return query([])
      }
    } } },
    console
  }
  vm.runInNewContext(source, context)
  return module.exports.main
}

const service = load()

test('游客只能读取示例笔记', async () => {
  const privateResult = await service({ action: 'getRecord', data: { id: 'private-1' } })
  const publicResult = await service({ action: 'getRecord', data: { id: 'sample-1' } })
  assert.equal(privateResult.data.length, 0)
  assert.equal(publicResult.data[0].title, '示例')
})

test('他人登录凭证不能读取或更新私有笔记及正文', async () => {
  const note = await service({ action: 'getRecord', sessionToken: 'bob-token', data: { id: 'private-1' } })
  const summary = await service({ action: 'getSummarize', sessionToken: 'bob-token', data: { id: 'sum-1' } })
  const update = await service({ action: 'updateRecord', sessionToken: 'bob-token', data: { id: 'private-1', value: { title: '篡改' } } })
  assert.equal(note.data.length, 0)
  assert.equal(summary.data.length, 0)
  assert.notEqual(update.code, 0)
})

test('伪造或过期登录凭证不能读写', async () => {
  const result = await service({ action: 'listRecords', sessionToken: 'invalid', data: {} })
  const write = await service({ action: 'deleteRecord', data: { id: 'private-1' } })
  assert.equal(result.code, -401)
  assert.equal(write.code, -401)
})

// 可写 fixture：验证删除正文的图片级联顺序与失败语义
function loadWritable(content) {
  const summaries = [{ _id: 'sum-1', content, createBy: 'alice' }]
  const deletedFiles = []
  let failDeleteFile = false
  const module = { exports: {} }
  const collection = () => ({
    where(condition) { return { limit() { return { async get() { return { data: condition.createBy === 'alice' ? summaries : [] } } } } } },
    doc(id) {
      return {
        async get() { return { data: summaries.filter(item => item._id === id) } },
        async update() { return {} },
        async remove() { const index = summaries.findIndex(item => item._id === id); if (index > -1) summaries.splice(index, 1); return {} }
      }
    }
  })
  vm.runInNewContext(source, {
    module, exports: module.exports, process: { env: { KB_SESSION_SECRET: 'test-secret' } },
    require() { return { verifySession(token) { if (token !== 'alice-token' && token !== 'bob-token') throw new Error('invalid'); return { openid: token.slice(0, -6) } } } },
    uniCloud: {
      database() { return { command: { in: values => ({ in: values }) }, collection } },
      async deleteFile({ fileList }) { if (failDeleteFile) throw new Error('storage down'); deletedFiles.push(...fileList); return { fileList } }
    },
    console
  })
  return { main: module.exports.main, summaries, deletedFiles, failOnDeleteFile() { failDeleteFile = true } }
}

test('删除正文先删云存储图片再删记录，图片失败时记录保留可重试', async () => {
  const content = '前文 <img src="cloud://a.png"> 中间 <img src="cloud://b.png"> 结尾 <img src="https://x.com/a.png">'
  const writable = loadWritable(content)
  const ok = await writable.main({ action: 'deleteSummarize', sessionToken: 'alice-token', data: { id: 'sum-1' } })
  assert.equal(ok.code, 0)
  assert.deepEqual(writable.deletedFiles, ['cloud://a.png', 'cloud://b.png'])
  assert.equal(writable.summaries.length, 0)

  const failing = loadWritable(content)
  failing.failOnDeleteFile()
  const blocked = await failing.main({ action: 'deleteSummarize', sessionToken: 'alice-token', data: { id: 'sum-1' } })
  assert.notEqual(blocked.code, 0)
  assert.equal(failing.summaries.length, 1, '图片删除失败时正文记录必须保留')
})

test('他人不能删除别人的正文，也不会触发图片删除', async () => {
  const writable = loadWritable('<img src="cloud://secret.png">')
  const denied = await writable.main({ action: 'deleteSummarize', sessionToken: 'bob-token', data: { id: 'sum-1' } })
  assert.notEqual(denied.code, 0)
  assert.equal(writable.summaries.length, 1)
  assert.equal(writable.deletedFiles.length, 0)
})
