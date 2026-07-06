<template>
  <view v-if="visible" class="opinion-overlay" @tap="onCancel">
    <view class="opinion-panel" @tap.stop>
      <view class="opinion-header">
        <text class="opinion-title">{{ title }}</text>
        <view class="opinion-close" @tap="onCancel">
          <uni-icons type="close" size="28" color="#999999"></uni-icons>
        </view>
      </view>

      <view class="opinion-quick">
        <view
          v-for="tag in quickTags"
          :key="tag"
          class="quick-tag"
          :class="{ 'quick-tag-active': selectedTag === tag }"
          @tap="selectTag(tag)"
        >
          <text class="quick-tag-text">{{ tag }}</text>
        </view>
      </view>

      <textarea
        class="opinion-textarea"
        v-model="opinionText"
        placeholder="请输入审核意见"
        maxlength="200"
        @input="handleInput"
      />
      <text class="opinion-count">{{ opinionText.length }}/200</text>

      <view class="opinion-btn" @tap="onConfirm">
        <text class="opinion-btn-text">确认提交</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { showSuccess, showError, showToast } from '@/utils/toast'

const props = defineProps({
  visible: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  title: { type: String, default: '审核意见' }
})

const emit = defineEmits(['confirm', 'cancel'])

const opinionText = ref('')
const selectedTag = ref('')

const quickTags = ['同意', '已阅', '请补充']

function selectTag(tag) {
  selectedTag.value = tag
  opinionText.value = tag
}

function handleInput(e) {
  if (opinionText.value.length > 200) {
    opinionText.value = opinionText.value.slice(0, 200)
  }
}

function onConfirm() {
  if (opinionText.value.trim() || !props.required) {
    emit('confirm', opinionText.value)
    opinionText.value = ''
    selectedTag.value = ''
  } else {
    showError('请填写意见')
  }
}

function onCancel() {
  opinionText.value = ''
  selectedTag.value = ''
  emit('cancel')
}
</script>

<style lang="scss" scoped>
.opinion-overlay {
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

.opinion-panel {
  width: 100%;
  background: #FFFFFF;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
}

.opinion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.opinion-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.opinion-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.opinion-quick {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.quick-tag {
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
  background: #F5F5F5;
}

.quick-tag-active {
  background: #EDF2FF;
}

.quick-tag-text {
  font-size: 26rpx;
  color: #666666;
}

.opinion-textarea {
  width: 100%;
  height: 200rpx;
  background: #F5F5F5;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #333333;
  box-sizing: border-box;
}

.opinion-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #999999;
  margin-top: 8rpx;
  margin-bottom: 24rpx;
}

.opinion-btn {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2B6DE8;
  border-radius: 16rpx;
}

.opinion-btn:active {
  opacity: 0.9;
}

.opinion-btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #FFFFFF;
}
</style>
