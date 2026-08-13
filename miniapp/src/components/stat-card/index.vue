<template>
  <view class="stat-card">
    <text class="stat-num" :class="'stat-num--' + tone">{{ value }}</text>
    <text class="stat-lbl">{{ label }}</text>
  </view>
</template>

<script setup>
defineProps({
  value: { type: [String, Number], default: 0 },
  label: { type: String, default: '' },
  tone: {
    type: String,
    default: 'default',
    validator: (v) => ['primary', 'success', 'warning', 'danger', 'default'].includes(v)
  }
})
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.stat-card {
  flex: 1;
  background: $bg-card;
  border-radius: $radius-lg;
  padding: 20rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.stat-num {
  font-size: $font-xl;
  font-weight: 700;
  line-height: 1.2;
}

.stat-lbl {
  font-size: $font-xs;
  color: $text-secondary;
}

.stat-num--primary { color: $primary-color; }
.stat-num--success { color: $success-color; }
.stat-num--warning { color: $warning-color; }
.stat-num--danger  { color: $danger-color; }
.stat-num--default { color: $text-primary; }
</style>
