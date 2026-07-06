<template>
  <view class="page">
    <nav-bar title="审核详情" :showBack="true" />

    <scroll-view class="content-scroll" scroll-y>
      <view v-if="loading" class="loading-wrap">
        <text class="loading-text">加载中...</text>
      </view>
      <template v-if="report">
        <view class="section-card">
          <text class="section-title">日报信息</text>
          <view class="info-row">
            <text class="info-label">日期</text>
            <text class="info-value">{{ report.date }} {{ report.weekday }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">填报人</text>
            <text class="info-value">{{ report.user }} · {{ report.department }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">项目</text>
            <text class="info-value">{{ report.project || '未选择' }}</text>
          </view>
        </view>

        <view class="section-card">
          <text class="section-title">今日完成</text>
          <text class="section-content">{{ report.todayWork }}</text>
        </view>

        <view class="section-card">
          <text class="section-title">明日计划</text>
          <text class="section-content">{{ report.tomorrowPlan || '无' }}</text>
        </view>

        <view class="section-card">
          <text class="section-title">遇到问题</text>
          <text class="section-content">{{ report.issues || '无' }}</text>
        </view>

        <view v-if="report.status !== 'pending'" class="section-card review-card">
          <text class="section-title">审核意见</text>
          <view class="review-status">
            <text class="review-label">审核结果</text>
            <view class="status-tag" :style="{ background: getStatusBg(report.status) }">
              <text class="status-text" :style="{ color: getStatusColor(report.status) }">{{ report.statusText }}</text>
            </view>
          </view>
          <view class="info-row">
            <text class="info-label">审核意见</text>
            <text class="info-value" :class="{ 'reject-text': report.status === 'rejected' }">{{ report.reviewOpinion }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">审核时间</text>
            <text class="info-value">{{ report.reviewTime }}</text>
          </view>
        </view>
      </template>

      <view class="bottom-placeholder"></view>
    </scroll-view>

    <view v-if="report && report.status === 'pending'" class="bottom-bar">
      <view class="opinion-area">
        <textarea
          class="opinion-input"
          v-model="opinion"
          placeholder="请输入审核意见（驳回时必须填写）"
          :disabled="approving"
        />
      </view>
      <view class="bottom-actions">
        <view class="btn-reject" hover-class="btn-press" @tap="handleReject">驳回</view>
        <view class="btn-approve" hover-class="btn-press" @tap="handleApprove">通过</view>
      </view>
    </view>
    <LoadingOverlay :visible="approving" text="处理中..." />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import LoadingOverlay from '@/components/loading-overlay/index.vue'
import { useUserStore } from '@/stores/user'
import { reviewApi } from '@/services/modules/review'
import { showSuccess, showError, showToast } from '@/utils/toast'

const userStore = useUserStore()

onMounted(async () => {
  if (!userStore.isAdmin) {
    showError('无权限访问')
    setTimeout(() => {
      uni.navigateBack()
    }, 500)
    return
  }
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  if (currentPage.options && currentPage.options.id) {
    await loadReportDetail(currentPage.options.id)
  }
  loading.value = false
})

const report = ref(null)
const loading = ref(true)
const approving = ref(false)
const opinion = ref('')

async function loadReportDetail(id) {
  try {
    const res = await reviewApi.getDetail(id)
    report.value = res.data
  } catch (err) {
    console.error('加载审核详情失败', err)
    showError('加载失败')
  }
}

function getStatusBg(status) {
  const map = { pending: '#FFF3E0', approved: '#F0FDF4', rejected: '#FFF0F0' }
  return map[status] || '#F5F5F5'
}

function getStatusColor(status) {
  const map = { pending: '#F59E0B', approved: '#22C55E', rejected: '#EF4444' }
  return map[status] || '#999999'
}

async function handleApprove() {
  if (!report.value?.id || approving.value) return
  approving.value = true
  uni.showLoading({ title: '审批中...' })
  try {
    const res = await reviewApi.doAction(report.value.id, 'approve', opinion.value || '同意')
    if (res.data) {
      uni.hideLoading()
      showSuccess('已通过')
      setTimeout(() => uni.navigateBack(), 1500)
    }
  } catch (err) {
    uni.hideLoading()
    showError('操作失败')
    console.error('审核操作失败', err)
  } finally {
    approving.value = false
  }
}

function handleReject() {
  if (!report.value?.id) return
  const name = report.value.userName || report.value.submitter || ''
  const project = report.value.projectName || report.value.project || ''
  uni.navigateTo({
    url: `/pages/admin/review-reject/index?id=${report.value.id}&name=${encodeURIComponent(name)}&project=${encodeURIComponent(project)}`
  })
}
</script>

<style lang="scss" scoped>
$color-primary: #2B6DE8;
$color-danger: #EF4444;
$bg-page: #F7F7F7;
$bg-card: #FFFFFF;
$text-primary: #333333;
$text-secondary: #666666;
$text-tertiary: #999999;
$border-color: #ECECEC;

.page {
  width: 100%;
  height: 100vh;
  background: $bg-page;
  display: flex;
  flex-direction: column;
}

.content-scroll {
  flex: 1;
  height: 0;
  padding: 24rpx;
}

.section-card {
  background: $bg-card;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 20rpx;
  display: block;
}

.section-content {
  font-size: 28rpx;
  color: $text-secondary;
  line-height: 44rpx;
  display: block;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F5F5F5;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 28rpx;
  color: $text-tertiary;
}

.info-value {
  font-size: 28rpx;
  color: $text-primary;
  font-weight: 500;
  text-align: right;
  max-width: 60%;
}

.reject-text {
  color: $color-danger;
}

.review-card .section-title {
  margin-bottom: 8rpx;
}

.review-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F5F5F5;
}

.review-label {
  font-size: 28rpx;
  color: $text-tertiary;
}

.status-tag {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.status-text {
  font-size: 22rpx;
  font-weight: 500;
}

.bottom-placeholder {
  height: 240rpx;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: $text-tertiary;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: $bg-card;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.opinion-area {
  width: 100%;
}

.opinion-input {
  width: 100%;
  min-height: 80rpx;
  max-height: 160rpx;
  padding: 16rpx 20rpx;
  font-size: 26rpx;
  color: $text-primary;
  background: #F5F5F5;
  border-radius: 12rpx;
  border: none;
  box-sizing: border-box;
}

.bottom-actions {
  display: flex;
  gap: 20rpx;
}

.btn-reject {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  border: 2rpx solid $color-danger;
  font-size: 30rpx;
  font-weight: 500;
  color: $color-danger;
}

.btn-reject:active {
  background: #FFF0F0;
}

.btn-approve {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background: $color-primary;
  font-size: 30rpx;
  font-weight: 500;
  color: #FFFFFF;
}

.btn-approve:active {
  opacity: 0.9;
}

.btn-press {
  opacity: 0.85;
}
</style>
