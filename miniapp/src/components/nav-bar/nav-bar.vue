<template>
  <view class="nav-container" :style="{ paddingTop: statusBarHeight + 'px' }">

    <!-- Navigation bar: 88rpx content -->
    <view class="nav-content" :style="{ paddingRight: capsulePadding + 'px' }">
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
          <text v-else-if="title && showBack" class="nav-title">{{ title }}</text>
        </slot>
      </view>

      <!-- Center title: absolute centered -->
      <text v-if="title && !leftCustom && !showBack" class="nav-title-center">{{ title }}</text>

      <view class="nav-right">
        <slot name="right">
          <view v-if="rightIcon" class="nav-icon-btn" @tap="onRightClick">
            <image v-if="rightIcon === 'notification'" class="nav-icon-img" src="/static/images/home/bell.png" mode="aspectFit" />
            <svg v-else-if="rightIcon === 'search'" width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#666666" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="#666666" stroke-width="2" stroke-linecap="round"/></svg>
            <svg v-else-if="rightIcon === 'settings'" width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="#666666" stroke-width="2"/><path d="M19.4 15a9.3 9.3 0 0 1-2.2 2.2l2.88 2.88-2.46 2.46-2.88-2.88a9.3 9.3 0 0 1-2.74.74L12 22h-4l-.86-2.26a9.3 9.3 0 0 1-2.74-.74L2.46 21.4 0 18.94l2.88-2.88A9.3 9.3 0 0 1 2.14 12L0 9.86 2.46 7.4 5.34 10.28A9.3 9.3 0 0 1 8.14 8.48L9 6h4l.86 2.48a9.3 9.3 0 0 1 2.8.8l2.88-2.88L21.4 7.4 18.52 10.28a9.3 9.3 0 0 1 .88 1.72L22 13.86v4.28L19.4 15z" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <svg v-else-if="rightIcon === 'filter'" width="22" height="22" viewBox="0 0 24 24" fill="none"><line x1="4" y1="6" x2="20" y2="6" stroke="#666666" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="12" x2="16" y2="12" stroke="#666666" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="18" x2="14" y2="18" stroke="#666666" stroke-width="2" stroke-linecap="round"/></svg>
            <view v-if="rightIcon === 'notification' && unreadCount > 0" class="badge">
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </view>
          </view>
        </slot>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const statusBarHeight = ref(44)
const capsulePadding = ref(0)

onMounted(() => {
  let sys
  try {
    sys = uni.getSystemInfoSync()
    statusBarHeight.value = sys.safeAreaInsets?.top || sys.safeArea?.top || sys.statusBarHeight || 44
  } catch {
    statusBarHeight.value = 44
  }

  // 微信小程序胶囊按钮避让
  try {
    // #ifdef MP-WEIXIN
    const menuBtn = uni.getMenuButtonBoundingClientRect ? uni.getMenuButtonBoundingClientRect() : wx.getMenuButtonBoundingClientRect()
    if (menuBtn && sys) {
      capsulePadding.value = menuBtn.width + (sys.windowWidth - menuBtn.right) + 8
    }
    // #endif
  } catch { /* ignore */ }
})

defineProps({
  title: { type: String, default: '' },
  showLogo: { type: Boolean, default: false },
  showBack: { type: Boolean, default: false },
  rightIcon: { type: String, default: '', validator: (v) => ['', 'search', 'notification', 'settings', 'filter'].includes(v) },
  leftCustom: { type: Boolean, default: false },
  unreadCount: { type: Number, default: 0 }
})

const emit = defineEmits(['back', 'rightClick'])

function goBack() { emit('back'); uni.navigateBack() }
function onRightClick() { emit('rightClick', rightIcon) }
</script>

<style scoped>
.nav-container {
  flex-shrink: 0;
  background: #FFFFFF;
}
.nav-container--brand {
  background: linear-gradient(180deg, #2B6DE8 0%, #3B77EA 100%);
}

/* Nav content: 88rpx height, flex layout */
.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  position: relative;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  z-index: 1;
}
.nav-left-brand {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

/* Center title: absolute positioned for true centering */
.nav-title-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 34rpx;
  font-weight: 600;
  color: #333333;
  white-space: nowrap;
}
.nav-container--brand .nav-title-center {
  color: #FFFFFF;
}

.back-btn {
  width: 48rpx; height: 48rpx;
  display: flex; align-items: center; justify-content: center;
}
.back-icon { width: 48rpx; height: 48rpx; }

.logo-badge {
  width: 56rpx; height: 56rpx;
  background: #2B6DE8; border-radius: 12rpx;
  display: flex; align-items: center; justify-content: center;
}
.logo-text {
  font-size: 28rpx; font-weight: 700; color: #FFFFFF; letter-spacing: 2rpx;
}

.nav-title {
  font-size: 34rpx; font-weight: 600; color: #333333;
}
.nav-container--brand .nav-title {
  color: #FFFFFF;
}

.nav-right {
  display: flex; align-items: center; gap: 16rpx; z-index: 1;
}
.nav-icon-btn {
  width: 80rpx; height: 80rpx;
  display: flex; align-items: center; justify-content: center;
  background: #F5F5F5;
  border-radius: 50%;
  position: relative;
}
.nav-icon-btn:active { opacity: 0.8; transform: scale(0.95); }
.nav-icon-img { width: 44rpx; height: 44rpx; }

.badge {
  position: absolute; top: 4rpx; right: 4rpx;
  min-width: 28rpx; height: 28rpx;
  background: #EF4444; border-radius: 14rpx;
  padding: 0 8rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 18rpx; font-weight: 600; color: #FFFFFF; line-height: 1;
}
</style>
