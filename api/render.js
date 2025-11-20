/**
 * LaTeX 和 YUML 渲染 API
 * 用于在小程序组件中调用云函数
 * 支持 ES6 export 和 CommonJS module.exports
 */

/**
 * 渲染 LaTeX 公式
 * @param {string} tex - LaTeX 公式文本
 * @param {string} theme - 主题：'light' 或 'dark'
 * @returns {Promise} 返回 Base64 格式的 SVG 图片
 */
function renderLatex(tex, theme = 'light') {
  return new Promise((resolve, reject) => {
    if (typeof uniCloud === 'undefined') {
      reject(new Error('uniCloud 未定义'));
      return;
    }
    
    uniCloud.callFunction({
      name: 'renderLatex',
      data: {
        tex: tex,
        theme: theme
      }
    }).then(res => {
      if (res.result && res.result.code === 0) {
        resolve(res.result.data);
      } else {
        reject(new Error(res.result?.message || 'LaTeX 渲染失败'));
      }
    }).catch(err => {
      console.error('调用 LaTeX 云函数失败：', err);
      reject(err);
    });
  });
}

/**
 * 渲染 YUML 图表
 * @param {string} yuml - YUML 图表文本
 * @param {string} theme - 主题：'light' 或 'dark'
 * @returns {Promise} 返回 Base64 格式的 SVG 图片
 */
function renderYuml(yuml, theme = 'light') {
  return new Promise((resolve, reject) => {
    if (typeof uniCloud === 'undefined') {
      reject(new Error('uniCloud 未定义'));
      return;
    }
    
    uniCloud.callFunction({
      name: 'renderYuml',
      data: {
        yuml: yuml,
        theme: theme
      }
    }).then(res => {
      if (res.result && res.result.code === 0) {
        resolve(res.result.data);
      } else {
        reject(new Error(res.result?.message || 'YUML 渲染失败'));
      }
    }).catch(err => {
      console.error('调用 YUML 云函数失败：', err);
      reject(err);
    });
  });
}

/**
 * 渲染 ECharts 图表
 * @param {object} option - ECharts 配置对象
 * @param {string} theme - 主题：'light' 或 'dark'
 * @param {number} width - 图表宽度（默认 800）
 * @param {number} height - 图表高度（默认 400）
 * @returns {Promise} 返回 Base64 格式的 PNG 图片
 */
function renderEcharts(option, theme = 'light', width = 800, height = 400) {
  return new Promise((resolve, reject) => {
    if (typeof uniCloud === 'undefined') {
      reject(new Error('uniCloud 未定义'));
      return;
    }
    
    uniCloud.callFunction({
      name: 'renderEcharts',
      data: {
        option: option,
        theme: theme,
        width: width,
        height: height
      }
    }).then(res => {
      if (res.result && res.result.code === 0) {
        resolve(res.result.data);
      } else {
        reject(new Error(res.result?.message || 'ECharts 渲染失败'));
      }
    }).catch(err => {
      console.error('调用 ECharts 云函数失败：', err);
      reject(err);
    });
  });
}

// ES6 export（用于 Vue 组件）
export { renderLatex, renderYuml, renderEcharts };

// CommonJS export（用于小程序组件）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    renderLatex: renderLatex,
    renderYuml: renderYuml,
    renderEcharts: renderEcharts
  };
}

