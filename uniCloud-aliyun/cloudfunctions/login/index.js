'use strict'
const WECHAT_APP_ID = process.env.WECHAT_APP_ID
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET

exports.main = async (event, context) => {
	if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
		return { code: -1, message: '微信登录服务缺少 WECHAT_APP_ID 或 WECHAT_APP_SECRET 环境变量' }
	}
	if (!event || !event.code) {
		return { code: -1, message: '微信登录 code 为空' }
	}

	const apiUrl = 'https://api.weixin.qq.com/sns/jscode2session?appid=' + encodeURIComponent(WECHAT_APP_ID) +
		'&secret=' + encodeURIComponent(WECHAT_APP_SECRET) + '&js_code=' + encodeURIComponent(event.code) +
		'&grant_type=authorization_code'
	const res = await uniCloud.httpclient.request(apiUrl, {
		method: 'GET',
		data: {},
		contentType: 'json', // 指定以application/json发送data内的数据
		dataType: 'json' // 指定返回值为json格式，自动进行parse
	})

	//返回数据给客户端
	return res
}
