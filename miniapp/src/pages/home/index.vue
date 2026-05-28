<template>
  <view class="page">
    <NavBar
      title="智慧办公助手"
      :showLogo="true"
      :showNotification="true"
      :showSetting="true"
      :unreadCount="unreadCount"
    />

    <!-- 顶部渐变背景区域 -->
    <view class="header-bg">
      <view class="stats-row" role="region" aria-label="待办统计">
        <view
          v-for="(stat, index) in stats"
          :key="stat.key"
          class="stat-item"
          :class="{ 'stat-item-last': index === stats.length - 1 }"
          @tap="goToStat(stat)"
          role="button"
          tabindex="0"
          :aria-label="`${stat.label}：${stat.count}件`"
        >
          <text class="stat-num" aria-hidden="true">{{ stat.count }}</text>
          <text class="stat-label">{{ stat.label }}</text>
        </view>
      </view>
    </view>

    <!-- 内容区域 -->
    <scroll-view
      class="content-scroll"
      scroll-y
      :scroll-with-animation="true"
      @scrolltolower="onLoadMore"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      role="main"
      aria-label="首页内容"
    >
      <view class="content-area">
        <!-- 快捷入口卡片 -->
        <view class="card quick-card" role="region" aria-labelledby="quick-title">
          <view class="card-header">
            <text id="quick-title" class="card-title">快捷入口</text>
          </view>
          <view class="quick-grid" role="list">
            <view
              v-for="entry in quickEntries"
              :key="entry.key"
              class="quick-item"
              hover-class="quick-hover"
              :hover-stay-time="100"
              @tap="goToFeature(entry)"
              role="listitem"
              tabindex="0"
              :aria-label="entry.label"
            >
              <view class="quick-icon-wrap" :style="{ background: entry.bg }" aria-hidden="true">
                <IconPark :name="entry.icon" size="56" />
              </view>
              <text class="quick-label">{{ entry.label }}</text>
            </view>
          </view>
        </view>

        <!-- 待办事项卡片 -->
        <view class="card task-card" role="region" aria-labelledby="task-title">
          <view class="card-header">
            <text id="task-title" class="card-title">待办事项</text>
            <button class="card-more" @tap="goToTasks" aria-label="查看全部待办事项">
              详情 <text class="arrow" aria-hidden="true">›</text>
            </button>
          </view>
          <view class="task-grid" role="list">
            <view
              v-for="task in tasks"
              :key="task.key"
              class="task-item"
              :style="{ background: task.bgColor }"
              @tap="goToPending(task)"
              role="listitem"
              tabindex="0"
              :aria-label="`${task.label}：${task.count}件`"
            >
              <text class="task-num" :style="{ color: task.color }" aria-hidden="true">{{ task.count }}</text>
              <text class="task-label">{{ task.label }}</text>
            </view>
          </view>
        </view>

        <!-- 最近动态卡片 -->
        <view class="card activity-card" role="region" aria-labelledby="activity-title">
          <view class="card-header">
            <text id="activity-title" class="card-title">最近动态</text>
          </view>
          <view class="activity-list" role="list">
            <view
              v-for="(activity, index) in activities"
              :key="activity.id"
              class="activity-item"
              :class="{ 'activity-item-last': index === activities.length - 1 }"
              hover-class="activity-hover"
              :hover-stay-time="100"
              @tap="goToActivity(activity)"
              role="listitem"
              tabindex="0"
              :aria-label="`${activity.text}，${activity.time}，${activity.date}`"
            >
              <view class="activity-icon-wrap" :style="{ background: activity.iconBg }" aria-hidden="true">
                <image class="activity-icon-img" :src="activity.iconSrc" mode="aspectFit" />
              </view>
              <view class="activity-body">
                <text class="activity-text">{{ activity.text }}</text>
                <text class="activity-time">{{ activity.time }}</text>
              </view>
              <text class="activity-date" aria-hidden="true">{{ activity.date }}</text>
            </view>
          </view>
        </view>

        <view v-if="isLoadingMore" class="loading-more" role="status" aria-live="polite">
          <view class="loading-spinner" aria-hidden="true"></view>
          <text class="loading-text">加载中...</text>
        </view>
        <view v-else-if="noMoreData" class="no-more" role="status">
          <text class="no-more-text">已经到底啦</text>
        </view>
      </view>
    </scroll-view>

    <TabBar activeTab="home" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import TabBar from '@/components/tab-bar/tab-bar.vue'
import IconPark from '@/components/icon-park/icon-park.vue'

const userStore = useUserStore()
const isRefreshing = ref(false)
const isLoadingMore = ref(false)
const noMoreData = ref(false)
const unreadCount = ref(5)

const stats = ref([
  { key: 'pending', label: '待审批', count: 3 },
  { key: 'submit', label: '待提交', count: 1 },
  { key: 'processed', label: '已处理', count: 28 },
  { key: 'unread', label: '待阅读', count: 5 }
])

const quickEntries = ref([
  { key: 'approval', icon: 'approval', label: '审批管理', bg: 'linear-gradient(135deg, #EDF2FF 0%, #E0E7FF 100%)' },
  { key: 'report', icon: 'report', label: '日报提交', bg: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)' },
  { key: 'announcement', icon: 'announcement', label: '通知公告', bg: 'linear-gradient(135deg, #F3E8FF 0%, #EDE9FE 100%)' },
  { key: 'contacts', icon: 'contacts', label: '通讯录', bg: 'linear-gradient(135deg, #E6F7FF 0%, #DBEAFE 100%)' }
])

const tasks = ref([
  { key: 'approval', label: '待审批', count: 3, color: '#22C55E', bgColor: '#F0FDF4' },
  { key: 'report', label: '待提交日报', count: 1, color: '#2B6DE8', bgColor: '#EDF2FF' },
  { key: 'message', label: '未读消息', count: 12, color: '#6366F1', bgColor: '#EEF2FF' }
])

const activities = ref([
  {
    id: 1,
    iconSrc: '/static/images/home/icon_daily_green.png',
    iconBg: '#F0FDF4',
    text: '完成审批 王明 的请假申请',
    time: '10:30',
    date: '今天'
  },
  {
    id: 2,
    iconSrc: '/static/images/home/icon_pending_blue_1.png',
    iconBg: '#EDF2FF',
    text: '设计部 提交了05-26日报',
    time: '09:15',
    date: '今天'
  },
  {
    id: 3,
    iconSrc: '/static/images/home/icon_pending_orange_1.png',
    iconBg: '#FFF7ED',
    text: '任务提醒 · 设计方案',
    time: '昨天',
    date: '昨天'
  },
  {
    id: 4,
    iconSrc: '/static/images/home/icon_pending_pink_1.png',
    iconBg: '#FDF2F8',
    text: '日报待补 · 05-26',
    time: '昨天',
    date: '昨天'
  }
])

function onRefresh() {
  isRefreshing.value = true
  setTimeout(() => {
    stats.value = stats.value.map(s => ({
      ...s,
      count: Math.floor(Math.random() * 10) + 1
    }))
    isRefreshing.value = false
    uni.showToast({ title: '刷新成功', icon: 'success', duration: 1500 })
  }, 1000)
}

function onLoadMore() {
  if (isLoadingMore.value || noMoreData.value) return
  isLoadingMore.value = true
  setTimeout(() => {
    isLoadingMore.value = false
    noMoreData.value = true
  }, 1000)
}

function goToStat(stat) {
  uni.showToast({ title: `查看${stat.label}`, icon: 'none' })
}

function goToFeature(entry) {
  const featureMap = {
    approval: '/pages/approval/index',
    report: '/pages/employee/report-history/index',
    announcement: '/pages/announcement/index',
    contacts: '/pages/contacts/index'
  }
  const url = featureMap[entry.key]
  if (url) {
    uni.navigateTo({ url })
  } else {
    uni.showToast({ title: entry.label, icon: 'none' })
  }
}

function goToPending(task) {
  uni.showToast({ title: task.label, icon: 'none' })
}

function goToTasks() {
  uni.navigateTo({ url: '/pages/task/index' })
}

function goToActivity(activity) {
  uni.showToast({ title: '查看动态详情', icon: 'none' })
}
</script>

<style lang="scss" scoped>
$color-primary: #2B6DE8;
$bg-page: #F7F7F7;
$bg-card: #FFFFFF;
$bg-hover: #F5F5F5;
$text-primary: rgba(0, 0, 0, 0.9);
$text-secondary: rgba(0, 0, 0, 0.6);
$text-tertiary: rgba(0, 0, 0, 0.4);
$text-white: #FFFFFF;
$border-color: #ECECEC;
$radius-sm: 8rpx;
$radius-md: 12rpx;
$radius-lg: 16rpx;
$transition-fast: 150ms ease;
$transition-normal: 200ms ease;

.page {
  width: 100%;
  height: 100vh;
  background: $bg-page;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header-bg {
  background: linear-gradient(180deg, #2B6DE8 0%, #3B77EA 60%, #5B8DF0 100%);
  padding: 24rpx 24rpx 32rpx;
  flex-shrink: 0;
}

.stats-row {
  display: flex;
  background: rgba(255, 255, 255, 0.15);
  border-radius: $radius-lg;
  padding: 20rpx 0;
  backdrop-filter: blur(8rpx);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  border-right: 1rpx solid rgba(255, 255, 255, 0.2);
  padding: 8rpx 0;
  transition: background-color $transition-fast;

  &:active {
    background: rgba(255, 255, 255, 0.1);
    border-radius: $radius-md;
  }

  &-last {
    border-right: none;
  }
}

.stat-num {
  font-size: 48rpx;
  font-weight: 700;
  color: $text-white;
  line-height: 1.2;
}

.stat-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.3;
}

.content-scroll {
  flex: 1;
  height: 0;
}

.content-area {
  padding: 24rpx;
  padding-bottom: calc(24rpx + 112rpx + env(safe-area-inset-bottom));
}

.card {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  transition: transform $transition-normal, box-shadow $transition-normal;

  &:active {
    transform: translateY(-2rpx);
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
  line-height: 1.4;
}

.card-more {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 24rpx;
  color: $text-tertiary;
  background: transparent;
  border: none;
  padding: 8rpx 0;
  margin: 0;
  line-height: 1.3;

  &::after {
    border: none;
  }

  &:active {
    color: $color-primary;
  }
}

.arrow {
  font-size: 28rpx;
  line-height: 1;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8rpx;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 0;
  border-radius: $radius-md;
  transition: background-color $transition-fast;
}

.quick-hover {
  background: $bg-hover;
}

.quick-icon-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: $radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform $transition-fast;

  .quick-item:active & {
    transform: scale(0.95);
  }
}

.quick-label {
  font-size: 24rpx;
  color: $text-primary;
  text-align: center;
  line-height: 1.3;
}

.task-grid {
  display: flex;
  gap: 16rpx;
}

.task-item {
  flex: 1;
  border-radius: $radius-md;
  padding: 24rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  transition: transform $transition-fast, box-shadow $transition-fast;

  &:active {
    transform: translateY(-2rpx);
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  }
}

.task-num {
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.2;
}

.task-label {
  font-size: 22rpx;
  color: $text-secondary;
  text-align: center;
  line-height: 1.3;
}

.activity-list {
  display: flex;
  flex-direction: column;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid $border-color;
  transition: background-color $transition-fast;

  &-last {
    border-bottom: none;
  }
}

.activity-hover {
  background: #FAFBFC;
  margin: 0 -24rpx;
  padding-left: 24rpx;
  padding-right: 24rpx;
}

.activity-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-icon-img {
  width: 36rpx;
  height: 36rpx;
}

.activity-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.activity-text {
  font-size: 26rpx;
  color: $text-primary;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-time {
  font-size: 22rpx;
  color: $text-tertiary;
  line-height: 1.3;
}

.activity-date {
  font-size: 22rpx;
  color: $text-tertiary;
  flex-shrink: 0;
  line-height: 1.3;
}

.loading-more,
.no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 32rpx 0;
}

.loading-spinner {
  width: 32rpx;
  height: 32rpx;
  border: 3rpx solid $border-color;
  border-top-color: $color-primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text,
.no-more-text {
  font-size: 24rpx;
  color: $text-tertiary;
}
</style>
