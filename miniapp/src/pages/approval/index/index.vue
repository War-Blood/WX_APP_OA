<template>
  <view class="page">
    <view class="nav-bar">
      <view class="nav-left" @tap="goBack">
        <image class="nav-icon" src="/static/images/approval/back.png" mode="aspectFit" />
      </view>
      <text class="nav-title">审批中心</text>
      <view class="nav-right" @tap="showMore">
        <image class="nav-icon" src="/static/images/approval/more.png" mode="aspectFit" />
      </view>
    </view>

    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ 'tab-active': activeTab === tab.key }"
        @tap="switchTab(tab.key)"
      >
        <text class="tab-text" :class="{ 'tab-text-active': activeTab === tab.key }">{{ tab.label }}</text>
        <view v-if="activeTab === tab.key" class="tab-indicator"></view>
      </view>
    </view>

    <view class="filters">
      <view
        v-for="filter in filters"
        :key="filter.key"
        class="filter-tag"
        :class="{ 'filter-active': activeFilter === filter.key }"
        @tap="activeFilter = filter.key"
      >
        <text class="filter-text" :class="{ 'filter-text-active': activeFilter === filter.key }">{{ filter.label }}</text>
      </view>
    </view>

    <scroll-view class="content-scroll" scroll-y>
      <view class="approval-list">
        <view
          v-for="item in approvalList"
          :key="item.id"
          class="approval-card"
          hover-class="card-hover"
          @tap="goToDetail(item)"
        >
          <view class="card-left">
            <view class="card-icon" :style="{ background: item.iconBg }">
              <image class="card-icon-img" :src="item.iconSrc" mode="aspectFit" />
            </view>
            <view class="card-info">
              <text class="card-title">{{ item.title }}</text>
              <text class="card-subtitle">{{ item.applicant }}</text>
            </view>
          </view>
          <view class="card-right">
            <text class="card-date">{{ item.date }}</text>
            <view class="status-tag" :style="{ background: item.statusBg }">
              <text class="status-text" :style="{ color: item.statusColor }">{{ item.status }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const activeTab = ref('pending')
const activeFilter = ref('all')

const tabs = [
  { key: 'pending', label: '待审批' },
  { key: 'mine', label: '我发起的' },
  { key: 'done', label: '已处理' }
]

const filters = [
  { key: 'all', label: '全部' },
  { key: 'leave', label: '请假' },
  { key: 'expense', label: '报销' },
  { key: 'seal', label: '用章' },
  { key: 'travel', label: '出差' }
]

const approvalList = ref([
  {
    id: 1,
    title: '请假申请',
    applicant: '李四 · 技术部',
    date: '05-27',
    status: '待审批',
    statusBg: '#FFF3E0',
    statusColor: '#F59E0B',
    iconBg: '#FFF3E0',
    iconSrc: '/static/images/approval/leave.png'
  },
  {
    id: 2,
    title: '报销申请',
    applicant: '王五 · 财务部',
    date: '05-26',
    status: '待审批',
    statusBg: '#FFF3E0',
    statusColor: '#F59E0B',
    iconBg: '#EDF2FF',
    iconSrc: '/static/images/approval/reimburse.png'
  },
  {
    id: 3,
    title: '用章申请',
    applicant: '赵六 · 行政部',
    date: '05-26',
    status: '待审批',
    statusBg: '#FFF3E0',
    statusColor: '#F59E0B',
    iconBg: '#FCE4EC',
    iconSrc: '/static/images/approval/seal.png'
  }
])

function goBack() {
  uni.navigateBack()
}

function showMore() {
  uni.showToast({ title: '更多', icon: 'none' })
}

function switchTab(key) {
  activeTab.value = key
}

function goToDetail(item) {
  uni.showToast({ title: `查看${item.title}`, icon: 'none' })
}
</script>

<style lang="scss" scoped>
$color-primary: #2B6DE8;
$text-white: #FFFFFF;
$bg-page: #F7F7F7;
$bg-card: #FFFFFF;
$text-primary: rgba(0, 0, 0, 0.9);
$text-secondary: rgba(0, 0, 0, 0.5);
$text-tertiary: rgba(0, 0, 0, 0.3);
$border-color: #ECECEC;

.page {
  width: 100%;
  height: 100vh;
  background: $bg-page;
  display: flex;
  flex-direction: column;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: $bg-card;
  border-bottom: 1rpx solid $border-color;
}

.nav-icon {
  width: 48rpx;
  height: 48rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: $text-primary;
}

.nav-left, .nav-right {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tabs {
  display: flex;
  background: $bg-card;
  padding: 20rpx 24rpx 0;
  gap: 8rpx;
  border-bottom: 1rpx solid $border-color;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding-bottom: 16rpx;
}

.tab-text {
  font-size: 28rpx;
  color: $text-secondary;
  font-weight: 400;
}

.tab-text-active {
  color: $color-primary;
  font-weight: 500;
}

.tab-indicator {
  width: 44rpx;
  height: 4rpx;
  background: $color-primary;
  border-radius: 2rpx;
}

.filters {
  display: flex;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background: $bg-card;
  overflow-x: auto;
}

.filter-tag {
  padding: 10rpx 24rpx;
  border-radius: 8rpx;
  background: $bg-card;
  border: 1rpx solid $border-color;
}

.filter-active {
  background: $color-primary;
  border-color: $color-primary;
}

.filter-text {
  font-size: 24rpx;
  color: $text-secondary;
}

.filter-text-active {
  color: $text-white;
}

.content-scroll {
  flex: 1;
  height: 0;
  padding: 16rpx 24rpx;
}

.approval-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.approval-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  background: $bg-card;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-hover {
  background: #FAFBFC;
}

.card-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
}

.card-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon-img {
  width: 36rpx;
  height: 36rpx;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-primary;
}

.card-subtitle {
  font-size: 24rpx;
  color: $text-secondary;
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12rpx;
  flex-shrink: 0;
}

.card-date {
  font-size: 22rpx;
  color: $text-tertiary;
}

.status-tag {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.status-text {
  font-size: 22rpx;
  font-weight: 400;
}
</style>
