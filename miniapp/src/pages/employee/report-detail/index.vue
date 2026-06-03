<template>
  <view class="page">
    <nav-bar title="日报详情" :showBack="true" />

    <scroll-view class="content-scroll" scroll-y>
      <view v-if="loading" class="loading-wrap">
        <text class="loading-text">加载中...</text>
      </view>
      <template v-else-if="report">
        <view class="header-card">
          <view class="header-row">
            <text class="header-date">{{ report.date }}</text>
            <view class="status-badge" :style="{ background: getStatusBg(report.status) }">
              <text class="status-badge-text" :style="{ color: getStatusColor(report.status) }">{{ report.statusText }}</text>
            </view>
          </view>
          <text class="header-meta">提交时间：{{ report.submitTime || report.time || '' }}</text>
        </view>

        <view class="field-card">
          <text class="card-title">项目信息</text>
          <view class="field-row">
            <text class="field-label">项目名称</text>
            <text class="field-value">{{ report.project || '未选择' }}</text>
          </view>
          <view class="field-row">
            <text class="field-label">作业类型</text>
            <text class="field-value field-value-accent">{{ report.workType || report.todayWorkType || '工作' }}</text>
          </view>
          <view class="field-row">
            <text class="field-label">机型</text>
            <text class="field-value">{{ report.machineModel || report.model || '无' }}</text>
          </view>
          <view class="field-row">
            <text class="field-label">作业人数</text>
            <text class="field-value">{{ report.workerCount || '1' }} 人</text>
          </view>
        </view>

        <view class="content-card">
          <text class="card-title">今日完成</text>
          <view class="card-text-content">{{ report.todayWork || '无工作内容' }}</view>
          <view v-if="progressPercent > 0" class="card-progress">
            <view class="progress-bar-bg">
              <view class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></view>
            </view>
            <text class="progress-pct">{{ progressPercent }}%</text>
          </view>
        </view>

        <view class="content-card">
          <text class="card-title">明日计划</text>
          <view class="card-text-content">{{ report.tomorrowPlan || '无计划' }}</view>
        </view>

        <view v-if="report.status !== 'pending'" class="review-card">
          <text class="card-title">审核信息</text>
          <view class="field-row">
            <text class="field-label">审核状态</text>
            <view class="status-badge" :style="{ background: getStatusBg(report.status) }">
              <text class="status-badge-text" :style="{ color: getStatusColor(report.status) }">{{ report.statusText }}</text>
            </view>
          </view>
          <view class="field-row">
            <text class="field-label">审核人</text>
            <text class="field-value">{{ report.reviewer || '' }}</text>
          </view>
          <view class="field-row">
            <text class="field-label">审核意见</text>
            <text class="field-value" :class="{ 'reject-text': report.status === 'rejected' }">{{ report.reviewOpinion || '无' }}</text>
          </view>
          <view class="field-row">
            <text class="field-label">审核时间</text>
            <text class="field-value">{{ report.reviewTime || '' }}</text>
          </view>
        </view>

        <view class="bottom-placeholder"></view>
      </template>
    </scroll-view>

    <view v-if="report?.status === 'rejected'" class="bottom-bar">
      <view class="btn-revise" hover-class="btn-press" @tap="goToRevise">
        <text class="btn-revise-text">修改重提</text>
      </view>
    </view>
    <view v-if="isSubmitting" class="loading-overlay">
      <text class="loading-overlay-text">跳转中...</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { reportApi } from '@/services/modules/report'

const isSubmitting = ref(false)
const loading = ref(true)
const report = ref(null)
const reportId = ref('')

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  if (currentPage.options && currentPage.options.id) {
    reportId.value = currentPage.options.id
    loadReportDetail()
  } else {
    loading.value = false
    uni.showToast({ title: '缺少参数', icon: 'none' })
  }
})

async function loadReportDetail() {
  loading.value = true
  try {
    const res = await reportApi.getDetail(reportId.value)
    report.value = res.data
  } catch (err) {
    console.error('加载日报详情失败', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const progressPercent = computed(() => {
  if (!report.value) return 0
  if (report.value.progress !== undefined) return Number(report.value.progress)
  if (report.value.requiredQty > 0) {
    const pct = Math.round((report.value.completedQty / report.value.requiredQty) * 100)
    return Math.min(pct, 100)
  }
  return 0
})

function getStatusBg(status) {
  const map = { approved: '#EFFDF5', pending: '#FFF8F0', rejected: '#FFF0F0', draft: '#F5F5F5' }
  return map[status] || '#F5F5F5'
}

function getStatusColor(status) {
  const map = { approved: '#22C55E', pending: '#F59E0B', rejected: '#EF4444', draft: '#999999' }
  return map[status] || '#999999'
}

async function goToRevise() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  await new Promise(resolve => setTimeout(resolve, 300))
  if (!report.value) return
  uni.navigateTo({ url: '/pages/employee/rejected-edit/index?id=' + report.value.id })
  isSubmitting.value = false
}
</script>

<style lang="scss" scoped>
.page {
  width: 100%;
  height: 100vh;
  background: #F7F7F7;
  display: flex;
  flex-direction: column;
}

.content-scroll {
  flex: 1;
  height: 0;
  padding: 24rpx;
}

.header-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-date {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.status-badge {
  height: 40rpx;
  padding: 0 16rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-badge-text {
  font-size: 20rpx;
  font-weight: 500;
}

.header-meta {
  font-size: 24rpx;
  color: #999999;
  margin-top: 16rpx;
  display: block;
}

.field-card,
.content-card,
.review-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 20rpx;
  display: block;
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
}

.field-row + .field-row {
  border-top: 1rpx solid #F5F5F5;
}

.field-label {
  font-size: 24rpx;
  color: #666666;
}

.field-value {
  font-size: 24rpx;
  color: #333333;
  font-weight: 500;
  text-align: right;
}

.field-value-accent {
  color: #2B6DE8;
}

.reject-text {
  color: #EF4444;
}

.card-text-content {
  font-size: 26rpx;
  color: #333333;
  line-height: 44rpx;
}

.card-progress {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 20rpx;
}

.progress-bar-bg {
  flex: 1;
  height: 12rpx;
  background: #EFF2F5;
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #22C55E;
  border-radius: 6rpx;
}

.progress-pct {
  font-size: 24rpx;
  font-weight: 600;
  color: #22C55E;
  min-width: 72rpx;
  text-align: right;
}

.bottom-placeholder {
  height: 120rpx;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.btn-revise {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 48rpx;
  background: #FFFFFF;
  border: 2rpx solid #EF4444;
}

.btn-revise:active {
  background: #FFF5F5;
}

.btn-revise-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #EF4444;
  letter-spacing: 2rpx;
}

.btn-press {
  opacity: 0.85;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-overlay-text {
  font-size: 28rpx;
  color: #FFFFFF;
}
</style>
