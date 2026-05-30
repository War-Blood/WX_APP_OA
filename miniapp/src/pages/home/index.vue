<template>
  <view class="home-page">
    <!-- Status Bar 44px placeholder -->
    <view class="status-bar" />

    <nav-bar
      title="智慧办公助手"
      :showLogo="true"
      :leftCustom="true"
      rightIcon="notification"
      rightIcon2="search"
      :unreadCount="unreadCount"
      @rightClick="handleRightClick"
    />

    <scroll-view
      class="content"
      scroll-y
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <!-- Stats card: 4 stats in a row -->
      <view class="stats-card">
        <view
          v-for="stat in stats"
          :key="stat.label"
          class="stat-item"
          @tap="goToStat(stat)"
        >
          <text class="stat-number" :style="{ color: stat.color }">{{ stat.value }}</text>
          <text class="stat-label">{{ stat.label }}</text>
        </view>
      </view>

      <!-- Quick actions: 4-icon grid -->
      <view class="quick-card">
        <text class="section-title">常用功能</text>
        <view class="quick-grid">
          <view
            v-for="action in quickActions"
            :key="action.label"
            class="quick-item"
            @tap="goToFeature(action.route)"
          >
            <view class="quick-icon" :style="{ backgroundColor: action.bg }">
              <!-- 审批: clipboard -->
              <svg v-if="action.icon === 'clipboard'" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="7" y="3" width="10" height="3" rx="1" stroke="#2B6DE8" stroke-width="1.8" stroke-linecap="round" />
                <rect x="5" y="6" width="14" height="15" rx="2" stroke="#2B6DE8" stroke-width="1.8" stroke-linecap="round" />
                <line x1="9" y1="11" x2="15" y2="11" stroke="#2B6DE8" stroke-width="1.8" stroke-linecap="round" />
                <line x1="9" y1="15" x2="15" y2="15" stroke="#2B6DE8" stroke-width="1.8" stroke-linecap="round" />
              </svg>
              <!-- 日志: document -->
              <svg v-if="action.icon === 'document'" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M8 2H16L20 6V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4C4 2.89543 4.89543 2 6 2H8Z" stroke="#22C55E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                <line x1="8" y1="13" x2="16" y2="13" stroke="#22C55E" stroke-width="1.8" stroke-linecap="round" />
                <line x1="8" y1="17" x2="12" y2="17" stroke="#22C55E" stroke-width="1.8" stroke-linecap="round" />
                <polyline points="8,2 8,6 16,6 16,2" stroke="#22C55E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <!-- 消息: bell -->
              <svg v-if="action.icon === 'bell'" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M8 17.5H4C3.44772 17.5 3 17.0523 3 16.5C3 15.9477 3.44772 15.5 4 15.5H5V10C5 6.68629 7.68629 4 11 4H13C16.3137 4 19 6.68629 19 10V15.5H20C20.5523 15.5 21 15.9477 21 16.5C21 17.0523 20.5523 17.5 20 17.5H16" stroke="#6366F1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M16 20.5C16 21.6046 15.1046 22.5 14 22.5H10C8.89543 22.5 8 21.6046 8 20.5" stroke="#6366F1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <!-- 审核: check-circle -->
              <svg v-if="action.icon === 'check-circle'" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#2B6DE8" stroke-width="1.8" />
                <polyline points="7,12 10.5,15.5 17,9" stroke="#2B6DE8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </view>
            <text class="quick-label">{{ action.label }}</text>
          </view>
        </view>
      </view>

      <!-- Activities: icon + content layout -->
      <view class="activity-card">
        <view class="activity-header">
          <text class="section-title">最近动态</text>
          <text class="more-link" @tap="goToMore">更多 ></text>
        </view>
        <view v-for="(item, index) in activities" :key="item.id">
          <view class="activity-item" @tap="goToActivity(item)">
            <view class="activity-icon" :style="{ backgroundColor: item.iconBg || '#EDF2FF' }">
              <!-- Default activity icon: clock -->
              <svg v-if="!item.iconType || item.iconType === 'default'" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#2B6DE8" stroke-width="1.8" />
                <polyline points="12,7 12,12 16,14" stroke="#2B6DE8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <!-- Approval icon -->
              <svg v-else-if="item.iconType === 'approval'" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="7" y="3" width="10" height="3" rx="1" stroke="#2B6DE8" stroke-width="1.8" />
                <rect x="5" y="6" width="14" height="15" rx="2" stroke="#2B6DE8" stroke-width="1.8" />
                <line x1="9" y1="11" x2="15" y2="11" stroke="#2B6DE8" stroke-width="1.8" />
              </svg>
              <!-- Report icon -->
              <svg v-else-if="item.iconType === 'report'" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M8 2H16L20 6V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4C4 2.89543 4.89543 2 6 2H8Z" stroke="#22C55E" stroke-width="1.8" />
                <line x1="8" y1="13" x2="16" y2="13" stroke="#22C55E" stroke-width="1.8" />
              </svg>
            </view>
            <view class="activity-content">
              <text class="activity-title">{{ item.title }}</text>
              <text class="activity-desc">{{ item.desc }}</text>
            </view>
            <text class="activity-time">{{ item.time }}</text>
          </view>
          <view v-if="index < activities.length - 1" class="divider" />
        </view>
      </view>

      <view v-if="isLoadingMore" class="loading-more">加载中...</view>
      <view v-else-if="noMoreData" class="no-more">— 没有更多了 —</view>
    </scroll-view>

    <tab-bar activeTab="home" @change="handleTabChange" />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import TabBar from '@/components/tab-bar/tab-bar.vue'
import { statsApi, messageApi } from '@/services'

const userStore = useUserStore()

// Stats (4 items with routes + colors)
const stats = ref([
  { label: '待审批', value: 0, color: '#2B6DE8', route: '/pages/approval/index/index?tab=pending' },
  { label: '待提交', value: 0, color: '#F59E0B', route: '/pages/employee/report-edit/index' },
  { label: '已处理', value: 0, color: '#22C55E', route: '/pages/approval/index/index?tab=done' },
  { label: '待阅读', value: 0, color: '#6366F1', route: '/pages/message/index' },
])

// Quick actions (4 items with icon bg + SVG type)
const quickActions = [
  { label: '审批', icon: 'clipboard', bg: '#EDF2FF', route: '/pages/approval/index/index' },
  { label: '日志', icon: 'document', bg: '#F0FDF4', route: '/pages/employee/report-history/index' },
  { label: '消息', icon: 'bell', bg: '#F3E8FF', route: '/pages/message/index' },
  { label: '审核', icon: 'check-circle', bg: '#E6F7FF', route: '/pages/admin/review-list/index' },
]

const activities = ref([])
const unreadCount = ref(0)
const activityPage = ref(1)
const isLoadingMore = ref(false)
const noMoreData = ref(false)
const isRefreshing = ref(false)

onMounted(() => {
  loadPageData()
})

async function loadPageData() {
  try {
    const role = userStore.isAdmin ? 'admin' : 'employee'
    const [statsRes, activitiesRes, unreadRes] = await Promise.all([
      statsApi.getHomeStats(role),
      statsApi.getActivities({ page: 1 }),
      messageApi.getUnreadCount(),
    ])

    const statsData = statsRes.data

    if (userStore.isAdmin) {
      stats.value[0].value = statsData.pendingCount || 0
      stats.value[1].value = statsData.reviewCount || 0
      stats.value[1].label = '待审核'
      stats.value[1].route = '/pages/admin/review-list/index'
      stats.value[2].value = statsData.processedCount || 0
      stats.value[3].value = statsData.unreadCount || 0
    } else {
      stats.value[0].value = statsData.pendingCount || 0
      stats.value[1].value = statsData.submitCount || 0
      stats.value[1].label = '待提交'
      stats.value[1].route = '/pages/employee/report-edit/index'
      stats.value[2].value = statsData.processedCount || 0
      stats.value[3].value = statsData.unreadCount || 0
    }

    const activityList = activitiesRes.data.list || []
    activities.value = activityList.map((item) => ({
      id: item.id,
      title: item.title || item.text || '',
      desc: item.desc || item.subtitle || '',
      time: item.time || '',
      iconBg: item.iconBg || '#EDF2FF',
      iconType: item.type || 'default',
      route: item.route || '',
      type: item.type || 'default',
    }))

    unreadCount.value = unreadRes.data.count || 0
    activityPage.value = 1
    noMoreData.value = false
  } catch (err) {
    console.error('首页数据加载失败', err)
  }
}

async function onRefresh() {
  isRefreshing.value = true
  await loadPageData()
  isRefreshing.value = false
}

async function onLoadMore() {
  if (isLoadingMore.value || noMoreData.value) return
  isLoadingMore.value = true
  try {
    activityPage.value++
    const res = await statsApi.getActivities({ page: activityPage.value })
    const list = res.data.list || []
    if (list.length === 0) {
      noMoreData.value = true
    } else {
      const mapped = list.map((item) => ({
        id: item.id,
        title: item.title || item.text || '',
        desc: item.desc || item.subtitle || '',
        time: item.time || '',
        iconBg: item.iconBg || '#EDF2FF',
        iconType: item.type || 'default',
        route: item.route || '',
        type: item.type || 'default',
      }))
      activities.value = [...activities.value, ...mapped]
    }
  } catch {
    activityPage.value--
  } finally {
    isLoadingMore.value = false
  }
}

function handleRightClick(icon) {
  if (icon === 'notification') {
    uni.navigateTo({ url: '/pages/message/index' })
  } else if (icon === 'search') {
    uni.showToast({ title: '搜索功能开发中', icon: 'none' })
  }
}

function handleTabChange(tab) {
  const routeMap = {
    home: '/pages/home/index',
    features: '/pages/features/index',
    profile: '/pages/profile/index',
  }
  const url = routeMap[tab]
  if (url && tab !== 'home') {
    uni.switchTab({ url })
  }
}

function goToStat(stat) {
  if (stat.route) {
    uni.navigateTo({ url: stat.route })
  } else {
    uni.showToast({ title: '功能待开发', icon: 'none' })
  }
}

function goToFeature(route) {
  uni.navigateTo({ url: route })
}

function goToActivity(activity) {
  const routeMap = {
    approval: '/pages/approval/index/index',
    report: userStore.isAdmin
      ? '/pages/admin/review-list/index'
      : '/pages/employee/report-history/index',
  }
  const url = routeMap[activity.type]
  if (url) {
    uni.navigateTo({ url })
  } else {
    uni.showToast({ title: '功能待开发', icon: 'none' })
  }
}

function goToMore() {
  uni.showToast({ title: '更多动态开发中', icon: 'none' })
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.home-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $bg-color;
}

.status-bar {
  height: 88rpx;
  background: $bg-card;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 24rpx;
}

/* ===== Stats Card ===== */
.stats-card {
  display: flex;
  justify-content: space-around;
  background: $bg-card;
  border-radius: $radius-lg;
  padding: 28rpx 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-number {
  font-size: $font-xxl;
  font-weight: 700;
}

.stat-label {
  font-size: $font-sm;
  color: $text-secondary;
}

/* ===== Quick Actions Card ===== */
.quick-card {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: $font-sm;
  color: $text-secondary;
  margin-bottom: 24rpx;
}

.quick-grid {
  display: flex;
  justify-content: space-around;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.quick-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-label {
  font-size: $font-sm;
  color: $text-primary;
}

/* ===== Activity Card ===== */
.activity-card {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.more-link {
  font-size: $font-xs;
  color: $text-secondary;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 0;
}

.activity-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.activity-title {
  font-size: $font-base;
  color: $text-primary;
  font-weight: 600;
}

.activity-desc {
  font-size: $font-xs;
  color: $text-regular;
}

.activity-time {
  font-size: $font-xs;
  color: $text-secondary;
}

.divider {
  height: 1rpx;
  background: #ECECEC;
  margin: 0 24rpx;
}

/* ===== Load More / No More ===== */
.loading-more,
.no-more {
  text-align: center;
  padding: 24rpx;
  font-size: $font-sm;
  color: $text-secondary;
}
</style>
