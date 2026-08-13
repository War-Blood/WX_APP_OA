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
            <StatusTag :status="item.reportType" />
          </view>
          <!-- 补公出审核状态 -->
          <view v-if="item.reportType === 'biz_trip_supplement'" class="supplement-row">
            <StatusTag :status="item.supplementStatus" />
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
      <EmptyState
        v-else
        title="暂无日报"
        description="下拉可刷新"
        :show-action="true"
        action-text="重新加载"
        @action="onRefresh"
      />
      <view v-if="noMoreData && filteredList.length > 0" class="no-more">已经到底啦</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import StatusTag from '@/components/status-tag/index.vue'
import EmptyState from '@/components/empty-state/index.vue'
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
@import '@/uni.scss';

.page {
  width: 100%;
  height: 100vh;
  background: $bg-color;
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  background: $bg-card;
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
  font-size: $font-base;
  color: $text-secondary;
  font-weight: 400;
}

.tab-text-active {
  color: $primary-color;
  font-weight: 600;
}

.tab-indicator {
  width: 48rpx;
  height: 4rpx;
  background: $primary-color;
  border-radius: 2rpx;
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
  background: $bg-card;
  border-radius: $radius-lg;
  padding: $spacing-base;
}

.card-hover {
  background: $bg-form;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.project-name {
  font-size: $font-base;
  font-weight: 600;
  color: $text-primary;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 补公出审核状态 */
.supplement-row {
  display: flex;
  margin-top: 12rpx;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: $spacing-base;
  margin-top: $spacing-sm;
}

.meta-date,
.meta-type,
.meta-person,
.meta-area {
  font-size: $font-sm;
  color: $text-secondary;
}

.meta-type {
  color: $primary-color;
  font-weight: 500;
}

.card-preview {
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  background: $bg-form;
  border-radius: $radius-sm;
}

.preview-text {
  font-size: $font-sm;
  color: $text-regular;
  line-height: 36rpx;
}

.card-progress {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 16rpx;
}

.progress-label {
  font-size: $font-xs;
  color: $text-secondary;
  flex-shrink: 0;
}

.progress-bar-bg {
  flex: 1;
  height: 8rpx;
  background: $bg-form;
  border-radius: 4rpx;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: $success-color;
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.progress-pct {
  font-size: $font-xs;
  font-weight: 600;
  color: $success-color;
  min-width: 64rpx;
  text-align: right;
}

.no-more {
  text-align: center;
  padding: 32rpx 0;
  font-size: $font-sm;
  color: $text-placeholder;
}
</style>
