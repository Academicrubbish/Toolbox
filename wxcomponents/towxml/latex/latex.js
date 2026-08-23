const renderCache = require('../render-cache.js');

Component({
	options: {
		styleIsolation: 'shared'
	},
	properties: {
		data: {
			type: Object,
			value: {}
		}
	},
	data: {
		size:{
			w:0,
			h:0
		},
		// 公式图片是否仍在渲染（骨架占位中）
		loading: true
	},
	lifetimes:{
		attached:function(){
			const _ts = this;
			let dataAttr = this.data.data.attrs;
			const theme = global._theme || 'light';
			const texValue = decodeURIComponent(dataAttr.value);

			// 直接调用云函数渲染 LaTeX 公式
			// 尝试多种方式获取 uniCloud
			let cloud = null;
			
			// 方式1: 全局 uniCloud
			if (typeof uniCloud !== 'undefined') {
				cloud = uniCloud;
			}
			// 方式2: 从 global 获取
			else if (typeof global !== 'undefined' && global.uniCloud) {
				cloud = global.uniCloud;
			}
			// 方式3: 从 getApp().globalData 获取
			else if (typeof getApp !== 'undefined') {
				const app = getApp();
				if (app && app.globalData && app.globalData.uniCloud) {
					cloud = app.globalData.uniCloud;
				}
			}
			
			if (!cloud || typeof cloud.callFunction !== 'function') {
				console.error('uniCloud 未定义或不可用，无法调用云函数');
				_ts.setData({ loading: false });
				return;
			}

			// 带缓存渲染：命中缓存直接复用，未命中调云函数并缓存结果
			renderCache.renderWithCache('latex', texValue, theme, () => {
				return cloud.callFunction({
					name: 'renderLatex',
					data: {
						tex: texValue,
						theme: theme
					}
				}).then(res => {
					if (res.result && res.result.code === 0) {
						return res.result.data;
					}
					throw new Error(res.result?.message || 'LaTeX 渲染失败');
				});
			}).then(data => {
				// 云函数返回 Base64 格式的图片
				_ts.setData({
					attrs: {
						src: data,
						class: `${dataAttr.class} ${dataAttr.class}--${dataAttr.type}`
					}
				});
			}).catch(err => {
				console.error('调用 LaTeX 云函数失败：', err.message || err);
				_ts.setData({ loading: false });
			});
		}
	},
	methods: {
		load:function(e){
			const _ts = this;

			// 图片上屏，撤掉骨架占位
			let scale = 20,
				w = e.detail.width / scale,
				h = e.detail.height /scale;

			_ts.setData({
				loading: false,
				size:{
					w:w,
					h:h
				}
			});
		},
		// 图片加载失败：撤掉骨架占位
		onImgError:function(){
			this.setData({ loading: false });
		}
	}
})