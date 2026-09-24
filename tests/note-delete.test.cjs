const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')

const source = fs.readFileSync(path.join(__dirname, '../uniCloud-aliyun/cloudfunctions/noteService/index.js'), 'utf8')
const deprecatedImageDelete = require('../uniCloud-aliyun/cloudfunctions/delImage/index.js').main

function fixture({ failImage = false, partialFileFailure = false, missingFile = false, failDb = false, shared = false, copiedImage = false, withAiLogs = false } = {}) {
  const content = [
    '<img src="https://storage.example.com/cloudstorage/recordImg/old.png">',
    '![](https://storage.example.com/cloudstorage/ocr/photo.jpg)',
    '<img src="https://external.example.com/photo.png">'
  ].join('\n')
  const tables = {
    daily_record: [{ _id: 'note-1', createBy: 'alice', summarizeId: 'summary-1' }],
    summarize: [{ _id: 'summary-1', createBy: 'alice', content }],
    dict_category: [], ai_learn_logs: [], ai_task_queue: []
  }
  if (shared) tables.daily_record.push({ _id: 'note-2', createBy: 'alice', summarizeId: 'summary-1' })
  if (copiedImage) tables.summarize.push({
    _id: 'summary-2', createBy: 'alice',
    content: '<img src="https://storage.example.com/cloudstorage/recordImg/old.png">'
  })
  if (withAiLogs) {
    tables.ai_learn_logs.push({ _id: 'log-1', record_id: 'note-1', batch_id: 'batch-1' })
    tables.ai_task_queue.push({ _id: 'task-1', batch_id: 'batch-1' })
  }
  const events = []
  const db = {
    command: { in: values => ({ in: values }) },
    collection(name) {
      const items = tables[name] || []
      let selection = items
      return {
        doc(id) { selection = items.filter(row => row._id === id); return this },
        where(condition) {
          selection = items.filter(row => Object.entries(condition).every(([key, value]) =>
            Object.prototype.toString.call(value) === '[object RegExp]' ? value.test(row[key] || '') :
              value && typeof value === 'object' && value.in ? value.in.includes(row[key]) : row[key] === value))
          return this
        },
        limit(count) { selection = selection.slice(0, count); return this },
        field() { return this },
        async get() { return { data: selection.map(row => ({ ...row })) } },
        async update(patch) { selection.forEach(row => Object.assign(row, patch)); return { updated: selection.length } },
        async remove() {
          for (const row of selection) {
            events.push('remove:' + name + ':' + row._id)
            const index = items.indexOf(row)
            if (index >= 0) items.splice(index, 1)
          }
          return { deleted: selection.length }
        }
      }
    },
    async startTransaction() {
      const removals = []
      return {
        collection(name) { return { doc(id) { return { async remove() { removals.push({ name, id }) } } } } },
        async commit() {
          if (failDb) throw new Error('database transaction failed')
          for (const { name, id } of removals) {
            const index = tables[name].findIndex(row => row._id === id)
            if (index >= 0) {
              tables[name].splice(index, 1)
              events.push('remove:' + name + ':' + id)
            }
          }
        },
        async rollback() {}
      }
    }
  }
  const module = { exports: {} }
  vm.runInNewContext(source, {
    module, exports: module.exports, process: { env: { KB_SESSION_SECRET: 'test' } },
    require(name) {
      assert.equal(name, 'kb-auth')
      return { verifySession(token) {
        if (token !== 'alice-token') throw new Error('invalid')
        return { openid: 'alice' }
      } }
    },
    uniCloud: {
      database() { return db },
      async deleteFile({ fileList }) {
        events.push('images:' + fileList.join(','))
        if (failImage) throw new Error('storage down')
        return { fileList: fileList.map(fileID => ({ fileID,
          ...(partialFileFailure ? { code: 'FAILED' } : {}),
          ...(missingFile ? { code: 'ParamInvalid', message: 'The specified file does not exist.' } : {})
        })) }
      }
    },
    console
  })
  return { main: module.exports.main, tables, events, content }
}

test('整篇笔记先删本应用图片，再删正文和笔记', async () => {
  const { main, tables, events } = fixture()
  const result = await main({ action: 'deleteRecord', sessionToken: 'alice-token', data: { id: 'note-1' } })
  assert.equal(result.code, 0)
  assert.deepEqual(events, [
    'images:https://storage.example.com/cloudstorage/recordImg/old.png,https://storage.example.com/cloudstorage/ocr/photo.jpg',
    'remove:summarize:summary-1',
    'remove:daily_record:note-1'
  ])
  assert.equal(tables.daily_record.length, 0)
  assert.equal(tables.summarize.length, 0)
})

test('图片删除失败时保留笔记及正文供重试', async () => {
  const { main, tables, events } = fixture({ failImage: true })
  const result = await main({ action: 'deleteRecord', sessionToken: 'alice-token', data: { id: 'note-1' } })
  assert.notEqual(result.code, 0)
  assert.equal(events.length, 1)
  assert.equal(tables.daily_record.length, 1)
  assert.equal(tables.summarize.length, 1)
})

test('云存储返回单文件失败状态时也保留笔记', async () => {
  const { main, tables } = fixture({ partialFileFailure: true })
  const result = await main({ action: 'deleteRecord', sessionToken: 'alice-token', data: { id: 'note-1' } })
  assert.notEqual(result.code, 0)
  assert.equal(tables.daily_record.length, 1)
  assert.equal(tables.summarize.length, 1)
})

test('重试时图片已不存在视为清理完成', async () => {
  const { main, tables } = fixture({ missingFile: true })
  const result = await main({ action: 'deleteRecord', sessionToken: 'alice-token', data: { id: 'note-1' } })
  assert.equal(result.code, 0)
  assert.equal(tables.daily_record.length, 0)
})

test('图片已删除但数据库事务失败时保留笔记供重试', async () => {
  const { main, tables, events } = fixture({ failDb: true })
  const result = await main({ action: 'deleteRecord', sessionToken: 'alice-token', data: { id: 'note-1' } })
  assert.notEqual(result.code, 0)
  assert.equal(events.length, 1)
  assert.equal(tables.daily_record.length, 1)
  assert.equal(tables.summarize.length, 1)
})

test('共用正文时只删除目标笔记，保留正文与图片', async () => {
  const { main, tables, events } = fixture({ shared: true })
  const result = await main({ action: 'deleteRecord', sessionToken: 'alice-token', data: { id: 'note-1' } })
  assert.equal(result.code, 0)
  assert.deepEqual(events, ['remove:daily_record:note-1'])
  assert.equal(tables.summarize.length, 1)
})

test('图片被另一篇正文引用时保留云文件', async () => {
  const { main, events } = fixture({ copiedImage: true })
  const result = await main({ action: 'deleteRecord', sessionToken: 'alice-token', data: { id: 'note-1' } })
  assert.equal(result.code, 0)
  assert.equal(events[0], 'images:https://storage.example.com/cloudstorage/ocr/photo.jpg')
})

test('编辑正文只删除新正文不再引用的旧图', async () => {
  const { main, tables, events } = fixture()
  const content = '<img src="https://storage.example.com/cloudstorage/recordImg/old.png">\n新内容'
  const result = await main({ action: 'updateSummarize', sessionToken: 'alice-token', data: { id: 'summary-1', value: { content } } })
  assert.equal(result.code, 0)
  assert.equal(tables.summarize[0].content, content)
  assert.deepEqual(events, ['images:https://storage.example.com/cloudstorage/ocr/photo.jpg'])
})

test('游客不能删除笔记或图片', async () => {
  const { main, tables, events } = fixture()
  const result = await main({ action: 'deleteRecord', data: { id: 'note-1' } })
  assert.equal(result.code, -401)
  assert.equal(tables.daily_record.length, 1)
  assert.deepEqual(events, [])
})

test('笔记删除后在服务端清理 AI 日志及任务', async () => {
  const { main, tables } = fixture({ withAiLogs: true })
  const result = await main({ action: 'deleteRecord', sessionToken: 'alice-token', data: { id: 'note-1' } })
  assert.equal(result.code, 0)
  assert.equal(tables.ai_learn_logs.length, 0)
  assert.equal(tables.ai_task_queue.length, 0)
})

test('旧版客户端重复清理已删除的正文时安全返回成功', async () => {
  const { main } = fixture()
  const deleted = await main({ action: 'deleteRecord', sessionToken: 'alice-token', data: { id: 'note-1' } })
  const repeated = await main({ action: 'deleteSummarize', sessionToken: 'alice-token', data: { id: 'summary-1' } })
  assert.equal(deleted.code, 0)
  assert.equal(repeated.code, 0)
})

test('旧的任意图片删除入口已关闭', async () => {
  const result = await deprecatedImageDelete({ imgList: ['cloud://other-user/photo.png'] })
  assert.equal(result.code, -410)
})
