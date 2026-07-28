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
    },
    // 图表渲染是否失败，失败时降级展示源码而非裂图
    failed: false,
    // 原始 mermaid 源码，供降级展示
    code: ''
  },
  lifetimes: {
    attached: function() {
      const _ts = this
      let dataAttr = this.data.data.attrs
      const theme = global._theme || 'light'
      const codeValue = decodeURIComponent(dataAttr.value)

      // 保存源码，渲染失败时降级展示
      _ts.setData({ code: codeValue })

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
        _ts.setData({ failed: true })
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
            },
            failed: false
          })
        } else {
          console.error('Mermaid 渲染失败：', res.result?.message)
          _ts.setData({ failed: true })
        }
      }).catch(err => {
        console.error('调用 Mermaid 云函数失败：', err)
        _ts.setData({ failed: true })
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
    },
    onError: function() {
      // 图片加载失败（如 Kroki 返回 400），降级显示源码
      this.setData({ failed: true })
    },
    _preview: function() {
      if (!this.data.attrs.src) return
      // 真机 previewImage 不支持 SVG，用 PNG 端点
      const pngUrl = this.data.attrs.src.replace('/svg/', '/png/')
      wx.previewImage({ urls: [pngUrl] })
    }
  }
})
