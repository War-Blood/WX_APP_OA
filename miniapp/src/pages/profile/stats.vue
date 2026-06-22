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
        @tap="adminActiveTab = tab.key"
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

    <!-- ========== 全员当日（管理员专属） ========== -->
    <scroll-view
      v-if="userStore.isAdmin && adminActiveTab === 'daily'"
      class="content-scroll"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- 日期选择 -->
      <view class="section-card">
        <view class="form-group" style="margin-bottom:0;">
          <text class="form-label">查看日期</text>
          <picker
            mode="date"
            :value="dailyDate"
            :end="todayStr"
            @change="onDailyDateChange"
          >
            <view class="form-picker">
              <text class="picker-value">{{ dailyDate }}</text>
              <text class="picker-icon">▾</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 汇总统计条 -->
      <view v-if="dailyStatus" class="summary-bar">
        <view class="summary-item">
          <text class="summary-val summary-val--submitted">{{ dailyStatus.summary?.submitted || 0 }}</text>
          <text class="summary-lbl">已提交</text>
        </view>
        <view class="summary-item">
          <text class="summary-val summary-val--substituted">{{ dailyStatus.summary?.substituted || 0 }}</text>
          <text class="summary-lbl">已代填</text>
        </view>
        <view class="summary-item">
          <text class="summary-val summary-val--supplement">{{ dailyStatus.summary?.supplement || 0 }}</text>
          <text class="summary-lbl">补公出</text>
        </view>
        <view class="summary-item">
          <text class="summary-val summary-val--office">{{ dailyStatus.summary?.office || 0 }}</text>
          <text class="summary-lbl">公司日报</text>
        </view>
        <view class="summary-item">
          <text class="summary-val summary-val--leave">{{ dailyStatus.summary?.leave || 0 }}</text>
          <text class="summary-lbl">请假</text>
        </view>
        <view class="summary-item">
          <text class="summary-val summary-val--rest">{{ dailyStatus.summary?.rest || 0 }}</text>
          <text class="summary-lbl">调休</text>
        </view>
        <view class="summary-item">
          <text class="summary-val" :class="(dailyStatus.summary?.missing || 0) > 0 ? 'summary-val--missing' : 'summary-val--zero'">
            {{ dailyStatus.summary?.missing || 0 }}
          </text>
          <text class="summary-lbl">缺失</text>
        </view>
      </view>

      <!-- 员工列表 -->
      <view v-if="dailyStatus && dailyStatus.workers" class="worker-list">
        <view
          v-for="w in sortedWorkers"
          :key="w.userId"
          class="worker-card"
          :class="{ 'worker-missing': w.status === 'missing' }"
        >
          <view class="worker-card-left">
            <text class="worker-card-name">{{ w.userName }}</text>
            <text class="worker-card-code">{{ w.workerCode || '' }}</text>
          </view>
          <view class="worker-card-mid">
            <text class="worker-card-project">{{ w.project || '-' }}</text>
          </view>
          <view class="worker-card-right">
            <view class="worker-status-badge" :class="'badge--' + w.status">
              <text class="worker-status-text">{{ getDailyStatusLabel(w) }}</text>
            </view>
            <text v-if="w.submittedAt" class="worker-card-time">{{ formatTime(w.submittedAt) }}</text>
          </view>
        </view>
      </view>

      <view v-if="!dailyStatus && !loading" class="empty-wrap">
        <text class="empty-text">暂无数据</text>
      </view>

      <view class="bottom-placeholder"></view>
    </scroll-view>
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
  { key: 'daily', label: '全员当日' }
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
</style>
