// 延迟初始化数据库连接，避免在模块加载时 uniCloud 未初始化
const getDb = () => {
  if (typeof uniCloud === 'undefined' || !uniCloud.database) {
    throw new Error('uniCloud 未初始化，请确保在应用启动后再调用数据库操作')
  }
  return uniCloud.database()
}

const user = {
  state: {
    openid: '',
    userData: {},
    isGuest: true,  // 游客状态标识，默认为 true（游客状态）
    authStateVersion: 0  // 授权状态版本号，每次登录成功时递增
  },

  mutations: {
    SET_OPENID: (state, openid) => {
      state.openid = openid
    },
    SET_USERDATA: (state, userData) => {
      state.userData = userData
    },
    SET_IS_GUEST: (state, isGuest) => {
      const wasGuest = state.isGuest;
      state.isGuest = isGuest;
      // 如果从游客状态变为已登录状态，递增版本号
      if (wasGuest === true && isGuest === false) {
        state.authStateVersion += 1;
      }
    },
    INCREMENT_AUTH_STATE_VERSION: (state) => {
      state.authStateVersion += 1;
    }
  },

  actions: {
    // 获取用户open_id
    GetOpenId({ commit }, code) {
      return new Promise((resolve, reject) => {
        if (typeof uniCloud === 'undefined' || !uniCloud.callFunction) {
          reject(new Error('uniCloud 未初始化'))
          return
        }
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
        try {
          const db = getDb()
          db.collection('tb_user').where({ _openid: state.openid }).get().then(res => {
            console.log('获取用户信息', res);
            const info = res.result.data
            if (info.length > 0) {
              commit('SET_USERDATA', info[0])
            } else {
              commit('SET_USERDATA', {})
            }
            resolve(info.length ? true : false)
          }).catch(err => {
            reject(err)
          })
        } catch (error) {
          reject(error)
        }
      })
    },
    // 注册用户
    AddUser({ commit, state }, userForm) {
      return new Promise((resolve, reject) => {
        try {
          const db = getDb()
          db.collection("tb_user").add(userForm).then(res => {
            let data = userForm
            data.id = res.result.id
            commit('SET_USERDATA', data)
            resolve('注册成功')
          }).catch(err => {
            reject('注册失败')
          })
        } catch (error) {
          reject(error)
        }
      })
    },
  }
}

export default user
