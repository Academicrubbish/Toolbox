<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-09-03 16:31:36
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2024-09-23 09:55:54
 * @FilePath: \Toolbox\subpackage\dictCategory\index.vue
 * @Description: 类别管理
 * 
-->
<template>
  <view>
    <cu-custom bgColor="bg-gradual-pink" :isBack="true">
      <block slot="backText">返回</block>
      <block slot="content">列表</block>
    </cu-custom>


    <view class="cu-bar bg-white solid-bottom margin-top">
      <view class="action">
        <text class="cuIcon-title text-orange "></text> 宫格列表
      </view>
      <view class="action">
        <button class="cu-btn bg-green shadow" @tap="showModal" data-target="gridModal">设置</button>
      </view>
    </view>
    <view class='cate-item padding-sm flex flex-wrap'>
      <view class="padding-xs" v-for="(item, index) in ColorList" :key="index">
        <view class='cu-tag' :class="item.isLight ? 'light bg-' + item.name : 'bg-' + item.name">
          {{ item.title }}
        </view>
      </view>
    </view>


    <view class="cu-modal" :class="modalName == 'gridModal' ? 'show' : ''" @tap="hideModal">
      <view class="cu-dialog" @tap.stop>
        <radio-group class="block" @change="Gridchange">
          <view class="cu-list menu text-left">
            <view class="cu-item" v-for="(item, index) in 3" :key="index">
              <label class="flex justify-between align-center flex-sub">
                <view class="flex-sub">{{ index + 3 }} 列</view>
                <radio class="round" :value="(index + 3) + ''" :class="gridCol == index + 3 ? 'checked' : ''"
                  :checked="gridCol == index + 3"></radio>
              </label>
            </view>
          </view>
        </radio-group>
        <view class="cu-list menu text-left solid-top">
          <view class="cu-item">
            <view class="content">
              <text class="text-grey">边框</text>
            </view>
            <view class="action">
              <switch @change="Gridswitch" :class="gridBorder ? 'checked' : ''" :checked="gridBorder ? true : false">
              </switch>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      ColorList: [
        {
          title: '嫣红',
          name: 'red',
          color: '#e54d42',
          isLight: false
        },
        {
          title: '桔橙',
          name: 'orange',
          color: '#f37b1d',
          isLight: false
        },
        {
          title: '明黄',
          name: 'yellow',
          color: '#fbbd08',
          isLight: false
        },
        {
          title: '橄榄',
          name: 'olive',
          color: '#8dc63f',
          isLight: false
        },
        {
          title: '森绿',
          name: 'green',
          color: '#39b54a',
          isLight: false
        },
        {
          title: '天青',
          name: 'cyan',
          color: '#1cbbb4',
          isLight: false
        },
        {
          title: '海蓝',
          name: 'blue',
          color: '#0081ff',
          isLight: false
        },
        {
          title: '姹紫',
          name: 'purple',
          color: '#6739b6',
          isLight: false
        },
        {
          title: '木槿',
          name: 'mauve',
          color: '#9c26b0',
          isLight: false
        },
        {
          title: '桃粉',
          name: 'pink',
          color: '#e03997',
          isLight: false
        },
        {
          title: '棕褐',
          name: 'brown',
          color: '#a5673f',
          isLight: false
        },
        {
          title: '玄灰',
          name: 'grey',
          color: '#8799a3',
          isLight: false
        },
        {
          title: '草灰',
          name: 'gray',
          color: '#aaaaaa',
          isLight: false
        },
        {
          title: '墨黑',
          name: 'black',
          color: '#333333',
          isLight: false
        },

        {
          title: '嫣红',
          name: 'red',
          color: '#e54d42',
          isLight: true
        },
        {
          title: '桔橙',
          name: 'orange',
          color: '#f37b1d',
          isLight: true
        },
        {
          title: '明黄',
          name: 'yellow',
          color: '#fbbd08',
          isLight: true
        },
        {
          title: '橄榄',
          name: 'olive',
          color: '#8dc63f',
          isLight: true
        },
        {
          title: '森绿',
          name: 'green',
          color: '#39b54a',
          isLight: true
        },
        {
          title: '天青',
          name: 'cyan',
          color: '#1cbbb4',
          isLight: true
        },
        {
          title: '海蓝',
          name: 'blue',
          color: '#0081ff',
          isLight: true
        },
        {
          title: '姹紫',
          name: 'purple',
          color: '#6739b6',
          isLight: true
        },
        {
          title: '木槿',
          name: 'mauve',
          color: '#9c26b0',
          isLight: true
        },
        {
          title: '桃粉',
          name: 'pink',
          color: '#e03997',
          isLight: true
        },
        {
          title: '棕褐',
          name: 'brown',
          color: '#a5673f',
          isLight: true
        },
        {
          title: '玄灰',
          name: 'grey',
          color: '#8799a3',
          isLight: true
        }
      ],
      cuIconList: [{
        cuIcon: 'cardboardfill',
        color: 'red',
        badge: 120,
        name: 'VR'
      }, {
        cuIcon: 'recordfill',
        color: 'orange',
        badge: 1,
        name: '录像'
      }, {
        cuIcon: 'picfill',
        color: 'yellow',
        badge: 0,
        name: '图像'
      }, {
        cuIcon: 'noticefill',
        color: 'olive',
        badge: 22,
        name: '通知'
      }, {
        cuIcon: 'upstagefill',
        color: 'cyan',
        badge: 0,
        name: '排行榜'
      }, {
        cuIcon: 'clothesfill',
        color: 'blue',
        badge: 0,
        name: '皮肤'
      }, {
        cuIcon: 'discoverfill',
        color: 'purple',
        badge: 0,
        name: '发现'
      }, {
        cuIcon: 'questionfill',
        color: 'mauve',
        badge: 0,
        name: '帮助'
      }, {
        cuIcon: 'commandfill',
        color: 'purple',
        badge: 0,
        name: '问答'
      }, {
        cuIcon: 'brandfill',
        color: 'mauve',
        badge: 0,
        name: '版权'
      }],
      modalName: null,
      gridCol: 3,
      gridBorder: false,
      menuBorder: false,
      menuArrow: false,
      menuCard: false,
      skin: false,
      listTouchStart: 0,
      listTouchDirection: null,
    };
  },
  methods: {
    showModal(e) {
      this.modalName = e.currentTarget.dataset.target
    },
    hideModal(e) {
      this.modalName = null
    },
    Gridchange(e) {
      this.gridCol = e.detail.value
    },
    Gridswitch(e) {
      this.gridBorder = e.detail.value
    },
    MenuBorder(e) {
      this.menuBorder = e.detail.value
    },
    MenuArrow(e) {
      this.menuArrow = e.detail.value
    },
    MenuCard(e) {
      this.menuCard = e.detail.value
    },
    SwitchSex(e) {
      this.skin = e.detail.value
    },

    // ListTouch触摸开始
    ListTouchStart(e) {
      this.listTouchStart = e.touches[0].pageX
    },

    // ListTouch计算方向
    ListTouchMove(e) {
      this.listTouchDirection = e.touches[0].pageX - this.listTouchStart > 0 ? 'right' : 'left'
    },

    // ListTouch计算滚动
    ListTouchEnd(e) {
      if (this.listTouchDirection == 'left') {
        this.modalName = e.currentTarget.dataset.target
      } else {
        this.modalName = null
      }
      this.listTouchDirection = null
    }
  }
}
</script>

<style>
.cate-item {
  background: #fff;
}

.cu-tag {
  border-radius: 25rpx;
}

.page {
  height: 100Vh;
  width: 100vw;
}

.page.show {
  overflow: hidden;
}

.switch-sex::after {
  content: "\e716";
}

.switch-sex::before {
  content: "\e7a9";
}

.switch-music::after {
  content: "\e66a";
}

.switch-music::before {
  content: "\e6db";
}
</style>
