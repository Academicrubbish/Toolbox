<template>
	<view class="charts-box">
		<qiun-data-charts type="line" :opts="opts" :chartData="chartData" :enableScroll="true" :ontouch="true" />
	</view>
</template>

<script>
	import {
		getHour
	} from '../../api/weather.js'
	export default {
		data() {
			return {
				chartData: {},
				//您可以通过修改 config-ucharts.js 文件中下标为 ['line'] 的节点来配置全局默认参数，如都是默认参数，此处可以不传 opts 。实际应用过程中 opts 只需传入与全局默认参数中不一致的【某一个属性】即可实现同类型的图表显示不同的样式，达到页面简洁的需求。
				opts: {
					color: ['#3CA272'],
					padding: [15, 0, 0, 0],
					enableScroll: true,
					legend: {
						show: false
					},
					xAxis: {
						axisLine: false,
						disableGrid: true,
						scrollShow: false,
						itemCount: 7,
					},
					yAxis: {
						disabled: true,
						disableGrid: true
					},
					extra: {
						line: {
							type: 'curve',
							width: 2,
							activeType: 'hollow'
						}
					}
				}
			}
		},
		methods: {
			getServerData(requestData) {
				//24h天气预报
				getHour(requestData).then(res => {
					if (res.data.code != '200') {
						this.$message('暂无此地区未来24h天气信息')
					} else {
						let hourly = {
							categories: [],
							series: [{
								name: '温度',
								data: []
							}]
						}
						res.data.hourly.forEach(item => {
							hourly.categories.push(item.fxTime.split('T')[1].split('+')[0])
							hourly.series[0].data.push(item.temp)
						})
						this.chartData = JSON.parse(JSON.stringify(hourly))
					}
				})
			},
		}
	}
</script>

<style scoped>
	/* 请根据实际需求修改父元素尺寸，组件自动识别宽高 */
	.charts-box {
		width: 100%;
		height: 100%;
	}
</style>