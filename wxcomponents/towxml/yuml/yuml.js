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
		attr:{
			src:'',
			class:''
		},
		size:{
			w:0,
			h:0
		},
		// 图表是否仍在渲染（骨架占位中）
		loading: true,
		// 图表渲染是否失败
		failed: false
	},
	lifetimes:{
		attached:function(){
			const _ts = this;
			let dataAttr = this.data.data.attrs;
			const theme = global._theme || 'light';
			const yumlValue = decodeURIComponent(dataAttr.value);

			// 直接调用云函数渲染 YUML 图表
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
				_ts.setData({ loading: false, failed: true });
				return;
			}
			
			// 带缓存渲染：命中缓存直接复用，未命中调云函数并缓存结果
			renderCache.renderWithCache('yuml', yumlValue, theme, () => {
				return cloud.callFunction({
					name: 'renderYuml',
					data: {
						yuml: yumlValue,
						theme: theme
					}
				}).then(res => {
					if (res.result && res.result.code === 0) {
						return res.result.data;
					}
					throw new Error(res.result?.message || 'YUML 渲染失败');
				});
			}).then(data => {
				// 云函数返回 Base64 格式的图片
				_ts.setData({
					attr: {
						src: data,
						class: `${dataAttr.class}`
					}
				});
			}).catch(err => {
				console.error('调用 YUML 云函数失败：', err.message || err);
				_ts.setData({ loading: false, failed: true });
			});
		}
	},
	methods: {
		// 点击图表 → 全屏大图预览
		// （云函数返回 SVG data URI，previewImage 真机不支持 SVG，走组件内全屏预览）
		onTap: function(){
			const src = this.data.attr && this.data.attr.src;
			if (!src) return;
			const preview = this.selectComponent('#chartPreview');
			if (preview) preview.show(src);
		},
		load:function(e){
			const _ts = this;
			// 图片上屏，撤掉骨架占位
			let scale = 20,
				w = e.detail.width / scale,
				h = e.detail.height / scale;
			_ts.setData({
				loading: false,
				size:{
					w:w,
					h:h
				}
			});
		},
		// 图片加载失败：撤掉骨架并提示失败
		onImgError:function(){
			this.setData({ loading: false, failed: true });
		}
	}
})