'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
	chunkNote,
	splitLongPiece,
	cosine
} = require('../uniCloud-aliyun/cloudfunctions/common/kb-vector')
const {
	nextFailureState
} = require('../uniCloud-aliyun/cloudfunctions/processEmbedding/task-state')

test('短笔记保持为一个切片并包含标题', () => {
	assert.deepEqual(chunkNote('标题', '正文'), ['标题\n正文'])
})

test('空标题和空正文不生成切片', () => {
	assert.deepEqual(chunkNote('', ''), [])
})

test('长笔记按二级标题切分', () => {
	const content = `## 一\n${'甲'.repeat(600)}\n## 二\n${'乙'.repeat(600)}`
	const chunks = chunkNote('长文', content)
	assert.equal(chunks.length, 2)
	assert.ok(chunks.every(chunk => chunk.startsWith('长文\n##')))
})

test('所有切片不超过 1500 字', () => {
	const content = Array.from({ length: 40 }, (_, i) => `第${i}行${'字'.repeat(80)}`).join('\n')
	const chunks = chunkNote('长文', content)
	assert.ok(chunks.length > 1)
	assert.ok(chunks.every(chunk => chunk.length <= 1500))
})

test('超长单行按原顺序硬切且不丢失前置内容', () => {
	const text = `前置行\n${'长'.repeat(2000)}`
	const parts = splitLongPiece(text, 1500)
	assert.equal(parts[0], '前置行')
	assert.equal(parts.slice(1).join(''), '长'.repeat(2000))
})

test('相同向量余弦为 1', () => {
	assert.equal(cosine([1, 2, 3], [1, 2, 3]), 1)
})

test('正交向量余弦为 0', () => {
	assert.equal(cosine([1, 0], [0, 1]), 0)
})

test('维度不一致返回 0', () => {
	assert.equal(cosine([1, 2], [1]), 0)
})

test('前两次失败重新排队', () => {
	assert.deepEqual(nextFailureState(0, 3), { retryCount: 1, status: 'pending' })
	assert.deepEqual(nextFailureState(1, 3), { retryCount: 2, status: 'pending' })
})

test('第三次失败进入 failed', () => {
	assert.deepEqual(nextFailureState(2, 3), { retryCount: 3, status: 'failed' })
})
