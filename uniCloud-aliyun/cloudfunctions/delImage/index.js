'use strict'
exports.main = async (event, context) => {
	//event为客户端上传的参数
	const res = await uniCloud.deleteFile({ fileList: event.imgList })

	//返回数据给客户端
	return res
}