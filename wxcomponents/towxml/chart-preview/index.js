/**
 * 全屏图表预览组件
 *
 * 用于 ECharts 等云函数返回 SVG data URI 的场景：
 * 真机 previewImage 不支持 SVG，无法走原生图片预览，
 * 改用全屏 <image>（本身支持 SVG data URI）+ 双指缩放实现大图查看。
 *
 * 用法：父组件 wxml 放置 <chart-preview id="chartPreview" />，
 * js 中 this.selectComponent('#chartPreview').show(src)
 */
Component({
	options: {
		styleIsolation: 'shared'
	},
	data: {
		visible: false,
		src: '',
		scale: 1
	},
	methods: {
		/** 显示大图预览 @param {string} src 图片地址（data URI / URL） */
		show: function (src) {
			this.setData({ visible: true, src: src, scale: 1 });
		},
		/** 关闭预览 */
		close: function () {
			this.setData({ visible: false });
		},
		/** 阻止图片上的 tap 冒泡关闭预览 */
		noop: function () {},
		/** 双指按下：记录初始指距与初始缩放 */
		onTouchStart: function (e) {
			if (e.touches && e.touches.length === 2) {
				this._startDist = this._distance(e.touches);
				this._startScale = this.data.scale;
			}
		},
		/** 双指移动：按指距比例缩放（限制在 0.5 ~ 5 倍） */
		onTouchMove: function (e) {
			if (e.touches && e.touches.length === 2 && this._startDist) {
				var scale = this._startScale * this._distance(e.touches) / this._startDist;
				scale = Math.min(5, Math.max(0.5, scale));
				this.setData({ scale: scale });
			}
		},
		/** 计算两指间距 */
		_distance: function (touches) {
			var dx = touches[0].clientX - touches[1].clientX;
			var dy = touches[0].clientY - touches[1].clientY;
			return Math.sqrt(dx * dx + dy * dy);
		}
	}
})
