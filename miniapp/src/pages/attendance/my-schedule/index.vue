<template>
  <view class="page">
    <nav-bar title="我的排班" :showBack="true" />
    <view class="month-nav">
      <view class="nav-btn" @tap="prevMonth"><text class="nav-icon">‹</text></view>
      <text class="nav-title">{{ monthLabel }}</text>
      <view class="nav-btn" @tap="nextMonth"><text class="nav-icon">›</text></view>
    </view>
    <view class="legend">
      <view v-for="l in legendItems" :key="l.label" class="legend-item">
        <view class="legend-dot" :style="{ background: l.color }" /><text>{{ l.label }}</text>
      </view>
    </view>
    <view class="cal-grid">
      <view class="cal-row cal-head">
        <text v-for="d in dayHeaders" :key="d" class="cal-hd">{{ d }}</text>
      </view>
      <view v-for="(week, wi) in calendarGrid" :key="wi" class="cal-row">
        <view v-for="(cell, ci) in week" :key="ci" class="cal-cell" :class="cell ? 'has-data' : 'cal-empty'" @tap="cell && onCellTap(cell)">
          <template v-if="cell">
            <text class="cal-d">{{ cell.day }}</text>
            <view class="cal-dot" :style="{ background: statusColor(cell.status) }" />
          </template>
        </view>
      </view>
    </view>
    <view v-if="selectedDate" class="detail-popup" @tap="selectedDate = null">
      <view class="popup-card" @tap.stop>
        <text class="popup-date">{{ selectedDate }}</text>
        <view class="popup-status" :style="{ background: statusBg(selectedStatus) }">
          <text :style="{ color: statusColor(selectedStatus) }">{{ statusLabel(selectedStatus) }}</text>
        </view>
        <text v-if="selectedNote" class="popup-note">{{ selectedNote }}</text>
      </view>
    </view>
    <view class="bottom-bar">
      <view class="bb-btn" @tap="goPage('/pages/attendance/leave-apply/index')"><text>请假申请</text></view>
      <view class="bb-btn primary" @tap="goPage('/pages/attendance/trip-start/index')"><text>出差开始</text></view>
      <view class="bb-btn" @tap="goPage('/pages/attendance/leave-list/index')"><text>我的申请</text></view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { attendanceApi } from '@/services/modules/attendance'

const dayHeaders = ['一', '二', '三', '四', '五', '六', '日']
const legendItems = [
  { label: '现场', color: '#2B6DE8' }, { label: '在途', color: '#F59E0B' },
  { label: '休息', color: '#CCC' }, { label: '请假', color: '#8B5CF6' }
]
const statusLabels = { work: '现场（陆）', biz_trip: '在途', rest: '休息', leave: '请假' }

const calMonth = ref(new Date().toISOString().slice(0, 7))
const scheduleMap = ref({})
const selectedDate = ref(null)
const selectedStatus = ref('')
const selectedNote = ref('')

const monthLabel = computed(() => {
  const [y, m] = calMonth.value.split('-'); return `${y}年${parseInt(m)}月`
})

const calendarGrid = computed(() => {
  const [y, m] = calMonth.value.split('-').map(Number)
  const startDow = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const days = new Date(y, m, 0).getDate()
  const rows = []; let week = []
  for (let i = 0; i < startDow; i++) week.push(null)
  for (let d = 1; d <= days; d++) {
    const ds = `${calMonth.value}-${String(d).padStart(2, '0')}`
    const s = scheduleMap.value[ds]
    week.push({ day: d, date: ds, status: s?.status || '', note: s?.note })
    if (week.length === 7) { rows.push(week); week = [] }
  }
  if (week.length) { while (week.length < 7) week.push(null); rows.push(week) }
  return rows
})

function statusColor(s) {
  const m = { work: '#2B6DE8', biz_trip: '#F59E0B', rest: '#CCC', leave: '#8B5CF6' }
  return m[s] || '#DDD'
}
function statusBg(s) {
  const m = { work: '#EDF2FF', biz_trip: '#FFF8E1', rest: '#F5F5F5', leave: '#F5F3FF' }
  return m[s] || '#F5F5F5'
}
function statusLabel(s) { return statusLabels[s] || '无数据' }
function onCellTap(cell) {
  selectedDate.value = cell.date
  selectedStatus.value = cell.status
  selectedNote.value = cell.note
}
function prevMonth() {
  const [y, m] = calMonth.value.split('-').map(Number)
  calMonth.value = new Date(y, m - 2, 1).toISOString().slice(0, 7)
  loadData()
}
function nextMonth() {
  const [y, m] = calMonth.value.split('-').map(Number)
  calMonth.value = new Date(y, m, 1).toISOString().slice(0, 7)
  loadData()
}

async function loadData() {
  try {
    const [y, m] = calMonth.value.split('-').map(Number)
    const firstDay = `${calMonth.value}-01`
    const lastDay = new Date(y, m, 0).toISOString().slice(0, 10)
    const res = await attendanceApi.getScheduleList({ startDate: firstDay, endDate: lastDay, pageSize: 31 })
    const map = {}
    ;(res.data?.list || []).forEach(s => { map[s.scheduleDate] = s })
    scheduleMap.value = map
  } catch { scheduleMap.value = {} }
}

function goPage(url) { uni.navigateTo({ url }) }

onMounted(() => loadData())
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; }
.month-nav { display: flex; align-items: center; justify-content: center; gap: 24rpx; padding: 16rpx; background: #FFF; }
.nav-btn { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; background: #F7F7F7; border-radius: 8rpx; }
.nav-icon { font-size: 36rpx; color: #666; line-height: 1; }
.nav-title { font-size: 30rpx; font-weight: 600; color: #333; min-width: 200rpx; text-align: center; }
.legend { display: flex; justify-content: center; gap: 24rpx; padding: 12rpx; background: #FFF; }
.legend-item { display: flex; align-items: center; gap: 4rpx; font-size: 20rpx; color: #999; }
.legend-dot { width: 16rpx; height: 16rpx; border-radius: 4rpx; }
.cal-grid { background: #FFF; padding: 12rpx; margin: 16rpx 24rpx; border-radius: 16rpx; }
.cal-row { display: flex; }
.cal-head { margin-bottom: 4rpx; }
.cal-hd { flex: 1; text-align: center; font-size: 22rpx; color: #999; padding: 8rpx 0; }
.cal-cell { flex: 1; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 2rpx; border-radius: 8rpx; }
.cal-empty { background: transparent; }
.has-data { background: #F9FAFB; }
.cal-d { font-size: 24rpx; color: #333; font-weight: 500; }
.cal-dot { width: 10rpx; height: 10rpx; border-radius: 5rpx; margin-top: 4rpx; }
.detail-popup { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.4); display: flex; align-items: flex-end; z-index: 100; }
.popup-card { width: 100%; background: #FFF; border-radius: 24rpx 24rpx 0 0; padding: 32rpx; }
.popup-date { font-size: 30rpx; font-weight: 600; color: #333; display: block; margin-bottom: 16rpx; }
.popup-status { display: inline-block; padding: 4rpx 16rpx; border-radius: 20rpx; font-size: 24rpx; font-weight: 500; }
.popup-note { font-size: 24rpx; color: #999; display: block; margin-top: 12rpx; }
.bottom-bar { display: flex; gap: 16rpx; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFF; box-shadow: 0 -2rpx 8rpx rgba(0,0,0,.06); }
.bb-btn { flex: 1; text-align: center; padding: 20rpx 0; border-radius: 44rpx; background: #EDF2FF; font-size: 28rpx; color: #2B6DE8; font-weight: 500; }
.bb-btn.primary { background: #2B6DE8; color: #FFF; }
</style>
