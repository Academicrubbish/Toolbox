const summary = {
  state: {
    summarizeId: '',
    summarizeStatus: '',
    prefillContent: '',
    prefillSource: '',
    prefillTitle: '',
    ocrLogId: ''
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
    },
    SET_PREFILL: (state, payload) => {
      state.prefillContent = payload.content || ''
      state.prefillSource = payload.source || ''
      state.prefillTitle = payload.title || ''
      state.ocrLogId = payload.ocrLogId || ''
    },
    CLEAR_PREFILL: (state) => {
      state.prefillContent = ''
      state.prefillSource = ''
      state.prefillTitle = ''
      state.ocrLogId = ''
    }
  },

  actions: {
    cacheSummary({ commit, state }, data) {
      commit('SET_SUMMARIZEID', data.id)
      commit('SET_SUMMARIZESTATUS', data.status)
    },
    deleteSummary({ commit, state }) {
      commit('DEL_SUMMARIZEID')
      commit('DEL_SUMMARIZESTATUS')
    },
    cachePrefill({ commit }, payload) {
      commit('SET_PREFILL', payload)
    },
    clearPrefill({ commit }) {
      commit('CLEAR_PREFILL')
    }
  }
}

export default summary
