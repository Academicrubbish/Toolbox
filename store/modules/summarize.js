const summary = {
  state: {
    summarizeId: '',
    summarizeStatus: ''
  },

  mutations: {
    SET_SUMMARIZEID: (state, summarizeId) => {
      state.summarizeId = summarizeId
    },
    SET_SUMMARIZESTATUS: (state, summarizeStatus) => {
      state.summarizeStatus = summarizeStatus
    },
    DEL_SUMMARIZEID: (state) => {
      state.summarizeId = ''
    },
    DEL_SUMMARIZESTATUS: (state) => {
      state.summarizeStatus = ''
    }
  },

  actions: {
    // 缓存总结数据
    cacheSummary({ commit, state }, data) {
      commit('SET_SUMMARIZEID', data.id)
      commit('SET_SUMMARIZESTATUS', data.status)
    },
    // 清空数据
    deleteSummary({ commit, state }) {
      commit('DEL_SUMMARIZEID')
      commit('DEL_SUMMARIZESTATUS')
    },
  }
}

export default summary
