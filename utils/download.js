/**
 * 文档下载工具
 * 处理 Markdown 内容的下载、上传云存储、保存本地等逻辑
 */
import moment from "moment";

/**
 * 下载 Markdown 文档
 * @param {string} title - 文档标题，用于生成文件名
 * @param {string} content - Markdown 内容
 */
export function downloadMarkdown(title, content) {
  if (!content) {
    uni.showToast({ title: '暂无内容可下载', icon: 'none' });
    return;
  }

  uni.showLoading({ title: '准备下载...', mask: true });

  const fileName = `${title || '文档'}_${moment().format('YYYYMMDD_HHmmss')}.md`;
  uploadMarkdownToCloud(fileName, content);
}

/**
 * 上传 Markdown 到云存储
 */
function uploadMarkdownToCloud(fileName, content) {
  const cloudPath = `downloads/${moment().unix()}_${fileName}`;
  const fs = uni.getFileSystemManager();

  let userDataPath = '';
  try {
    if (typeof wx !== 'undefined' && wx.env && wx.env.USER_DATA_PATH) {
      userDataPath = wx.env.USER_DATA_PATH;
    }
  } catch (e) {
    console.warn('无法获取USER_DATA_PATH：', e);
  }

  if (!userDataPath) {
    downloadMarkdownFallback(fileName, content);
    return;
  }

  const tempFilePath = `${userDataPath}/${fileName}`;

  fs.writeFile({
    filePath: tempFilePath,
    data: content,
    encoding: 'utf8',
    success: () => {
      uniCloud.uploadFile({
        cloudPath,
        filePath: tempFilePath,
        cloudPathAsRealPath: true,
        success: (uploadRes) => {
          downloadFileFromCloud(uploadRes.fileID, fileName);
        },
        fail: (err) => {
          uni.hideLoading();
          console.error('上传文件失败：', err);
          downloadMarkdownFallback(fileName, content);
        }
      });
    },
    fail: (err) => {
      uni.hideLoading();
      console.error('写入临时文件失败：', err);
      downloadMarkdownFallback(fileName, content);
    }
  });
}

/**
 * 从云存储下载文件到本地
 */
function downloadFileFromCloud(fileID, fileName) {
  uni.downloadFile({
    url: fileID,
    success: (downloadRes) => {
      if (downloadRes.statusCode === 200) {
        saveFileToLocal(downloadRes.tempFilePath, fileName);
      } else {
        uni.hideLoading();
        uni.showToast({ title: '下载失败', icon: 'none' });
      }
    },
    fail: (err) => {
      uni.hideLoading();
      console.error('下载文件失败：', err);
      uni.showToast({ title: '下载失败', icon: 'none' });
    }
  });
}

/**
 * 备用下载方案：复制内容到剪贴板
 */
function downloadMarkdownFallback(fileName, content) {
  uni.showModal({
    title: '提示',
    content: '由于平台限制，建议您复制内容后手动保存。是否复制内容到剪贴板？',
    success: (res) => {
      uni.hideLoading();
      if (res.confirm) {
        uni.setClipboardData({
          data: content,
          success: () => {
            uni.showToast({ title: '内容已复制到剪贴板', icon: 'success' });
          }
        });
      }
    }
  });
}

/**
 * 保存文件到本地
 */
function saveFileToLocal(tempFilePath, fileName) {
  uni.saveFile({
    tempFilePath,
    success: (saveRes) => {
      uni.hideLoading();
      uni.showToast({ title: '保存成功', icon: 'success', duration: 2000 });
      console.log('文件保存路径：', saveRes.savedFilePath);
      openFile(saveRes.savedFilePath);
    },
    fail: (err) => {
      uni.hideLoading();
      console.error('保存文件失败：', err);
      uni.showToast({ title: '保存失败', icon: 'none' });
    }
  });
}

/**
 * 打开已下载的文件
 */
function openFile(filePath) {
  uni.openDocument({
    filePath,
    showMenu: true,
    success: () => console.log('文件打开成功'),
    fail: (err) => {
      uni.showToast({ title: '打开文件失败', icon: 'none' });
      console.error('打开失败：', err);
    }
  });
}
