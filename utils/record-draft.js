'use strict'

const DRAFT_STORAGE_PREFIX = 'unfinished_record_draft_v1'

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function getRecordDraftKey(openid) {
  const owner = normalizeText(openid)
  return owner ? `${DRAFT_STORAGE_PREFIX}:${owner}` : ''
}

function normalizeRecordDraft(draft = {}) {
  const openid = normalizeText(draft.openid)
  const summarizeId = normalizeText(draft.summarizeId)
  if (!openid || !summarizeId) return null

  const tags = Array.isArray(draft.tags)
    ? [...new Set(draft.tags.map(normalizeText).filter(Boolean))]
    : []
  const now = Date.now()

  return {
    version: 1,
    openid,
    summarizeId,
    title: normalizeText(draft.title),
    tags,
    savedAt: Number(draft.savedAt) || now,
    updatedAt: Number(draft.updatedAt) || now,
  }
}

function getStorageAdapter(storage) {
  if (storage) return storage
  return typeof globalThis !== 'undefined' ? globalThis.uni : null
}

function saveRecordDraft(draft, storage) {
  const normalized = normalizeRecordDraft(draft)
  const adapter = getStorageAdapter(storage)
  if (!normalized || !adapter || typeof adapter.setStorageSync !== 'function') {
    return null
  }

  try {
    adapter.setStorageSync(
      getRecordDraftKey(normalized.openid),
      JSON.stringify(normalized),
    )
    return normalized
  } catch (error) {
    return null
  }
}

function getRecordDraft(openid, storage) {
  const key = getRecordDraftKey(openid)
  const adapter = getStorageAdapter(storage)
  if (!key || !adapter || typeof adapter.getStorageSync !== 'function') {
    return null
  }

  try {
    const stored = adapter.getStorageSync(key)
    if (!stored) return null
    const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored
    const normalized = normalizeRecordDraft(parsed)
    if (!normalized || normalized.openid !== normalizeText(openid)) {
      if (typeof adapter.removeStorageSync === 'function') {
        adapter.removeStorageSync(key)
      }
      return null
    }
    return normalized
  } catch (error) {
    if (typeof adapter.removeStorageSync === 'function') {
      adapter.removeStorageSync(key)
    }
    return null
  }
}

function clearRecordDraft(openid, summarizeId = '', storage) {
  const key = getRecordDraftKey(openid)
  const adapter = getStorageAdapter(storage)
  if (!key || !adapter || typeof adapter.removeStorageSync !== 'function') {
    return false
  }

  const expectedId = normalizeText(summarizeId)
  if (expectedId) {
    const current = getRecordDraft(openid, adapter)
    if (!current || current.summarizeId !== expectedId) return false
  }

  try {
    adapter.removeStorageSync(key)
    return true
  } catch (error) {
    return false
  }
}

module.exports = {
  DRAFT_STORAGE_PREFIX,
  getRecordDraftKey,
  normalizeRecordDraft,
  saveRecordDraft,
  getRecordDraft,
  clearRecordDraft,
}
