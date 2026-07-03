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
        <text class="card-title">备注（可选）</text>
        <textarea v-model="reason" placeholder="项目完成返回" :maxlength="200" />
      </view>
      <view class="btn-area">
        <view class="btn-primary" :class="{ 'btn-disabled': submitting }" @tap="handleEnd">
          <text class="btn-text">{{ submitting ? '处理中...' : '确认结束出差' }}</text>
        </view>
      </view>
    </scroll-view>
    <view v-else-if="loading" class="loading">加载中...</view>
    <view v-else class="empty">
      <text class="empty-text">没有进行中的出差</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { attendanceApi } from '@/services/modules/attendance'

const loading = ref(true)
const trip = ref(null)
const reason = ref('')
const submitting = ref(false)
const missingDates = ref([])

const tripDays = computed(() => {
  if (!trip.value?.tripStartedAt) return 0
  // 日期粒度：忽略时分秒，按日历天数计算
  const start = new Date(trip.value.tripStartedAt.slice(0, 10))
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.floor((today - start) / 86400000) + 1
})

function fmtTime(t) { if (!t) return ''; return t.slice(0, 16).replace('T', ' ') }

onMounted(async () => {
  try {
    const res = await attendanceApi.getMyLeaveList({ requestType: 'biz_trip', status: 'in_progress', pageSize: 1 })
    if (res.data?.list?.length) {
      trip.value = res.data.list[0]
      const detail = await attendanceApi.getLeaveDetail(trip.value.id)
      missingDates.value = detail.data?.missingDates || []
    }
  } catch { /* */ }
  finally { loading.value = false }
})

async function handleEnd() {
  submitting.value = true
  try {
    const res = await attendanceApi.endTrip({ requestId: trip.value.id, reason: reason.value })
    const d = res.data
    uni.showToast({ title: `已结束，${d.tripDays}天，未提交${d.missingDays}天`, icon: 'none', duration: 2500 })
    setTimeout(() => uni.navigateBack(), 2500)
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
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
.btn-area { padding: 24rpx 0 48rpx; }
.btn-primary { height: 96rpx; display: flex; align-items: center; justify-content: center; border-radius: 48rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); }
.btn-primary:active { opacity: .9; }
.btn-disabled { opacity: .5; }
.btn-text { font-size: 32rpx; font-weight: 600; color: #FFF; letter-spacing: 2rpx; }
.loading, .empty { flex: 1; display: flex; align-items: center; justify-content: center; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
