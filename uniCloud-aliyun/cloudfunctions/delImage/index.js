'use strict'

// 旧客户端曾直接传任意 fileID 到这里，无法验证图片归属。
// 删除图片统一经 noteService 校验笔记归属后执行。
exports.main = async () => ({ code: -410, message: '请更新小程序后重试图片操作' })
