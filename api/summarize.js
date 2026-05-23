import store from '@/store';
import { withAuth } from '@/utils/api-auth.js';

// 延迟初始化数据库连接，避免在模块加载时 uniCloud 未初始化
const getRequest = () => {
  if (typeof uniCloud === 'undefined' || !uniCloud.database) {
    throw new Error('uniCloud 未初始化，请确保在应用启动后再调用数据库操作')
  }
  return uniCloud.database().collection("summarize")
}

// 查询总结详情
export function  getSummarize(id) {
  return getRequest().doc(id).get()
}

// 根据recordId查询summarize信息
export function  summarizeRecordInfoById(id) {
  return getRequest().where({ recordId: id }).get()
}



// 添加总结（需要登录）
export const addSummarize = withAuth(function(data) {
  return getRequest().add(data)
}, store)

// 更新总结（需要登录）
export const updateSummarize = withAuth(function(id, data) {
  return getRequest().doc(id).update(data)
}, store)

/**
 * 从 HTML 内容中提取云存储图片 fileID
 * @param {string} htmlString 富文本内容
 * @returns {Array<string>} 云存储图片 fileID 列表
 */
function extractCloudImageUrls(htmlString) {
	if (!htmlString) return []
	const urls = []
	// 匹配 <img src="..."> 和 <img src='...'>（含前置属性）
	const quotedRegex = /<img[^>]*src=["']([^"']+)["']/gi
	let match
	while ((match = quotedRegex.exec(htmlString)) !== null) {
		if (isCloudStorageUrl(match[1])) {
			urls.push(match[1])
		}
	}
	// 兜底：匹配无引号的 <img src=url>
	const unquotedRegex = /<img[^>]*src=([^'"\s>]+)/gi
	while ((match = unquotedRegex.exec(htmlString)) !== null) {
		if (isCloudStorageUrl(match[1]) && !urls.includes(match[1])) {
			urls.push(match[1])
		}
	}
	return urls
}

function isCloudStorageUrl(url) {
	if (!url) return false
	// 匹配 uniCloud 云存储协议头（cloud://）或已知上传路径（cloudstorage、recordImg）
	return /^cloud:\/\//i.test(url) || /cloudstorage|recordImg/i.test(url)
}

/**
 * 删除云存储中的图片
 * @param {Array<string>} imageUrls 图片 fileID 列表
 */
function deleteCloudImages(imageUrls) {
	if (!imageUrls || imageUrls.length === 0) return Promise.resolve()
	return uniCloud.callFunction({
		name: 'delImage',
		data: { imgList: imageUrls }
	})
}

// 删除总结（需要登录），级联删除云存储图片
export const delSummarize = withAuth(function(id) {
	const db = getRequest()
	// 1. 先查出内容，提取云存储图片
	return db.doc(id).get().then(res => {
		const record = res.result?.data?.[0] || res.data?.[0]
		const content = record?.content || ''
		const imageUrls = extractCloudImageUrls(content)
		// 2. 删除云存储图片
		return deleteCloudImages(imageUrls).then(() => {
			// 3. 删除数据库记录
			return db.doc(id).remove()
		})
	})
}, store)