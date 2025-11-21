import App from './App'

// #ifndef VUE3
import Vue from 'vue'

import store from './store'
import './uni.promisify.adaptor'

Vue.prototype.towxml = require('./wxcomponents/towxml/index.js')

// 将渲染 API 挂载到全局，供小程序组件使用
import { renderLatex, renderYuml } from './api/render.js'
if (typeof global !== 'undefined') {
	global.renderLatex = renderLatex
	global.renderYuml = renderYuml
}

import cuCustom from './colorui/components/cu-custom.vue'
Vue.component('cu-custom', cuCustom)

// 注册全局登录弹窗组件
import LoginModal from './component/login-modal/index.vue'
Vue.component('login-modal', LoginModal)

Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
	store,
	...App
})
app.$mount()

// 将 store 和 app 实例挂载到 globalData，供工具函数使用
if (typeof getApp !== 'undefined') {
	const globalApp = getApp();
	if (globalApp && !globalApp.globalData) {
		globalApp.globalData = {};
	}
	if (globalApp && globalApp.globalData) {
		globalApp.globalData.store = app.$store;
		globalApp.globalData.app = app; // 挂载 app 实例
	}
}
// #endif

// #ifdef VUE3
import {
	createSSRApp
} from 'vue'
export function createApp() {
	const app = createSSRApp(App)
	return {
		app
	}
}
// #endif