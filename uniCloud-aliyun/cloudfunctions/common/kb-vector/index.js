'use strict'

function chunkNote(title, content) {
	const text = `${title || ''}\n${content || ''}`.trim()
	if (!text) return []
	if (text.length <= 1000) return [text]

	const sections = String(content || '').split(/\n(?=##\s)/)
	const chunks = []
	sections.forEach(section => {
		const piece = `${title || ''}\n${section}`.trim()
		splitLongPiece(piece, 1500).forEach(part => chunks.push(part))
	})
	return chunks
}

function splitLongPiece(piece, maxSize) {
	if (piece.length <= maxSize) return [piece]

	const parts = []
	let buffer = ''
	for (let line of piece.split('\n')) {
		while (line.length > maxSize) {
			if (buffer) {
				parts.push(buffer)
				buffer = ''
			}
			parts.push(line.slice(0, maxSize))
			line = line.slice(maxSize)
		}
		if (!line) continue
		if (buffer && buffer.length + 1 + line.length > maxSize) {
			parts.push(buffer)
			buffer = line
		} else {
			buffer = buffer ? `${buffer}\n${line}` : line
		}
	}
	if (buffer) parts.push(buffer)
	return parts
}

function cosine(a, b) {
	if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0
	let dot = 0
	let normA = 0
	let normB = 0
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}
	if (!normA || !normB) return 0
	return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

module.exports = {
	chunkNote,
	splitLongPiece,
	cosine
}
