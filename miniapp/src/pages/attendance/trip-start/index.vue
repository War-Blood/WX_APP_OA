<template>
  <view class="page">
    <nav-bar title="出差开始" :showBack="true" />
    <scroll-view class="content" scroll-y>
      <view class="hero">
        <text class="hero-icon">🚗</text>
        <text class="hero-title">开始出差打卡</text>
        <text class="hero-desc">点击即生效，开始后需每日提交公出日志，否则将标记为未提交</text>
      </view>
      <view class="card">
        <text class="card-title">出差备注（可选）</text>
        <textarea v-model="reason" placeholder="如：前往广州项目现场" :maxlength="200" />
      </view>
      <view class="btn-area">
        <view class="btn-primary" :class="{ 'btn-disabled': submitting }" @tap="handleStart">
          <text class="btn-text">{{ submitting ? '提交中...' : '确认开始出差' }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { attendanceApi } from '@/services/modules/attendance'
import { showSuccess, showError, showToast } from '@/utils/toast'

const reason = ref('')
const submitting = ref(false)

async function handleStart() {
  submitting.value = true
  try {
    await attendanceApi.startTrip({ reason: reason.value })
    showSuccess('出差已开始')
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (e) {
    showError(e.message || '操作失败')
  } finally { submitting.value = false }
}
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; }
.content { flex: 1; height: 0; padding: 24rpx; }
.hero { display: flex; flex-direction: column; align-items: center; padding: 60rpx 24rpx; }
.hero-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.hero-title { font-size: 36rpx; font-weight: 700; color: #333; margin-bottom: 16rpx; }
.hero-desc { font-size: 24rpx; color: #999; text-align: center; line-height: 1.6; }
.card { background: #FFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,.04); }
.card-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-bottom: 16rpx; }
textarea { width: 100%; height: 160rpx; font-size: 26rpx; padding: 16rpx; background: #F7F7F7; border-radius: 8rpx; box-sizing: border-box; }
.btn-area { padding: 24rpx 0 48rpx; }
.btn-primary { height: 96rpx; display: flex; align-items: center; justify-content: center; border-radius: 48rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); }
.btn-primary:active { opacity: .9; }
.btn-disabled { opacity: .5; }
.btn-text { font-size: 32rpx; font-weight: 600; color: #FFF; letter-spacing: 2rpx; }
</style>
