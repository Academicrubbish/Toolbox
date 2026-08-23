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
			class:'',
			height: 400
		},
		size:{
			w:0,
			h:0
		},
		// 图表是否仍在渲染（骨架占位中）
		loading: true,
		// 图表渲染是否失败，失败时展示提示而非空白
		failed: false
	},
	lifetimes:{
		attached:function(){
			const _ts = this;
			let dataAttr = this.data.data.attrs;

			if (!dataAttr || !dataAttr.value) {
				_ts.setData({ loading: false, failed: true });
				return;
			}
			
			const theme = global._theme || 'light';
			
			try {
				// 获取屏幕宽度（用于自适应）
				let screenWidth = 750; // 默认 750rpx（小程序标准宽度）
				try {
					const systemInfo = uni.getSystemInfoSync();
					if (systemInfo && systemInfo.windowWidth) {
						// 将 px 转换为 rpx（小程序中 1rpx = 屏幕宽度/750）
						// 但云函数需要的是 px，所以直接使用 windowWidth
						screenWidth = systemInfo.windowWidth;
					}
				} catch (e) {
					// 如果获取失败，使用默认值
				}
				
				// 解析 echarts 配置
				const decoded = decodeURIComponent(dataAttr.value);
				const config = JSON.parse(decoded);
				
				// 兼容两种格式：
				// 1. 包装格式：{option: {...}, height: 400, width: 800}
				// 2. 直接格式：{title: {...}, series: [...]}（直接的 ECharts option）
				let option;
				let configHeight = 400;
				let configWidth = 800;
				
				if (config.option) {
					// 包装格式
					option = config.option;
					configHeight = config.height || 400;
					configWidth = config.width || 800;
				} else if (config.title || config.series || config.xAxis || config.yAxis) {
					// 直接格式：直接是 ECharts option
					option = config;
					// 尝试从 option 中获取尺寸，如果没有则使用默认值
					if (config.width) configWidth = config.width;
					if (config.height) configHeight = config.height;
				} else {
					option = {};
				}
				
				// 基于屏幕宽度计算实际渲染尺寸（保持宽高比）
				// 使用屏幕宽度作为最大宽度，保持配置的宽高比
				const aspectRatio = configHeight / configWidth;
				const renderWidth = Math.min(screenWidth, configWidth);
				const renderHeight = Math.round(renderWidth * aspectRatio);
				
				// 设置显示尺寸（用于前端显示）
				_ts.setData({
					attr: {
						height: renderHeight,
						width: renderWidth
					}
				});
				
				// 尝试多种方式获取 uniCloud
				let cloud = null;
				if (typeof uniCloud !== 'undefined') {
					cloud = uniCloud;
				} else if (typeof global !== 'undefined' && global.uniCloud) {
					cloud = global.uniCloud;
				} else if (typeof getApp !== 'undefined') {
					const app = getApp();
					if (app && app.globalData && app.globalData.uniCloud) {
						cloud = app.globalData.uniCloud;
					}
				}
				
				if (!cloud || typeof cloud.callFunction !== 'function') {
					_ts.setData({ loading: false, failed: true });
					return;
				}
				
				// 带缓存渲染图表（缓存维度含宽高，尺寸变化不会误用旧图）
				renderCache.renderWithCache('echarts', decoded, theme + '|' + renderWidth + 'x' + renderHeight, () => {
					return cloud.callFunction({
						name: 'renderEcharts',
						data: {
							option: option,
							theme: theme,
							width: renderWidth,
							height: renderHeight
						}
					}).then(res => {
						if (res.result && res.result.code === 0) {
							return res.result.data;
						}
						throw new Error(res.result?.message || 'ECharts 渲染失败');
					});
				}).then(data => {
					// 云函数返回 Base64 格式的图片
					_ts.setData({
						attr: {
							src: data,
							class: dataAttr.class,
							height: renderHeight,
							width: renderWidth
						}
					});
				}).catch(err => {
					console.error('调用 ECharts 云函数失败：', err.message || err);
					_ts.setData({ loading: false, failed: true });
				});
			} catch (error) {
				console.error('ECharts 配置解析失败：', error.message || error);
				_ts.setData({ loading: false, failed: true });
			}
		}
	},
	methods: {
		load:function(e){
			// 图片上屏，撤掉骨架占位
			this.setData({ loading: false });
		},
		error:function(e){
			// 图片加载失败：撤掉骨架占位
			this.setData({ loading: false });
		},
		// 点击图表 → 全屏大图预览
		// （云函数返回 SVG data URI，previewImage 真机不支持 SVG，走组件内全屏预览）
		onTap: function(){
			const src = this.data.attr && this.data.attr.src;
			if (!src) return;
			const preview = this.selectComponent('#chartPreview');
			if (preview) preview.show(src);
		}
	}
})

