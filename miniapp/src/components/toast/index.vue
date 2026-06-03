<template>
  <view v-if="visible" class="toast-overlay">
    <view class="toast-card" :style="{ background: bgColor }">
      <view class="toast-icon">
        <uni-icons :type="iconName" size="48" :color="iconColor"></uni-icons>
      </view>
      <text class="toast-message">{{ message }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  type: { type: String, default: 'info' },
  message: { type: String, default: '' },
  duration: { type: Number, default: 2000 }
})

const emit = defineEmits(['close'])

const iconMap = {
  success: { name: 'check-circle', color: '#FFFFFF' },
  error: { name: 'close-circle', color: '#FFFFFF' },
  warning: { name: 'info', color: '#FFFFFF' },
  info: { name: 'info', color: '#FFFFFF' }
}

const iconName = computed(() => iconMap[props.type]?.name || 'info')
const iconColor = computed(() => iconMap[props.type]?.color || '#FFFFFF')
const bgColor = computed(() => {
  const map = { success: 'rgba(0,0,0,0.7)', error: 'rgba(0,0,0,0.7)', warning: 'rgba(0,0,0,0.7)', info: 'rgba(0,0,0,0.7)' }
  return map[props.type] || 'rgba(0,0,0,0.7)'
})

watch(() => props.visible, (val) => {
  if (val) {
    setTimeout(() => {
      emit('close')
    }, props.duration)
  }
})
</script>

<style lang="scss" scoped>
.toast-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 1000;
}

.toast-card {
  min-width: 200rpx;
  max-width: 480rpx;
  padding: 40rpx 48rpx;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.toast-icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-message {
  font-size: 26rpx;
  color: #FFFFFF;
  text-align: center;
  line-height: 36rpx;
}
</style>
