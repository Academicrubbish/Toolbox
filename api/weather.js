export function getWeather(location) {
	return uni.request({
		url: 'https://devapi.qweather.com/v7/weather/now?key=5b81005e51744ced8ec0525d17ed39d4',
		method: 'GET',
		data: { location }
	})
}

export function getWill(location) {
	return uni.request({
		url: 'https://devapi.qweather.com/v7/weather/7d?lang=zh&key=5b81005e51744ced8ec0525d17ed39d4',
		method: 'GET',
		data: { location },
	})
}

export function getAir(location) {
	return uni.request({
		url: 'https://devapi.qweather.com/v7/air/5d?lang=zh&key=5b81005e51744ced8ec0525d17ed39d4',
		method: 'GET',
		data: { location },
	})
}

export function getHour(location) {
	return uni.request({
		url: 'https://devapi.qweather.com/v7/weather/24h?lang=zh&key=5b81005e51744ced8ec0525d17ed39d4',
		method: 'GET',
		data: { location },
	})
}

export function getNowAir(location) {
	return uni.request({
		url: 'https://devapi.qweather.com/v7/air/now?lang=zh&key=5b81005e51744ced8ec0525d17ed39d4',
		method: 'GET',
		data: { location, },
	})
}

export function getMinutely(location) {
	return uni.request({
		url: 'https://devapi.qweather.com/v7/minutely/5m?lang=zh&key=5b81005e51744ced8ec0525d17ed39d4',
		method: 'GET',
		data: { location, },
	})
}
