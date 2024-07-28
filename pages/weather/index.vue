<template>
	<view>
		<view class="cu-card case">
			<view class="cu-item shadow border" style="background-color: rgba(255, 255, 255, 0.8);">
				<view class="today-title">
					<text>
						<text class="cuIcon-locationfill" style="color: #1e86ee;" />
						{{loctionData.address.district+' '+loctionData.address.street}}
					</text>
					<text style="text-align: right;">{{now.obsTime.split('T')[0]}}</text>
				</view>
				<view class="today-weather">
					<view class="left">
						<image :src="require('@/static/weather/' + now.icon + '.png')">
					</view>
					<view class="right">
						<view class="content">
							<view class="temp">{{now.temp}}
								<view class="cu-tag tag">°C</view>
							</view>
							<view>{{now.text}}</view>
						</view>
					</view>
				</view>
				<view class="today-nowair">
					<span>
						<text class="cuIcon-timefill" />
						{{ summary }}
					</span>
					<span>
						<text class="cuIcon-evaluate_fill" />
						空气{{ nowAir.category+' '+ nowAir.aqi}}
					</span>

				</view>
				<view class="line" />
				<view class="today-other">
					<view class="flex-item">
						<span>
							<image src="@/static/WSpeed.png">
						</span>
						<span class="data">{{now.windSpeed}}km/h</span>
						<span class="describe">风速</span>
					</view>
					<view class="flex-item">
						<span>
							<image src="@/static/ATemp.png">
						</span>
						<span class="data">{{now.feelsLike}}°</span>
						<span class="describe">体感温度</span>
					</view>
					<view class="flex-item">
						<span>
							<image src="@/static/Humidity.png">
						</span>
						<span class="data">{{now.humidity}}%</span>
						<span class="describe">湿度</span>
					</view>
				</view>
			</view>
		</view>
		<view class="cu-card case">
			<view class="cu-item shadow border" style="margin-top: 0;">
				<view class="future-weather">
					<view v-for="(item,index) of daily" :key="item.fxDate">
						<span class="date">{{item.fxDate.split('-')}}-{{item.fxDate.split('-')[2]}}</span>
						<span>
							<image :src="require('@/static/weather/' + item.iconDay + '.png')">
						</span>
						<span class="temp">{{item.tempMax}}°/{{item.tempMin}}°</span>
						<span class="air">{{air[index].category}}</span>
					</view>
				</view>
			</view>
		</view>
		<view class="cu-card case">
			<view class="cu-item shadow border" style="margin-top: 0;">
				<view class="hour-title">
					<text class="cuIcon-time"></text>24小时预报
				</view>
				<view class="hour-weather">
					<w-chart ref="chart"></w-chart>
				</view>
			</view>
		</view>
		<view class="finally">
			敬请期待等多功能
		</view>
	</view>
</template>

<script>
	import {
		getWeather,
		getWill,
		getAir,
		getHour,
		getNowAir,
		getMinutely
	} from '../../api/weather.js'
	import wChart from '@/component/w-chart/index.vue'
	export default {
		components: {
			wChart
		},
		data() {
			return {
				loctionData: {
					longitude: 0, //经度
					latitude: 0, //纬度
					address: {}
				},
				now: {
					icon: '100',
					obsTime: '2023-02-14T00:46+08:00'
				}, //实时天气信息
				daily: [], //未来3天天气
				air: [], //未来3天空气质量
				nowAir: {}, //空气质量
				summary: '', //分钟级降水
			}
		},
		onLoad() {
			this.getRegeo()
		},
		methods: {
			requestData() {
				let lon = this.loctionData.longitude
				let lat = this.loctionData.latitude
				let requestData = lon + ',' + lat
				//24h天气画图
				this.$refs.chart.getServerData(requestData)
				//实时天气				
				getWeather(requestData).then(res => {
					console.log('111', res);
					if (res.data.code != '200') {
						this.$message('暂无此地区实时天气信息')
					} else {
						this.now = res.data.now
					}
				})
				//未来3天天气
				getWill(requestData).then(res => {
					console.log('222', res);
					if (res.data.code != '200') {
						this.$message('暂无此地区未来3天天气信息')
					} else {
						this.daily = res.data.daily.slice(0, 4)
					}
				})
				//未来3天天气质量
				getAir(requestData).then(res => {
					console.log('333', res);
					if (res.data.code != '200') {
						this.$message('暂无此地区未来3天天气质量信息')
					} else {
						this.air = res.data.daily.slice(0, 4)
					}
				})
				//当前实时天气质量
				getNowAir(requestData).then(res => {
					console.log('444', res);
					if (res.data.code != '200') {
						this.$message('暂无此地区实时天气质量信息')
					} else {
						this.nowAir = res.data.now
					}
				})
				//分钟级降水
				getMinutely(requestData).then(res => {
					console.log('555', res);
					if (res.data.code != '200') {
						this.$message('暂无此地区分钟级降水信息')
					} else {
						this.summary = res.data.summary
					}
				})
			},
			getRegeo() {
				let _this = this
				uni.getLocation({
					type: 'gcj02',
					geocode: true,
					success: function(res) {
						console.log('location', res);
						_this.loctionData.longitude = res.longitude
						_this.loctionData.latitude = res.latitude
						_this.loctionData.address = res.address
						// 创建地图坐标对象
						var point = new plus.maps.Point(res.longitude, res.latitude);
						//静态方法，反向地理编码
						plus.maps.Map.reverseGeocode(point, {}, (event) => {
								var address = event.address; // 转换后的地理位置
								var point = event.coord; // 转换后的坐标信息
								var coordType = event.coordType; // 转换后的坐标系类型
								var reg = /.+?(省|市|自治区|自治州|县|区)/g;
								var addressList = address.match(reg).toString().split(",");
								//注意 因为存在直辖市， 当所在地区为普通省市时，addressList.length == 3，city = addressList[1];当所在地区为直辖市时addressList.length == 2，city = addressList[0];
								let city = addressList.length == 3 ? addressList[1] : addressList[0];
								console.log("addressList", addressList);
							},
							function(e) {
								console.log("失败回调", e);
							}
						);
						_this.requestData()
					},
					fail: function(err) {
						console.log('err', err);
					}
				})
			}
		},


	}
</script>

<style lang="scss" scoped>
	.border {
		border-radius: 50rpx;
	}

	.today-title {
		font-size: 30rpx;
		color: gray;
		padding: 30rpx;
		display: flex;

		>text {
			line-height: 30rpx;
			flex: 1;
		}
	}

	.today-weather {
		height: 300rpx;

		>view {
			display: inline-block;
			height: 100%;
			width: 50%;
			vertical-align: middle;
			position: relative;
		}

		.left {
			image {
				width: 200rpx;
				height: 200rpx;
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-20%, -50%);
			}
		}

		.right {
			.content {
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-80%, -50%);

				.temp {
					font-size: 150rpx;
					text-align: center;
					position: relative;

					.tag {
						padding: 0;
						background-color: transparent;
						position: absolute;
						top: 10rpx;
					}
				}
			}
		}
	}

	.today-nowair {
		height: 50rpx;
		text-align: center;

		>span {
			color: white;
			background-color: gray;
			border-radius: 20rpx;
			margin: 0 10rpx;
			padding: 0 10rpx;

			>text {
				margin-right: 10rpx;
			}
		}
	}

	.line {
		height: 1rpx;
		background-color: #f7f7f7;
		width: 86%;
		margin-left: 7%;
	}

	.today-other {
		height: 150rpx;
		text-align: center;
		align-items: center;
		display: flex;

		.flex-item {
			flex: 1;

			>span {
				display: block;
			}

			image {
				width: 35rpx;
				height: 35rpx;
			}

			.data {
				font-size: 20rpx;
			}

			.describe {
				font-size: 20rpx;
				color: gray;
			}
		}
	}

	.future-weather {
		background-color: #000032;
		color: white;
		height: 200rpx;
		text-align: center;
		align-items: center;
		display: flex;

		>view {
			flex: 1;

			>span {
				display: block;
			}

			image {
				height: 35rpx;
				width: 35rpx;
			}

			.date {
				font-size: 20rpx;
			}

			.temp {
				font-size: 20rpx;
			}

			.air {
				font-size: 20rpx;
			}
		}
	}

	.hour-title {
		line-height: 60rpx;
		padding-left: 40rpx;
		background-color: #000032;
		color: white;
	}

	.hour-weather {
		height: 400rpx;
		padding: 40rpx;
		background-color: #000032;
		color: white;
	}

	.finally {
		font-size: 20rpx;
		color: gray;
		line-height: 120rpx;
		text-align: center;
	}
</style>