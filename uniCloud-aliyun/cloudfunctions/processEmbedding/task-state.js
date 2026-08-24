'use strict'

function nextFailureState(currentRetryCount, maxRetryCount) {
	const retryCount = (Number(currentRetryCount) || 0) + 1
	return {
		retryCount,
		status: retryCount >= maxRetryCount ? 'failed' : 'pending'
	}
}

module.exports = {
	nextFailureState
}
