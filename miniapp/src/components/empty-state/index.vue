<template>
  <view class="empty-state">
    <view class="empty-icon" :style="{ background: iconBg }">
      <uni-icons :type="getEmptyIcon(icon)" :size="iconSize" :color="iconColor"></uni-icons>
    </view>
    <text class="empty-title">{{ title }}</text>
    <text v-if="description" class="empty-desc">{{ description }}</text>
    <view v-if="showAction" class="empty-action" @tap="onAction">
      <text class="empty-action-text">{{ actionText }}</text>
    </view>
  </view>
</template>

<script setup>
function getEmptyIcon(name) {
  const map = { notification:'notification', search:'search', approval:'checkbox', report:'compose', empty:'help' }
  return map[name] || 'help'
}

const props = defineProps({
  icon: { type: String, default: 'empty' },
  iconBg: { type: String, default: '#F5F5F5' },
  iconColor: { type: String, default: '#CCCCCC' },
  iconSize: { type: Number, default: 48 },
  title: { type: String, default: '暂无数据' },
  description: { type: String, default: '' },
  showAction: { type: Boolean, default: false },
  actionText: { type: String, default: '重新加载' }
})

const emit = defineEmits(['action'])

function onAction() {
  emit('action')
}
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
}

.empty-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.empty-title {
  font-size: 28rpx;
  color: #999999;
  font-weight: 400;
  margin-bottom: 12rpx;
}

.empty-desc {
  font-size: 24rpx;
  color: #BBBBBB;
  text-align: center;
  line-height: 36rpx;
  margin-bottom: 24rpx;
}

.empty-action {
  padding: 16rpx 40rpx;
  border-radius: 24rpx;
  background: #EDF2FF;
  border: 1rpx solid #D6E4FF;
}

.empty-action:active {
  background: #D6E4FF;
}

.empty-action-text {
  font-size: 26rpx;
  color: #2B6DE8;
  font-weight: 500;
}
</style>
