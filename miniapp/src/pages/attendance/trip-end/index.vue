<template>
  <view class="page">
    <nav-bar title="出差结束" :showBack="true" />
    <scroll-view class="content" scroll-y v-if="trip">
      <view class="status-card status-active">
        <text class="status-label">出差中</text>
        <text class="status-time">开始：{{ fmtTime(trip.tripStartedAt) }}</text>
        <text class="status-days">已持续 {{ tripDays }} 天</text>
      </view>
      <view v-if="missingDates.length" class="missing-card">
        <text class="missing-title">⚠ 未提交日期</text>
        <view v-for="d in missingDates" :key="d" class="missing-item">
          <text class="missing-date">{{ d }}</text>
          <text class="missing-label">未提交公出日志</text>
        </view>
        <text class="missing-total">共 {{ missingDates.length }} 天未提交</text>
      </view>
      <view class="card">
        <text class="card-title">结束日期</text>
        <picker mode="date" :value="endDate" :start="minDate" :end="todayDate" @change="onEndDateChange">
          <view class="picker-field">
            <text class="picker-label">{{ endDate }}</text>
            <text class="picker-icon">▼</text>
          </view>
        </picker>
        <text class="picker-hint">如需补录过往日期，可选择出差期间任意一天</text>
      </view>
      <view class="card">
        <text class="card-title">备注（可选）</text>
        <textarea v-model="reason" placeholder="项目完成返回" :maxlength="200" />
      </view>
      <view class="btn-spacer" />
    </scroll-view>
    <view v-else-if="loading" class="loading">加载中...</view>
    <view v-else class="empty">
      <text class="empty-text">没有进行中的出差</text>
    </view>
    <view v-if="trip" class="bottom-bar">
      <view class="btn-primary" :class="{ 'btn-disabled': submitting }" @tap="handleEnd">
        <text class="btn-text">{{ submitting ? '处理中...' : '确认结束出差' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { attendanceApi } from '@/services/modules/attendance'
import { showSuccess, showError, showToast } from '@/utils/toast'

const loading = ref(true)
const trip = ref(null)
const reason = ref('')
const submitting = ref(false)
const missingDates = ref([])
const endDate = ref('')           // 选中的结束日期
const startDate = ref('')         // 出差开始日期

// 今天（YYYY-MM-DD）
const todayDate = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
// 出差开始日期作为最小可选日期
const minDate = computed(() => startDate.value || '2020-01-01')

const tripDays = computed(() => {
  if (!trip.value?.tripStartedAt) return 0
  const st = new Date(trip.value.tripStartedAt)
  const start = new Date(st.getFullYear(), st.getMonth(), st.getDate())
  const end = endDate.value ? new Date(endDate.value) : new Date()
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.floor((endDay - start) / 86400000) + 1
})

function fmtTime(t) { if (!t) return ''; return t.slice(0, 16).replace('T', ' ') }

async function loadMissing() {
  if (!trip.value) return
  const detail = await attendanceApi.getLeaveDetail(trip.value.id)
  missingDates.value = detail.data?.missingDates || []
}

onMounted(async () => {
  try {
    const res = await attendanceApi.getMyLeaveList({ requestType: 'biz_trip', status: 'in_progress', pageSize: 1 })
    if (res.data?.list?.length) {
      trip.value = res.data.list[0]
      const start = trip.value.tripStartedAt ? String(trip.value.tripStartedAt).slice(0, 10) : ''
      startDate.value = start
      endDate.value = todayDate.value
      await loadMissing()
    }
  } catch { showError('加载失败') }
  finally { loading.value = false }
})

async function onEndDateChange(e) {
  endDate.value = e.detail.value
  await loadMissing()
}

async function handleEnd() {
  submitting.value = true
  try {
    const res = await attendanceApi.endTrip({ requestId: trip.value.id, reason: reason.value, endDate: endDate.value })
    const d = res.data
    const tripDays = d.tripDays ?? 0
    const missingDays = d.missingDays ?? 0
    showToast(`已结束，${tripDays}天，未提交${missingDays}天`)
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (e) {
    showError(e.message || '操作失败')
  } finally { submitting.value = false }
}
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; }
.content { flex: 1; height: 0; padding: 24rpx; }
.status-card { padding: 32rpx; border-radius: 16rpx; margin-bottom: 24rpx; }
.status-active { background: linear-gradient(135deg, #FFF8E1, #FFF3CD); border-left: 6rpx solid #F59E0B; }
.status-label { font-size: 28rpx; font-weight: 700; color: #F59E0B; display: block; }
.status-time { font-size: 24rpx; color: #666; margin-top: 8rpx; display: block; }
.status-days { font-size: 32rpx; font-weight: 700; color: #333; margin-top: 4rpx; display: block; }
.missing-card { background: #FFF5F5; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; border-left: 6rpx solid #EF4444; }
.missing-title { font-size: 26rpx; font-weight: 600; color: #EF4444; display: block; margin-bottom: 12rpx; }
.missing-item { display: flex; align-items: center; justify-content: space-between; padding: 8rpx 0; }
.missing-date { font-size: 24rpx; color: #EF4444; font-weight: 500; }
.missing-label { font-size: 22rpx; color: #999; }
.missing-total { font-size: 24rpx; color: #EF4444; font-weight: 600; margin-top: 12rpx; display: block; text-align: right; }
.card { background: #FFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,.04); }
.card-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-bottom: 16rpx; }
textarea { width: 100%; height: 120rpx; font-size: 26rpx; padding: 16rpx; background: #F7F7F7; border-radius: 8rpx; box-sizing: border-box; }
.picker-field { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; background: #F7F7F7; border-radius: 12rpx; }
.picker-label { font-size: 28rpx; color: #333; font-weight: 500; }
.picker-icon { font-size: 20rpx; color: #999; }
.picker-hint { font-size: 22rpx; color: #999; margin-top: 12rpx; display: block; }
.btn-spacer { height: 40rpx; }
.bottom-bar { background: #FFF; padding: 24rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); box-shadow: 0 -2rpx 12rpx rgba(0,0,0,.06); }
.btn-primary { height: 96rpx; display: flex; align-items: center; justify-content: center; border-radius: 48rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); }
.btn-primary:active { opacity: .9; }
.btn-disabled { opacity: .5; }
.btn-text { font-size: 32rpx; font-weight: 600; color: #FFF; letter-spacing: 2rpx; }
.loading, .empty { flex: 1; display: flex; align-items: center; justify-content: center; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
