<template>
  <view class="page">
    <nav-bar title="审批中心" :showBack="true" />

    <!-- Tabs: 3 equal tabs, 125px each -->
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        @tap="switchTab(tab.key)"
      >
        <text
          class="tab-text"
          :style="{ color: activeTab === tab.key ? '#2B6DE8' : '#999999', fontWeight: activeTab === tab.key ? '600' : '400' }"
        >{{ tab.label }}</text>
        <view v-if="activeTab === tab.key" class="tab-indicator" />
      </view>
    </view>

    <!-- Filter pills: only for approval tabs -->
    <scroll-view v-if="!isReviewTab" class="filters-scroll" scroll-x enable-flex :show-scrollbar="false">
      <view class="filters">
        <view
          v-for="filter in filters"
          :key="filter.key"
          class="filter-pill"
          :class="{ 'filter-active': activeFilter === filter.key }"
          @tap="activeFilter = filter.key"
        >
          <text
            class="filter-text"
            :style="{ color: activeFilter === filter.key ? '#FFFFFF' : '#666666', fontWeight: activeFilter === filter.key ? '500' : '400' }"
          >{{ filter.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- Content list: VERTICAL, spacing 12px -->
    <scroll-view
      class="content-scroll"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <!-- Approval list -->
      <view v-if="!isReviewTab && approvalList.length > 0" class="approval-list">
        <view
          v-for="item in approvalList"
          :key="item.id"
          class="approval-card"
          hover-class="card-hover"
          @tap="goToDetail(item)"
        >
          <!-- Type icon: 48×48, cornerRadius 12 -->
          <view class="card-icon" :style="{ backgroundColor: getTypeBg(item.type) }">
            <image class="card-icon-img" :src="getTypeIcon(item.type)" mode="aspectFit" />
          </view>
          <!-- Info: title + applicant -->
          <view class="card-info">
            <text class="card-title">{{ item.title }}</text>
            <text class="card-applicant">{{ item.applicant }}</text>
          </view>
          <!-- Right: time + status badge -->
          <view class="card-right">
            <text class="card-time">{{ item.applyTime || item.date }}</text>
            <view class="status-badge" :style="{ backgroundColor: getStatusBg(item.status) }">
              <text class="status-text" :style="{ color: getStatusColor(item.status) }">{{ item.statusText || getStatusText(item.status) }}</text>
            </view>
          </view>
        </view>
        <view v-if="isLoadingMore" class="loading-more">加载中...</view>
        <view v-else-if="noMoreData" class="no-more">— 没有更多了 —</view>
      </view>
      <empty-state v-else-if="!isReviewTab" icon="empty" title="暂无审批记录" description="当前筛选条件下没有审批单" />

      <!-- Review list (admin only) -->
      <view v-if="isReviewTab && reviewList.length > 0" class="approval-list">
        <view
          v-for="item in reviewList"
          :key="item.id"
          class="approval-card"
          hover-class="card-hover"
          @tap="goToDetail(item)"
        >
          <view class="card-icon" :style="{ backgroundColor: '#FDE8E8' }">
            <view class="card-avatar">{{ (item.userName || item.user || '?').charAt(0) }}</view>
          </view>
          <view class="card-info">
            <text class="card-title">{{ item.userName || item.user || '未知用户' }}</text>
            <text class="card-subtitle">{{ item.projectName || item.project || '未选择项目' }}</text>
          </view>
          <view class="card-right">
            <text class="card-time">{{ item.date || '' }}</text>
            <view class="status-badge" :style="{ backgroundColor: getReviewStatusBg(item.status) }">
              <text class="status-text" :style="{ color: getReviewStatusColor(item.status) }">{{ item.statusLabel || item.status || '' }}</text>
            </view>
          </view>
        </view>
        <view v-if="isLoadingMore" class="loading-more">加载中...</view>
        <view v-else-if="noMoreData" class="no-more">— 没有更多了 —</view>
      </view>
      <empty-state v-else-if="isReviewTab" icon="empty" title="暂无审核记录" description="当前没有需要审核的日报" />
    </scroll-view>

    <!-- Bottom tab bar matching L1 pages -->
    <tab-bar activeTab="features" @change="handleTabChange" />
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import TabBar from '@/components/tab-bar/tab-bar.vue'
import EmptyState from '@/components/empty-state/index.vue'
import { approvalApi } from '@/services/modules/approval'
import { reviewApi } from '@/services/modules/review'

const userStore = useUserStore()

const activeTab = ref('pending')
const activeFilter = ref('all')

const tabs = computed(() => {
  const base = [
    { key: 'pending', label: '待审批' },
    { key: 'mine', label: '我发起的' },
    { key: 'done', label: '已处理' }
  ]
  // Admin: add review tab
  if (userStore.isAdmin) {
    base.push({ key: 'review', label: '审核' })
  }
  return base
})

const filters = [
  { key: 'all', label: '全部' },
  { key: 'leave', label: '请假' },
  { key: 'expense', label: '报销' },
  { key: 'seal', label: '售后' }
]

const approvalList = ref([])
const reviewList = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const noMoreData = ref(false)
const isLoading = ref(false)
const isRefreshing = ref(false)
const isLoadingMore = ref(false)

// Hide filters and approval list when on review tab
const isReviewTab = computed(() => activeTab.value === 'review')

onMounted(() => {
  if (!userStore.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  loadApprovalList(true)
})

function switchTab(key) {
  if (activeTab.value === key) return
  activeTab.value = key
  activeFilter.value = 'all'
  if (key === 'review') {
    loadReviewList(true)
  } else {
    loadApprovalList(true)
  }
}

function goToDetail(item) {
  if (isReviewTab.value) {
    uni.navigateTo({ url: '/pages/admin/review-detail/index?id=' + item.id })
  } else {
    uni.navigateTo({ url: '/pages/approval/detail?id=' + item.id })
  }
}

async function loadReviewList(reset = true) {
  if (isLoading.value) return
  isLoading.value = true
  if (reset) { currentPage.value = 1; noMoreData.value = false }
  try {
    const res = await reviewApi.getList({ page: currentPage.value, pageSize: pageSize.value })
    const list = res.data.list || []
    reviewList.value = reset ? list : [...reviewList.value, ...list]
    if (list.length < pageSize.value) noMoreData.value = true
  } catch (err) {
    console.error('加载审核列表失败', err)
  } finally { isLoading.value = false }
}

async function loadApprovalList(reset = true) {
  if (isLoading.value) return
  isLoading.value = true

  if (reset) {
    currentPage.value = 1
    noMoreData.value = false
  }

  try {
    const params = {
      tab: activeTab.value,
      type: activeFilter.value === 'all' ? undefined : activeFilter.value,
      page: currentPage.value,
      pageSize: pageSize.value
    }

    const res = await approvalApi.getList(params)
    const list = res.data.list || []

    if (reset) {
      approvalList.value = list
    } else {
      approvalList.value = [...approvalList.value, ...list]
    }

    if (list.length < pageSize.value) {
      noMoreData.value = true
    }
  } catch (err) {
    console.error('加载审批列表失败', err)
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

watch(activeFilter, () => {
  loadApprovalList(true)
})

async function onLoadMore() {
  if (noMoreData.value || isLoading.value || isLoadingMore.value) return
  isLoadingMore.value = true
  currentPage.value++
  if (isReviewTab.value) await loadReviewList(false)
  else await loadApprovalList(false)
}

async function onRefresh() {
  isRefreshing.value = true
  if (isReviewTab.value) await loadReviewList(true)
  else await loadApprovalList(true)
  isRefreshing.value = false
}

function handleTabChange(tab) {
  const map = { home: '/pages/home/index', features: '/pages/features/index', profile: '/pages/profile/index' }
  if (map[tab] && tab !== 'features') uni.switchTab({ url: map[tab] })
}

// Type helpers
const typeIconMap = {
  leave: '/static/icons/feat-clock.svg',
  expense: '/static/icons/feat-cart.svg',
  seal: '/static/icons/feat-shield.svg',
  travel: '/static/icons/feat-book.svg',
  purchase: '/static/icons/feat-cart.svg',
  general: '/static/icons/feat-document.svg'
}

const typeBgMap = {
  leave: '#EDF2FF',
  expense: '#FFF3E0',
  seal: '#FCE4EC',
  travel: '#E8F5E9',
  purchase: '#F3E5F5',
  general: '#F5F5F5'
}

function getTypeIcon(type) {
  return typeIconMap[type] || typeIconMap.general
}

function getTypeBg(type) {
  return typeBgMap[type] || typeBgMap.general
}

function getStatusBg(status) {
  const map = {
    pending: '#FFF8ED',
    approved: '#F0FFF4',
    rejected: '#FFF0F0'
  }
  return map[status] || '#FFF8ED'
}

function getStatusColor(status) {
  const map = {
    pending: '#F59E0B',
    approved: '#22C55E',
    rejected: '#EF4444'
  }
  return map[status] || '#F59E0B'
}

function getStatusText(status) {
  const map = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回'
  }
  return map[status] || status || '未知'
}

function getReviewStatusBg(status) {
  const map = { pending: '#FFF3E0', approved: '#F0FDF4', rejected: '#FFF0F0' }
  return map[status] || '#F5F5F5'
}
function getReviewStatusColor(status) {
  const map = { pending: '#F59E0B', approved: '#22C55E', rejected: '#EF4444' }
  return map[status] || '#999999'
}
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F7F7F7;
}

/* Tabs: 3 equal columns, 44px (88rpx) height, white bg */
.tabs {
  display: flex;
  background: #FFFFFF;
  height: 88rpx;
  flex-shrink: 0;
}
.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}
.tab-text {
  font-size: 28rpx;
}
.tab-indicator {
  position: absolute;
  bottom: 0;
  width: 48rpx;
  height: 6rpx;
  background: #2B6DE8;
  border-radius: 4rpx;
}

/* Filters: horizontally scrollable */
.filters-scroll {
  width: 100%;
  white-space: nowrap;
  background: #FFFFFF;
  flex-shrink: 0;
}
.filters {
  display: inline-flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 32rpx;
}
.filter-pill {
  padding: 6rpx 24rpx;
  border-radius: 24rpx;
  background: #F5F5F5;
  flex-shrink: 0;
}
.filter-active {
  background: #2B6DE8;
}
.filter-text {
  font-size: 24rpx;
  line-height: 1.3;
}

/* Scrollable content */
.content-scroll {
  flex: 1;
  height: 0;
  padding: 24rpx;
}

.approval-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* Card: white, cornerRadius 16px, HORIZONTAL with 14px spacing */
.approval-card {
  display: flex;
  align-items: center;
  gap: 28rpx;
  padding: 24rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
}
.card-hover {
  background: #FAFBFC;
}

.card-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.card-icon-img {
  width: 44rpx;
  height: 44rpx;
}

.card-avatar {
  font-size: 32rpx;
  font-weight: 700;
  color: #EF4444;
  line-height: 1;
}.card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}
.card-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-applicant {
  font-size: 24rpx;
  color: #999999;
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12rpx;
  flex-shrink: 0;
}
.card-time {
  font-size: 22rpx;
  color: #999999;
}
.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}
.status-text {
  font-size: 22rpx;
}

.loading-more, .no-more {
  text-align: center;
  padding: 24rpx;
  font-size: 24rpx;
  color: #B0B0B0;
}
</style>
