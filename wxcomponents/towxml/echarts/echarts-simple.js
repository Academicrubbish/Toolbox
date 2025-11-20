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
		}
	},
	lifetimes:{
		attached:function(){
			const _ts = this;
			let dataAttr = this.data.data.attrs;
			
			if (!dataAttr || !dataAttr.value) {
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
					return;
				}
				
				// 调用云函数渲染图表（使用屏幕宽度）
				cloud.callFunction({
					name: 'renderEcharts',
					data: {
						option: option,
						theme: theme,
						width: renderWidth,
						height: renderHeight
					}
				}).then(res => {
					if (res.result && res.result.code === 0) {
						// 云函数返回 Base64 格式的图片
						_ts.setData({
							attr: {
								src: res.result.data,
								class: dataAttr.class,
								height: renderHeight,
								width: renderWidth
							}
						});
					}
				}).catch(err => {
					// 静默处理错误
				});
			} catch (error) {
				// 静默处理错误
			}
		}
	},
	methods: {
		load:function(e){
			// 图片加载完成，无需额外处理（已使用 widthFix 模式自适应）
		},
		error:function(e){
			// 静默处理错误
		}
	}
})

