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
		}
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
				return;
			}
			
			cloud.callFunction({
				name: 'renderLatex',
				data: {
					tex: texValue,
					theme: theme
				}
			}).then(res => {
				if (res.result && res.result.code === 0) {
					// 云函数返回 Base64 格式的图片
					_ts.setData({
						attrs: {
							src: res.result.data,
							class: `${dataAttr.class} ${dataAttr.class}--${dataAttr.type}`
						}
					});
				} else {
					console.error('LaTeX 渲染失败：', res.result?.message);
				}
			}).catch(err => {
				console.error('调用 LaTeX 云函数失败：', err);
			});
		}
	},
	methods: {
		load:function(e){
			const _ts = this;

			// 公式图片加载完成则根据其图片大小、类型计算其显示的合适大小
			let scale = 20,
				w = e.detail.width / scale,
				h = e.detail.height /scale;

			_ts.setData({
				size:{
					w:w,
					h:h
				}
			});
		}
	}
})