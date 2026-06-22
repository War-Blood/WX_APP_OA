<template>
  <view class="page">
    <NavBar title="昨日工作一览" :showBack="true" />

    <!-- 日期选择 + 导航 -->
    <view class="date-bar">
      <view class="date-nav-btn" @tap="prevDay"><text class="date-nav-icon">‹</text></view>
      <picker mode="date" :value="currentDate" :end="todayStr" @change="onDateChange">
        <view class="date-picker">
          <text class="date-text">{{ displayDate }}</text>
          <text class="date-arrow">▾</text>
        </view>
      </picker>
      <view class="date-nav-btn" :class="{ 'date-nav-disabled': isToday }" @tap="nextDay">
        <text class="date-nav-icon">›</text>
      </view>
    </view>

    <!-- 摘要统计条 -->
    <view v-if="response" class="summary-bar">
      <view class="summary-item summary-item--submitted">
        <text class="summary-val">{{ submittedCount }}</text>
        <text class="summary-lbl">已提交</text>
      </view>
      <view class="summary-item summary-item--missing">
        <text class="summary-val" :class="{ 'summary-val--danger': missingCount > 0 }">{{ missingCount }}</text>
        <text class="summary-lbl">缺失</text>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-wrap"><text class="loading-text">加载中...</text></view>

    <!-- 内容列表 -->
    <scroll-view
      v-else-if="response"
      class="content-scroll"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- 缺失人员 -->
      <view v-if="missingWorkers.length > 0" class="section">
        <text class="section-header section-header--missing">未提交 ({{ missingWorkers.length }})</text>
        <view class="card-list">
          <view v-for="w in missingWorkers" :key="w.userId" class="worker-card worker-card--missing">
            <view class="card-left">
              <text class="card-name">{{ w.userName }}</text>
              <text class="card-code">{{ w.workerCode || '' }}</text>
            </view>
            <view class="card-right">
              <text class="card-status-tag tag--missing">未提交</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 已提交人员 -->
      <view v-if="activeWorkers.length > 0" class="section">
        <text class="section-header section-header--active">已提交 ({{ activeWorkers.length }})</text>
        <view class="card-list">
          <view
            v-for="w in activeWorkers"
            :key="w.userId"
            class="worker-card"
            :class="'worker-card--' + w.status"
            @tap="goToDetail(w)"
          >
            <view class="card-left">
              <text class="card-name">{{ w.userName }}</text>
              <text class="card-code">{{ w.workerCode || '' }}</text>
            </view>
            <view class="card-mid">
              <text v-if="w.project" class="card-project">{{ w.project }}</text>
              <text v-if="w.area" class="card-area">{{ w.area }}</text>
            </view>
            <view class="card-right">
              <text class="card-status-tag" :class="'tag--' + w.status">
                {{ statusLabelMap[w.status] || w.status }}
              </text>
              <text v-if="w.workType" class="card-work-type">{{ w.workType }}</text>
              <text v-if="w.submittedAt" class="card-time">{{ formatTime(w.submittedAt) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 请假/调休 -->
      <view v-if="leaveRestWorkers.length > 0" class="section">
        <text class="section-header section-header--leave">请假/调休 ({{ leaveRestWorkers.length }})</text>
        <view class="card-list">
          <view
            v-for="w in leaveRestWorkers"
            :key="w.userId"
            class="worker-card worker-card--leave"
          >
            <view class="card-left">
              <text class="card-name">{{ w.userName }}</text>
              <text class="card-code">{{ w.workerCode || '' }}</text>
            </view>
            <view class="card-right">
              <text class="card-status-tag" :class="'tag--' + w.status">
                {{ statusLabelMap[w.status] || w.status }}
              </text>
              <text v-if="w.submittedAt" class="card-time">{{ formatTime(w.submittedAt) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-placeholder"></view>
    </scroll-view>

    <!-- 空状态 -->
    <view v-else-if="!loading" class="empty-wrap">
      <text class="empty-text">暂无数据</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { reportApi } from '@/services/modules/report'

// 工具函数
function formatToday() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatTime(datetime) {
  if (!datetime) return ''
  const parts = String(datetime).split(' ')
  return parts[1] ? parts[1].substring(0, 5) : datetime
}

// 状态标签映射
const statusLabelMap = {
  submitted: '已提交',
  supplement: '补公出',
  office: '公司日报',
  substituted: '已代填',
  leave: '请假',
  rest: '调休',
  missing: '未提交'
}

// 状态
const todayStr = ref(formatToday())
const currentDate = ref(yesterday())
const loading = ref(false)
const refreshing = ref(false)
const response = ref(null)

function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// 计算属性
const isToday = computed(() => currentDate.value === todayStr.value)

const displayDate = computed(() => {
  const today = formatToday()
  const yesterdayStr = yesterday()
  if (currentDate.value === today) return '今天 ' + currentDate.value
  if (currentDate.value === yesterdayStr) return '昨天 ' + currentDate.value
  return currentDate.value
})

const missingCount = computed(() => response.value?.summary?.missing || 0)
const submittedCount = computed(() => {
  if (!response.value) return 0
  const s = response.value.summary
  return (s.submitted || 0) + (s.substituted || 0) + (s.supplement || 0) + (s.office || 0) + (s.leave || 0) + (s.rest || 0)
})

const missingWorkers = computed(() => {
  if (!response.value) return []
  return response.value.workers.filter(w => w.status === 'missing')
})

const activeWorkers = computed(() => {
  if (!response.value) return []
  return response.value.workers.filter(w => w.status !== 'missing' && w.status !== 'leave' && w.status !== 'rest')
})

const leaveRestWorkers = computed(() => {
  if (!response.value) return []
  return response.value.workers.filter(w => w.status === 'leave' || w.status === 'rest')
})

// 数据加载
async function loadData() {
  loading.value = true
  try {
    const res = await reportApi.getDailyStatus({ date: currentDate.value })
    if (res.code === 0 && res.data) {
      response.value = res.data
    }
  } catch {
    response.value = null
  } finally {
    loading.value = false
  }
}

// 事件
function prevDay() {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() - 1)
  currentDate.value = d.toISOString().slice(0, 10)
  loadData()
}

function nextDay() {
  if (isToday.value) return
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + 1)
  currentDate.value = d.toISOString().slice(0, 10)
  loadData()
}

function onDateChange(e) {
  currentDate.value = e.detail.value
  loadData()
}

async function onRefresh() {
  refreshing.value = true
  await loadData()
  refreshing.value = false
}

function goToDetail(worker) {
  // 暂跳转到日报查询，后续可改为直接链接
  uni.showToast({ title: worker.userName + ' - ' + (worker.project || '无项目'), icon: 'none' })
}

onMounted(() => {
  loadData()
})
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

// ===== 日期导航 =====
.date-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-base;
  background: $bg-card;
  flex-shrink: 0;
}
.date-nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F7F8FA;
  border-radius: $radius-base;
}
.date-nav-btn:active { background: #EBEDF0; }
.date-nav-icon {
  font-size: 40rpx;
  color: $text-regular;
  line-height: 1;
}
.date-nav-disabled {
  opacity: 0.3;
}
.date-picker {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: #F7F8FA;
  border-radius: $radius-base;
  min-width: 280rpx;
  justify-content: center;
}
.date-text {
  font-size: $font-base;
  color: $text-primary;
  font-weight: 500;
}
.date-arrow {
  font-size: 24rpx;
  color: $text-secondary;
}

// ===== 摘要统计条 =====
.summary-bar {
  display: flex;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-base;
  flex-shrink: 0;
}
.summary-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 20rpx;
  border-radius: $radius-base;
}
.summary-item--submitted {
  background: #EFFDF5;
}
.summary-item--missing {
  background: #FFF0F0;
}
.summary-val {
  font-size: 36rpx;
  font-weight: 700;
  color: $success-color;
}
.summary-val--danger {
  color: $danger-color;
}
.summary-lbl {
  font-size: $font-sm;
  color: $text-regular;
}

// ===== 内容滚动 =====
.content-scroll {
  flex: 1;
  height: 0;
  padding: 0 $spacing-base;
}

// ===== 分组区块 =====
.section {
  margin-bottom: $spacing-sm;
}
.section-header {
  font-size: 26rpx;
  font-weight: 600;
  padding: 12rpx 0;
  display: block;
}
.section-header--missing { color: $danger-color; }
.section-header--active  { color: $success-color; }
.section-header--leave   { color: $text-secondary; }

// ===== 卡片列表 =====
.card-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

// 通用卡片
.worker-card {
  display: flex;
  align-items: center;
  padding: 20rpx $spacing-base;
  background: $bg-card;
  border-radius: $radius-base;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

// 缺失卡片
.worker-card--missing {
  border-left: 6rpx solid $danger-color;
  background: #FFF5F5;
}

// 请假/调休卡片
.worker-card--leave {
  border-left: 6rpx solid $text-placeholder;
}

// 已提交/补公出卡片
.worker-card--submitted { border-left: 6rpx solid $success-color; }
.worker-card--supplement { border-left: 6rpx solid $warning-color; }
.worker-card--office { border-left: 6rpx solid $primary-color; }
.worker-card--substituted { border-left: 6rpx solid #6366F1; }

.card-left {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  width: 140rpx;
  flex-shrink: 0;
}
.card-name {
  font-size: 26rpx;
  font-weight: 600;
  color: $text-primary;
}
.card-code {
  font-size: $font-xs;
  color: $text-secondary;
}

.card-mid {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.card-project {
  font-size: $font-sm;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-area {
  font-size: $font-xs;
  color: $text-secondary;
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
  flex-shrink: 0;
  margin-left: $spacing-sm;
}
.card-work-type {
  font-size: $font-xs;
  color: $primary-color;
}
.card-time {
  font-size: $font-xs - 2rpx;
  color: $text-placeholder;
}

// ===== 状态标签 =====
.card-status-tag {
  font-size: $font-xs;
  font-weight: 500;
  padding: 2rpx 10rpx;
  border-radius: $radius-sm;
}
.tag--submitted   { background: #EFFDF5; color: $success-color; }
.tag--supplement  { background: #FFF8E1; color: $warning-color; }
.tag--office      { background: $primary-bg; color: $primary-color; }
.tag--substituted { background: #FFF0F5; color: #6366F1; }
.tag--leave       { background: #F5F3FF; color: #8B5CF6; }
.tag--rest        { background: #FDF2F8; color: #EC4899; }
.tag--missing     { background: #FFF0F0; color: $danger-color; }

// ===== 加载 & 空状态 =====
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}
.loading-text {
  font-size: $font-base;
  color: $text-secondary;
}
.empty-wrap {
  display: flex;
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
