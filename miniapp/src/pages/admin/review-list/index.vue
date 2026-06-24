<template>
  <view class="page">
    <nav-bar title="审核管理" :showBack="true" />

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
      <view v-if="filteredList.length > 0" class="review-list">
        <view
          v-for="item in filteredList"
          :key="item.id"
          class="review-card"
          hover-class="card-hover"
          @tap="goToDetail(item)"
        >
          <!-- 缺失报告标识 -->
          <view v-if="activeTab === 'missing'" class="missing-tag">
            <text class="tag-icon">!</text>
            <text class="tag-text">缺失报告({{ daysLate(item.report_date) }}天)</text>
          </view>
          
          <view class="card-header">
            <!-- 缺失报告用项目维度展示 -->
            <view v-if="activeTab === 'missing'" class="user-info">
              <view class="name-block" style="flex: 1;">
                <text class="user-name">{{ item.project || '(未指定项目)' }}</text>
                <text class="project-name">人员: {{ item.workers || '-' }}</text>
              </view>
            </view>
            <!-- 普通审核用用户维度展示 -->
            <view v-else class="user-info">
              <view class="avatar-circle">
                <image
                  v-if="item.avatar"
                  class="avatar-img"
                  :src="item.avatar"
                  mode="aspectFill"
                />
                <text v-else class="avatar-text">{{ getInitial(item.user) }}</text>
              </view>
              <view class="name-block">
                <text class="user-name">{{ item.user }}</text>
                <text class="project-name">{{ item.project || '未命名项目' }}</text>
              </view>
            </view>
            <view class="status-badge" :style="{ background: getStatusBg(item.status) }">
              <text class="status-badge-text" :style="{ color: getStatusColor(item.status) }">{{ item.statusText }}</text>
            </view>
          </view>
          <text class="card-desc">{{ item.desc || item.time || '' }}</text>
        </view>
      </view>
      <view v-else class="empty-wrap">
        <text class="empty-text">暂无审核记录</text>
        <text class="empty-desc">当前筛选条件下没有审核项</text>
      </view>
      <view v-if="noMoreData && filteredList.length > 0" class="no-more">已经到底啦</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { useUserStore } from '@/stores/user'
import { reviewApi } from '@/services/modules/review'
import { complianceApi } from '@/services/modules/compliance'
import { reportApi } from '@/services/modules/report'

const userStore = useUserStore()

onMounted(() => {
  if (!userStore.isAdmin) {
    uni.showToast({ title: '无权限访问', icon: 'none' })
    setTimeout(() => { uni.navigateBack() }, 500)
    return
  }
  loadAll()
})

const activeTab = ref('pending')

const tabs = [
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
  { key: 'supplement', label: '补公出审核' },
  { key: 'missing', label: '缺失报告' }
]

const reviewList = ref([])
const currentPage = ref(1)
const noMoreData = ref(false)
const isLoading = ref(false)
const isRefreshing = ref(false)

const filteredList = computed(() => reviewList.value)

function getInitial(name) {
  return name ? name.slice(0, 1) : '?'
}

function daysLate(dateStr) {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function getStatusBg(status) {
  const map = { pending: '#FFF8F0', approved: '#EFFDF5', rejected: '#FFF0F0', missing: '#FFF0F0', reviewed: '#EFFDF5' }
  return map[status] || '#F5F5F5'
}

function getStatusColor(status) {
  const map = { pending: '#F59E0B', approved: '#22C55E', rejected: '#EF4444', missing: '#EF4444', reviewed: '#22C55E' }
  return map[status] || '#999999'
}

function switchTab(key) {
  activeTab.value = key
  loadAll(true)
}

function goToDetail(item) {
  if (activeTab.value === 'missing') return
  if (activeTab.value === 'supplement') {
    uni.navigateTo({ url: '/pages/employee/report-detail/index?id=' + item.id })
    return
  }
  uni.navigateTo({ url: '/pages/admin/review-detail/index?id=' + item.id })
}

function onLoadMore() {
  if (noMoreData.value || isLoading.value) return
  currentPage.value++
  loadAll(false)
}

async function onRefresh() {
  isRefreshing.value = true
  await loadAll(true)
  isRefreshing.value = false
}

async function loadAll(reset = true) {
  if (isLoading.value) return
  isLoading.value = true

  if (reset) {
    currentPage.value = 1
    noMoreData.value = false
  }

  try {
    const params = {
      status: activeTab.value,
      page: currentPage.value,
      pageSize: 20,
    }

    let listRes
    if (activeTab.value === 'missing') {
      listRes = await complianceApi.getMissingReports({
        page: currentPage.value,
        pageSize: 20
      })
    } else if (activeTab.value === 'supplement') {
      const supplementStatus = params.status === 'supplement' ? 'pending' : params.status
      listRes = await reportApi.getPendingReviews({
        status: supplementStatus,
        page: currentPage.value,
        pageSize: 20
      })
    } else {
      const [res] = await Promise.all([
        reviewApi.getList(params),
        reviewApi.getReviewStats().catch(() => ({ data: {} })),
      ])
      listRes = res
    }

    const list = listRes.data.list || []
    let normalizedList
    if (activeTab.value === 'missing') {
      normalizedList = list.map(item => ({ ...item, status: 'missing', statusText: '缺失' }))
    } else if (activeTab.value === 'supplement') {
      normalizedList = list.map(item => ({
        ...item,
        id: item.reportId,
        user: item.submitterName,
        status: item.status === 'pending_review' ? 'pending' : 'reviewed',
        statusText: item.status === 'pending_review' ? '待审核' : '已审核',
        desc: `补录日期: ${item.supplementDate || '-'}  |  项目: ${item.project || '-'}`,
        time: item.createdAt
      }))
    } else {
      normalizedList = list
    }
    if (reset) { reviewList.value = normalizedList }
    else { reviewList.value = [...reviewList.value, ...normalizedList] }
    if (list.length < 20) { noMoreData.value = true }
  } catch (err) {
    console.error('加载审核数据失败', err)
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

.review-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx;
}

.review-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
}

.card-hover {
  background: #FAFBFC;
}

.missing-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  border-radius: 8rpx;
  margin-bottom: 16rpx;
}

.tag-icon {
  font-size: 28rpx;
}

.tag-text {
  font-size: 26rpx;
  color: #d32f2f;
  font-weight: 600;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
  min-width: 0;
}

.avatar-circle {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #2B6DE8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.avatar-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.name-block {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.user-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
}

.project-name {
  font-size: 24rpx;
  color: #666666;
}

.status-badge {
  height: 40rpx;
  padding: 0 16rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 20rpx;
}

.status-badge-text {
  font-size: 20rpx;
  font-weight: 500;
}

.card-desc {
  font-size: 24rpx;
  color: #666666;
  margin-top: 16rpx;
  display: block;
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
