const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')

const source = fs.readFileSync(path.join(__dirname, '../uniCloud-aliyun/cloudfunctions/generateLearnNote/index.js'), 'utf8')

function fixture() {
  const records = [
    { _id: 'sample', createBy: '' },
    { _id: 'own', createBy: 'alice' },
    { _id: 'other', createBy: 'bob' }
  ]
  const added = []
  const module = { exports: {} }
  vm.runInNewContext(source, {
    module, exports: module.exports,
    process: { env: { KB_SESSION_SECRET: 'test' } },
    require(name) {
      assert.equal(name, 'kb-auth')
      return { verifySession(token) {
        if (token !== 'alice-token') throw new Error('invalid')
        return { openid: 'alice' }
      } }
    },
    uniCloud: { database() { return { collection(name) {
      if (name === 'daily_record') return {
        where(condition) { return { limit() { return { async get() { return { data: records.filter(row => row._id === condition._id) } } } } } }
      }
      return { async add(value) { added.push({ name, ...value }); return { id: String(added.length) } } }
    } } } },
    console
  })
  return { main: module.exports.main, added }
}

test('游客不能提交 AI 辅导；登录用户只能关联自己的笔记', async () => {
  const { main, added } = fixture()
  const guest = await main({ content: '正文', recordId: 'sample' })
  const sample = await main({ content: '私人正文', recordId: 'sample', sessionToken: 'alice-token' })
  const other = await main({ content: '正文', recordId: 'other', sessionToken: 'alice-token' })
  assert.equal(guest.code, -401)
  assert.equal(sample.code, -403)
  assert.equal(other.code, -403)
  assert.equal(added.length, 0)
  const own = await main({ content: '正文', recordId: 'own', sessionToken: 'alice-token' })
  assert.equal(own.code, 0)
  assert.equal(added.length, 3)
})
