<!--
 * @Author: yuanchuang 1226377893@qq.com
 * @Date: 2024-09-03 16:31:36
 * @LastEditors: yuanchuang 1226377893@qq.com
 * @LastEditTime: 2024-09-03 16:39:36
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

    <view class="cu-list grid" :class="['col-' + gridCol, gridBorder ? '' : 'no-border']">
      <view class="cu-item" v-for="(item, index) in cuIconList" :key="index" v-if="index < gridCol * 2">
        <text>{{ item.name }}</text>
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
