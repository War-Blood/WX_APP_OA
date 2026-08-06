<template>
  <view class="page">
    <nav-bar title="日报历史" :showBack="true" />

    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        @tap="switchTab(tab.key)"
      >
        <text class="tab-text" :class="{ 'tab-text-active': activeTab === tab.key }">{{ tab.label }}</text>
        <view v-if="activeTab === tab.key" class="tab-indicator"></view>
      </view>
    </view>

    <scroll-view
      class="content-scroll"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <view v-if="filteredList.length > 0" class="report-list">
        <view
          v-for="item in filteredList"
          :key="item.id || item.reportId"
          class="report-card"
          hover-class="card-hover"
          @tap="goToDetail(item)"
        >
          <view class="card-header">
            <text class="project-name">{{ item.project || '未命名项目' }}</text>
            <!-- 日志类型标签 -->
            <view class="type-tag" :style="{ background: getTypeBg(item.reportType) }">
              <text class="type-tag-text" :style="{ color: getTypeColor(item.reportType) }">
                {{ getTypeLabel(item.reportType) }}
              </text>
            </view>
          </view>
          <!-- 补公出审核状态 -->
          <view v-if="item.reportType === 'biz_trip_supplement'" class="supplement-row">
            <view class="supplement-status-tag" :style="{ background: getSupplementBg(item.supplementStatus) }">
              <text class="supplement-status-text" :style="{ color: getSupplementColor(item.supplementStatus) }">
                {{ getSupplementLabel(item.supplementStatus) }}
              </text>
            </view>
          </view>
          <view class="card-meta">
            <text class="meta-date">{{ item.date || item.reportDate }}</text>
            <text class="meta-type">{{ item.todayWorkType || item.workType || '' }}</text>
            <text class="meta-person">{{ item.submitter || item.person || '' }}</text>
          </view>
          <!-- 项目/区域行 -->
          <view v-if="item.area" class="card-meta" style="margin-top:8rpx;">
            <text class="meta-area">{{ item.area }}</text>
          </view>
          <view v-if="item.todayWork" class="card-preview">
            <text class="preview-text">{{ truncateText(item.todayWork, 80) }}</text>
          </view>
          <view v-if="(item.progress || 0) > 0" class="card-progress">
            <text class="progress-label">进度</text>
            <view class="progress-bar-bg">
              <view class="progress-bar-fill" :style="{ width: (item.progress || 0) + '%' }"></view>
            </view>
            <text class="progress-pct">{{ item.progress || 0 }}%</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-wrap">
        <text class="empty-text">暂无日报</text>
        <text class="empty-desc">当前筛选条件下没有日报记录</text>
      </view>
      <view v-if="noMoreData && filteredList.length > 0" class="no-more">已经到底啦</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { reportApi } from '@/services/modules/report'

const activeTab = ref('all')
const currentPage = ref(1)
const noMoreData = ref(false)
const isLoading = ref(false)
const isRefreshing = ref(false)

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '草稿' },
  { key: 'submitted', label: '已提交' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' }
]

const reportList = ref([])
const filteredList = computed(() => reportList.value)

// ===== 日志类型标签 =====
function getTypeLabel(type) {
  const map = { biz_trip: '公出', biz_trip_supplement: '补公出', office: '工作日报', leave: '请假单' }
  return map[type] || type || '日报'
}

function getTypeBg(type) {
  const map = { biz_trip: '#EDF2FF', biz_trip_supplement: '#FFF8E1', office: '#E8F5E9', leave: '#FFEBEE' }
  return map[type] || '#F5F5F5'
}

function getTypeColor(type) {
  const map = { biz_trip: '#2B6DE8', biz_trip_supplement: '#F59E0B', office: '#2E7D32' }
  return map[type] || '#999999'
}

// ===== 补公出审核状态 =====
function getSupplementLabel(status) {
  const map = { pending_review: '审核中', approved: '通过', delayed: '延迟', special: '通过(特殊)' }
  return map[status] || status || '待审核'
}

function getSupplementBg(status) {
  const map = { pending_review: '#FFF8E1', approved: '#EFFDF5', delayed: '#FFF0F0', special: '#EDF2FF' }
  return map[status] || '#F5F5F5'
}

function getSupplementColor(status) {
  const map = { pending_review: '#F59E0B', approved: '#22C55E', delayed: '#EF4444', special: '#2B6DE8' }
  return map[status] || '#999999'
}

// ===== 工具函数 =====
function truncateText(text, maxLen) {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

// ===== 方法 =====
function switchTab(key) {
  activeTab.value = key
  loadReportList(true)
}

function goToDetail(item) {
  const id = item.reportId || item.id
  if (id) {
    uni.navigateTo({ url: '/pages/employee/report-detail/index?id=' + id })
  }
}

function onLoadMore() {
  if (noMoreData.value || isLoading.value) return
  currentPage.value++
  loadReportList(false)
}

async function onRefresh() {
  isRefreshing.value = true
  await loadReportList(true)
  isRefreshing.value = false
}

onMounted(() => { loadReportList(true) })

async function loadReportList(reset = true) {
  if (isLoading.value) return
  isLoading.value = true

  if (reset) {
    currentPage.value = 1
    noMoreData.value = false
  }

  try {
    const statusMap = { all: undefined, draft: 'draft', submitted: 'submitted', approved: 'approved', rejected: 'rejected' }
    const res = await reportApi.getList({
      page: currentPage.value,
      pageSize: 20,
      status: statusMap[activeTab.value]
    })
    const list = res.data.list || []
    if (reset) { reportList.value = list }
    else { reportList.value = [...reportList.value, ...list] }
    if (list.length < 20) { noMoreData.value = true }
  } catch {
    // fail silently
  } finally {
    isLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  width: 100%;
  height: 100vh;
  background: #F7F7F7;
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  background: #FFFFFF;
  flex-shrink: 0;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 88rpx;
}

.tab-text {
  font-size: 28rpx;
  color: #999999;
  font-weight: 400;
}

.tab-text-active {
  color: #2B6DE8;
  font-weight: 600;
}

.tab-indicator {
  width: 48rpx;
  height: 6rpx;
  background: #2B6DE8;
  border-radius: 4rpx;
  margin-top: 4rpx;
}

.content-scroll {
  flex: 1;
  height: 0;
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx;
}

.report-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
}

.card-hover {
  background: #FAFBFC;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.project-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-tag {
  height: 32rpx;
  padding: 0 12rpx;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.type-tag-text {
  font-size: 20rpx;
  font-weight: 500;
}

/* 补公出审核状态 */
.supplement-row {
  display: flex;
  margin-top: 12rpx;
}

.supplement-status-tag {
  height: 32rpx;
  padding: 0 12rpx;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.supplement-status-text {
  font-size: 20rpx;
  font-weight: 500;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 16rpx;
}

.meta-date,
.meta-type,
.meta-person,
.meta-area {
  font-size: 24rpx;
  color: #999999;
}

.meta-type {
  color: #2B6DE8;
  font-weight: 500;
}

.card-preview {
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  background: #F7F8FA;
  border-radius: 8rpx;
}

.preview-text {
  font-size: 24rpx;
  color: #666666;
  line-height: 36rpx;
}

.card-progress {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 16rpx;
}

.progress-label {
  font-size: 22rpx;
  color: #999999;
  flex-shrink: 0;
}

.progress-bar-bg {
  flex: 1;
  height: 8rpx;
  background: #EFF2F5;
  border-radius: 4rpx;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #22C55E;
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.progress-pct {
  font-size: 22rpx;
  font-weight: 600;
  color: #22C55E;
  min-width: 64rpx;
  text-align: right;
}

.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.empty-text {
  font-size: 30rpx;
  color: #999999;
}

.empty-desc {
  font-size: 24rpx;
  color: #C0C4CC;
  margin-top: 12rpx;
}

.no-more {
  text-align: center;
  padding: 32rpx 0;
  font-size: 24rpx;
  color: #C0C4CC;
}
</style>
