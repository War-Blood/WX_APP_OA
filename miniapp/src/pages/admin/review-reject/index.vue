<template>
  <view class="page">
    <nav-bar title="驳回填写" :showBack="true" />
    <scroll-view class="content" scroll-y>
      <!-- 审核对象卡片 - 红底 -->
      <view class="reject-card target-card">
        <text class="card-label">审核驳回</text>
        <view class="target-info">
          <view class="target-avatar">
            <text class="avatar-text">{{ targetName.charAt(0) }}</text>
          </view>
          <view class="target-meta">
            <text class="target-name">{{ targetName }}</text>
            <text class="target-project">{{ projectName }}</text>
          </view>
        </view>
      </view>

      <!-- 驳回原因卡片 -->
      <view class="reject-card reason-card">
        <text class="reason-title">驳回原因</text>
        <view class="reason-textarea">
          <textarea
            v-model="reason"
            class="textarea"
            placeholder="请详细说明驳回原因，帮助提交者了解需要修改的内容"
            placeholder-style="color:#C0C4CC;font-size:26rpx"
            :maxlength="500"
            auto-height
          />
          <text class="char-count">{{ reason.length }}/500</text>
        </view>
      </view>

      <view class="form-tip">驳回后将通知提交者重新编辑日报内容</view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="btn-cancel" hover-class="btn-hover" @tap="handleCancel">
        <text class="btn-cancel-text">取消</text>
      </view>
      <view class="btn-confirm" hover-class="btn-hover" @tap="handleConfirm" :class="{ 'btn-disabled': !reason.trim() }">
        <text class="btn-confirm-text">确认驳回</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { reviewApi } from '@/services/modules/review'

const id = ref('')
const targetName = ref('')
const projectName = ref('')
const reason = ref('')
const submitting = ref(false)

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const options = page.$page?.options || page.options || {}
  id.value = options.id || ''
  targetName.value = decodeURIComponent(options.name || options.targetName || '') || '未知用户'
  projectName.value = decodeURIComponent(options.project || options.projectName || '') || '未知项目'
})

function handleCancel() {
  uni.navigateBack()
}

async function handleConfirm() {
  if (!reason.value.trim() || submitting.value) return
  submitting.value = true
  try {
    await reviewApi.reject(id.value, reason.value.trim())
    uni.showToast({ title: '驳回成功', icon: 'success' })
    setTimeout(() => {
      // 返回审核详情并刷新
      uni.navigateBack()
    }, 1200)
  } catch (err) {
    uni.showToast({ title: err.message || '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  width: 100%;
  height: 100vh;
  background: #F7F7F7;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content {
  flex: 1;
  height: 0;
  padding: 24rpx;
}

/* 审核对象卡片 - 红底 */
.reject-card {
  padding: 24rpx;
  border-radius: 16rpx;
  margin-bottom: 32rpx;
}
.target-card {
  background: #FDE8E8;
}
.card-label {
  font-size: 24rpx;
  font-weight: 600;
  color: #EF4444;
  margin-bottom: 16rpx;
}
.target-info {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.target-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #FCD5D5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.avatar-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #EF4444;
}
.target-meta {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.target-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
}
.target-project {
  font-size: 24rpx;
  color: #999999;
}

/* 驳回原因卡片 */
.reason-card {
  background: #FFFFFF;
}
.reason-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 20rpx;
}
.reason-textarea {
  background: #F7F8FA;
  border-radius: 12rpx;
  padding: 24rpx;
  min-height: 200rpx;
  position: relative;
}
.textarea {
  width: 100%;
  min-height: 160rpx;
  font-size: 26rpx;
  color: #333333;
  line-height: 1.6;
}
.char-count {
  position: absolute;
  bottom: 16rpx;
  right: 24rpx;
  font-size: 22rpx;
  color: #C0C4CC;
}

.form-tip {
  font-size: 24rpx;
  color: #B0B0B0;
  text-align: center;
  margin-top: 24rpx;
}

/* 底部操作栏 */
.bottom-bar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 12rpx 24rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  border-top: 1rpx solid #F0F0F0;
  flex-shrink: 0;
}
.btn-cancel, .btn-confirm {
  height: 96rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 500;
  transition: opacity 0.2s;
}
.btn-cancel {
  width: 330rpx;
  background: #F5F5F5;
}
.btn-cancel-text {
  color: #666666;
}
.btn-confirm {
  flex: 1;
  background: #EF4444;
}
.btn-confirm-text {
  color: #FFFFFF;
  font-weight: 600;
}
.btn-disabled {
  opacity: 0.5;
}
.btn-hover {
  opacity: 0.8;
}
</style>
