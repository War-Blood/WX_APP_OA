<template>
  <view class="page">
    <NavBar :showBack="true" title="消息详情" />

    <scroll-view class="content-scroll" scroll-y>
      <view class="message-card">
        <text class="msg-title">{{ messageData.title }}</text>
        <text class="msg-time">{{ messageData.time }}</text>
        <view class="msg-divider"></view>
        <text class="msg-body">{{ messageData.body }}</text>
        <view class="msg-action" @tap="handleAction">
          <text class="msg-action-text">{{ messageData.actionText }}</text>
          <uni-icons type="arrow-right" size="24" color="#2B6DE8"></uni-icons>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { onLoad } from '@dcloudio/uni-app'
import { messageApi } from '@/services/modules/message'
import { showSuccess, showError, showToast } from '@/utils/toast'

const messageData = ref(null)
const isLoading = ref(true)
const messageId = ref('')

onLoad((options) => {
  messageId.value = options.id || ''
  loadDetail()
})

async function loadDetail() {
  isLoading.value = true
  try {
    const res = await messageApi.getDetail(messageId.value)
    if (res.data) {
      messageData.value = {
        id: res.data.id,
        title: res.data.title,
        time: res.data.time || res.data.createTime,
        body: res.data.body || res.data.content,
        actionText: res.data.actionText || '查看详情',
        actionUrl: res.data.actionUrl || ''
      }
    }
  } catch (err) {
    console.error('加载消息详情失败', err)
    showError('加载失败')
  } finally {
    isLoading.value = false
  }
}

function handleAction() {
  const url = messageData.value?.actionUrl
  if (url) {
    uni.navigateTo({ url })
  }
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.page {
  width: 100%;
  height: 100vh;
  background: $bg-color;
  display: flex;
  flex-direction: column;
}

.content-scroll {
  flex: 1;
  height: 0;
  padding: 24rpx;
}

.message-card {
  background: $bg-card;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.msg-title {
  font-size: 34rpx;
  font-weight: 600;
  color: $text-primary;
  display: block;
  margin-bottom: 12rpx;
  word-break: break-all;
  overflow-wrap: break-word;
}

.msg-time {
  font-size: 24rpx;
  color: $text-secondary;
  display: block;
  margin-bottom: 24rpx;
}

.msg-divider {
  height: 1rpx;
  background: $border-color;
  margin-bottom: 24rpx;
}

.msg-body {
  font-size: 28rpx;
  color: $text-regular;
  line-height: 48rpx;
  display: block;
  white-space: pre-line;
  word-break: break-all;
  overflow-wrap: break-word;
  margin-bottom: 32rpx;
}

.msg-action {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 0;
}

.msg-action:active {
  opacity: 0.7;
}

.msg-action-text {
  font-size: 28rpx;
  color: $primary-color;
  font-weight: 500;
}
</style>
