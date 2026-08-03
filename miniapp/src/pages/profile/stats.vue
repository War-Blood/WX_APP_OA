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
    <view v-if="showTab('daily')" class="daily-tab">
      <!-- 日期导航 + 今日/明日切换 -->
      <view class="date-bar">
        <view class="date-nav-btn" @tap="dailyPrevDay"><text class="date-nav-icon">‹</text></view>
        <picker mode="date" :value="dailyDate" :end="todayStr" @change="onDailyDateChange">
          <view class="date-picker">
            <text class="date-text">{{ dailyDateDisplay }}</text>
            <text class="date-arrow">▾</text>
          </view>
        </picker>
        <view class="date-nav-btn" :class="{ 'date-nav-disabled': dailyDate === todayStr }" @tap="dailyNextDay">
          <text class="date-nav-icon">›</text>
        </view>
        <view class="daily-seg">
          <view class="daily-seg-item" :class="{ 'daily-seg-item--active': dailyMode === 'today' }" @tap="switchDailyMode('today')">
            <text class="daily-seg-text">今日</text>
          </view>
          <view class="daily-seg-item" :class="{ 'daily-seg-item--active': dailyMode === 'tomorrow' }" @tap="switchDailyMode('tomorrow')">
            <text class="daily-seg-text">明日</text>
          </view>
        </view>
      </view>

      <!-- 今日模式:摘要统计条 -->
      <view v-if="dailyMode === 'today' && dailyResponse" class="summary-bar">
        <view class="summary-item summary-item--submitted">
          <text class="summary-val">{{ dailySubmitted }}</text>
          <text class="summary-lbl">已提交</text>
        </view>
        <view class="summary-item summary-item--missing">
          <text class="summary-val" :class="{ 'summary-val--danger': dailyMissing > 0 }">{{ dailyMissing }}</text>
          <text class="summary-lbl">缺失</text>
        </view>
        <view class="summary-item summary-item--total">
          <text class="summary-val">{{ dailySubmitted + dailyMissing }}</text>
          <text class="summary-lbl">总人数</text>
        </view>
      </view>

      <!-- 今日模式:加载/空状态 -->
      <view v-if="dailyMode === 'today' && dailyLoading" class="loading"><text>加载中...</text></view>
      <view v-else-if="dailyMode === 'today' && !dailyResponse" class="empty"><text>暂无数据</text></view>

      <!-- 今日模式:内容列表 -->
      <scroll-view v-else-if="dailyMode === 'today'" class="daily-scroll" scroll-y>
        <!-- 缺失人员 -->
        <view v-if="dailyMissingWorkers.length" class="daily-section">
          <text class="section-header section-header--missing">未提交 ({{ dailyMissingWorkers.length }})</text>
          <view class="daily-card-list">
            <view v-for="w in dailyMissingWorkers" :key="w.userId" class="worker-card worker-card--missing">
              <view class="card-left">
                <text class="card-name">{{ w.userName }}</text>
                <text class="card-code">{{ w.workerCode || '' }}</text>
              </view>
              <text class="card-status-tag tag--missing">未提交</text>
            </view>
          </view>
        </view>

        <!-- 补公出 -->
        <view v-if="dailySupplementWorkers.length" class="daily-section">
          <text class="section-header section-header--supplement">补公出 ({{ dailySupplementWorkers.length }})</text>
          <view class="daily-card-list">
            <view v-for="w in dailySupplementWorkers" :key="w.userId" class="worker-card" :class="'worker-card--' + w.status" @tap="goDailyDetail(w)">
              <view class="card-left">
                <text class="card-name">{{ w.userName }}</text>
                <text class="card-code">{{ w.workerCode || '' }}</text>
              </view>
              <view class="card-mid">
                <text v-if="w.project" class="card-project">{{ w.project }}</text>
                <text v-if="w.area" class="card-area">{{ w.area }}</text>
              </view>
              <view class="card-right">
                <text class="card-status-tag tag--supplement">补公出</text>
                <text v-if="w.workType" class="card-work-type">{{ w.workType }}</text>
                <text v-if="w.submittedAt" class="card-time">{{ fmtTime(w.submittedAt) }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 请假/调休 -->
        <view v-if="dailyLeaveWorkers.length" class="daily-section">
          <text class="section-header section-header--leave">请假/调休 ({{ dailyLeaveWorkers.length }})</text>
          <view class="daily-card-list">
            <view v-for="w in dailyLeaveWorkers" :key="w.userId" class="worker-card worker-card--leave">
              <view class="card-left">
                <text class="card-name">{{ w.userName }}</text>
                <text class="card-code">{{ w.workerCode || '' }}</text>
              </view>
              <text class="card-status-tag" :class="'tag--' + w.status">{{ statusLabel(w.status) }}</text>
            </view>
          </view>
        </view>

        <!-- 已提交 -->
        <view v-if="dailyActiveWorkers.length" class="daily-section">
          <text class="section-header section-header--active">已提交 ({{ dailyActiveWorkers.length }})</text>
          <view class="daily-card-list">
            <view v-for="w in dailyActiveWorkers" :key="w.userId" class="worker-card" :class="'worker-card--' + w.status" @tap="goDailyDetail(w)">
              <view class="card-left">
                <text class="card-name">{{ w.userName }}</text>
                <text class="card-code">{{ w.workerCode || '' }}</text>
              </view>
              <view class="card-mid">
                <text v-if="w.project" class="card-project">{{ w.project }}</text>
                <text v-if="w.area" class="card-area">{{ w.area }}</text>
              </view>
              <view class="card-right">
                <text class="card-status-tag" :class="'tag--' + w.status">{{ statusLabel(w.status) }}</text>
                <text v-if="w.workType" class="card-work-type">{{ w.workType }}</text>
                <text v-if="w.submittedAt" class="card-time">{{ fmtTime(w.submittedAt) }}</text>
              </view>
            </view>
          </view>
        </view>
        <view class="spacer" />
      </scroll-view>

      <!-- 明日模式:加载/空状态 -->
      <view v-if="dailyMode === 'tomorrow' && tomorrowLoading" class="loading"><text>加载中...</text></view>
      <view v-else-if="dailyMode === 'tomorrow' && !tomorrowResponse" class="empty"><text>暂无数据</text></view>

      <!-- 明日模式:分组列表 -->
      <scroll-view v-else-if="dailyMode === 'tomorrow'" class="daily-scroll" scroll-y>
        <view v-for="g in tomorrowGroups" :key="g.label" class="daily-section">
          <text class="section-header section-header--tomorrow">{{ g.label }} ({{ g.workers.length }})</text>
          <view class="daily-card-list">
            <view v-for="w in g.workers" :key="w.userId" class="worker-card worker-card--tomorrow" @tap="goDailyDetail(w)">
              <view class="card-left">
                <text class="card-name">{{ w.userName }}</text>
                <text v-if="w.project" class="card-project">{{ w.project }}</text>
              </view>
              <view class="card-right">
                <text v-if="w.tomorrowWorkType" class="card-work-type">{{ w.tomorrowWorkType }}</text>
                <text v-else class="card-work-type card-work-type--empty">未填写</text>
              </view>
            </view>
          </view>
        </view>
        <view class="spacer" />
      </scroll-view>
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
          <view v-for="(cell, ci) in week" :key="ci" class="cal-cell" :class="calClass(cell)">
            <template v-if="cell">
              <text class="cal-d">{{ cell.day }}</text>
              <text class="cal-n">{{ cell.submitted }}/{{ cell.total }}</text>
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
        <view v-for="p in projData" :key="p.project" class="card proj-card" @tap="openProjDetail(p)">
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
        <view class="card-head-row">
          <text class="card-title">工作类型分布</text>
          <view class="month-nav" style="margin:0">
            <view class="nav-btn" @tap="wtPrev"><text class="nav-icon">‹</text></view>
            <text class="nav-title">{{ workTypeMonth }}</text>
            <view class="nav-btn" @tap="wtNext"><text class="nav-icon">›</text></view>
          </view>
        </view>
        <scroll-view scroll-x class="wt-scroll">
          <view class="wt-table">
            <view class="wt-row wt-head">
              <text class="wt-c wt-name">姓名</text>
              <text class="wt-c wt-val wt-supp">补</text>
              <text v-for="l in wtShort" :key="l" class="wt-c wt-val">{{ l }}</text>
              <text class="wt-c wt-val wt-total">计</text>
            </view>
            <!-- 汇总行 -->
            <view class="wt-row wt-summary">
              <text class="wt-c wt-name">汇总</text>
              <text class="wt-c wt-val wt-supp">{{ wtSummary.supplement }}</text>
              <text v-for="l in wtLabels" :key="l" class="wt-c wt-val">{{ wtSummary.workTypes[l] || 0 }}</text>
              <text class="wt-c wt-val wt-total">{{ wtSummary.total }}</text>
            </view>
            <view v-for="w in workTypeData" :key="w.userName" class="wt-row" @tap="openDrill(w)">
              <text class="wt-c wt-name">{{ w.userName }}</text>
              <text class="wt-c wt-val wt-supp">{{ w.supplementCount || 0 }}</text>
              <text v-for="l in wtLabels" :key="l" class="wt-c wt-val" :style="{ background: wtCellBg(w.workTypes[l], wtMax(l)) }">{{ w.workTypes[l] || 0 }}</text>
              <text class="wt-c wt-val wt-total">{{ w.total }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 区域分布（昨日） -->
      <view v-if="areaData.length" class="card" style="margin-top:16rpx">
        <text class="card-title">区域分布（昨日）</text>
        <view class="area-list">
          <view v-for="p in areaData" :key="p.name" class="area-row" @tap="openProvinceDrill(p)">
            <view class="area-left-box">
              <text class="area-n">{{ p.name }}</text>
            </view>
            <view class="area-divider" />
            <view class="area-right-box">
              <text class="area-workers">{{ p.workers?.map(w => w.userName).join('、') }}</text>
            </view>
          </view>
        </view>
      </view>
      <view class="spacer" />
    </scroll-view>

    <!-- 工作类型 drill-down 弹窗 -->
    <view v-if="drillUser" class="drill-overlay" @tap="closeDrill">
      <view class="drill-panel" @tap.stop>
        <view class="drill-header">
          <text class="drill-title">{{ drillUser.userName }} · {{ workTypeMonth }}</text>
          <text class="drill-close" @tap="closeDrill">✕</text>
        </view>
        <view class="drill-summary">
          <text v-for="l in wtLabels" :key="l" class="drill-tag" v-if="drillUser.workTypes[l]">
            {{ l }} {{ drillUser.workTypes[l] }}天
          </text>
        </view>
        <scroll-view v-if="drillLoading" class="drill-loading"><text>加载中...</text></scroll-view>
        <scroll-view v-else-if="drillLogs.length === 0" class="drill-empty"><text>暂无日志记录</text></scroll-view>
        <scroll-view v-else class="drill-body" scroll-y>
          <view v-for="log in drillLogs" :key="log.reportId" class="drill-log" @tap="goTeamDetail({ reportId: log.reportId })">
            <view class="drill-log-head">
              <text class="drill-log-date">{{ log.reportDate }}</text>
              <text class="drill-log-type">{{ log.workType }}</text>
              <text v-if="log.submitterName" class="drill-log-by">by {{ log.submitterName }}</text>
            </view>
            <text v-if="log.project" class="drill-log-proj">{{ log.project }} · {{ log.area }}</text>
            <text v-if="log.workContent" class="drill-log-content">{{ log.workContent }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 项目日志弹窗 -->
    <view v-if="projDetail" class="drill-overlay" @tap="closeProjDetail">
      <view class="drill-panel" @tap.stop>
        <view class="drill-header">
          <text class="drill-title">{{ projDetail.project }} · {{ projDetail.logCount }}条日志</text>
          <text class="drill-close" @tap="closeProjDetail">✕</text>
        </view>
        <scroll-view v-if="projDetailLoading" class="drill-loading"><text>加载中...</text></scroll-view>
        <scroll-view v-else-if="!projDetailLogs.length" class="drill-empty"><text>暂无日志</text></scroll-view>
        <scroll-view v-else class="drill-body" scroll-y>
          <view v-for="log in projDetailLogs" :key="log.reportId" class="drill-log" @tap="goTeamDetail({ reportId: log.reportId })">
            <view class="drill-log-head">
              <text class="drill-log-date">{{ fmt(log.reportDate) }}</text>
              <text class="drill-log-type">{{ log.todayWorkType }}</text>
            </view>
            <text v-if="log.workers" class="drill-log-proj">{{ log.workers }}</text>
            <text v-if="log.workContent" class="drill-log-content">{{ log.workContent }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 省份下钻人员弹窗 -->
    <view v-if="provinceDrill" class="drill-overlay" @tap="closeProvinceDrill">
      <view class="drill-panel" @tap.stop>
        <view class="drill-header">
          <text class="drill-title">{{ provinceDrill.name }} · {{ provinceDrill.count }}人</text>
          <text class="drill-close" @tap="closeProvinceDrill">✕</text>
        </view>
        <scroll-view v-if="provinceLoading" class="drill-loading"><text>加载中...</text></scroll-view>
        <scroll-view v-else-if="!provinceWorkers.length" class="drill-empty"><text>暂无人员数据</text></scroll-view>
        <scroll-view v-else class="drill-body" scroll-y>
          <view v-for="w in provinceWorkers" :key="w.userId" class="drill-log">
            <text class="drill-log-date">{{ w.userName }}</text>
            <text class="drill-log-type">{{ w.workerCode }}</text>
            <text v-if="w.project" class="drill-log-proj">{{ w.project }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
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
  if (k === 'daily' && !dailyResponse.value) loadDailyStatus()
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
const calLegend = [
  { label:'全员提交', color:'#E8F5E9' },
  { label:'部分提交', color:'#FFFFFF' },
  { label:'无数据', color:'#F0F0F0' },
]
const calMonthLabel = computed(() => { const [y,m] = calMonth.value.split('-'); return y + '年' + parseInt(m) + '月' })

const calendarGrid = computed(() => {
  const [y, m] = calMonth.value.split('-').map(Number)
  const startDow = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const days = new Date(y, m, 0).getDate()
  const map = {}; calData.value.forEach(d => { map[d.date] = d })
  const rows = []; let week = []
  for (let i = 0; i < startDow; i++) week.push(null)
  for (let d = 1; d <= days; d++) {
    const ds = calMonth.value + '-' + String(d).padStart(2, '0')
    const cell = map[ds]
    const submitted = cell ? cell.submitted || 0 : 0
    const total = cell ? cell.total || 0 : 0
    week.push({ day: d, date: ds, submitted, total, hasData: !!cell })
    if (week.length === 7) { rows.push(week); week = [] }
  }
  if (week.length) { while (week.length < 7) week.push(null); rows.push(week) }
  return rows
})

// 背景规则：全员提交→淡绿；部分提交→白；无数据(休息/未到)→浅灰
function calClass(cell) {
  if (!cell) return 'cal-empty'
  if (!cell.hasData) return 'cal-nodata'
  if (cell.total > 0 && cell.submitted >= cell.total) return 'cal-full'
  return 'cal-partial'
}
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
const wtLabels = ['工作（陆）','工作（海）','待工','在途','请假']
const wtShort = ['陆','海','待','途','假']
function wtMax(k) { return Math.max(1, ...workTypeData.value.map(w => w.workTypes[k] || 0)) }
function wtCellBg(v, max) { if (!v) return 'transparent'; const p = v / max; return p <= .25 ? '#E8F5E9' : p <= .5 ? '#A5D6A7' : '#66BB6A' }
// 汇总行：各列合计 + 补录合计 + 总计
const wtSummary = computed(() => {
  const s = { workTypes: {}, supplement: 0, total: 0 }
  wtLabels.forEach(l => { s.workTypes[l] = 0 })
  workTypeData.value.forEach(w => {
    wtLabels.forEach(l => { s.workTypes[l] += w.workTypes[l] || 0 })
    s.supplement += w.supplementCount || 0
    s.total += w.total || 0
  })
  return s
})
function wtPrev() { workTypeMonth.value = prevM(workTypeMonth.value); loadWorkTypes() }
function wtNext() { workTypeMonth.value = nextM(workTypeMonth.value); loadWorkTypes() }

const areaData = ref([])

// ============ 工作类型 drill-down ============
const drillUser = ref(null)
const drillLogs = ref([])
const drillLoading = ref(false)

async function openDrill(w) {
  drillUser.value = w
  drillLoading.value = true
  drillLogs.value = []
  try {
    const res = await reportApi.getUserMonthlyLogs(w.userId, workTypeMonth.value)
    if (res.code === 0 && res.data) drillLogs.value = res.data.logs || []
  } catch { drillLogs.value = [] }
  finally { drillLoading.value = false }
}

function closeDrill() {
  drillUser.value = null
  drillLogs.value = []
}

// ============ 省份下钻 ============
const provinceDrill = ref(null)
const provinceWorkers = ref([])
const provinceLoading = ref(false)

async function openProvinceDrill(p) {
  provinceDrill.value = p
  provinceLoading.value = true
  provinceWorkers.value = []
  try {
    const res = await reportApi.getProvinceWorkers(p.name)
    if (res.code === 0 && res.data) provinceWorkers.value = res.data.workers || []
  } catch { provinceWorkers.value = [] }
  finally { provinceLoading.value = false }
}

function closeProvinceDrill() {
  provinceDrill.value = null
  provinceWorkers.value = []
}

// ============ 项目日志弹窗 ============
const projDetail = ref(null)
const projDetailLogs = ref([])
const projDetailLoading = ref(false)

async function openProjDetail(p) {
  projDetail.value = p
  projDetailLoading.value = true
  projDetailLogs.value = []
  try {
    const res = await reportApi.getList({ keyword: p.project, pageSize: 200 })
    if (res.code === 0 && res.data) {
      projDetailLogs.value = res.data.list.map(r => ({ ...r, reportId: r.id }))
    }
  } catch { projDetailLogs.value = [] }
  finally { projDetailLoading.value = false }
}

function closeProjDetail() {
  projDetail.value = null
  projDetailLogs.value = []
}

// ============ 全员当日 ============
const todayStr = new Date().toISOString().slice(0, 10)
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) }
const dailyDate = ref(yesterday())
const dailyMode = ref('today') // today | tomorrow
const dailyResponse = ref(null)
const dailyLoading = ref(false)
const tomorrowResponse = ref(null)
const tomorrowLoading = ref(false)

const dailyDateDisplay = computed(() => {
  if (dailyMode.value === 'tomorrow') return '明日安排 ' + dailyDate.value
  if (dailyDate.value === todayStr) return '今天 ' + dailyDate.value
  if (dailyDate.value === yesterday()) return '昨天 ' + dailyDate.value
  return dailyDate.value
})

const dailyMissing = computed(() => dailyResponse.value?.summary?.missing || 0)
const dailySubmitted = computed(() => {
  if (!dailyResponse.value) return 0
  const s = dailyResponse.value.summary
  return (s.submitted || 0) + (s.substituted || 0) + (s.supplement || 0) + (s.office || 0) + (s.leave || 0)
})

const dailyMissingWorkers = computed(() => (dailyResponse.value?.workers || []).filter(w => w.status === 'missing'))
const dailySupplementWorkers = computed(() => (dailyResponse.value?.workers || []).filter(w => w.status === 'supplement'))
const dailyActiveWorkers = computed(() => (dailyResponse.value?.workers || []).filter(w => w.status !== 'missing' && w.status !== 'leave' && w.status !== 'supplement'))
const dailyLeaveWorkers = computed(() => (dailyResponse.value?.workers || []).filter(w => w.status === 'leave'))

function fmtTime(dt) { if (!dt) return ''; const p = String(dt).split(' '); return p[1] ? p[1].slice(0, 5) : dt }

function statusLabel(s) {
  const m = { submitted: '已提交', supplement: '补公出', office: '公司日报', substituted: '已代填', leave: '请假', missing: '未提交' }
  return m[s] || s
}

async function loadDailyStatus() {
  dailyLoading.value = true
  try {
    const res = await reportApi.getDailyStatus({ date: dailyDate.value })
    if (res.code === 0 && res.data) dailyResponse.value = res.data
  } catch { dailyResponse.value = null }
  finally { dailyLoading.value = false }
}

async function loadTomorrowStatus(date) {
  tomorrowLoading.value = true
  try {
    const res = await reportApi.getTomorrowStatus({ date })
    if (res.code === 0 && res.data) tomorrowResponse.value = res.data
  } catch { tomorrowResponse.value = null }
  finally { tomorrowLoading.value = false }
}

function switchDailyMode(mode) {
  if (dailyMode.value === mode) return
  dailyMode.value = mode
  if (mode === 'tomorrow') {
    // 明日视图默认看"今天日报里的明日计划"(即明天的安排)
    dailyDate.value = todayStr
    loadTomorrowStatus(dailyDate.value)
  } else {
    dailyDate.value = yesterday()
    loadDailyStatus()
  }
}

function dailyPrevDay() {
  const d = new Date(dailyDate.value); d.setDate(d.getDate() - 1); dailyDate.value = d.toISOString().slice(0, 10)
  if (dailyMode.value === 'tomorrow') loadTomorrowStatus(dailyDate.value); else loadDailyStatus()
}
function dailyNextDay() {
  if (dailyDate.value >= todayStr) return
  const d = new Date(dailyDate.value); d.setDate(d.getDate() + 1); dailyDate.value = d.toISOString().slice(0, 10)
  if (dailyMode.value === 'tomorrow') loadTomorrowStatus(dailyDate.value); else loadDailyStatus()
}
function onDailyDateChange(e) {
  dailyDate.value = e.detail.value
  if (dailyMode.value === 'tomorrow') loadTomorrowStatus(dailyDate.value); else loadDailyStatus()
}
function goDailyDetail(w) { if (w.reportId) uni.navigateTo({ url: '/pages/employee/report-detail/index?id=' + w.reportId }) }

// 明日视图:按明日工作类型分组
const tomorrowGroups = computed(() => {
  if (!tomorrowResponse.value) return []
  const workers = tomorrowResponse.value.workers || []
  const order = ['工作（陆）', '工作（海）', '待工', '在途', '请假']
  const groups = []
  order.forEach(wt => {
    const list = workers.filter(w => w.tomorrowWorkType === wt)
    if (list.length) groups.push({ label: wt, workers: list })
  })
  const noPlan = workers.filter(w => !w.tomorrowWorkType)
  if (noPlan.length) groups.push({ label: '未填写', workers: noPlan })
  return groups
})

// ============ 数据加载 ============
async function loadPersonal() {
  try {
    const res = await reportApi.getStats({ userId: userStore.userInfo?.id })
    if (res.code === 0 && res.data) {
      const d = res.data
      personalStats.value = { totalCount: d.totalCount||0, monthCount: d.monthCount||0, missingDays: d.missingDays||0, missingDates: d.missingDates||[], delayedCount: d.delayedCount||0, entryDate: d.entryDate||'' }
    }
  } catch { /* */ }
}
async function loadMonthly() {
  try {
    const res = await reportApi.getMonthlySummary({ userId: userStore.userInfo?.id, month: nowYearMonth() })
    if (res.code === 0 && res.data) monthlySummary.value = res.data
  } catch { /* */ }
}
async function loadTeamLogs() {
  try { const res = await reportApi.getTeamLogs({ userId: userStore.userInfo?.id, days: 7 }); if (res.code === 0 && res.data) teamLogs.value = res.data.logs || [] } catch { /* */ }
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
  else if (activeTab.value === 'daily') {
    if (dailyMode.value === 'tomorrow') await loadTomorrowStatus(dailyDate.value)
    else await loadDailyStatus()
  }
  else if (activeTab.value === 'calendar') await loadCalendar()
  else if (activeTab.value === 'projects') await loadProjects()
  else if (activeTab.value === 'workers') await Promise.all([loadWorkTypes(), loadAreas()])
  refreshing.value = false
}

// ============ 导航 ============
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
.cal-nodata { background:#F0F0F0; }
.cal-full { background:#E8F5E9; }
.cal-partial { background:#FFFFFF; border:1rpx solid #E5E7EB; }
.cal-partial .cal-n { color:$primary-color; }
.cal-full .cal-n { color:#22C55E; }
.cal-d { font-size:22rpx; font-weight:500; color:$text-primary; line-height:1.2; }
.cal-n { font-size:20rpx; font-weight:700; color:$text-regular; line-height:1.2; }

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
.card-head-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:$spacing-sm; }
.wt-scroll { width:100%; white-space:nowrap; }
.wt-table { display:inline-flex; flex-direction:column; min-width:100%; }
.wt-row { display:flex; border-bottom:1rpx solid $border-light; }
.wt-head { background:#F7F8FA; border-radius:$radius-sm $radius-sm 0 0; }
.wt-c { padding:10rpx 6rpx; font-size:20rpx; text-align:center; display:flex; align-items:center; justify-content:center; }
.wt-name { width:100rpx; flex-shrink:0; font-weight:500; color:$text-primary; justify-content:flex-start; padding-left:12rpx; }
.wt-supp { color:#F59E0B; font-weight:600; }
.wt-val { width:52rpx; flex-shrink:0; border-radius:4rpx; margin:1rpx; }
.wt-total { font-weight:700; color:$primary-color; }
.wt-summary { background:#F0F7FF; font-weight:600; }
.wt-summary .wt-c { color:$text-primary; font-weight:600; }

// ===== 省份排行 =====
.area-list { display:flex; flex-direction:column; }
.area-row { display:flex; align-items:center; justify-content:space-between; padding:14rpx 0; border-top:1rpx solid $border-light; }
.area-row:first-child { border-top:none; }
.area-left { display:flex; align-items:center; gap:14rpx; }
.area-r { font-size:$font-sm; font-weight:700; color:$text-secondary; width:30rpx; text-align:center; }
.area-n { font-size:26rpx; font-weight:500; color:$text-primary; }
.area-row { display:flex; align-items:flex-start; gap:16rpx; }
.area-left-box { width:28%; flex-shrink:0; display:flex; align-items:center; }
.area-divider { width:2rpx; background:$border-light; align-self:stretch; margin:8rpx 12rpx; }
.area-right-box { flex:1; min-width:0; display:flex; flex-wrap:wrap; align-items:center; }
.area-c { font-size:24rpx; font-weight:600; color:$primary-color; }
.area-proj { font-size:$font-xs; color:$text-secondary; background:$bg-form; padding:2rpx 8rpx; border-radius:$radius-sm; }
.area-workers { font-size:22rpx; color:$text-regular; line-height:1.6; word-break:break-all; }

// ===== 通用 =====
.loading, .empty { display:flex; align-items:center; justify-content:center; padding:160rpx 0; font-size:$font-base; color:$text-secondary; }
.spacer { height:40rpx; }

// ===== 全员当日 =====
.daily-tab { display:flex; flex-direction:column; flex:1; height:0; }
.date-bar { display:flex; align-items:center; justify-content:center; gap:$spacing-sm; padding:$spacing-sm $spacing-base; background:$bg-card; flex-shrink:0; }
.date-nav-btn { width:64rpx; height:64rpx; display:flex; align-items:center; justify-content:center; background:#F7F8FA; border-radius:$radius-base; }
.date-nav-btn:active { background:#EBEDF0; }
.date-nav-icon { font-size:40rpx; color:$text-regular; line-height:1; }
.date-nav-disabled { opacity:.3; }
.date-picker { display:flex; align-items:center; gap:8rpx; padding:12rpx 24rpx; background:#F7F8FA; border-radius:$radius-base; min-width:280rpx; justify-content:center; }
.date-text { font-size:$font-base; color:$text-primary; font-weight:500; }
.date-arrow { font-size:24rpx; color:$text-secondary; }
.daily-seg { display:flex; background:#F7F8FA; border-radius:$radius-base; padding:4rpx; }
.daily-seg-item { padding:12rpx 24rpx; border-radius:$radius-sm; }
.daily-seg-item--active { background:$primary-color; }
.daily-seg-text { font-size:$font-sm; color:$text-regular; font-weight:500; }
.daily-seg-item--active .daily-seg-text { color:#FFFFFF; }
.summary-bar { display:flex; gap:$spacing-sm; padding:$spacing-sm $spacing-base; flex-shrink:0; }
.summary-item { flex:1; display:flex; align-items:center; gap:8rpx; padding:16rpx 20rpx; border-radius:$radius-base; }
.summary-item--submitted { background:#EFFDF5; }
.summary-item--missing { background:#FFF0F0; }
.summary-item--total { background:#F0F7FF; }
.summary-val { font-size:36rpx; font-weight:700; color:$success-color; }
.summary-val--danger { color:$danger-color; }
.summary-item--total .summary-val { color:$primary-color; }
.summary-lbl { font-size:$font-sm; color:$text-regular; }
.daily-scroll { flex:1; height:0; padding:0 $spacing-base; }
.daily-section { margin-bottom:$spacing-sm; }
.section-header { font-size:26rpx; font-weight:600; padding:12rpx 0; display:block; }
.section-header--missing { color:$danger-color; }
.section-header--active  { color:$success-color; }
.section-header--leave   { color:$text-secondary; }
.section-header--tomorrow { color:$primary-color; }
.daily-card-list { display:flex; flex-direction:column; gap:$spacing-xs; }
.worker-card {
  display:flex; align-items:center; padding:20rpx $spacing-base; background:$bg-card;
  border-radius:$radius-base; box-shadow:0 2rpx 12rpx rgba(0,0,0,.04);
}
.worker-card--missing { border-left:6rpx solid $danger-color; background:#FFF5F5; }
.worker-card--leave { border-left:6rpx solid $text-placeholder; }
.worker-card--submitted { border-left:6rpx solid $success-color; }
.worker-card--supplement { border-left:6rpx solid $warning-color; }
.worker-card--office { border-left:6rpx solid $primary-color; }
.worker-card--substituted { border-left:6rpx solid #6366F1; }
.worker-card--tomorrow { border-left:6rpx solid $primary-color; }
.card-left { display:flex; flex-direction:column; gap:4rpx; width:140rpx; flex-shrink:0; }
.card-name { font-size:26rpx; font-weight:600; color:$text-primary; }
.card-code { font-size:$font-xs; color:$text-secondary; }
.card-mid { flex:1; min-width:0; display:flex; flex-direction:column; gap:4rpx; }
.card-project { font-size:$font-sm; color:$text-primary; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.card-area { font-size:$font-xs; color:$text-secondary; }
.card-right { display:flex; flex-direction:column; align-items:flex-end; gap:4rpx; flex-shrink:0; margin-left:$spacing-sm; }
.card-work-type { font-size:$font-xs; color:$primary-color; }
.card-work-type--empty { color:$text-secondary; }
.card-time { font-size:18rpx; color:$text-placeholder; }
.card-status-tag { font-size:$font-xs; font-weight:500; padding:2rpx 10rpx; border-radius:$radius-sm; }
.tag--submitted   { background:#EFFDF5; color:$success-color; }
.tag--supplement  { background:#FFF8E1; color:$warning-color; }
.tag--office      { background:$primary-bg; color:$primary-color; }
.tag--substituted { background:#FFF0F5; color:#6366F1; }
.tag--leave       { background:#F5F3FF; color:#8B5CF6; }
.tag--rest        { background:#FDF2F8; color:#EC4899; }
.tag--missing     { background:#FFF0F0; color:$danger-color; }

// ===== drill-down 弹窗 =====
.drill-overlay {
  position:fixed; top:0; left:0; right:0; bottom:0;
  background:rgba(0,0,0,0.5); display:flex; align-items:flex-end; z-index:1000;
}
.drill-panel {
  width:100%; max-height:80vh; background:$bg-card;
  border-radius:24rpx 24rpx 0 0; display:flex; flex-direction:column;
}
.drill-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:24rpx $spacing-base 12rpx; border-bottom:1rpx solid $border-light;
}
.drill-title { font-size:28rpx; font-weight:600; color:$text-primary; }
.drill-close { font-size:36rpx; color:$text-secondary; padding:0 8rpx; }
.drill-summary { display:flex; flex-wrap:wrap; gap:8rpx; padding:12rpx $spacing-base; }
.drill-tag {
  padding:4rpx 12rpx; background:$primary-bg; color:$primary-color;
  font-size:20rpx; border-radius:$radius-sm; font-weight:500;
}
.drill-loading, .drill-empty {
  display:flex; align-items:center; justify-content:center;
  padding:80rpx 0; font-size:$font-sm; color:$text-secondary;
}
.drill-body { flex:1; max-height:56vh; padding:0 $spacing-base; }
.drill-log {
  padding:16rpx 0; border-bottom:1rpx solid $border-light;
}
.drill-log:last-child { border-bottom:none; }
.drill-log-head { display:flex; align-items:center; gap:12rpx; margin-bottom:4rpx; }
.drill-log-date { font-size:24rpx; font-weight:500; color:$text-primary; }
.drill-log-type { font-size:20rpx; color:$primary-color; font-weight:500; }
.drill-log-by { font-size:18rpx; color:$text-placeholder; margin-left:auto; }
.drill-log-proj { font-size:20rpx; color:$text-secondary; display:block; margin-bottom:2rpx; }
.drill-log-content { font-size:20rpx; color:$text-regular; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
</style>
