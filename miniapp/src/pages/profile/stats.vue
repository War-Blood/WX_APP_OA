<template>
  <view class="page">
    <NavBar title="公出统计" :showBack="true" />

    <!-- Tab 栏 -->
    <view v-if="userStore.isAdmin" class="tab-bar">
      <view v-for="t in tabs" :key="t.key" class="tab-item" @tap="switchTab(t.key)">
        <text class="tab-text" :class="{ 'tab-text--active': activeTab === t.key }">{{ t.label }}</text>
        <view v-if="activeTab === t.key" class="tab-indicator" />
      </view>
    </view>

    <!-- 个人统计 -->
    <scroll-view v-if="showTab('personal')" class="content-scroll" scroll-y :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh">
      <view class="entry-bar">
        <text class="entry-label">入场日期</text>
        <text class="entry-value">{{ entryDateDisplay }}</text>
      </view>
      <view class="stat-grid">
        <view v-for="s in statCards" :key="s.key" class="stat-card">
          <text class="stat-num" :class="s.colorClass">{{ s.value }}</text>
          <text class="stat-lbl">{{ s.label }}</text>
        </view>
      </view>
      <view v-if="personalStats.missingDates?.length" class="card">
        <text class="card-title">缺失日期（最近30条）</text>
        <view class="missing-tags">
          <text v-for="d in personalStats.missingDates" :key="d" class="missing-tag">{{ fmtShort(d) }}</text>
        </view>
      </view>
      <view v-if="monthlySummary" class="card">
        <text class="card-title">{{ monthlyMonth }}工作占比</text>
        <text class="card-sub">已填报 {{ monthlySummary.totalSubmitted }} 天</text>
        <view class="ratio-list">
          <view v-for="(days, type) in monthlySummary.breakdown" :key="type" class="ratio-row">
            <text class="ratio-label">{{ type }}</text>
            <view class="ratio-track"><view class="ratio-fill" :style="{ width: getRatio(type) }" /></view>
            <text class="ratio-pct">{{ getRatio(type) }}</text>
            <text class="ratio-day">{{ days }}天</text>
          </view>
        </view>
      </view>
      <view v-if="teamLogs.length" class="card">
        <text class="card-title">同组日志（最近7天）</text>
        <view v-for="log in teamLogs" :key="log.id || log.reportId" class="log-row" @tap="goTeamDetail(log)">
          <view class="log-left">
            <text class="log-name">{{ log.userName || log.submitterName }}</text>
            <text class="log-date">{{ fmtShort(log.reportDate || log.date) }}</text>
          </view>
          <text class="log-type">{{ log.workType || log.todayWorkType || '-' }}</text>
        </view>
      </view>
      <view class="spacer" />
    </scroll-view>

    <!-- 全员当日 -->
    <view v-if="showTab('daily')" class="content-scroll" style="display:flex;align-items:center;justify-content:center">
      <view class="card" style="text-align:center;padding:64rpx 32rpx">
        <text class="card-title">昨日工作一览</text>
        <text style="font-size:24rpx;color:#999;display:block;margin:16rpx 0 24rpx">查看所有在职人员昨日的工作状态与项目分布</text>
        <view class="btn-primary" @tap="goDailyOverview"><text class="btn-primary-text">查看详情</text></view>
      </view>
    </view>

    <!-- 日历热力图 -->
    <scroll-view v-if="showTab('calendar')" class="content-scroll" scroll-y :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh">
      <view class="month-nav">
        <view class="nav-btn" @tap="calPrev"><text class="nav-icon">‹</text></view>
        <text class="nav-title">{{ calMonthLabel }}</text>
        <view class="nav-btn" @tap="calNext"><text class="nav-icon">›</text></view>
      </view>
      <view class="legend">
        <view v-for="l in calLegend" :key="l.label" class="legend-item">
          <view class="legend-dot" :style="{ background: l.color }" /><text>{{ l.label }}</text>
        </view>
      </view>
      <view v-if="calLoading" class="loading"><text>加载中...</text></view>
      <view v-else class="cal-grid">
        <view class="cal-row cal-head">
          <text v-for="d in dayHeaders" :key="d" class="cal-hd">{{ d }}</text>
        </view>
        <view v-for="(week, wi) in calendarGrid" :key="wi" class="cal-row">
          <view v-for="(cell, ci) in week" :key="ci" class="cal-cell" :class="cell ? calClass(cell.count) : 'cal-empty'">
            <template v-if="cell">
              <text class="cal-d">{{ cell.day }}</text>
              <text class="cal-n">{{ cell.count }}</text>
            </template>
          </view>
        </view>
      </view>
      <view class="spacer" />
    </scroll-view>

    <!-- 项目进展 -->
    <scroll-view v-if="showTab('projects')" class="content-scroll" scroll-y :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh">
      <view class="month-nav">
        <view class="nav-btn" @tap="projPrev"><text class="nav-icon">‹</text></view>
        <text class="nav-title">{{ projMonth }}</text>
        <view class="nav-btn" @tap="projNext"><text class="nav-icon">›</text></view>
      </view>
      <view v-if="projLoading" class="loading"><text>加载中...</text></view>
      <view v-else-if="!projData.length" class="empty"><text>暂无项目数据</text></view>
      <view v-else class="proj-list">
        <view v-for="p in projData" :key="p.project" class="card proj-card">
          <view class="proj-head">
            <text class="proj-name">{{ p.project }}</text>
            <text class="proj-tag">{{ p.area || '--' }}</text>
          </view>
          <view class="proj-meta">
            <text>完成 {{ p.completedQty }} / 需求 {{ p.requiredQty }}</text>
            <text class="proj-info">{{ p.logCount }}条 · {{ p.dayCount }}天</text>
          </view>
          <view class="proj-track"><view class="proj-fill" :style="{ width: (p.progress ?? 0) + '%', background: projColor(p.progress) }" /></view>
          <text class="proj-pct">{{ p.progress !== null ? p.progress + '%' : '无数据' }}</text>
        </view>
      </view>
      <view class="spacer" />
    </scroll-view>

    <!-- 人员分布 -->
    <scroll-view v-if="showTab('workers')" class="content-scroll" scroll-y :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh">
      <!-- 工作类型表 -->
      <view v-if="workTypeData.length" class="card">
        <text class="card-title">工作类型分布（{{ workTypeMonth }}）</text>
        <scroll-view scroll-x class="wt-scroll">
          <view class="wt-table">
            <view class="wt-row wt-head">
              <text class="wt-c wt-name">姓名</text>
              <text class="wt-c wt-code">工号</text>
              <text v-for="l in wtShort" :key="l" class="wt-c wt-val">{{ l }}</text>
              <text class="wt-c wt-val wt-total">计</text>
            </view>
            <view v-for="w in workTypeData" :key="w.userName" class="wt-row">
              <text class="wt-c wt-name">{{ w.userName }}</text>
              <text class="wt-c wt-code">{{ w.workerCode }}</text>
              <text v-for="l in wtLabels" :key="l" class="wt-c wt-val" :style="{ background: wtCellBg(w.workTypes[l], wtMax(l)) }">{{ w.workTypes[l] || 0 }}</text>
              <text class="wt-c wt-val wt-total">{{ w.total }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 省份排行 -->
      <view v-if="areaData.length" class="card" style="margin-top:16rpx">
        <text class="card-title">区域分布（省份）</text>
        <view class="area-list">
          <view v-for="(p, i) in areaData" :key="p.name" class="area-row">
            <view class="area-left">
              <text class="area-r">{{ i + 1 }}</text>
              <text class="area-n">{{ p.name }}</text>
            </view>
            <view class="area-right">
              <text class="area-c">{{ p.count }}人</text>
              <text class="area-proj">{{ p.projects?.length || 0 }}项目</text>
            </view>
          </view>
        </view>
      </view>
      <view class="spacer" />
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { reportApi } from '@/services/modules/report'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// ============ Tabs ============
const tabs = [
  { key: 'personal', label: '个人统计' },
  { key: 'daily',    label: '全员当日' },
  { key: 'calendar', label: '日历' },
  { key: 'projects', label: '项目进展' },
  { key: 'workers',  label: '人员分布' }
]
const activeTab = ref('personal')
const refreshing = ref(false)

function showTab(k) { return !userStore.isAdmin ? k === 'personal' : activeTab.value === k }

function switchTab(k) {
  activeTab.value = k
  if (k === 'calendar' && !calData.value.length) loadCalendar()
  if (k === 'projects' && !projData.value.length) loadProjects()
  if (k === 'workers' && !workTypeData.value.length) { loadWorkTypes(); loadAreas() }
}

// ============ 工具函数 ============
const fmt = d => { if (!d) return ''; const s = String(d).slice(0, 10); return s }
const fmtShort = s => { if (!s) return ''; const p = String(s).split('-'); return p.length === 3 ? p[1] + '-' + p[2] : s }
const nowMonth = () => new Date().toISOString().slice(0, 7)
const nowYearMonth = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') }
const prevM = m => { const d = new Date(m + '-01'); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7) }
const nextM = m => { const d = new Date(m + '-01'); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 7) }

// ============ 个人统计 ============
const personalStats = ref({ totalCount:0, monthCount:0, missingDays:0, missingDates:[], delayedCount:0, entryDate:'' })
const monthlySummary = ref(null)
const teamLogs = ref([])
const monthlyMonth = computed(() => (new Date().getMonth() + 1) + '月')
const entryDateDisplay = computed(() => personalStats.value.entryDate || userStore.entryDate || '--')

const statCards = computed(() => {
  const s = personalStats.value
  return [
    { key:'total',   label:'累计条数', value: s.totalCount,   colorClass:'stat-num--primary' },
    { key:'month',   label:'当月条数', value: s.monthCount,   colorClass:'stat-num--success' },
    { key:'missing', label:'缺失天数', value: s.missingDays,  colorClass: s.missingDays > 0 ? 'stat-num--danger' : 'stat-num--success' },
    { key:'delay',   label:'延迟条数', value: s.delayedCount, colorClass: s.delayedCount > 0 ? 'stat-num--warning' : 'stat-num--success' }
  ]
})

function getRatio(type) { return monthlySummary.value?.ratio?.[type] || '0%' }

// ============ 日历热力图 ============
const calMonth = ref(nowMonth())
const calData = ref([])
const calLoading = ref(false)
const dayHeaders = ['一','二','三','四','五','六','日']
const calLegend = [{ label:'0', color:'#F0F0F0' },{ label:'1-3', color:'#C5DFFF' },{ label:'4-6', color:'#7BB5F0' },{ label:'7+', color:'#3D8DE0' }]
const calMonthLabel = computed(() => { const [y,m] = calMonth.value.split('-'); return y + '年' + parseInt(m) + '月' })

const calendarGrid = computed(() => {
  const [y, m] = calMonth.value.split('-').map(Number)
  const startDow = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const days = new Date(y, m, 0).getDate()
  const map = {}; calData.value.forEach(d => { map[d.date] = d.count })
  const rows = []; let week = []
  for (let i = 0; i < startDow; i++) week.push(null)
  for (let d = 1; d <= days; d++) {
    const ds = calMonth.value + '-' + String(d).padStart(2, '0')
    week.push({ day: d, date: ds, count: map[ds] || 0 })
    if (week.length === 7) { rows.push(week); week = [] }
  }
  if (week.length) { while (week.length < 7) week.push(null); rows.push(week) }
  return rows
})

function calClass(n) { return n === 0 ? 'cal-zero' : n <= 3 ? 'cal-low' : n <= 6 ? 'cal-mid' : 'cal-high' }
function calPrev() { calMonth.value = prevM(calMonth.value); loadCalendar() }
function calNext() { calMonth.value = nextM(calMonth.value); loadCalendar() }

// ============ 项目进展 ============
const projMonth = ref(nowMonth())
const projData = ref([])
const projLoading = ref(false)
function projPrev() { projMonth.value = prevM(projMonth.value); loadProjects() }
function projNext() { projMonth.value = nextM(projMonth.value); loadProjects() }
function projColor(p) { if (p === null) return '#C0C4CC'; if (p < 50) return '#EF4444'; if (p < 80) return '#F59E0B'; return '#22C55E' }

// ============ 人员分布 ============
const workTypeData = ref([])
const workTypeMonth = ref(nowMonth())
const wtLabels = ['工作（陆）','工作（海）','待工','在途','请假','调休']
const wtShort = ['陆','海','待','途','假','休']
function wtMax(k) { return Math.max(1, ...workTypeData.value.map(w => w.workTypes[k] || 0)) }
function wtCellBg(v, max) { if (!v) return 'transparent'; const p = v / max; return p <= .25 ? '#E8F5E9' : p <= .5 ? '#A5D6A7' : '#66BB6A' }

const areaData = ref([])

// ============ 数据加载 ============
async function loadPersonal() {
  try {
    const res = await reportApi.getStats({ userId: userStore.userInfo?.userId })
    if (res.code === 0 && res.data) {
      const d = res.data
      personalStats.value = { totalCount: d.totalCount||0, monthCount: d.monthCount||0, missingDays: d.missingDays||0, missingDates: d.missingDates||[], delayedCount: d.delayedCount||0, entryDate: d.entryDate||'' }
    }
  } catch { /* */ }
}
async function loadMonthly() {
  try {
    const res = await reportApi.getMonthlySummary({ userId: userStore.userInfo?.userId, month: nowYearMonth() })
    if (res.code === 0 && res.data) monthlySummary.value = res.data
  } catch { /* */ }
}
async function loadTeamLogs() {
  try { const res = await reportApi.getTeamLogs({ userId: userStore.userInfo?.userId, days: 7 }); if (res.code === 0 && res.data) teamLogs.value = res.data.logs || [] } catch { /* */ }
}
async function loadCalendar() {
  calLoading.value = true
  try { const res = await reportApi.getDailyCounts(calMonth.value); if (res.code === 0 && res.data) calData.value = res.data.data || [] } catch { calData.value = [] }
  finally { calLoading.value = false }
}
async function loadProjects() {
  projLoading.value = true
  try { const res = await reportApi.getProjectProgress(projMonth.value); if (res.code === 0 && res.data) projData.value = res.data.projects || [] } catch { projData.value = [] }
  finally { projLoading.value = false }
}
async function loadWorkTypes() {
  try { const res = await reportApi.getWorkerWorkTypes(workTypeMonth.value); if (res.code === 0 && res.data) workTypeData.value = res.data.workers || [] } catch { workTypeData.value = [] }
}
async function loadAreas() {
  try { const res = await reportApi.getAreaDistribution(); if (res.code === 0 && res.data) areaData.value = res.data.provinces || [] } catch { areaData.value = [] }
}

async function onRefresh() {
  refreshing.value = true
  if (activeTab.value === 'personal') await Promise.all([loadPersonal(), loadMonthly(), loadTeamLogs()])
  else if (activeTab.value === 'calendar') await loadCalendar()
  else if (activeTab.value === 'projects') await loadProjects()
  else if (activeTab.value === 'workers') await Promise.all([loadWorkTypes(), loadAreas()])
  refreshing.value = false
}

// ============ 导航 ============
function goDailyOverview() { uni.navigateTo({ url: '/pages/admin/daily-overview/index' }) }
function goTeamDetail(log) { const id = log.reportId || log.id; if (id) uni.navigateTo({ url: '/pages/employee/report-detail/index?id=' + id }) }

// ============ 初始化 ============
onMounted(async () => {
  await Promise.all([loadPersonal(), loadMonthly(), loadTeamLogs()])
})
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

// ===== 布局 =====
.page { width:100%; height:100vh; background:$bg-color; display:flex; flex-direction:column; }
.content-scroll { flex:1; height:0; padding:0 $spacing-base; }

// ===== Tab =====
.tab-bar { display:flex; background:#FFFFFF; flex-shrink:0; }
.tab-item { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; height:88rpx; position:relative; }
.tab-text { font-size:28rpx; color:$text-secondary; }
.tab-text--active { color:$primary-color; font-weight:600; }
.tab-indicator { position:absolute; bottom:8rpx; width:48rpx; height:4rpx; background:$primary-color; border-radius:2rpx; }

// ===== 卡片 =====
.card { background:$bg-card; border-radius:$radius-lg; padding:$spacing-base; margin-bottom:$spacing-sm; box-shadow:0 2rpx 12rpx rgba(0,0,0,.04); }
.card-title { font-size:30rpx; font-weight:600; color:$text-primary; display:block; margin-bottom:8rpx; }
.card-sub { font-size:$font-sm; color:$text-secondary; display:block; margin-bottom:$spacing-sm; }

// ===== 入场日期 =====
.entry-bar { display:flex; align-items:center; justify-content:space-between; padding:20rpx $spacing-base; margin-bottom:$spacing-sm; background:$bg-card; border-radius:$radius-base; box-shadow:0 2rpx 12rpx rgba(0,0,0,.04); }
.entry-label { font-size:$font-sm; color:$text-regular; }
.entry-value { font-size:$font-base; font-weight:600; color:$primary-color; }

// ===== 四格统计 =====
.stat-grid { display:flex; gap:$spacing-sm; margin-bottom:$spacing-sm; }
.stat-card { flex:1; background:$bg-card; border-radius:$radius-lg; padding:20rpx 12rpx; display:flex; flex-direction:column; align-items:center; gap:6rpx; box-shadow:0 2rpx 12rpx rgba(0,0,0,.04); }
.stat-num { font-size:38rpx; font-weight:700; line-height:1.2; }
.stat-lbl { font-size:$font-xs; color:$text-secondary; }
.stat-num--primary { color:$primary-color; }
.stat-num--success { color:$success-color; }
.stat-num--danger  { color:$danger-color; }
.stat-num--warning { color:$warning-color; }

// ===== 缺失日期 =====
.missing-tags { display:flex; flex-wrap:wrap; gap:$spacing-xs; margin-top:$spacing-sm; }
.missing-tag { padding:6rpx 14rpx; background:#FFF0F0; border-radius:$radius-sm; font-size:$font-sm; color:$danger-color; }

// ===== 月度占比 =====
.ratio-list { display:flex; flex-direction:column; gap:14rpx; }
.ratio-row { display:flex; align-items:center; gap:$spacing-sm; }
.ratio-label { font-size:$font-sm; color:$text-regular; width:120rpx; flex-shrink:0; text-align:right; }
.ratio-track { flex:1; height:14rpx; background:$border-light; border-radius:7rpx; overflow:hidden; }
.ratio-fill { height:100%; background:linear-gradient(90deg,$primary-color,$primary-light); border-radius:7rpx; transition:width .5s; }
.ratio-pct { font-size:$font-sm; font-weight:600; color:$text-primary; width:68rpx; text-align:right; }
.ratio-day { font-size:$font-xs; color:$text-secondary; width:40rpx; text-align:right; }

// ===== 同组日志 =====
.log-row { display:flex; align-items:center; justify-content:space-between; padding:18rpx 0; border-top:1rpx solid $border-light; }
.log-row:first-child { border-top:none; margin-top:4rpx; }
.log-left { display:flex; align-items:center; gap:$spacing-sm; }
.log-name { font-size:26rpx; font-weight:500; color:$text-primary; }
.log-date { font-size:$font-sm; color:$text-secondary; }
.log-type { font-size:$font-sm; color:$primary-color; }

// ===== 按钮 =====
.btn-primary { height:88rpx; display:flex; align-items:center; justify-content:center; border-radius:44rpx; background:linear-gradient(135deg,$primary-color,$primary-light); }
.btn-primary:active { opacity:.9; }
.btn-primary-text { font-size:30rpx; font-weight:600; color:#fff; }

// ===== 月份导航 =====
.month-nav { display:flex; align-items:center; justify-content:center; gap:$spacing-base; padding:$spacing-sm 0; }
.nav-btn { width:52rpx; height:52rpx; display:flex; align-items:center; justify-content:center; background:$bg-card; border-radius:$radius-base; }
.nav-btn:active { background:#EBEDF0; }
.nav-icon { font-size:34rpx; color:$text-regular; line-height:1; }
.nav-title { font-size:28rpx; font-weight:600; color:$text-primary; min-width:180rpx; text-align:center; }

// ===== 图例 =====
.legend { display:flex; gap:20rpx; justify-content:center; padding-bottom:$spacing-sm; }
.legend-item { display:flex; align-items:center; gap:4rpx; font-size:20rpx; color:$text-secondary; }
.legend-dot { width:18rpx; height:18rpx; border-radius:4rpx; }

// ===== 日历网格 =====
.cal-grid { background:$bg-card; border-radius:$radius-lg; padding:12rpx; box-shadow:0 2rpx 12rpx rgba(0,0,0,.04); }
.cal-row { display:flex; }
.cal-head { margin-bottom:2rpx; }
.cal-hd { flex:1; text-align:center; font-size:20rpx; color:$text-secondary; padding:6rpx 0; }
.cal-cell { flex:1; aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:4rpx; margin:2rpx; }
.cal-empty { background:transparent; }
.cal-zero { background:#F0F0F0; }
.cal-low  { background:#C5DFFF; }
.cal-mid  { background:#7BB5F0; }
.cal-high { background:#3D8DE0; }
.cal-d { font-size:20rpx; font-weight:500; color:$text-primary; line-height:1.2; }
.cal-n { font-size:16rpx; color:$text-regular; line-height:1.2; }

// ===== 项目进展 =====
.proj-list { display:flex; flex-direction:column; gap:$spacing-sm; }
.proj-card { margin-bottom:0 !important; }
.proj-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10rpx; }
.proj-name { font-size:28rpx; font-weight:600; color:$text-primary; }
.proj-tag { font-size:20rpx; color:$text-secondary; background:$bg-form; padding:2rpx 10rpx; border-radius:$radius-sm; }
.proj-meta { display:flex; justify-content:space-between; margin-bottom:10rpx; font-size:$font-sm; color:$text-regular; }
.proj-info { color:$text-secondary; font-size:$font-xs; }
.proj-track { height:14rpx; background:$border-light; border-radius:7rpx; overflow:hidden; margin-bottom:6rpx; }
.proj-fill { height:100%; border-radius:7rpx; transition:width .5s; min-width:2rpx; }
.proj-pct { font-size:$font-sm; font-weight:600; color:$text-primary; text-align:right; display:block; }

// ===== 工作类型表格 =====
.wt-scroll { width:100%; white-space:nowrap; }
.wt-table { display:inline-flex; flex-direction:column; min-width:100%; }
.wt-row { display:flex; border-bottom:1rpx solid $border-light; }
.wt-head { background:#F7F8FA; border-radius:$radius-sm $radius-sm 0 0; }
.wt-c { padding:10rpx 6rpx; font-size:20rpx; text-align:center; display:flex; align-items:center; justify-content:center; }
.wt-name { width:100rpx; flex-shrink:0; font-weight:500; color:$text-primary; justify-content:flex-start; padding-left:12rpx; }
.wt-code { width:72rpx; flex-shrink:0; color:$text-secondary; }
.wt-val { width:52rpx; flex-shrink:0; border-radius:4rpx; margin:1rpx; }
.wt-total { font-weight:700; color:$primary-color; }

// ===== 省份排行 =====
.area-list { display:flex; flex-direction:column; }
.area-row { display:flex; align-items:center; justify-content:space-between; padding:14rpx 0; border-top:1rpx solid $border-light; }
.area-row:first-child { border-top:none; }
.area-left { display:flex; align-items:center; gap:14rpx; }
.area-r { font-size:$font-sm; font-weight:700; color:$text-secondary; width:30rpx; text-align:center; }
.area-n { font-size:26rpx; font-weight:500; color:$text-primary; }
.area-right { display:flex; align-items:center; gap:14rpx; }
.area-c { font-size:24rpx; font-weight:600; color:$primary-color; }
.area-proj { font-size:$font-xs; color:$text-secondary; background:$bg-form; padding:2rpx 8rpx; border-radius:$radius-sm; }

// ===== 通用 =====
.loading, .empty { display:flex; align-items:center; justify-content:center; padding:160rpx 0; font-size:$font-base; color:$text-secondary; }
.spacer { height:40rpx; }
</style>
