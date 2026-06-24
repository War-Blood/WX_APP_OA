<template>
  <view v-if="visible" class="dialog-overlay" @tap="onCancel">
    <view class="dialog-card" @tap.stop>
      <view class="dialog-icon" :style="{ background: iconBg }">
        <uni-icons :type="icon" :size="iconSize" :color="iconColor"></uni-icons>
      </view>
      <text class="dialog-title">{{ title }}</text>
      <text class="dialog-desc">{{ description }}</text>
      <view class="dialog-btns">
        <view class="dialog-btn dialog-btn-cancel" @tap="onCancel">{{ cancelText }}</view>
        <view
          class="dialog-btn dialog-btn-confirm"
          :style="{ background: confirmBg }"
          @tap="onConfirm"
        >
          {{ confirmText }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '提示' },
  description: { type: String, default: '' },
  icon: { type: String, default: 'info' },
  iconBg: { type: String, default: '#FFF3E0' },
  iconColor: { type: String, default: '#F59E0B' },
  iconSize: { type: Number, default: 40 },
  cancelText: { type: String, default: '取消' },
  confirmText: { type: String, default: '确定' },
  confirmBg: { type: String, default: '#2B6DE8' },
  type: { type: String, default: 'primary' }
})

const emit = defineEmits(['confirm', 'cancel'])

function onConfirm() {
  emit('confirm')
}

function onCancel() {
  emit('cancel')
}
</script>

<style lang="scss" scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-card {
  width: 560rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 48rpx 32rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dialog-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 12rpx;
}

.dialog-desc {
  font-size: 26rpx;
  color: #666666;
  text-align: center;
  line-height: 40rpx;
  margin-bottom: 32rpx;
}

.dialog-btns {
  width: 100%;
  display: flex;
  gap: 20rpx;
}

.dialog-btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 500;
}

.dialog-btn-cancel {
  background: #F5F5F5;
  color: #666666;
}

.dialog-btn-cancel:active {
  background: #EEEEEE;
}

.dialog-btn-confirm {
  color: #FFFFFF;
}

.dialog-btn-confirm:active {
  opacity: 0.9;
}
</style>
