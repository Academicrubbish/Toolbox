import Vue from 'vue'
import Vuex from 'vuex'
import user from './modules/user'
import summarize from './modules/summarize'
import getters from './getters'

Vue.use(Vuex)

const store = new Vuex.Store({
  modules: {
    user,
    summarize
  },
  getters
})

export default store
