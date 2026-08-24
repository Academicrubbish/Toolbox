'use strict'

function mergeHybridResults(keywordIds, semanticHits) {
	const keywordIdSet = new Set(keywordIds)
	const semanticExtras = (semanticHits || []).filter(hit => !keywordIdSet.has(hit.source_id))
	const orderedIds = keywordIds.concat(semanticExtras.map(hit => hit.source_id))
	const hitMap = {}
	keywordIds.forEach(id => { hitMap[id] = { matchType: 'keyword' } })
	semanticExtras.forEach(hit => {
		hitMap[hit.source_id] = {
			matchType: 'semantic',
			score: hit.score,
			digest: hit.digest
		}
	})
	return { orderedIds, hitMap, semanticExtras }
}

module.exports = {
	mergeHybridResults
}
