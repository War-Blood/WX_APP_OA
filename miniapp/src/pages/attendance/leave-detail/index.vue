<template>
  <view class="page">
    <nav-bar title="详情" :showBack="true" />
    <scroll-view class="content" scroll-y v-if="data">
      <view class="status-bar" :class="'bar-' + data.status">
        <text class="status-bar-text">{{ statusMap[data.status] }}</text>
      </view>
      <view class="card">
        <text class="card-title">基本信息</text>
        <view class="row"><text class="lbl">申请人</text><text class="val">{{ data.applicantName }}</text></view>
        <view class="row"><text class="lbl">部门</text><text class="val">{{ data.departmentName || '-' }}</text></view>
        <view class="row"><text class="lbl">类型</text><text class="val">{{ data.requestType === 'biz_trip' ? '出差' : '请假' }}</text></view>
        <template v-if="data.requestType === 'biz_trip'">
          <view class="row"><text class="lbl">开始时间</text><text class="val">{{ fmt(data.tripStartedAt) }}</text></view>
          <view class="row"><text class="lbl">结束时间</text><text class="val">{{ data.tripEndedAt ? fmt(data.tripEndedAt) : '进行中' }}</text></view>
        </template>
        <template v-else>
          <view class="row"><text class="lbl">请假类型</text><text class="val">{{ leaveMap[data.leaveSubtype] || '-' }}</text></view>
          <view class="row"><text class="lbl">日期</text><text class="val">{{ data.startDate }} → {{ data.endDate }}</text></view>
          <view class="row"><text class="lbl">天数</text><text class="val">{{ data.days }} 天</text></view>
        </template>
        <view class="row"><text class="lbl">备注</text><text class="val">{{ data.reason || '-' }}</text></view>
      </view>
      <view v-if="data.missingDates?.length" class="missing-card">
        <text class="missing-title">⚠ 未提交日期（{{ data.missingDates.length }}天）</text>
        <text v-for="d in data.missingDates" :key="d" class="missing-date">{{ d }}</text>
      </view>
    </scroll-view>
    <view v-if="data?.requestType === 'biz_trip' && data?.status === 'in_progress'" class="bottom-bar">
      <view class="btn-end" @tap="handleEndTrip"><text>结束出差</text></view>
    </view>
    <view v-if="data?.requestType === 'leave' && data?.status === 'active'" class="bottom-bar">
      <view class="btn-edit" @tap="handleEdit"><text>修改信息</text></view>
      <view class="btn-cancel" @tap="handleCancel"><text>撤销申请</text></view>
    </view>
    <view v-else-if="!data" class="loading">加载中...</view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { attendanceApi } from '@/services/modules/attendance'
import { showSuccess, showError, showToast } from '@/utils/toast'

const statusMap = { active: '生效中', cancelled: '已撤销', in_progress: '进行中', ended: '已结束' }
const leaveMap = { annual: '年假', sick: '病假', personal: '事假', marriage: '婚假', funeral: '丧假', other: '其他' }

const data = ref(null)
const id = ref('')

function fmt(t) { if (!t) return ''; return t.slice(0, 16).replace('T', ' ') }

onMounted(() => {
  const pages = getCurrentPages()
  const options = pages[pages.length - 1].options || pages[pages.length - 1].$route?.query || {}
  id.value = options.id
  if (id.value) loadDetail()
})

async function loadDetail() {
  try {
    const res = await attendanceApi.getLeaveDetail(id.value)
    data.value = res.data
  } catch { data.value = null }
}

async function handleCancel() {
  const r = await new Promise(resolve => uni.showModal({ title: '确认撤销', content: '撤销后不可恢复', success: resolve }))
  if (!r.confirm) return
  try {
    await attendanceApi.cancelLeave(id.value)
    showSuccess('已撤销')
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (e) { showError(e.message) }
}

function handleEdit() {
  const d = data.value
  const params = new URLSearchParams()
  params.set('editId', id.value)
  if (d.leaveSubtype) params.set('type', d.leaveSubtype)
  if (d.startDate) params.set('start', d.startDate)
  if (d.endDate) params.set('end', d.endDate)
  if (d.reason) params.set('reason', d.reason)
  uni.navigateTo({ url: '/pages/attendance/leave-apply/index?' + params.toString() })
}

function handleEndTrip() {
  uni.navigateTo({ url: '/pages/attendance/trip-end/index' })
}
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; }
.content { flex: 1; height: 0; padding: 24rpx; }
.status-bar { padding: 16rpx 24rpx; border-radius: 12rpx; margin-bottom: 24rpx; text-align: center; }
.bar-active { background: #EFFDF5; } .bar-active .status-bar-text { color: #22C55E; }
.bar-cancelled { background: #F5F5F5; } .bar-cancelled .status-bar-text { color: #999; }
.bar-in_progress { background: #FFF8E1; } .bar-in_progress .status-bar-text { color: #F59E0B; }
.bar-ended { background: #EDF2FF; } .bar-ended .status-bar-text { color: #2B6DE8; }
.status-bar-text { font-size: 30rpx; font-weight: 700; }
.card { background: #FFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.card-title { font-size: 28rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; display: block; }
.row { display: flex; justify-content: space-between; padding: 16rpx 0; border-top: 1rpx solid #F5F5F5; }
.row:first-of-type { border-top: none; }
.lbl { font-size: 26rpx; color: #999; }
.val { font-size: 26rpx; color: #333; text-align: right; }
.missing-card { background: #FFF5F5; border-radius: 16rpx; padding: 24rpx; border-left: 6rpx solid #EF4444; }
.missing-title { font-size: 26rpx; font-weight: 600; color: #EF4444; display: block; margin-bottom: 12rpx; }
.missing-date { font-size: 24rpx; color: #EF4444; display: block; padding: 4rpx 0; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFF; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,.04); display: flex; gap: 24rpx; }
.btn-end { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); color: #FFF; font-size: 30rpx; font-weight: 600; }
.btn-edit { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); color: #FFF; font-size: 30rpx; font-weight: 600; }
.btn-cancel { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; background: #FFF; border: 2rpx solid #EF4444; color: #EF4444; font-size: 30rpx; font-weight: 600; }
.loading { flex: 1; display: flex; align-items: center; justify-content: center; }
</style>
