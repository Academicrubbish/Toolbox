<template>
  <view class="open">
    <view class="text-center text-xxl animation-slide-bottom open_title">
      <text class="text-black text-bold">番薯工具箱</text>
    </view>
    <view class="text-center margin-top text-bold animation-slide-bottom open_comment">
      <text>- 为你而准备 -</text>
    </view>
    <view class="animation-slide-bottom open_login">
      <view class="cu-bar btn-group login_btn">
        <button class="cu-btn bg-green shadow-blur round lg" @click="judgeUser">授权登录</button>
      </view>
      <view class="text-center text-grey margin-top" @tap="browseAsGuest">
        <text style="text-decoration: underline">游客登录</text>
      </view>
    </view>
  </view>
</template>

<script>
import moment from "moment";
export default {
  methods: {
    // 授权登录
    judgeUser() {
      uni.showLoading({
        title: "登录中"
      });

      const hideLoading = () => {
        uni.hideLoading();
      };

      this.loginWeixin()
        .then((code) => {
          return this.$store.dispatch("GetOpenId", code);
        })
        .then((openId) => {
          //获取用户信息，判断是否注册
          return this.$store.dispatch("GetInfo").then((isRegister) => {
            hideLoading();
            if (isRegister) {
              // 用户已注册
              this.$store.commit('SET_IS_GUEST', false);
              uni.redirectTo({
                url: "/pages/home/index"
              });
            } else {
              // 用户未注册，自动注册
              this.addUserInfo(openId);
            }
          });
        })
        .catch((error) => {
          hideLoading();
          uni.showToast({
            title: "登录失败，请重试",
            icon: "none"
          });
        });
    },

    // 游客登录
    browseAsGuest() {
      // 设置游客状态
      this.$store.commit('SET_IS_GUEST', true);
      // 清空 openid 和 userData
      this.$store.commit('SET_OPENID', '');
      this.$store.commit('SET_USERDATA', {});
      // 跳转到首页
      uni.redirectTo({
        url: "/pages/home/index"
      });
    },

    loginWeixin() {
      return new Promise((resolve, reject) => {
        uni.login({
          provider: "weixin",
          success: resolve,
          fail: reject
        });
      });
    },

    // 云数据库用户表新增
    addUserInfo(openId) {
      const data = {
        _openid: openId,
        createTime: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
        updateTime: moment(new Date()).format("YYYY-MM-DD HH:mm:ss")
      };

      this.$store.dispatch("AddUser", data)
        .then((res) => {
          this.$store.commit('SET_IS_GUEST', false);
          uni.showToast({
            title: res,
            icon: "success"
          });
          uni.redirectTo({
            url: "/pages/home/index"
          });
        })
        .catch((error) => {
          uni.showToast({
            title: error || "注册失败",
            icon: "none"
          });
        });
    }
  }
};
</script>

<style lang="scss" scoped>
.open {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to bottom, #f5f7fa 0%, #f1f1f1 100%);

  .open_title {
    animation-delay: 0.2s;
  }

  .open_comment {
    animation-delay: 0.3s;
    margin-top: 40rpx;
  }

  .open_login {
    animation-delay: 0.4s;
    margin-top: 200rpx;
    width: 100%;

    .login_btn {
      justify-content: center;
      margin-top: 0;
    }
  }
}
</style>
