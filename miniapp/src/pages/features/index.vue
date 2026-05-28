<template>
  <view class="page">
    <NavBar title="功能中心" />

    <scroll-view class="content-scroll" scroll-y>
      <view class="search-bar">
        <view class="search-input">
          <OaIcon name="search" size="28" color="#C0C4CC" />
          <text class="search-placeholder">搜索功能</text>
        </view>
      </view>

      <view class="features-content">
        <view
          v-for="(group, gIndex) in featureGroups"
          :key="gIndex"
          class="panel"
        >
          <view class="panel-header">
            <text class="group-title">{{ group.title }}</text>
          </view>
          <view class="feature-grid">
            <view
              v-for="(item, index) in group.items"
              :key="index"
              class="feature-item"
              hover-class="feature-item-hover"
              @tap="goToFeature(item)"
            >
              <view class="feature-icon" :style="{ background: item.bg }">
                <OaIcon :name="item.icon" size="40" />
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

const featureGroups = [
  {
    title: '办公协作',
    items: [
      { icon: 'approval', label: '审批管理', bg: '#EDF2FF' },
      { icon: 'report', label: '日报提交', bg: '#F0FDF4' },
      { icon: 'project', label: '项目管理', bg: '#E8F4FD' },
      { icon: 'asset', label: '资产申购', bg: '#FFF0F6' }
    ]
  },
  {
    title: '信息中心',
    items: [
      { icon: 'announcement', label: '通知公告', bg: '#F3E8FF' },
      { icon: 'statistics', label: '数据统计', bg: '#FEF3E2' },
      { icon: 'contacts', label: '通讯录', bg: '#E6F7FF' },
      { icon: 'document', label: '文档中心', bg: '#E8F8F5' }
    ]
  },
  {
    title: '系统设置',
    items: [
      { icon: 'user', label: '个人设置', bg: '#F0F0FF' },
      { icon: 'security', label: '安全中心', bg: '#FFF0F0' },
      { icon: 'statistics', label: '操作日志', bg: '#F5F5F5' },
      { icon: 'more', label: '更多', bg: '#FAFAFA' }
    ]
  }
]

function goToFeature(item) {
  uni.showToast({ title: `跳转到${item.label}`, icon: 'none' })
}
</script>

<style lang="scss" scoped>
.page {
  width: 100%;
  height: 100vh;
  background: #F7F7F7;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-scroll {
  flex: 1;
  height: 0;
}

.search-bar {
  padding: 20rpx 32rpx;
  background: #FFFFFF;
}

.search-input {
  height: 72rpx;
  background: #F5F5F5;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 28rpx;
}

.search-placeholder {
  font-size: 26rpx;
  color: #C0C4CC;
}

.features-content {
  padding: 20rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.panel {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.panel-header {
  margin-bottom: 24rpx;
}

.group-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
  padding-left: 16rpx;
  border-left: 6rpx solid #2B6DE8;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx 8rpx;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 0;
  border-radius: 16rpx;
}

.feature-item-hover {
  background: #F5F5F5;
}

.feature-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-label {
  font-size: 24rpx;
  color: #666666;
  text-align: center;
}
</style>
