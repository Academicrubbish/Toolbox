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

Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
	store,
	...App
})
app.$mount()
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