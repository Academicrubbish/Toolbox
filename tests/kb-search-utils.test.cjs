'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
	mergeHybridResults
} = require('../uniCloud-aliyun/cloudfunctions/semanticSearch/search-utils')

test('关键词结果排在语义结果之前', () => {
	const result = mergeHybridResults(['k1', 'k2'], [
		{ source_id: 's1', score: 0.9 },
		{ source_id: 's2', score: 0.8 }
	])
	assert.deepEqual(result.orderedIds, ['k1', 'k2', 's1', 's2'])
})

test('语义通道与关键词重复时去重', () => {
	const result = mergeHybridResults(['same'], [
		{ source_id: 'same', score: 0.99 },
		{ source_id: 'other', score: 0.8 }
	])
	assert.deepEqual(result.orderedIds, ['same', 'other'])
	assert.equal(result.hitMap.same.matchType, 'keyword')
})

test('语义结果保留分数和摘要', () => {
	const result = mergeHybridResults([], [
		{ source_id: 's1', score: 0.75, digest: '摘要' }
	])
	assert.deepEqual(result.hitMap.s1, {
		matchType: 'semantic',
		score: 0.75,
		digest: '摘要'
	})
})
