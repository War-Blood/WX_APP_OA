<template>
  <view class="login-page">
    <view class="hero-section">
      <view class="logo-wrapper">
        <view class="logo-icon">
          <text class="logo-text">OA</text>
        </view>
      </view>
      <text class="app-name">智慧办公助手</text>
      <text class="slogan">轻量化办公 · 高效能协作</text>
    </view>

    <view class="feature-section">
      <view class="feature-card" v-for="(item, index) in features" :key="index">
        <view class="feature-icon" :style="{ background: item.bg }">
          <OaIcon :name="item.icon" size="36" />
        </view>
        <text class="feature-title">{{ item.title }}</text>
        <text class="feature-desc">{{ item.desc }}</text>
      </view>
    </view>

    <view class="action-section">
      <button class="login-btn" @tap="handleLogin" :loading="isLogging">
        <text class="login-btn-text">微信一键登录</text>
      </button>

      <view class="dev-skip" @tap="handleDevLogin">
        <text class="dev-skip-text">跳过登录，进入首页 ›</text>
      </view>

      <view class="agreement">
        <label class="agreement-checkbox" @tap="toggleAgreement">
          <view :class="['checkbox-box', { checked: agreed }]">
            <text v-if="agreed" class="checkbox-tick">✓</text>
          </view>
        </label>
        <text class="agreement-text">
          登录即同意
          <text class="agreement-link">《用户协议》</text>
          和
          <text class="agreement-link">《隐私政策》</text>
        </text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const agreed = ref(false)
const isLogging = ref(false)

const features = [
  {
    icon: 'approval',
    title: '审批管理',
    desc: '流程审批，高效流转',
    bg: 'linear-gradient(135deg, #EDF2FF 0%, #D6E4FF 100%)'
  },
  {
    icon: 'report',
    title: '日报提交',
    desc: '工作报告，一键提交',
    bg: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)'
  },
  {
    icon: 'notification',
    title: '消息通知',
    desc: '实时提醒，及时处理',
    bg: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)'
  }
]

function toggleAgreement() {
  agreed.value = !agreed.value
}

function goHome() {
  uni.redirectTo({ url: '/pages/home/index' })
}

function handleDevLogin() {
  uni.setStorageSync('token', 'dev-mode-token')
  uni.setStorageSync('userInfo', {
    nickName: '开发用户',
    avatarUrl: '',
    role: 'employee',
    department: '技术部'
  })
  goHome()
}

async function handleLogin() {
  if (!agreed.value) {
    uni.showToast({
      title: '请先阅读并同意协议',
      icon: 'none'
    })
    return
  }

  isLogging.value = true
  try {
    const { code } = await uni.login({ provider: 'weixin' })
    const res = await uni.request({
      url: 'https://warblood.online/api/auth/login',
      method: 'POST',
      data: { code }
    })
    if (res.data?.token) {
      uni.setStorageSync('token', res.data.token)
      uni.setStorageSync('userInfo', res.data.userInfo)
      goHome()
    } else {
      uni.showToast({ title: '登录失败，请重试', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
  } finally {
    isLogging.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
}

.hero-section {
  background: linear-gradient(180deg, #2B6DE8 0%, #3B77EA 52%, #5B8DF0 100%);
  border-radius: 0 0 48rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
  padding-bottom: 80rpx;
}

.logo-wrapper {
  width: 140rpx;
  height: 140rpx;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(43, 109, 232, 0.3);
  margin-bottom: 28rpx;
}

.logo-icon {
  width: 104rpx;
  height: 104rpx;
  background: linear-gradient(135deg, #2B6DE8 0%, #5B8DF0 100%);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 44rpx;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 4rpx;
}

.app-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 2rpx;
  margin-bottom: 10rpx;
}

.slogan {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 4rpx;
}

.feature-section {
  display: flex;
  gap: 20rpx;
  padding: 0 32rpx;
  margin-top: -36rpx;
  margin-bottom: 48rpx;
  z-index: 1;
}

.feature-card {
  flex: 1;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.feature-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.feature-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 6rpx;
}

.feature-desc {
  font-size: 22rpx;
  color: #999999;
}

.action-section {
  padding: 0 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: auto;
  padding-bottom: 60rpx;
}

.login-btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #2B6DE8 0%, #5B8DF0 100%);
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 8rpx 32rpx rgba(43, 109, 232, 0.35);
  border: none;
  margin-bottom: 20rpx;
}

.login-btn::after {
  border: none;
}

.login-btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 2rpx;
}

.dev-skip {
  margin-bottom: 32rpx;
}

.dev-skip-text {
  font-size: 26rpx;
  color: #2B6DE8;
  letter-spacing: 1rpx;
}

.agreement {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.agreement-checkbox {
  display: flex;
  align-items: center;
}

.checkbox-box {
  width: 30rpx;
  height: 30rpx;
  border-radius: 50%;
  border: 2rpx solid #D0D5DD;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.checkbox-box.checked {
  background: #2B6DE8;
  border-color: #2B6DE8;
}

.checkbox-tick {
  font-size: 18rpx;
  color: #FFFFFF;
  font-weight: 700;
}

.agreement-text {
  font-size: 24rpx;
  color: #999999;
}

.agreement-link {
  color: #2B6DE8;
}
</style>
