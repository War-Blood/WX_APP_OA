<template>
  <view v-if="visible" class="loading-overlay">
    <view class="loading-card">
      <view class="loading-spinner"></view>
      <text class="loading-text">{{ text }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  text: { type: String, default: '提交中...' }
})
</script>

<style lang="scss" scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.loading-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 48rpx 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.loading-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 6rpx solid #EDF2FF;
  border-top-color: #2B6DE8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 26rpx;
  color: #666666;
  font-weight: 400;
}
</style>
