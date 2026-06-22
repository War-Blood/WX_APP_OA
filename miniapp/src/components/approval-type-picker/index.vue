<template>
  <view v-if="visible" class="picker-overlay" @tap="onCancel">
    <view class="picker-panel" @tap.stop>
      <view class="picker-header">
        <text class="picker-title">选择审批类型</text>
        <view class="picker-close" @tap="onCancel">
          <uni-icons type="close" size="28" color="#999999"></uni-icons>
        </view>
      </view>

      <view class="type-grid">
        <view
          v-for="type in approvalTypes"
          :key="type.key"
          class="type-item"
          @tap="selectType(type)"
        >
          <view class="type-icon" :style="{ background: type.bg }">
            <image class="type-icon-img" :src="type.icon" mode="aspectFit" />
          </view>
          <text class="type-name">{{ type.name }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['confirm', 'cancel'])

const approvalTypes = [
  { key: 'leave', name: '请假', icon: '/static/images/approval/leave.png', bg: '#FFF3E0' },
  { key: 'expense', name: '报销', icon: '/static/images/approval/reimburse.png', bg: '#EDF2FF' },
  { key: 'seal', name: '用章', icon: '/static/images/approval/seal.png', bg: '#FCE4EC' },
  { key: 'travel', name: '出差', icon: '/static/images/approval/leave.png', bg: '#E8F5E9' },
  { key: 'purchase', name: '采购', icon: '/static/images/approval/reimburse.png', bg: '#F3E5F5' },
  { key: 'general', name: '通用', icon: '/static/images/approval/seal.png', bg: '#F5F5F5' }
]

function selectType(type) {
  emit('confirm', type)
}

function onCancel() {
  emit('cancel')
}
</script>

<style lang="scss" scoped>
.picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.picker-panel {
  width: 100%;
  background: #FFFFFF;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}

.picker-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
}

.picker-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
}

.type-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 0;
}

.type-item:active {
  opacity: 0.7;
}

.type-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-icon-img {
  width: 40rpx;
  height: 40rpx;
}

.type-name {
  font-size: 26rpx;
  color: #333333;
  font-weight: 500;
}
</style>
