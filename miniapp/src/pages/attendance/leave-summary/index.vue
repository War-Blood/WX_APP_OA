<template>
  <view class="page">
    <nav-bar title="个人考勤汇总" :showBack="true" />

    <!-- 月份选择 -->
    <view class="month-selector">
      <view class="month-arrow" @click="prevMonth">◀</view>
      <text class="month-text">{{ displayMonth }}</text>
      <view class="month-arrow" @click="nextMonth">▶</view>
    </view>

    <!-- 统计卡片 -->
    <view class="summary-grid">
      <view class="stat-card stat-work">
        <text class="stat-num">{{ stats.workDays }}</text>
        <text class="stat-label">现场</text>
      </view>
      <view class="stat-card stat-biz">
        <text class="stat-num">{{ stats.bizTripDays }}</text>
        <text class="stat-label">在途</text>
      </view>
      <view class="stat-card stat-rest">
        <text class="stat-num">{{ stats.restDays }}</text>
        <text class="stat-label">休息</text>
      </view>
      <view class="stat-card stat-leave">
        <text class="stat-num">{{ stats.leaveDays }}</text>
        <text class="stat-label">请假</text>
      </view>
    </view>

    <!-- 未提交提醒 -->
    <view class="missing-card" v-if="stats.missingDays > 0" @click="handleMissingClick">
      <text class="missing-icon">⚠️</text>
      <text class="missing-text">本月有 {{ stats.missingDays }} 天未提交公出日志</text>
    </view>

    <!-- 日历视图 -->
    <view class="calendar">
      <view class="cal-header">
        <text v-for="d in weekDays" :key="d" class="cal-weekday">{{ d }}</text>
      </view>
      <view class="cal-grid">
        <view
          v-for="(cell, idx) in calendarCells"
          :key="idx"
          class="cal-cell"
          :class="cell.statusClass"
          @click="handleCellClick(cell)"
        >
          <text class="cal-day">{{ cell.day }}</text>
        </view>
      </view>
    </view>

    <view class="legend">
      <view class="legend-item"><view class="dot dot-work" /><text>现场</text></view>
      <view class="legend-item"><view class="dot dot-biz" /><text>在途</text></view>
      <view class="legend-item"><view class="dot dot-rest" /><text>休息</text></view>
      <view class="legend-item"><view class="dot dot-leave" /><text>请假</text></view>
      <view class="legend-item"><view class="dot dot-missing" /><text>未提交</text></view>
    </view>

    <!-- 日期详情弹窗 -->
    <view class="detail-overlay" v-if="selectedDay" @click="selectedDay = null">
      <view class="detail-card" @click.stop>
        <text class="detail-date">{{ selectedDay.date }}</text>
        <view class="detail-row">
          <text class="detail-label">状态</text>
          <text class="detail-value" :style="{ color: statusColor(selectedDay.status) }">
            {{ statusLabel(selectedDay.status) }}
          </text>
        </view>
        <view class="detail-row" v-if="selectedDay.note">
          <text class="detail-label">备注</text>
          <text class="detail-value">{{ selectedDay.note }}</text>
        </view>
        <view class="detail-close" @click="selectedDay = null">关闭</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { attendanceApi } from '@/services/modules/attendance'

const weekDays = ['一', '二', '三', '四', '五', '六', '日']
const currentDate = new Date()
const year = ref(currentDate.getFullYear())
const month = ref(currentDate.getMonth() + 1)

const displayMonth = computed(() => `${year.value}年${month.value}月`)

const stats = ref({ workDays: 0, restDays: 0, bizTripDays: 0, leaveDays: 0, missingDays: 0 })
const calendarCells = ref([])
const loading = ref(false)
const selectedDay = ref(null)
const dailyMap = ref({})

const statusMap = { work: '现场（陆）', rest: '休息', biz_trip: '在途', leave: '请假', missing: '未提交', none: '无排班' }
const statusClassMap = { work: 'cal-work', rest: 'cal-rest', biz_trip: 'cal-biz', leave: 'cal-leave', missing: 'cal-missing', none: 'cal-none' }
const statusColorMap = { work: '#2B6DE8', rest: '#22C55E', biz_trip: '#F59E0B', leave: '#EF4444', missing: '#EF4444', none: '#999999' }

function statusLabel(s) { return statusMap[s] || '无排班' }
function statusColor(s) { return statusColorMap[s] || '#999999' }

function prevMonth() {
  if (month.value === 1) { year.value--; month.value = 12 }
  else { month.value-- }
  loadData()
}
function nextMonth() {
  if (month.value === 12) { year.value++; month.value = 1 }
  else { month.value++ }
  loadData()
}

function getMonthRange() {
  const start = `${year.value}-${String(month.value).padStart(2, '0')}-01`
  const lastDay = new Date(year.value, month.value, 0).getDate()
  const end = `${year.value}-${String(month.value).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function buildCalendar(dailyList) {
  const cells = []
  const firstDay = new Date(year.value, month.value - 1, 1)
  const lastDay = new Date(year.value, month.value, 0)
  const startDow = firstDay.getDay() || 7 // 周一=1..周日=7

  // 构建每日数据索引
  const map = {}
  if (dailyList && dailyList.length) {
    dailyList.forEach(item => { map[item.date] = item })
  }
  dailyMap.value = map

  // 上月填充
  for (let i = 1; i < startDow; i++) {
    cells.push({ day: '', statusClass: '', date: '', status: '', note: '' })
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const ds = `${year.value}-${String(month.value).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const item = map[ds]
    const status = item ? item.status : 'none'
    const statusClass = statusClassMap[status] || ''
    const note = item ? (item.note || '') : ''

    cells.push({ day: d, statusClass, date: ds, status, note })
  }

  calendarCells.value = cells
}

async function loadData() {
  loading.value = true
  try {
    const { start, end } = getMonthRange()
    const res = await attendanceApi.getMySummary({ startDate: start, endDate: end })

    if (res && res.code === 0 && res.data) {
      const data = res.data
      stats.value = {
        workDays: data.workDays || 0,
        restDays: data.restDays || 0,
        bizTripDays: data.bizTripDays || 0,
        leaveDays: data.leaveDays || 0,
        missingDays: data.missingDays || 0
      }
      buildCalendar(data.dailyList || [])
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}


function handleCellClick(cell) {
  if (!cell.date || !cell.status || cell.status === 'none') return
  selectedDay.value = { date: cell.date, status: cell.status, note: cell.note }
}

function handleMissingClick() {
  uni.showToast({ title: '请及时提交公出日志', icon: 'none' })
}

loadData()
</script>

<style scoped>
.page { min-height: 100vh; background: #F7F7F7; padding-bottom: 40rpx; }

.month-selector {
  display: flex; align-items: center; justify-content: center;
  padding: 24rpx; background: #FFFFFF; margin: 16rpx 24rpx; border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}
.month-arrow { font-size: 28rpx; padding: 12rpx 24rpx; color: #2B6DE8; }
.month-text { font-size: 32rpx; font-weight: 600; color: #333333; min-width: 180rpx; text-align: center; }

.summary-grid {
  display: flex; margin: 0 24rpx 16rpx; gap: 16rpx;
}
.stat-card {
  flex: 1; background: #FFFFFF; border-radius: 16rpx; padding: 20rpx 0;
  text-align: center; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}
.stat-num { display: block; font-size: 48rpx; font-weight: 700; }
.stat-label { display: block; font-size: 24rpx; color: #999999; margin-top: 4rpx; }
.stat-work .stat-num { color: #2B6DE8; }
.stat-biz .stat-num { color: #F59E0B; }
.stat-rest .stat-num { color: #909399; }
.stat-leave .stat-num { color: #8B5CF6; }

.missing-card {
  display: flex; align-items: center; margin: 0 24rpx 16rpx;
  background: #FFF3CD; border-radius: 12rpx; padding: 20rpx 24rpx;
}
.missing-icon { font-size: 32rpx; margin-right: 12rpx; }
.missing-text { font-size: 28rpx; color: #856404; }

.calendar { margin: 0 24rpx; background: #FFFFFF; border-radius: 16rpx; padding: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.cal-header { display: flex; margin-bottom: 12rpx; }
.cal-weekday { flex: 1; text-align: center; font-size: 24rpx; color: #999999; padding: 8rpx 0; }
.cal-grid { display: flex; flex-wrap: wrap; }
.cal-cell { width: calc(100% / 7); aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 8rpx; }
.cal-day { font-size: 26rpx; }
.cal-work { background: #EDF2FF; }
.cal-work .cal-day { color: #2B6DE8; }
.cal-biz { background: #FFF8E1; }
.cal-biz .cal-day { color: #F59E0B; }
.cal-rest { background: #F0FDF4; }
.cal-rest .cal-day { color: #22C55E; }
.cal-leave { background: #FEF2F2; }
.cal-leave .cal-day { color: #EF4444; }
.cal-missing { background: #FFF1F0; }
.cal-missing .cal-day { color: #EF4444; }
.cal-none { background: #F7F7F7; }
.cal-none .cal-day { color: #CCCCCC; }

.legend { display: flex; justify-content: center; gap: 24rpx; margin: 24rpx; flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; gap: 8rpx; font-size: 22rpx; color: #666666; }
.dot { width: 16rpx; height: 16rpx; border-radius: 4rpx; }
.dot-work { background: #2B6DE8; }
.dot-biz { background: #F59E0B; }
.dot-rest { background: #909399; }
.dot-leave { background: #8B5CF6; }
.dot-missing { background: #EF4444; }

/* 日期详情弹窗 */
.detail-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;
  z-index: 1100;
}
.detail-card {
  background: #FFFFFF; border-radius: 16rpx; padding: 40rpx; width: 560rpx;
}
.detail-date {
  font-size: 32rpx; font-weight: 600; color: #333333; display: block; margin-bottom: 24rpx;
}
.detail-row {
  display: flex; justify-content: space-between; padding: 12rpx 0; border-bottom: 1rpx solid #F0F0F0;
}
.detail-label { font-size: 28rpx; color: #999999; }
.detail-value { font-size: 28rpx; }
.detail-close {
  margin-top: 32rpx; text-align: center; font-size: 28rpx; color: #2B6DE8; padding: 16rpx 0;
}
</style>
