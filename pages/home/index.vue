<template>
  <view>
    <cu-custom bgColor="bg-gradual-pink">
      <block slot="content">首页</block>
    </cu-custom>

    <view class="cu-list menu sm-border">
      <view class="cu-item arrow" @tap="goDepart">
        <view class="content">
          <image src="/static/logo.png" class="png" mode="aspectFit"></image>
          <text class="text-grey">柒月</text>
        </view>
      </view>
      <view class="cu-item arrow">
        <view class="content">
          <text class="cuIcon-circlefill text-grey"></text>
          <text class="text-grey">图标 + 标题</text>
        </view>
      </view>

      <view class="cu-item arrow">
        <button class="cu-btn content" open-type="contact">
          <text class="cuIcon-btn text-olive"></text>
          <text class="text-grey">Open-type 按钮</text>
        </button>
      </view>
      <view class="cu-item arrow">
        <navigator
          class="content"
          hover-class="none"
          url="../list/list"
          open-type="redirect"
        >
          <text class="cuIcon-discoverfill text-orange"></text>
          <text class="text-grey">Navigator 跳转</text>
        </navigator>
      </view>
      <view class="cu-item arrow">
        <view class="content">
          <text class="cuIcon-emojiflashfill text-pink"></text>
          <text class="text-grey">头像组</text>
        </view>
        <view class="action">
          <view class="cu-avatar-group">
            <view
              class="cu-avatar round sm"
              style="
                background-image: url(https://ossweb-img.qq.com/images/lol/web201310/skin/big10001.jpg);
              "
            ></view>
            <view
              class="cu-avatar round sm"
              style="
                background-image: url(https://ossweb-img.qq.com/images/lol/web201310/skin/big81005.jpg);
              "
            ></view>
            <view
              class="cu-avatar round sm"
              style="
                background-image: url(https://ossweb-img.qq.com/images/lol/web201310/skin/big25002.jpg);
              "
            ></view>
            <view
              class="cu-avatar round sm"
              style="
                background-image: url(https://ossweb-img.qq.com/images/lol/web201310/skin/big91012.jpg);
              "
            ></view>
          </view>
          <text class="text-grey text-sm">4 人</text>
        </view>
      </view>
      <view class="cu-item arrow">
        <view class="content">
          <text class="cuIcon-btn text-green"></text>
          <text class="text-grey">按钮</text>
        </view>
        <view class="action">
          <button class="cu-btn round bg-green shadow">
            <text class="cuIcon-upload"></text> 上传
          </button>
        </view>
      </view>
      <view class="cu-item arrow">
        <view class="content">
          <text class="cuIcon-tagfill text-red margin-right-xs"></text>
          <text class="text-grey">标签</text>
        </view>
        <view class="action">
          <view class="cu-tag round bg-orange light">音乐</view>
          <view class="cu-tag round bg-olive light">电影</view>
          <view class="cu-tag round bg-blue light">旅行</view>
        </view>
      </view>
      <view class="cu-item arrow">
        <view class="content">
          <text class="cuIcon-warn text-green"></text>
          <text class="text-grey">文本</text>
        </view>
        <view class="action">
          <text class="text-grey text-sm">小目标还没有实现！</text>
        </view>
      </view>
      <view class="cu-item">
        <view class="content padding-tb-sm">
          <view>
            <text class="cuIcon-clothesfill text-blue margin-right-xs"></text>
            多行Item</view
          >
          <view class="text-gray text-sm">
            <text class="cuIcon-infofill margin-right-xs"></text>
            小目标还没有实现！</view
          >
        </view>
        <view class="action">
          <switch
            class="switch-sex"
            @change="SwitchSex"
            :class="skin ? 'checked' : ''"
            :checked="skin ? true : false"
          ></switch>
        </view>
      </view>
    </view>
  </view>
</template>
<script>
export default {
  data() {
    return {
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
    goDepart() {
      uni.navigateTo({
        url: "/subpackage/depart/index",
      });
    },
    showModal(e) {
      this.modalName = e.currentTarget.dataset.target;
    },
    hideModal(e) {
      this.modalName = null;
    },
    Gridchange(e) {
      this.gridCol = e.detail.value;
    },
    Gridswitch(e) {
      this.gridBorder = e.detail.value;
    },
    MenuBorder(e) {
      this.menuBorder = e.detail.value;
    },
    MenuArrow(e) {
      this.menuArrow = e.detail.value;
    },
    MenuCard(e) {
      this.menuCard = e.detail.value;
    },
    SwitchSex(e) {
      this.skin = e.detail.value;
    },

    // ListTouch触摸开始
    ListTouchStart(e) {
      this.listTouchStart = e.touches[0].pageX;
    },

    // ListTouch计算方向
    ListTouchMove(e) {
      this.listTouchDirection =
        e.touches[0].pageX - this.listTouchStart > 0 ? "right" : "left";
    },

    // ListTouch计算滚动
    ListTouchEnd(e) {
      if (this.listTouchDirection == "left") {
        this.modalName = e.currentTarget.dataset.target;
      } else {
        this.modalName = null;
      }
      this.listTouchDirection = null;
    },
  },
};
</script>

<style>
.page {
  height: 100vh;
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