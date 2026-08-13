<template>
  <view class="home-page">
    <nav-bar
      :title="APP_NAME"
      :leftCustom="true"
    />

    <!-- Stats header: blue gradient, fixed height -->
    <view class="stats-header">
      <text class="month-label">{{ monthLabel }}</text>
      <view class="stats-row">
        <view
          v-for="stat in stats"
          :key="stat.label"
          class="stat-item"
          @tap="goToStat(stat)"
        >
          <text class="stat-number">{{ stat.value }}</text>
          <text class="stat-text">{{ stat.label }}</text>
        </view>
      </view>
    </view>

    <scroll-view
      class="content"
      scroll-y
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <!-- Quick actions: 4-icon grid -->
      <view class="quick-card">
        <view class="section-title-row">
          <text class="section-title">常用功能</text>
        </view>
        <view class="quick-grid">
          <view
            v-for="action in quickActions"
            :key="action.label"
            class="quick-item"
            @tap="goToFeature(action.route)"
          >
            <view class="quick-icon" :class="'quick-icon--' + action.cls">
              <image class="quick-icon-img" :src="action.iconSrc" mode="aspectFit" />
            </view>
            <text class="quick-label">{{ action.label }}</text>
          </view>
        </view>
      </view>

      <!-- Divider: 10px #EDEDED -->
      <view class="section-divider" />

      <!-- Activities: colored dot + text -->
      <view class="activity-card">
        <view class="section-title-row">
          <text class="section-title">最近动态</text>
        </view>
        <view v-for="(item, index) in activities" :key="item.id">
          <view class="activity-item" @tap="goToActivity(item)">
            <view class="activity-dot" :class="'activity-dot--' + (item.dotClass || 'default')" />
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
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import TabBar from '@/components/tab-bar/tab-bar.vue'
import { statsApi } from '@/services/modules/stats'
import { messageApi } from '@/services/modules/message'
import { renewDailyReminder } from '@/utils/subscribe'
import { APP_NAME } from '@/config/version'

const userStore = useUserStore()
const appStore = useAppStore()

const stats = ref([
  { label: '已填写', value: 0, route: '' },
  { label: '未填写', value: 0, route: '' },
  { label: '待审核', value: 0, route: '/pages/admin/review-list/index' },
])

const monthLabel = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}年${now.getMonth() + 1}月`
})

// 快捷操作：从模块列表取 sort 前 4 的可见模块（背景色收敛为 scoped class，见 .quick-icon--*）
const quickIconMap = {
  approval: { iconSrc: '/static/icons/quick-clipboard.svg', cls: 'approval' },
  report: { iconSrc: '/static/icons/quick-document.svg', cls: 'report' },
  message: { iconSrc: '/static/icons/quick-bell.svg', cls: 'message' },
  report_history: { iconSrc: '/static/icons/quick-check.svg', cls: 'report_history' },
  review: { iconSrc: '/static/icons/quick-check.svg', cls: 'review' },
  compliance: { iconSrc: '/static/icons/quick-check.svg', cls: 'compliance' },
  stats: { iconSrc: '/static/icons/quick-document.svg', cls: 'stats' },
  attendance: { iconSrc: '/static/icons/quick-clock.svg', cls: 'attendance' }
}
const defaultQuickIcon = { iconSrc: '/static/icons/quick-document.svg', cls: 'default' }

const quickActions = computed(() => {
  return appStore.modules
    .filter(m => m.visible !== false)
    .sort((a, b) => (a.sort || 99) - (b.sort || 99))
    .slice(0, 4)
    .map(m => {
      const icon = quickIconMap[m.key] || defaultQuickIcon
      return {
        label: m.name,
        cls: icon.cls,
        iconSrc: icon.iconSrc,
        route: m.route || ''
      }
    })
})

// 日报提醒订阅续订已收敛到公出日志入口(utils/subscribe.js renewDailyReminder)

const activities = ref([])
const unreadCount = ref(0)
const activityPage = ref(1)
const isLoadingMore = ref(false)
const noMoreData = ref(false)
const isRefreshing = ref(false)

onMounted(() => { userStore.refreshProfile(); loadPageData() })

async function loadPageData() {
  try {
    const role = userStore.isAdmin ? 'admin' : 'employee'
    const [statsRes, activitiesRes, unreadRes] = await Promise.all([
      statsApi.getHomeStats(role),
      statsApi.getActivities({ page: 1, pageSize: 5 }),
      messageApi.getUnreadCount(),
    ])
    const d = statsRes.data
    // 月度填写统计（admin 全员 / employee 个人）
    stats.value[0].value = d.monthFilled || 0
    stats.value[1].value = d.monthUnfilled || 0
    // 待审核（角色区分）
    if (userStore.isAdmin) {
      stats.value[2].value = d.reviewCount || 0
      stats.value[2].label = '待审核'
      stats.value[2].route = '/pages/admin/review-list/index'
    } else {
      stats.value[2].value = d.pendingCount || 0
      stats.value[2].label = '待审核'
      stats.value[2].route = '/pages/approval/index/index?tab=pending'
    }
    const list = activitiesRes.data.list || []
    activities.value = list.map((item) => ({
      id: item.id,
      title: item.title || item.text || '',
      desc: item.desc || item.subtitle || '',
      time: item.time || '',
      dotClass: item.type === 'report' ? 'report' : 'default',
      type: item.type || 'default',
    }))
    unreadCount.value = unreadRes.data.count || 0
    activityPage.value = 1
    noMoreData.value = false
  } catch { /* 加载失败时保留当前统计值 */ }
}

async function onRefresh() { isRefreshing.value = true; await loadPageData(); isRefreshing.value = false }

async function onLoadMore() {
  if (isLoadingMore.value || noMoreData.value) return
  isLoadingMore.value = true
  try {
    activityPage.value++
    const res = await statsApi.getActivities({ page: activityPage.value, pageSize: 5 })
    const list = res.data.list || []
    if (!list.length) { noMoreData.value = true; return }
    const mapped = list.map((item) => ({
      id: item.id, title: item.title || item.text || '', desc: item.desc || item.subtitle || '',
      time: item.time || '', dotClass: item.type === 'report' ? 'report' : 'default', type: item.type || 'default',
    }))
    activities.value = [...activities.value, ...mapped]
  } catch { activityPage.value-- }
  finally { isLoadingMore.value = false }
}

function handleTabChange(tab) {
  const map = { home: '/pages/home/index', features: '/pages/features/index', profile: '/pages/profile/index' }
  if (map[tab] && tab !== 'home') uni.switchTab({ url: map[tab] })
}
function goToStat(stat) {
  if (stat.label === '未填写') {
    uni.navigateTo({ url: '/pages/employee/missing-dates/index' })
    return
  }
  if (stat.route) {
    if (stat.route.includes('report-edit')) renewDailyReminder()
    uni.navigateTo({ url: stat.route })
  }
}
function goToFeature(route) {
  if (!route) return
  if (route.includes('report-edit')) renewDailyReminder()
  uni.navigateTo({ url: route })
}
function goToActivity(item) {
  const map = { approval: '/pages/approval/index/index', report: userStore.isAdmin ? '/pages/admin/review-list/index' : '/pages/employee/report-history/index' }
  if (map[item.type]) uni.navigateTo({ url: map[item.type] })
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

/* 页面背景与品牌令牌统一 */
.home-page { display: flex; flex-direction: column; height: 100vh; background: $bg-color; }

/* Stats header: brand blue gradient, month label + 3-col stats */
.stats-header {
  height: 200rpx;
  background: linear-gradient(180deg, $primary-color 0%, $primary-light 100%);
  padding: 24rpx 40rpx 48rpx 40rpx;
  flex-shrink: 0;
}
.month-label {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,0.7);
  text-align: center;
  margin-bottom: 12rpx;
}
.stats-row {
  display: flex;
  background: rgba(255,255,255,0.1);
  border-radius: 32rpx;
  height: 120rpx;
}
.stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4rpx; }
.stat-number { font-size: 56rpx; font-weight: 700; color: #FFFFFF; line-height: 1; }
.stat-text { font-size: 22rpx; color: #FFFFFF; }

/* Scrollable content */
.content { flex: 1; overflow-y: auto; background: $bg-color; }

/* Quick actions card: white, full width */
.quick-card { background: $bg-card; padding-bottom: 48rpx; }
.section-title-row { height: 72rpx; display: flex; align-items: flex-end; padding: 0 24rpx; }
.section-title { font-size: 24rpx; font-weight: 500; color: $text-regular; line-height: 30rpx; }
.quick-grid { display: flex; justify-content: space-around; padding: 24rpx; }
.quick-item { display: flex; flex-direction: column; align-items: center; gap: 16rpx; width: 112rpx; }
.quick-icon { width: 96rpx; height: 96rpx; border-radius: 48rpx; display: flex; align-items: center; justify-content: center; }
.quick-icon-img { width: 48rpx; height: 48rpx; }
.quick-label { font-size: 24rpx; color: $text-primary; }

/* 快捷入口底色：静态 class 收敛（模块 → 浅色 tint，与设计文档一致） */
.quick-icon--approval, .quick-icon--attendance { background: $primary-bg; }
.quick-icon--report { background: #F0FDF4; }
.quick-icon--message { background: #F3E8FF; }
.quick-icon--report_history, .quick-icon--review { background: #E6F7FF; }
.quick-icon--compliance { background: #FFF0F0; }
.quick-icon--stats { background: #FEF3E2; }
.quick-icon--default { background: #FAFAFA; }

/* 动态 dot：report → success 绿，default → 品牌蓝 */
.activity-dot--report { background: $success-color; }
.activity-dot--default { background: $primary-color; }

/* Section divider */
.section-divider { height: 20rpx; background: $border-light; }

/* Activity card */
.activity-card { background: $bg-card; padding-bottom: 24rpx; }
.activity-item { display: flex; align-items: center; padding: 24rpx; gap: 24rpx; }
.activity-dot { width: 16rpx; height: 16rpx; border-radius: 8rpx; flex-shrink: 0; }
.activity-content { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.activity-title { font-size: 26rpx; font-weight: 600; color: $text-primary; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.activity-desc { font-size: 24rpx; color: $text-secondary; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.activity-time { font-size: 22rpx; color: $text-secondary; flex-shrink: 0; }
.divider { height: 1rpx; background: $border-light; margin: 0 24rpx; }

.loading-more, .no-more { text-align: center; padding: 24rpx; font-size: 24rpx; color: $text-secondary; }
</style>
