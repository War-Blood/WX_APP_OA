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
                <image class="feature-icon-img" :src="item.iconSrc" mode="aspectFit" />
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
import NavBar from '@/components/nav-bar/nav-bar.vue'
import TabBar from '@/components/tab-bar/tab-bar.vue'

const ICON = '/static/icons/feat-'

const featureGroups = [
  {
    name: '办公协作',
    items: [
      { label: '审批管理', iconSrc: `${ICON}clipboard.svg`, bg: '#EDF2FF', route: '/pages/approval/index/index' },
      { label: '公出日志', iconSrc: `${ICON}document.svg`, bg: '#F0FDF4', route: '/pages/employee/report-edit/index' },
      { label: '日报历史', iconSrc: `${ICON}folder.svg`, bg: '#E8F4FD', route: '/pages/employee/report-history/index' },
      { label: '审核管理', iconSrc: `${ICON}shield.svg`, bg: '#E6F7FF', route: '/pages/admin/review-list/index' }
    ]
  },
  {
    name: '信息中心',
    items: [
      { label: '消息中心', iconSrc: `${ICON}bell.svg`, bg: '#F3E8FF', route: '/pages/message/index/index' },
      { label: '项目日报', iconSrc: `${ICON}chart.svg`, bg: '#FEF3E2', route: '' },
      { label: '通知公告', iconSrc: `${ICON}bell.svg`, bg: '#EEF2FF', route: '' },
      { label: '通讯录', iconSrc: `${ICON}users.svg`, bg: '#E6F7FF', route: '' }
    ]
  },
  {
    name: '系统设置',
    items: [
      { label: '个人设置', iconSrc: `${ICON}gear.svg`, bg: '#F0F0FF', route: '' },
      { label: '关于我们', iconSrc: `${ICON}book.svg`, bg: '#F5F5F5', route: '' },
      { label: '更多功能', iconSrc: `${ICON}grid.svg`, bg: '#FAFAFA', route: '' },
      { label: '管理后台', iconSrc: `${ICON}shield.svg`, bg: '#FFF0F0', route: '' }
    ]
  }
]

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
.page {
  width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; overflow: hidden;
}

.content { flex: 1; height: 0; padding: 24rpx; }

.search-bar {
  height: 80rpx; background: #F5F5F5; border-radius: 40rpx;
  display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx; margin-bottom: 32rpx;
}
.search-icon { font-size: 28rpx; line-height: 1; }
.search-placeholder { font-size: 26rpx; color: #C0C4CC; }

.section { margin-bottom: 32rpx; }
.section:last-child { margin-bottom: 0; }

.group-card {
  background: #FFFFFF; border-radius: 40rpx; padding: 40rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
}
.group-header { display: flex; align-items: center; gap: 20rpx; margin-bottom: 32rpx; }
.group-bar { width: 6rpx; height: 32rpx; background: #2B6DE8; border-radius: 4rpx; flex-shrink: 0; }
.group-title { font-size: 28rpx; font-weight: 600; color: #333333; }

.group-grid { display: flex; flex-wrap: wrap; }
.feature-item { width: 25%; display: flex; flex-direction: column; align-items: center; gap: 16rpx; margin-bottom: 24rpx; }
.feature-item:nth-child(n+5) { margin-bottom: 0; }
.feature-icon { width: 96rpx; height: 96rpx; border-radius: 28rpx; display: flex; align-items: center; justify-content: center; }
.feature-icon-img { width: 48rpx; height: 48rpx; }
.feature-label { font-size: 22rpx; color: #666666; text-align: center; }
</style>
