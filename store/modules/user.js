const db = uniCloud.database() //创建数据库连接

const user = {
  state: {
    openid: '',
    userData: {}
  },

  mutations: {
    SET_OPENID: (state, openid) => {
      state.openid = openid
    },
    SET_USERDATA: (state, userData) => {
      state.userData = userData
    }
  },

  actions: {
    // 获取用户open_id
    GetOpenId({ commit }, code) {
      return new Promise((resolve, reject) => {
        uniCloud.callFunction({
          name: 'login',
          data: { code: code.code }
        }).then(res => {
          let openid = res.result.data.openid
          commit('SET_OPENID', openid)
          resolve(openid)
        }).catch(error => {
          reject(error)
        })
      })
    },
    // 获取用户信息 
    GetInfo({ commit, state }) {
      return new Promise((resolve, reject) => {
        db.collection('tb_user').where({ _openid: state.openid }).get().then(res => {
          console.log('获取用户信息', res);
          const info = res.result.data
          if (info.length > 0) {
            commit('SET_USERDATA', info[0])
          } else {
            commit('SET_USERDATA', {})
          }
          resolve(info.length ? true : false)
        })
      })
    },
    // 注册用户
    AddUser({ commit, state }, userForm) {
      return new Promise((resolve, reject) => {
        db.collection("tb_user").add(userForm).then(res => {
          let data = userForm
          data.id = res.result.id
          commit('SET_USERDATA', data)
          resolve('注册成功')
        }).catch(err => {
          reject('注册失败')
        })
      })
    },
  }
}

export default user
