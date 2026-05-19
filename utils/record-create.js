import { callProcessOcr, callParseWechatArticle } from '@/api/ocr.js';
import { fetchWebPage } from '@/utils/web-reader.js';

/**
 * 带超时的 Promise 包装
 * @param {Promise} promise
 * @param {number} ms
 * @param {string} message
 * @returns {Promise}
 */
function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);
}

/**
 * OCR 拍照识别流程（独立于页面，可被 form.vue 和 home.vue 复用）
 * 流程：选择图片 → 逐张上传 → 云函数 OCR → 构建 Markdown → 缓存预填充
 * @param {Object} store - Vuex store 实例
 * @returns {Promise<boolean>} 成功返回 true，用户取消或失败返回 false
 */
export async function processOcr(store) {
  try {
    const res = await new Promise((resolve, reject) => {
      uni.chooseMedia({ count: 9, mediaType: ['image'], success: resolve, fail: reject });
    });
    if (!res.tempFiles || res.tempFiles.length === 0) return false;

    const total = res.tempFiles.length;
    const imageUrls = [];

    for (let i = 0; i < total; i++) {
      uni.showLoading({ title: `正在上传第 ${i + 1}/${total} 张...`, mask: true });
      const uploadRes = await uniCloud.uploadFile({
        filePath: res.tempFiles[i].tempFilePath,
        cloudPath: 'ocr/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.jpg'
      });
      imageUrls.push(uploadRes.fileID);
    }

    const estimatedSeconds = total * 4;
    uni.showLoading({ title: `正在识别 ${total} 张图片（预计约${estimatedSeconds}s）`, mask: true });
    const ocrRes = await withTimeout(
      callProcessOcr({ imageUrls, source: 'depart' }),
      90000,
      '识别超时，请减少图片数量或稍后重试'
    );
    uni.hideLoading();

    const imageMarkdown = imageUrls.map(url => '![](' + url + ')').join('\n\n');
    const fullContent = imageMarkdown + '\n\n---\n\n' + ocrRes.data.content;

    store.dispatch('cachePrefill', {
      content: fullContent,
      source: 'ocr',
      ocrLogId: ocrRes.data.logId
    });
    return true;
  } catch (err) {
    uni.hideLoading();
    if (err && err.errMsg && err.errMsg.includes('cancel')) return false;
    uni.showToast({ title: (err && err.message) || '识别失败，请重试', icon: 'none' });
    return false;
  }
}

/**
 * 链接导入流程（独立于页面，可被 form.vue 和 home.vue 复用）
 * 流程：输入 URL → 客户端获取 → 云函数清洗 → 缓存预填充
 * @param {Object} store - Vuex store 实例
 * @returns {Promise<{ title: string }|false>} 成功返回解析结果，失败或取消返回 false
 */
export async function processLinkImport(store) {
  try {
    const res = await new Promise((resolve) => {
      uni.showModal({ title: '导入链接', editable: true, placeholderText: '请粘贴微信公众号文章链接', success: resolve });
    });
    if (!res.confirm || !res.content) return false;
    const url = res.content.trim();

    if (!url.includes('mp.weixin.qq.com')) {
      uni.showToast({ title: '暂不支持该链接，目前仅支持微信公众号文章', icon: 'none' });
      return false;
    }

    uni.showLoading({ title: '正在获取文章...', mask: true });

    const article = await withTimeout(
      fetchWebPage(url),
      15000,
      '获取文章超时，请检查网络'
    );

    uni.showLoading({ title: '正在清洗文章（约10s）', mask: true });
    const parseRes = await withTimeout(
      callParseWechatArticle({ html: article.content, title: article.title }),
      60000,
      '清洗超时，请稍后重试'
    );
    uni.hideLoading();

    store.dispatch('cachePrefill', {
      content: parseRes.data.content,
      source: 'link',
      title: parseRes.data.title
    });

    return { title: parseRes.data.title || '' };
  } catch (err) {
    uni.hideLoading();
    uni.showToast({ title: (err && err.message) || '解析失败，请重试', icon: 'none' });
    return false;
  }
}
