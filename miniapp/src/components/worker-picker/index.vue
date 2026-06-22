<template>
  <view v-if="visible" class="picker-overlay" @tap="onCancel">
    <view class="picker-panel" @tap.stop>
      <view class="picker-header">
        <text class="picker-cancel" @tap="onCancel">取消</text>
        <text class="picker-title">选择人员</text>
        <text class="picker-confirm" @tap="onConfirm">确定</text>
      </view>

      <view class="search-bar">
        <uni-icons type="search" size="24" color="#999999"></uni-icons>
        <input
          class="search-input"
          v-model="searchText"
          placeholder="搜索姓名或工号"
          placeholder-class="search-placeholder"
          @input="onSearchInput"
        />
      </view>

      <view v-if="selectedIds.length > 0" class="selected-tags">
        <view
          v-for="userId in selectedIds"
          :key="userId"
          class="selected-tag"
        >
          <text class="tag-text">{{ getWorkerLabel(userId) }}</text>
          <text class="tag-close" @tap="removeWorker(userId)">×</text>
        </view>
      </view>

      <scroll-view class="worker-scroll" scroll-y>
        <view
          v-for="worker in workerList"
          :key="worker.userId"
          class="worker-item"
          @tap="toggleWorker(worker)"
        >
          <view class="worker-avatar" :style="{ background: getAvatarBg(worker.userId) }">
            <text class="worker-avatar-text">{{ worker.userName.charAt(0) }}</text>
          </view>
          <view class="worker-info">
            <text class="worker-name">{{ worker.userName }}</text>
            <text class="worker-code">{{ worker.workerCode }}</text>
          </view>
          <view v-if="isSelected(worker.userId)" class="worker-checked">
            <uni-icons type="checkmark" size="24" color="#2B6DE8"></uni-icons>
          </view>
        </view>
        <view v-if="workerList.length === 0 && !loading" class="empty-tip">
          <text class="empty-tip-title">暂无作业人员</text>
          <text class="empty-tip-desc">请管理员在 Web 后台「外场人员花名册」中标记作业人员</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { adminApi } from '@/services/modules/admin'

const props = defineProps({
  visible: { type: Boolean, default: false },
  modelValue: { type: Array, default: () => [] },
  max: { type: Number, default: 20 }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const searchText = ref('')
const selectedIds = ref([])
const workerList = ref([])
const loading = ref(false)

let searchTimer = null

const avatarColors = [
  '#2B6DE8', '#52C41A', '#FAAD14', '#FF4D4F', '#722ED1',
  '#13C2C2', '#EB2F96', '#FA8C16', '#2F54EB', '#A0D911'
]

function getAvatarBg(userId) {
  return avatarColors[userId % avatarColors.length]
}

watch(() => props.visible, (val) => {
  if (val) {
    selectedIds.value = [...props.modelValue]
    searchText.value = ''
    fetchWorkers()
  }
})

function fetchWorkers(keyword) {
  loading.value = true
  adminApi.getWorkerList({ keyword: keyword || '', pageSize: 100, fieldWorkerOnly: true }).then((res) => {
    if (res.code === 0) {
      workerList.value = res.data.list || []
    }
  }).catch(() => {
    workerList.value = []
  }).finally(() => {
    loading.value = false
  })
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchWorkers(searchText.value)
  }, 300)
}

function toggleWorker(worker) {
  const idx = selectedIds.value.indexOf(worker.userId)
  if (idx > -1) {
    selectedIds.value.splice(idx, 1)
  } else {
    if (selectedIds.value.length >= props.max) {
      uni.showToast({ title: `最多选择${props.max}人`, icon: 'none' })
      return
    }
    selectedIds.value.push(worker.userId)
  }
}

function isSelected(userId) {
  return selectedIds.value.includes(userId)
}

function removeWorker(userId) {
  const idx = selectedIds.value.indexOf(userId)
  if (idx > -1) selectedIds.value.splice(idx, 1)
}

function getWorkerById(userId) {
  return workerList.value.find((w) => w.userId === userId)
}

function getWorkerLabel(userId) {
  const worker = getWorkerById(userId)
  if (worker) {
    return `${worker.userName} ${worker.workerCode}`
  }
  return `UID${userId}`
}

function onConfirm() {
  emit('update:modelValue', [...selectedIds.value])
  emit('confirm', [...selectedIds.value])
}

function onCancel() {
  selectedIds.value = [...props.modelValue]
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
  height: 80vh;
  background: #FFFFFF;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 16rpx;
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

.search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 16rpx 32rpx;
  padding: 16rpx 20rpx;
  background: #F5F5F5;
  border-radius: 24rpx;
}

.search-input {
  flex: 1;
  font-size: 26rpx;
  color: #333333;
}

.search-placeholder {
  font-size: 26rpx;
  color: #C0C4CC;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 0 32rpx 16rpx;
}

.selected-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background: #EDF2FF;
  border-radius: 8rpx;
}

.tag-text {
  font-size: 24rpx;
  color: #2B6DE8;
}

.tag-close {
  font-size: 24rpx;
  color: #2B6DE8;
  font-weight: 600;
  padding: 0 4rpx;
}

.worker-scroll {
  flex: 1;
  height: 0;
  padding: 0 32rpx;
}

.worker-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-top: 1rpx solid #F5F5F5;
}

.worker-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.worker-avatar-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #FFFFFF;
}

.worker-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.worker-name {
  font-size: 28rpx;
  color: #333333;
}

.worker-code {
  font-size: 22rpx;
  color: #999999;
}

.worker-checked {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-tip {
  text-align: center;
  padding: 80rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.empty-tip-title {
  font-size: 28rpx;
  color: #999999;
}

.empty-tip-desc {
  font-size: 24rpx;
  color: #C0C4CC;
}
</style>
