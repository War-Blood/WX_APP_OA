<template>
  <view class="page">
    <NavBar title="功能中心" />
    <scroll-view class="content" scroll-y>
      <view class="search-bar" @tap="handleSearch">
        <text class="search-icon">🔍</text>
        <text class="search-placeholder">搜索功能</text>
      </view>
      <view class="section" v-for="group in featureGroups" :key="group.name">
        <view class="group-card">
          <view class="group-header">
            <view class="group-bar" />
            <text class="group-title">{{ group.name }}</text>
          </view>
          <view class="group-grid">
            <view
              v-for="item in group.items"
              :key="item.label"
              class="feature-item"
              hover-class="feature-item-hover"
              :hover-stay-time="100"
              @tap="goToFeature(item.route)"
            >
              <view class="feature-icon" :style="{ backgroundColor: item.bg }">
                <uni-icons :type="getFeatureIcon(item.icon)" size="48" :color="item.color" />
              </view>
              <text class="feature-label">{{ item.label }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
    <TabBar activeTab="features" />
  </view>
</template>

<script setup>
import { useUserStore } from '@/stores/user'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import TabBar from '@/components/tab-bar/tab-bar.vue'

const userStore = useUserStore()

const featureGroups = [
  {
    name: '办公协作',
    items: [
      { icon: 'clipboard', label: '审批管理', bg: '#EDF2FF', color: '#2B6DE8', route: '/pages/approval/index' },
      { icon: 'document', label: '公出日志', bg: '#F0FDF4', color: '#22C55E', route: '/pages/employee/report-edit/index' },
      { icon: 'folder', label: '项目管理', bg: '#E8F4FD', color: '#2B6DE8', route: '' },
      { icon: 'cart', label: '资产申购', bg: '#FFF0F6', color: '#EF4444', route: '' }
    ]
  },
  {
    name: '信息中心',
    items: [
      { icon: 'bell', label: '通知公告', bg: '#F3E8FF', color: '#6366F1', route: '' },
      { icon: 'chart', label: '数据统计', bg: '#FEF3E2', color: '#F59E0B', route: '' },
      { icon: 'users', label: '通讯录', bg: '#E6F7FF', color: '#2B6DE8', route: '' },
      { icon: 'folder', label: '文档中心', bg: '#E8F8F5', color: '#22C55E', route: '' }
    ]
  },
  {
    name: '系统设置',
    items: [
      { icon: 'settings', label: '个人设置', bg: '#F0F0FF', color: '#6366F1', route: '' },
      { icon: 'shield', label: '安全中心', bg: '#FFF0F0', color: '#EF4444', route: '' },
      { icon: 'list', label: '操作日志', bg: '#F5F5F5', color: '#999999', route: '' },
      { icon: 'more', label: '更多', bg: '#FAFAFA', color: '#999999', route: '' }
    ]
  }
]

function getFeatureIcon(name) {
  const map = {
    clipboard: 'checkbox',
    document: 'compose',
    folder: 'folder-add',
    cart: 'cart',
    bell: 'notification',
    chart: 'bars',
    users: 'contact',
    settings: 'gear',
    shield: 'locked',
    list: 'list',
    more: 'more'
  }
  return map[name] || 'help'
}

function goToFeature(route) {
  if (route) {
    uni.navigateTo({ url: route })
  } else {
    uni.showToast({ title: '功能待开发', icon: 'none' })
  }
}

function handleSearch() {
  uni.showToast({ title: '功能待开发', icon: 'none' })
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
  overflow: hidden;
}

.content {
  flex: 1;
  height: 0;
}

.search-bar {
  margin: 24rpx 24rpx 0;
  height: 72rpx;
  background: #F5F5F5;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 28rpx;
}

.search-bar:active {
  background: #ECECEC;
}

.search-icon {
  font-size: 28rpx;
  line-height: 1;
}

.search-placeholder {
  font-size: 26rpx;
  color: $text-placeholder;
}

.section {
  padding: 0 24rpx;
  margin-top: 24rpx;
}

.group-card {
  background: $bg-card;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 28rpx;
}

.group-bar {
  width: 6rpx;
  height: 32rpx;
  background: $primary-color;
  border-radius: 3rpx;
  flex-shrink: 0;
}

.group-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
  line-height: 1.3;
}

.group-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8rpx 0;
}

.feature-item {
  width: calc(25% - 6rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
  border-radius: 16rpx;
}

.feature-item-hover {
  background: #F5F5F5;
}

.feature-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-label {
  font-size: $font-sm;
  color: $text-regular;
  text-align: center;
  line-height: 1.3;
}
</style>
