<template>
  <view class="nav-bar" :class="{ 'nav-bar--brand': showLogo }">
    <view class="nav-left">
      <view v-if="showBack" class="back-btn" @tap="goBack">
        <image class="back-icon" src="/static/images/approval/back.png" mode="aspectFit" />
      </view>
      <slot name="left">
        <view v-if="leftCustom" class="nav-left-brand">
          <view class="logo-badge">
            <text class="logo-text">OA</text>
          </view>
          <text v-if="title" class="nav-title">{{ title }}</text>
        </view>
        <text v-else-if="title" class="nav-title">{{ title }}</text>
      </slot>
    </view>
    <view class="nav-right">
      <slot name="right">
        <view
          v-if="rightIcon"
          class="nav-icon-btn"
          @tap="onRightClick"
        >
          <uni-icons :type="rightIcon" size="44" color="#666666" />
          <view v-if="rightIcon === 'notification' && unreadCount > 0" class="badge">
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </view>
        </view>
      </slot>
    </view>
  </view>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  showLogo: {
    type: Boolean,
    default: false
  },
  showBack: {
    type: Boolean,
    default: false
  },
  rightIcon: {
    type: String,
    default: '',
    validator: (value) => ['', 'search', 'notification', 'settings', 'filter'].includes(value)
  },
  leftCustom: {
    type: Boolean,
    default: false
  },
  unreadCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['back', 'rightClick'])

function goBack() {
  emit('back')
  uni.navigateBack()
}

function onRightClick() {
  emit('rightClick')
}
</script>

<style scoped>
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  line-height: 88rpx;
  padding: 0 24rpx;
  background: #FFFFFF;
  flex-shrink: 0;
}

.nav-bar--brand {
  background: linear-gradient(180deg, #2B6DE8 0%, #3B77EA 100%);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.nav-left-brand {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.back-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  width: 48rpx;
  height: 48rpx;
}

.logo-badge {
  width: 56rpx;
  height: 56rpx;
  background: #2B6DE8;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 2rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333333;
}

.nav-bar--brand .nav-title {
  color: #FFFFFF;
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
  background: #F5F5F5;
  border-radius: 50%;
  position: relative;
}

.nav-icon-btn:active {
  opacity: 0.8;
  transform: scale(0.95);
}

.badge {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  min-width: 28rpx;
  height: 28rpx;
  background: #EF4444;
  border-radius: 14rpx;
  padding: 0 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  font-weight: 600;
  color: #FFFFFF;
  line-height: 1;
}
</style>
