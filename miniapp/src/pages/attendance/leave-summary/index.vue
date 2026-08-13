<template>
  <view class="page">
    <nav-bar title="个人考勤汇总" :showBack="true" />

    <!-- 月份选择 -->
    <view class="month-selector">
      <view class="month-arrow" @tap="prevMonth">◀</view>
      <text class="month-text">{{ displayMonth }}</text>
      <view class="month-arrow" @tap="nextMonth">▶</view>
    </view>

    <!-- 统计卡片 -->
    <view class="summary-grid">
      <stat-card :value="stats.workDays" label="现场" tone="primary" />
      <stat-card :value="stats.bizTripDays" label="在途" tone="warning" />
      <stat-card :value="stats.restDays" label="休息" tone="success" />
      <stat-card :value="stats.leaveDays" label="请假" tone="default" class="stat-leave" />
    </view>

    <!-- 未提交提醒 -->
    <view class="missing-card" v-if="stats.missingDays > 0" @tap="handleMissingClick">
      <view class="missing-dot"></view>
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
          @tap="handleCellClick(cell)"
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
    <view class="detail-overlay" v-if="selectedDay" @tap="selectedDay = null">
      <view class="detail-card" @tap.stop>
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
        <view class="detail-close" @tap="selectedDay = null">关闭</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import StatCard from '@/components/stat-card/index.vue'
import { attendanceApi } from '@/services/modules/attendance'
import { showSuccess, showError, showToast } from '@/utils/toast'

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
const statusColorMap = { work: '#2B6DE8', rest: '#22C55E', biz_trip: '#F59E0B', leave: '#8B5CF6', missing: '#EF4444', none: '#999999' }

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
    showError('加载失败')
  } finally {
    loading.value = false
  }
}


function handleCellClick(cell) {
  if (!cell.date || !cell.status || cell.status === 'none') return
  selectedDay.value = { date: cell.date, status: cell.status, note: cell.note }
}

function handleMissingClick() {
  showError('请及时提交公出日志')
}

loadData()
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.page { min-height: 100vh; background: $bg-color; padding-bottom: 40rpx; }

.month-selector {
  display: flex; align-items: center; justify-content: center;
  padding: $spacing-base; background: $bg-card; margin: $spacing-sm $spacing-base; border-radius: $radius-lg;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}
.month-arrow { font-size: $font-base; padding: 12rpx $spacing-base; color: $primary-color; }
.month-text { font-size: $font-lg; font-weight: 600; color: $text-primary; min-width: 180rpx; text-align: center; }

.summary-grid {
  display: flex; margin: 0 $spacing-base $spacing-sm; gap: $spacing-sm;
}
/* 请假卡片：设计文档 leave 色 #8B5CF6（stat-card tone 集无此色，仅在卡片上覆写） */
.stat-leave :deep(.stat-num) { color: #8B5CF6; }

.missing-card {
  display: flex; align-items: center; margin: 0 $spacing-base $spacing-sm;
  background: #FFF8E1; border-radius: $radius-base; padding: 20rpx $spacing-base;
}
.missing-dot { width: 28rpx; height: 28rpx; border-radius: $radius-sm; background: $warning-color; margin-right: 12rpx; flex-shrink: 0; }
.missing-text { font-size: $font-base; color: $warning-color; }

.calendar { margin: 0 $spacing-base; background: $bg-card; border-radius: $radius-lg; padding: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.cal-header { display: flex; margin-bottom: 12rpx; }
.cal-weekday { flex: 1; text-align: center; font-size: $font-sm; color: $text-secondary; padding: 8rpx 0; }
.cal-grid { display: flex; flex-wrap: wrap; }
.cal-cell { width: calc(100% / 7); aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: $radius-sm; }
.cal-day { font-size: 26rpx; }
.cal-work { background: $primary-bg; }
.cal-work .cal-day { color: $primary-color; }
.cal-biz { background: #FFF8E1; }
.cal-biz .cal-day { color: $warning-color; }
.cal-rest { background: #EFFDF5; }
.cal-rest .cal-day { color: $success-color; }
.cal-leave { background: #F5F3FF; }
.cal-leave .cal-day { color: #8B5CF6; }
.cal-missing { background: #FFF0F0; }
.cal-missing .cal-day { color: $danger-color; }
.cal-none { background: $bg-color; }
.cal-none .cal-day { color: $text-placeholder; }

.legend { display: flex; justify-content: center; gap: $spacing-base; margin: $spacing-base; flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; gap: 8rpx; font-size: $font-xs; color: $text-regular; }
.dot { width: 16rpx; height: 16rpx; border-radius: 4rpx; }
.dot-work { background: $primary-color; }
.dot-biz { background: $warning-color; }
.dot-rest { background: $success-color; }
.dot-leave { background: #8B5CF6; }
.dot-missing { background: $danger-color; }

/* 日期详情弹窗（底部抽屉） */
.detail-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; justify-content: center;
  z-index: 1100;
}
.detail-card {
  width: 100%; background: $bg-card; border-radius: $radius-xl $radius-xl 0 0; padding: 40rpx;
}
.detail-date {
  font-size: $font-lg; font-weight: 600; color: $text-primary; display: block; margin-bottom: $spacing-base;
}
.detail-row {
  display: flex; justify-content: space-between; padding: 12rpx 0; border-bottom: 1rpx solid $border-light;
}
.detail-label { font-size: $font-base; color: $text-secondary; }
.detail-value { font-size: $font-base; }
.detail-close {
  margin-top: $spacing-lg; text-align: center; font-size: $font-base; color: $primary-color; padding: $spacing-sm 0;
}
</style>
