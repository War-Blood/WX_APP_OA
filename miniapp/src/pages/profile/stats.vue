<template>
  <view class="page">
    <NavBar title="公出统计" :showBack="true" />

    <!-- 管理员 Tab 切换 -->
    <view v-if="userStore.isAdmin" class="tab-bar">
      <view
        v-for="tab in adminTabs"
        :key="tab.key"
        class="tab-item"
        :class="{ 'tab-active': adminActiveTab === tab.key }"
        @tap="switchAdminTab(tab.key)"
      >
        <text class="tab-text">{{ tab.label }}</text>
      </view>
    </view>

    <!-- ========== 个人统计（非管理员 or 管理员"个人统计"Tab） ========== -->
    <scroll-view
      v-if="!userStore.isAdmin || adminActiveTab === 'personal'"
      class="content-scroll"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- 入场日期 -->
      <view class="entry-date-bar">
        <text class="entry-label">入场日期</text>
        <text class="entry-value">{{ entryDateDisplay }}</text>
      </view>

      <!-- 四格统计卡片 -->
      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-value stat-value--primary">{{ personalStats.totalCount }}</text>
          <text class="stat-label">累计条数</text>
        </view>
        <view class="stat-card">
          <text class="stat-value stat-value--success">{{ personalStats.monthCount }}</text>
          <text class="stat-label">当月条数</text>
        </view>
        <view class="stat-card">
          <text class="stat-value" :class="personalStats.missingDays > 0 ? 'stat-value--danger' : 'stat-value--success'">{{ personalStats.missingDays }}</text>
          <text class="stat-label">缺失天数</text>
        </view>
        <view class="stat-card">
          <text class="stat-value" :class="personalStats.delayedCount > 0 ? 'stat-value--warning' : 'stat-value--success'">{{ personalStats.delayedCount }}</text>
          <text class="stat-label">延迟条数</text>
        </view>
      </view>

      <!-- 缺失日期列表 -->
      <view v-if="personalStats.missingDates && personalStats.missingDates.length > 0" class="section-card">
        <text class="section-title">缺失日期（最近30条）</text>
        <view class="missing-dates">
          <text
            v-for="d in personalStats.missingDates"
            :key="d"
            class="missing-date-tag"
          >{{ formatShortDate(d) }}</text>
        </view>
      </view>

      <!-- 月度工作占比 -->
      <view v-if="monthlySummary" class="section-card">
        <text class="section-title">{{ monthlyMonth }}工作占比</text>
        <text class="section-subtitle">已填报：{{ monthlySummary.totalSubmitted }}天</text>
        <view class="ratio-list">
          <view
            v-for="(days, type) in monthlySummary.breakdown"
            :key="type"
            class="ratio-item"
          >
            <text class="ratio-type">{{ type }}</text>
            <view class="ratio-bar-wrap">
              <view
                class="ratio-bar"
                :style="{ width: getRatio(type) }"
              ></view>
            </view>
            <text class="ratio-pct">{{ getRatio(type) }}</text>
            <text class="ratio-days">{{ days }}天</text>
          </view>
        </view>
      </view>

      <!-- 同组日志 -->
      <view v-if="teamLogs.length > 0" class="section-card">
        <text class="section-title">同组日志（最近7天）</text>
        <view
          v-for="log in teamLogs"
          :key="log.id || log.reportId"
          class="team-log-item"
          @tap="goToTeamDetail(log)"
        >
          <view class="team-log-left">
            <text class="team-log-name">{{ log.userName || log.submitterName }}</text>
            <text class="team-log-date">{{ formatShortDate(log.reportDate || log.date) }}</text>
          </view>
          <view class="team-log-right">
            <text class="team-log-type">{{ log.workType || log.todayWorkType || '-' }}</text>
            <text class="team-log-arrow">→</text>
          </view>
        </view>
      </view>

      <view class="bottom-placeholder"></view>
    </scroll-view>

    <!-- ========== 全员当日 ========== -->
    <view
      v-if="userStore.isAdmin && adminActiveTab === 'daily'"
      class="content-scroll"
    >
      <view class="section-card" style="text-align:center; padding:48rpx 24rpx;">
        <text class="section-title" style="margin-bottom:16rpx;">昨日工作一览</text>
        <text style="font-size:24rpx;color:#999;display:block;margin-bottom:24rpx;">
          查看所有在职人员昨日的工作状态与项目分布
        </text>
        <view class="btn-submit" hover-class="btn-submit-press" @tap="goToDailyOverview">
          <text class="btn-submit-text">查看详情</text>
        </view>
      </view>
    </view>

    <!-- ========== 日历热力图 ========== -->
    <scroll-view
      v-if="userStore.isAdmin && adminActiveTab === 'calendar'"
      class="content-scroll" scroll-y
      :refresher-enabled="true" :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="cal-header">
        <view class="cal-nav-btn" @tap="prevCalMonth"><text class="cal-nav-icon">‹</text></view>
        <text class="cal-month-title">{{ calMonthLabel() }}</text>
        <view class="cal-nav-btn" @tap="nextCalMonth"><text class="cal-nav-icon">›</text></view>
      </view>
      <view class="cal-legend">
        <view class="cal-legend-item"><view class="cal-dot cal-dot--zero"></view><text>0</text></view>
        <view class="cal-legend-item"><view class="cal-dot cal-dot--low"></view><text>1-3</text></view>
        <view class="cal-legend-item"><view class="cal-dot cal-dot--mid"></view><text>4-6</text></view>
        <view class="cal-legend-item"><view class="cal-dot cal-dot--high"></view><text>7+</text></view>
      </view>
      <view v-if="calLoading" class="loading-wrap"><text class="loading-text">加载中...</text></view>
      <view v-else class="cal-grid">
        <!-- 表头 -->
        <view class="cal-row cal-row--head">
          <text v-for="d in ['一','二','三','四','五','六','日']" :key="d" class="cal-head-cell">{{ d }}</text>
        </view>
        <!-- 日期行 -->
        <view v-for="(week, wi) in calendarGrid" :key="wi" class="cal-row">
          <view
            v-for="(cell, ci) in week" :key="ci"
            class="cal-cell"
            :class="cell ? calColorClass(cell.count) : 'cal-cell--empty'"
          >
            <text v-if="cell" class="cal-day">{{ cell.day }}</text>
            <text v-if="cell" class="cal-count">{{ cell.count }}</text>
          </view>
        </view>
      </view>
      <view class="bottom-placeholder"></view>
    </scroll-view>

    <!-- ========== 项目进展看板 ========== -->
    <scroll-view
      v-if="userStore.isAdmin && adminActiveTab === 'kanban'"
      class="content-scroll" scroll-y
      :refresher-enabled="true" :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="cal-header">
        <view class="cal-nav-btn" @tap="prevProgMonth"><text class="cal-nav-icon">‹</text></view>
        <text class="cal-month-title">{{ progMonth }}</text>
        <view class="cal-nav-btn" @tap="nextProgMonth"><text class="cal-nav-icon">›</text></view>
      </view>
      <view v-if="progLoading" class="loading-wrap"><text class="loading-text">加载中...</text></view>
      <view v-else-if="progData.length === 0" class="empty-wrap"><text class="empty-text">暂无项目数据</text></view>
      <view v-else class="prog-list">
        <view v-for="p in progData" :key="p.project" class="prog-card section-card">
          <view class="prog-top">
            <text class="prog-name">{{ p.project }}</text>
            <text class="prog-area">{{ p.area || '--' }}</text>
          </view>
          <view class="prog-numbers">
            <text class="prog-qty">完成 {{ p.completedQty }} / 需求 {{ p.requiredQty }}</text>
            <text class="prog-days">{{ p.logCount }}条·{{ p.dayCount }}天</text>
          </view>
          <view class="prog-bar-wrap">
            <view
              class="prog-bar-fill"
              :style="{ width: (p.progress ?? 0) + '%', background: progressColor(p.progress) }"
            ></view>
          </view>
          <text class="prog-pct">{{ p.progress !== null ? p.progress + '%' : '无数据' }}</text>
        </view>
      </view>
      <view class="bottom-placeholder"></view>
    </scroll-view>

    <!-- ========== 人员工作类型分布（看板内嵌） ========== -->
    <view v-if="userStore.isAdmin && adminActiveTab === 'kanban' && workTypeData.length > 0" class="section-card section-card--wt" style="margin: 0 24rpx 16rpx;">
      <text class="section-title">人员工作类型分布</text>
      <scroll-view scroll-x class="wt-scroll">
        <view class="wt-table">
          <!-- 表头 -->
          <view class="wt-row wt-row--head">
            <text class="wt-cell wt-cell--name">姓名</text>
            <text class="wt-cell wt-cell--code">工号</text>
            <text v-for="(l, i) in workTypeShort" :key="l" class="wt-cell wt-cell--val">{{ l }}</text>
            <text class="wt-cell wt-cell--val wt-cell--total">计</text>
          </view>
          <!-- 数据行 -->
          <view v-for="w in workTypeData" :key="w.userName" class="wt-row">
            <text class="wt-cell wt-cell--name">{{ w.userName }}</text>
            <text class="wt-cell wt-cell--code">{{ w.workerCode }}</text>
            <text
              v-for="(l, i) in workTypeLabels"
              :key="l"
              class="wt-cell wt-cell--val"
              :style="{ background: wtBg(w.workTypes[l], maxWorkTypeVal(l)) }"
            >{{ w.workTypes[l] || 0 }}</text>
            <text class="wt-cell wt-cell--val wt-cell--total">{{ w.total }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { reportApi } from '@/services/modules/report'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// ===== 常量 =====
const adminTabs = [
  { key: 'personal', label: '个人统计' },
  { key: 'daily', label: '全员当日' },
  { key: 'calendar', label: '日历' },
  { key: 'kanban', label: '看板' }
]

// ===== 响应式 =====
const adminActiveTab = ref('personal')
const refreshing = ref(false)
const loading = ref(false)

// 个人统计
const personalStats = ref({
  totalCount: 0,
  monthCount: 0,
  missingDays: 0,
  missingDates: [],
  delayedCount: 0,
  entryDate: ''
})

// 月度占比
const monthlySummary = ref(null)
const monthlyMonth = computed(() => {
  const d = new Date()
  return (d.getMonth() + 1) + '月'
})

// 同组日志
const teamLogs = ref([])

// 全员当日
const dailyDate = ref(formatToday())
const dailyStatus = ref(null)

// 日历热力图
const calMonth = ref(new Date().toISOString().slice(0, 7))
const calData = ref([])
const calLoading = ref(false)

// 项目进展看板
const progMonth = ref(new Date().toISOString().slice(0, 7))
const progData = ref([])
const progLoading = ref(false)

// 人员工作类型分布
const workTypeData = ref([])
const workTypeMonth = ref(new Date().toISOString().slice(0, 7))
const workTypeLoading = ref(false)

// ===== 计算属性 =====
const todayStr = computed(() => formatToday())

const entryDateDisplay = computed(() => {
  return personalStats.value.entryDate || userStore.entryDate || '--'
})

const sortedWorkers = computed(() => {
  if (!dailyStatus.value?.workers) return []
  const order = { missing: 0, substituted: 1, supplement: 2, submitted: 3, office: 4, leave: 5, rest: 6 }
  return [...dailyStatus.value.workers].sort((a, b) => {
    return (order[a.status] ?? 9) - (order[b.status] ?? 9)
  })
})

// ===== 工具函数 =====
function formatToday() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatShortDate(dateStr) {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  if (parts.length === 3) return parts[1] + '-' + parts[2]
  return dateStr
}

function formatTime(datetime) {
  if (!datetime) return ''
  const parts = String(datetime).split(' ')
  return parts[1] ? parts[1].substring(0, 5) : datetime
}

function getRatio(type) {
  if (!monthlySummary.value?.ratio) return '0%'
  return monthlySummary.value.ratio[type] || '0%'
}

// ===== 生命周期 =====
onMounted(async () => {
  loading.value = true
  await Promise.all([
    loadPersonalStats(),
    loadMonthlySummary(),
    loadTeamLogs()
  ])
  loading.value = false

  // 管理员默认加载全员当日
  if (userStore.isAdmin) {
    loadDailyStatus()
  }
})

// 下拉刷新
async function onRefresh() {
  refreshing.value = true
  if (!userStore.isAdmin || adminActiveTab.value === 'personal') {
    await Promise.all([
      loadPersonalStats(),
      loadMonthlySummary(),
      loadTeamLogs()
    ])
  } else {
    await loadDailyStatus()
  }
  refreshing.value = false
}

// ===== 数据加载 =====
async function loadPersonalStats() {
  try {
    const res = await reportApi.getStats({
      userId: userStore.userInfo?.userId
    })
    if (res.code === 0 && res.data) {
      personalStats.value = {
        totalCount: res.data.totalCount || 0,
        monthCount: res.data.monthCount || 0,
        missingDays: res.data.missingDays || 0,
        missingDates: res.data.missingDates || [],
        delayedCount: res.data.delayedCount || 0,
        entryDate: res.data.entryDate || ''
      }
    }
  } catch { /* ignore */ }
}

async function loadMonthlySummary() {
  try {
    const d = new Date()
    const month = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    const res = await reportApi.getMonthlySummary({
      userId: userStore.userInfo?.userId,
      month
    })
    if (res.code === 0 && res.data) {
      monthlySummary.value = res.data
    }
  } catch { /* ignore */ }
}

async function loadTeamLogs() {
  try {
    const res = await reportApi.getTeamLogs({
      userId: userStore.userInfo?.userId,
      days: 7
    })
    if (res.code === 0 && res.data) {
      teamLogs.value = res.data.logs || []
    }
  } catch { /* ignore */ }
}

async function loadDailyStatus() {
  try {
    const res = await reportApi.getDailyStatus({
      date: dailyDate.value
    })
    if (res.code === 0 && res.data) {
      dailyStatus.value = res.data
    }
  } catch { /* ignore */ }
}

// ===== 事件 =====
function onDailyDateChange(e) {
  dailyDate.value = e.detail.value
  loadDailyStatus()
}

// Tab 切换时自动加载对应数据
function switchAdminTab(key) {
  adminActiveTab.value = key
  if (key === 'calendar' && calData.value.length === 0) loadCalendar()
  if (key === 'kanban' && progData.value.length === 0) { loadKanban(); loadWorkTypeDist() }
}

function goToDailyOverview() {
  uni.navigateTo({ url: '/pages/admin/daily-overview/index' })
}

// ===== 日历热力图 =====
const calendarGrid = computed(() => {
  const [year, mon] = calMonth.value.split('-').map(Number)
  const firstDay = new Date(year, mon - 1, 1).getDay() // 周日0→调整为周一0
  const daysInMonth = new Date(year, mon, 0).getDate()
  const countMap = {}
  calData.value.forEach(d => { countMap[d.date] = d.count })

  const rows = []
  let week = []
  // 补齐前置空白
  const startDow = firstDay === 0 ? 6 : firstDay - 1 // 周一=0
  for (let i = 0; i < startDow; i++) { week.push(null) }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = calMonth.value + '-' + String(day).padStart(2, '0')
    const count = countMap[dateStr] || 0
    week.push({ day, date: dateStr, count })
    if (week.length === 7) { rows.push(week); week = [] }
  }
  if (week.length > 0) {
    while (week.length < 7) { week.push(null) }
    rows.push(week)
  }
  return rows
})

function calColorClass(count) {
  if (count === 0) return 'cal-cell--zero'
  if (count <= 3) return 'cal-cell--low'
  if (count <= 6) return 'cal-cell--mid'
  return 'cal-cell--high'
}

function calMonthLabel() {
  const [y, m] = calMonth.value.split('-')
  return y + '年' + parseInt(m) + '月'
}

function prevCalMonth() {
  const d = new Date(calMonth.value + '-01')
  d.setMonth(d.getMonth() - 1)
  calMonth.value = d.toISOString().slice(0, 7)
  loadCalendar()
}

function nextCalMonth() {
  const d = new Date(calMonth.value + '-01')
  d.setMonth(d.getMonth() + 1)
  calMonth.value = d.toISOString().slice(0, 7)
  loadCalendar()
}

async function loadCalendar() {
  calLoading.value = true
  try {
    const res = await reportApi.getDailyCounts(calMonth.value)
    if (res.code === 0 && res.data) {
      calData.value = res.data.data || []
    }
  } catch { calData.value = [] }
  finally { calLoading.value = false }
}

// ===== 项目进展看板 =====
async function loadKanban() {
  progLoading.value = true
  try {
    const res = await reportApi.getProjectProgress(progMonth.value)
    if (res.code === 0 && res.data) {
      progData.value = res.data.projects || []
    }
  } catch { progData.value = [] }
  finally { progLoading.value = false }
}

function prevProgMonth() {
  const d = new Date(progMonth.value + '-01')
  d.setMonth(d.getMonth() - 1)
  progMonth.value = d.toISOString().slice(0, 7)
  loadKanban()
}

function nextProgMonth() {
  const d = new Date(progMonth.value + '-01')
  d.setMonth(d.getMonth() + 1)
  progMonth.value = d.toISOString().slice(0, 7)
  loadKanban()
}

// ===== 人员工作类型分布 =====
async function loadWorkTypeDist() {
  workTypeLoading.value = true
  try {
    const res = await reportApi.getWorkerWorkTypes(workTypeMonth.value)
    if (res.code === 0 && res.data) {
      workTypeData.value = res.data.workers || []
    }
  } catch { workTypeData.value = [] }
  finally { workTypeLoading.value = false }
}

const workTypeLabels = ['工作（陆）', '工作（海）', '待工', '在途', '请假', '调休']
const workTypeShort = ['陆', '海', '待', '途', '假', '休']

function maxWorkTypeVal(key) {
  return Math.max(1, ...workTypeData.value.map(w => w.workTypes[key] || 0))
}

function wtBg(val, max) {
  if (!val) return 'transparent'
  const p = val / max
  if (p <= 0.25) return '#E8F5E9'
  if (p <= 0.5) return '#A5D6A7'
  return '#66BB6A'
}

function progressColor(pct) {
  if (pct === null || pct === undefined) return '#C0C4CC'
  if (pct < 50) return '#EF4444'
  if (pct < 80) return '#F59E0B'
  return '#22C55E'
}

function goToTeamDetail(log) {
  const id = log.reportId || log.id
  if (id) {
    uni.navigateTo({ url: '/pages/employee/report-detail/index?id=' + id })
  }
}

// ===== 状态显示辅助 =====
function getDailyStatusLabel(worker) {
  const map = {
    submitted: worker.substituteBy ? '已代填(' + worker.substituteBy + ')' : '已提交',
    supplement: '补公出',
    office: '公司日报',
    substituted: '已代填',
    leave: '请假',
    rest: '调休',
    missing: '未提交'
  }
  return map[worker.status] || worker.status
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

// ===== 页面布局 =====
.page {
  width: 100%;
  height: 100vh;
  background: $bg-color;
  display: flex;
  flex-direction: column;
}

// ===== Tab 切换栏（同 report-edit .type-tab-bar） =====
.tab-bar {
  display: flex;
  margin: $spacing-sm $spacing-base;
  background: $bg-card;
  border-radius: $radius-base;
  padding: 6rpx;
  flex-shrink: 0;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 10rpx;
  transition: background 0.2s;
}
.tab-active {
  background: $primary-color;
}
.tab-text {
  font-size: 26rpx;
  color: $text-regular;
  font-weight: 500;
}
.tab-active .tab-text {
  color: #FFFFFF;
}

// ===== 内容滚动 =====
.content-scroll {
  flex: 1;
  height: 0;
  padding: 0 $spacing-base;
}

// ===== 入场日期（卡片样式） =====
.entry-date-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx $spacing-base;
  margin-bottom: $spacing-sm;
  background: $bg-card;
  border-radius: $radius-base;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.entry-label {
  font-size: $font-sm;
  color: $text-regular;
}
.entry-value {
  font-size: $font-base;
  font-weight: 600;
  color: $primary-color;
}

// ===== 四格统计卡片 =====
.stats-grid {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
}
.stat-card {
  flex: 1;
  background: $bg-card;
  border-radius: $radius-lg;
  padding: $spacing-base $spacing-sm;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-xs;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.stat-value {
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.2;
}
.stat-label {
  font-size: $font-xs;
  color: $text-secondary;
}

// 统计数值颜色修饰符
.stat-value--primary { color: $primary-color; }
.stat-value--success { color: $success-color; }
.stat-value--danger  { color: $danger-color; }
.stat-value--warning { color: $warning-color; }

// ===== 通用卡片（同 report-edit .section-card） =====
.section-card {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: $spacing-base;
  margin-bottom: $spacing-sm;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 4rpx;
  display: block;
}
.section-subtitle {
  font-size: $font-sm;
  color: $text-secondary;
  margin-bottom: $spacing-sm;
  display: block;
}

// ===== 缺失日期标签 =====
.missing-dates {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  margin-top: $spacing-sm;
}
.missing-date-tag {
  padding: $spacing-xs $spacing-sm;
  background: #FFF0F0;
  border-radius: $radius-sm;
  font-size: $font-sm;
  color: $danger-color;
}

// ===== 月度工作占比 =====
.ratio-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}
.ratio-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}
.ratio-type {
  font-size: $font-sm;
  color: $text-regular;
  width: 120rpx;
  flex-shrink: 0;
  text-align: right;
}
.ratio-bar-wrap {
  flex: 1;
  height: 16rpx;
  background: $border-light;
  border-radius: $radius-sm;
  overflow: hidden;
}
.ratio-bar {
  height: 100%;
  background: linear-gradient(90deg, $primary-color, $primary-light);
  border-radius: $radius-sm;
  transition: width 0.5s ease;
}
.ratio-pct {
  font-size: $font-sm;
  font-weight: 600;
  color: $text-primary;
  width: 72rpx;
  text-align: right;
}
.ratio-days {
  font-size: $font-xs;
  color: $text-secondary;
  width: 44rpx;
  text-align: right;
}

// ===== 同组日志 =====
.team-log-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-top: 1rpx solid $border-light;
}
.team-log-item:first-child {
  border-top: none;
  margin-top: 4rpx;
}
.team-log-left {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}
.team-log-name {
  font-size: 26rpx;
  font-weight: 500;
  color: $text-primary;
}
.team-log-date {
  font-size: $font-sm;
  color: $text-secondary;
}
.team-log-right {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}
.team-log-type {
  font-size: $font-sm;
  color: $primary-color;
}
.team-log-arrow {
  font-size: $font-sm;
  color: $text-placeholder;
}

// ===== 表单（同 report-edit） =====
.form-group {
  margin-bottom: $spacing-base - 4rpx;
}
.form-label {
  font-size: 26rpx;
  color: $text-regular;
  font-weight: 500;
  margin-bottom: $spacing-xs;
  display: block;
}
.form-picker {
  height: 72rpx;
  padding: 0 20rpx;
  background: #F7F8FA;
  border-radius: $radius-base;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.picker-value {
  font-size: $font-base;
  color: $text-primary;
}
.picker-icon {
  font-size: $font-base;
  color: $text-secondary;
}

// ===== 汇总统计条 =====
.summary-bar {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  padding: 20rpx $spacing-base;
  background: $bg-card;
  border-radius: $radius-lg;
  margin-bottom: $spacing-sm;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.summary-item {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx $spacing-sm;
  background: #F7F8FA;
  border-radius: $radius-sm;
}
.summary-val {
  font-size: $font-base;
  font-weight: 700;
}
.summary-lbl {
  font-size: $font-xs;
  color: $text-secondary;
}

// 汇总数值颜色修饰符
.summary-val--submitted   { color: $primary-color; }
.summary-val--substituted { color: #6366F1; }
.summary-val--supplement  { color: $warning-color; }
.summary-val--office      { color: $success-color; }
.summary-val--leave       { color: #8B5CF6; }
.summary-val--rest        { color: #EC4899; }
.summary-val--missing     { color: $danger-color; }
.summary-val--zero        { color: $text-secondary; }

// ===== 员工列表 =====
.worker-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}
.worker-card {
  display: flex;
  align-items: center;
  padding: 20rpx $spacing-base;
  background: $bg-card;
  border-radius: $radius-base;
  gap: $spacing-sm;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.worker-missing {
  border: 1rpx solid #FFCDD2;
  background: #FFF5F5;
}
.worker-card-left {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  width: 140rpx;
  flex-shrink: 0;
}
.worker-card-name {
  font-size: 26rpx;
  font-weight: 600;
  color: $text-primary;
}
.worker-card-code {
  font-size: $font-xs;
  color: $text-secondary;
}
.worker-card-mid {
  flex: 1;
  min-width: 0;
}
.worker-card-project {
  font-size: $font-sm;
  color: $text-regular;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.worker-card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
  flex-shrink: 0;
}
.worker-card-time {
  font-size: $font-xs - 2rpx;
  color: $text-placeholder;
}

// ===== 状态徽章（同 report-detail/report-edit 标签体系） =====
.worker-status-badge {
  padding: 4rpx 12rpx;
  border-radius: $radius-sm;
}
.worker-status-text {
  font-size: $font-xs;
  font-weight: 500;
}

// 徽章颜色修饰符（统一标签体系）
.badge--submitted   { background: #EFFDF5; color: $success-color; }
.badge--supplement  { background: #FFF8E1; color: $warning-color; }
.badge--office      { background: $primary-bg; color: $primary-color; }
.badge--substituted { background: #FFF0F5; color: #6366F1; }
.badge--leave       { background: #F5F3FF; color: #8B5CF6; }
.badge--rest        { background: #FDF2F8; color: #EC4899; }
.badge--missing     { background: #FFF0F0; color: $danger-color; }

// ===== 空状态 =====
.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}
.empty-text {
  font-size: $font-base;
  color: $text-secondary;
}

.bottom-placeholder {
  height: 40rpx;
}

// ===== 日历热力图 =====
.cal-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-base;
  padding: $spacing-sm 0;
}
.cal-nav-btn {
  width: 56rpx; height: 56rpx;
  display: flex; align-items: center; justify-content: center;
  background: $bg-card; border-radius: $radius-base;
}
.cal-nav-btn:active { background: #EBEDF0; }
.cal-nav-icon { font-size: 36rpx; color: $text-regular; line-height: 1; }
.cal-month-title {
  font-size: 30rpx; font-weight: 600; color: $text-primary;
  min-width: 200rpx; text-align: center;
}

.cal-legend {
  display: flex; gap: $spacing-sm; justify-content: center;
  padding: 0 0 $spacing-sm 0;
}
.cal-legend-item {
  display: flex; align-items: center; gap: 4rpx;
  font-size: 20rpx; color: $text-secondary;
}
.cal-dot {
  width: 20rpx; height: 20rpx; border-radius: 4rpx;
}
.cal-dot--zero { background: #F0F0F0; }
.cal-dot--low  { background: #C5DFFF; }
.cal-dot--mid  { background: #7BB5F0; }
.cal-dot--high { background: #3D8DE0; }

.cal-grid {
  background: $bg-card; border-radius: $radius-lg;
  padding: $spacing-sm; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}
.cal-row {
  display: flex;
}
.cal-row--head {
  margin-bottom: 4rpx;
}
.cal-head-cell {
  flex: 1; text-align: center;
  font-size: 22rpx; color: $text-secondary; padding: 8rpx 0;
}
.cal-cell {
  flex: 1; aspect-ratio: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-radius: 6rpx; margin: 2rpx;
}
.cal-cell--empty { background: transparent; }
.cal-cell--zero  { background: #F0F0F0; }
.cal-cell--low   { background: #C5DFFF; }
.cal-cell--mid   { background: #7BB5F0; }
.cal-cell--high  { background: #3D8DE0; }
.cal-day {
  font-size: 22rpx; font-weight: 500; color: $text-primary; line-height: 1.2;
}
.cal-count {
  font-size: 18rpx; color: $text-regular; line-height: 1.2;
}

// ===== 项目进展看板 =====
.prog-list {
  display: flex; flex-direction: column; gap: $spacing-sm;
}
.prog-card {
  margin-bottom: 0 !important;
}
.prog-top {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12rpx;
}
.prog-name {
  font-size: 28rpx; font-weight: 600; color: $text-primary;
}
.prog-area {
  font-size: 22rpx; color: $text-secondary;
  background: $bg-form; padding: 2rpx 12rpx; border-radius: $radius-sm;
}
.prog-numbers {
  display: flex; justify-content: space-between; margin-bottom: 12rpx;
}
.prog-qty {
  font-size: $font-sm; color: $text-regular;
}
.prog-days {
  font-size: $font-xs; color: $text-secondary;
}
.prog-bar-wrap {
  height: 16rpx; background: $border-light; border-radius: $radius-sm;
  overflow: hidden; margin-bottom: 8rpx;
}
.prog-bar-fill {
  height: 100%; border-radius: $radius-sm; transition: width 0.5s ease;
  min-width: 2rpx;
}
.prog-pct {
  font-size: $font-sm; font-weight: 600; color: $text-primary; text-align: right; display: block;
}

// ===== 人员工作类型分布（横向滚动表格） =====
.wt-scroll {
  width: 100%;
  white-space: nowrap;
}
.wt-table {
  display: inline-flex;
  flex-direction: column;
  min-width: 100%;
}
.wt-row {
  display: flex;
  border-bottom: 1rpx solid $border-light;
}
.wt-row--head {
  background: #F7F8FA;
  border-radius: $radius-sm $radius-sm 0 0;
}
.wt-cell {
  padding: 12rpx 8rpx;
  font-size: 22rpx;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wt-cell--name {
  width: 100rpx;
  flex-shrink: 0;
  font-weight: 500;
  color: $text-primary;
  justify-content: flex-start;
  padding-left: 16rpx;
}
.wt-cell--code {
  width: 80rpx;
  flex-shrink: 0;
  color: $text-secondary;
}
.wt-cell--val {
  width: 56rpx;
  flex-shrink: 0;
  border-radius: 4rpx;
  margin: 2rpx;
}
.wt-cell--total {
  font-weight: 700;
  color: $primary-color;
}
</style>
