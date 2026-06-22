<template>
  <view v-if="visible" class="picker-overlay" @tap="onCancel">
    <view class="picker-panel" @tap.stop>
      <view class="picker-header">
        <text class="picker-cancel" @tap="onCancel">取消</text>
        <text class="picker-title">选择日期</text>
        <text class="picker-confirm" @tap="onConfirm">确定</text>
      </view>
      <picker
        mode="date"
        :value="currentValue"
        :start="minDate"
        :end="maxDate"
        :disabled="false"
        @change="onDateChange"
        class="picker-hidden"
      />
      <view class="picker-display" @tap="triggerPicker">
        <text class="picker-date-text">{{ displayDate || '请选择日期' }}</text>
        <uni-icons type="calendar" size="28" color="#2B6DE8"></uni-icons>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  value: { type: String, default: '' },
  maxDate: { type: String, default: '' },
  minDate: { type: String, default: '' }
})

const emit = defineEmits(['confirm', 'cancel'])

const currentValue = ref(props.value || getToday())
const selectedDate = ref(props.value || '')

const displayDate = computed(() => {
  if (!selectedDate.value) return ''
  const parts = selectedDate.value.split('-')
  return parts[0] + '年' + parts[1] + '月' + parts[2] + '日'
})

function getToday() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

watch(() => props.value, (val) => {
  if (val) {
    currentValue.value = val
    selectedDate.value = val
  }
})

function onDateChange(e) {
  selectedDate.value = e.detail.value
  currentValue.value = e.detail.value
}

function triggerPicker() {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const picker = page.$el?.querySelector('.picker-hidden')
}

function onConfirm() {
  emit('confirm', selectedDate.value || currentValue.value)
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

.picker-cancel {
  font-size: 28rpx;
  color: #999999;
}

.picker-confirm {
  font-size: 28rpx;
  color: #2B6DE8;
  font-weight: 500;
}

.picker-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
}

.picker-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 32rpx;
  background: #F5F5F5;
  border-radius: 12rpx;
}

.picker-date-text {
  font-size: 32rpx;
  font-weight: 500;
  color: #333333;
}

.picker-hidden {
  position: absolute;
  left: -9999rpx;
  opacity: 0;
  pointer-events: none;
}
</style>
