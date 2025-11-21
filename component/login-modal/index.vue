<template>
  <uni-popup ref="loginModal" type="center" :mask-click="true" @change="handlePopupChange">
    <view class="login-modal">
      <view class="login-header">
        <view class="login-title">
          <text class="text-xxl text-bold text-black">markdown笔记</text>
        </view>
        <view class="login-subtitle">
          <text class="text-gray">- 为你而准备 -</text>
        </view>
      </view>
      
      <view class="login-content">
        <view class="login-tips">
          <text class="text-sm text-gray">登录后可保存和管理您的记录</text>
        </view>
        
        <view class="login-buttons">
          <button 
            class="cu-btn bg-green shadow-blur round lg login-btn" 
            @click="handleLogin" 
            :disabled="loading"
            :loading="loading">
            {{ loading ? '登录中...' : '点击授权' }}
          </button>
          <view class="text-center text-grey margin-top cancel-btn" @tap="handleCancel">
            <text style="text-decoration: underline">暂不登录</text>
          </view>
        </view>
      </view>
    </view>
  </uni-popup>
</template>

<script>
import moment from "moment";

export default {
  name: "LoginModal",
  data() {
    return {
      loading: false
    };
  },
  methods: {
    // 打开弹窗
    open() {
      if (this.$refs.loginModal) {
        // 使用 $nextTick 确保组件已完全渲染
        this.$nextTick(() => {
          try {
            this.$refs.loginModal.open();
          } catch (e) {
            // 忽略错误
          }
        });
      }
    },
    
    // 关闭弹窗
    close() {
      this.$refs.loginModal.close();
    },
    
    // 处理登录
    handleLogin() {
      if (this.loading) return;
      
      this.loading = true;
      
      this.loginWeixin()
        .then((code) => {
          return this.$store.dispatch("GetOpenId", code);
        })
        .then((openId) => {
          // 获取用户信息，判断是否注册
          return this.$store.dispatch("GetInfo").then((isRegister) => {
            this.loading = false;
            if (isRegister) {
              // 用户已注册
              this.$store.commit('SET_IS_GUEST', false);
              this.$emit("success");
              this.close();
              uni.showToast({
                title: "登录成功",
                icon: "success"
              });
            } else {
              // 用户未注册，自动注册
              this.addUserInfo(openId);
            }
          });
        })
        .catch((error) => {
          this.loading = false;
          uni.showToast({
            title: "登录失败，请重试",
            icon: "none"
          });
        });
    },
    
    // 微信登录
    loginWeixin() {
      return new Promise((resolve, reject) => {
        uni.login({
          provider: "weixin",
          success: resolve,
          fail: reject
        });
      });
    },
    
    // 注册用户
    addUserInfo(openId) {
      const data = {
        _openid: openId,
        createTime: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
        updateTime: moment(new Date()).format("YYYY-MM-DD HH:mm:ss")
      };

      this.$store.dispatch("AddUser", data)
        .then((res) => {
          this.loading = false;
          this.$store.commit('SET_IS_GUEST', false);
          this.$emit("success");
          this.close();
          uni.showToast({
            title: res,
            icon: "success"
          });
        })
        .catch((error) => {
          this.loading = false;
          uni.showToast({
            title: error || "注册失败",
            icon: "none"
          });
        });
    },
    
    // 取消登录
    handleCancel() {
      this.$emit("cancel");
      this.close();
    },
    
    // 弹窗状态变化
    handlePopupChange(e) {
      if (!e.show) {
        // 弹窗关闭时触发 cancel 事件
        this.$emit("cancel");
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.login-modal {
  width: 600rpx;
  max-width: 90vw;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 60rpx 40rpx 40rpx;
  box-sizing: border-box;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
}

.login-header {
  text-align: center;
  margin-bottom: 40rpx;
  
  .login-title {
    margin-bottom: 16rpx;
  }
  
  .login-subtitle {
    margin-top: 8rpx;
  }
}

.login-content {
  .login-tips {
    text-align: center;
    margin-bottom: 40rpx;
    padding: 0 20rpx;
  }
  
  .login-buttons {
    .login-btn {
      width: 100%;
      height: 88rpx;
      line-height: 88rpx;
      font-size: 32rpx;
      margin-bottom: 20rpx;
    }
    
    .cancel-btn {
      padding: 20rpx 0;
      cursor: pointer;
      
      &:active {
        opacity: 0.7;
      }
    }
  }
}
</style>

