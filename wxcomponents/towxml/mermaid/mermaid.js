Component({
  options: {
    styleIsolation: 'shared'
  },
  properties: {
    data: {
      type: Object,
      value: {}
    }
  },
  data: {
    attrs: {
      src: '',
      class: ''
    },
    size: {
      w: 0,
      h: 0
    }
  },
  lifetimes: {
    attached: function() {
      const _ts = this
      let dataAttr = this.data.data.attrs
      const theme = global._theme || 'light'
      const codeValue = decodeURIComponent(dataAttr.value)

      let cloud = null
      if (typeof uniCloud !== 'undefined') {
        cloud = uniCloud
      }
      else if (typeof global !== 'undefined' && global.uniCloud) {
        cloud = global.uniCloud
      }
      else if (typeof getApp !== 'undefined') {
        const app = getApp()
        if (app && app.globalData && app.globalData.uniCloud) {
          cloud = app.globalData.uniCloud
        }
      }

      if (!cloud || typeof cloud.callFunction !== 'function') {
        console.error('uniCloud 未定义或不可用，无法调用 renderMermaid 云函数')
        return
      }

      cloud.callFunction({
        name: 'renderMermaid',
        data: {
          code: codeValue,
          theme: theme
        }
      }).then(res => {
        if (res.result && res.result.code === 0) {
          _ts.setData({
            attrs: {
              src: res.result.data,
              class: dataAttr.class
            }
          })
        } else {
          console.error('Mermaid 渲染失败：', res.result?.message)
        }
      }).catch(err => {
        console.error('调用 Mermaid 云函数失败：', err)
      })
    }
  },
  methods: {
    load: function(e) {
      const _ts = this
      const maxWidth = 690
      const scale = 1.5
      let w = e.detail.width
      let h = e.detail.height

      if (w > maxWidth) {
        h = h * maxWidth / w
        w = maxWidth
      }

      _ts.setData({
        size: {
          w: w / scale,
          h: h / scale
        }
      })
    }
  }
})
