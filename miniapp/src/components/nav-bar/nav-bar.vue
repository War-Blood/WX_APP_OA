<template>
  <view class="nav-bar">
    <view class="nav-left">
      <slot name="left">
        <view v-if="showLogo" class="logo-badge">
          <text class="logo-text">OA</text>
        </view>
        <view v-if="title" class="nav-title">{{ title }}</view>
      </slot>
    </view>
    <view class="nav-right">
      <slot name="right">
        <view v-if="showNotification" class="nav-icon-btn" @tap="goToMessage">
          <Remind theme="outline" size="24" fill="#ffffff" />
          <view v-if="unreadCount > 0" class="notification-badge">
            <text class="badge-text">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
          </view>
        </view>
        <view v-if="showSetting" class="nav-icon-btn" @tap="goToProfile">
          <Setting theme="outline" size="24" fill="#ffffff" />
        </view>
      </slot>
    </view>
  </view>
</template>

<script setup>
import { Remind, Setting } from '@icon-park/vue-next'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  showLogo: {
    type: Boolean,
    default: false
  },
  showNotification: {
    type: Boolean,
    default: false
  },
  showSetting: {
    type: Boolean,
    default: false
  },
  unreadCount: {
    type: Number,
    default: 0
  }
})

function goToMessage() {
  uni.navigateTo({ url: '/pages/message/index' })
}

function goToProfile() {
  uni.navigateTo({ url: '/pages/profile/index' })
}
</script>

<style scoped>
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: linear-gradient(180deg, #2B6DE8 0%, #3B77EA 100%);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.logo-badge {
  width: 72rpx;
  height: 72rpx;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.logo-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #2B6DE8;
  letter-spacing: 2rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 2rpx;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.nav-icon-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  position: relative;
  transition: all 0.2s ease;
}

.nav-icon-btn:active {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(0.95);
}

.notification-badge {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  min-width: 28rpx;
  height: 28rpx;
  background: #FF4D4F;
  border-radius: 14rpx;
  padding: 0 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #2B6DE8;
}

.badge-text {
  font-size: 18rpx;
  font-weight: 600;
  color: #FFFFFF;
  line-height: 1;
}
</style>
