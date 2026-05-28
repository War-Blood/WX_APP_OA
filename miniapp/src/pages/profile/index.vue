<template>
  <view class="page">
    <NavBar title="个人中心" />

    <scroll-view class="content-scroll" scroll-y>
      <view class="user-card">
        <view class="user-avatar">
          <image v-if="userStore.userAvatar" :src="userStore.userAvatar" class="avatar-img" />
          <text v-else class="avatar-placeholder">{{ userStore.userName.charAt(0) }}</text>
        </view>
        <view class="user-detail">
          <text class="user-name">{{ userStore.userName }}</text>
          <text class="user-role">普通员工 · 技术部</text>
        </view>
        <view class="edit-btn" @tap="editProfile">
          <OaIcon name="edit" size="28" color="#FFFFFF" />
        </view>
      </view>

      <view class="stats-card panel">
        <view
          v-for="(stat, index) in stats"
          :key="index"
          class="stat-item"
          @tap="goToStat(stat)"
        >
          <text class="stat-number">{{ stat.count }}</text>
          <text class="stat-label">{{ stat.label }}</text>
        </view>
      </view>

      <view class="panel">
        <view
          v-for="(item, index) in settingsList"
          :key="index"
          class="setting-item"
          hover-class="setting-active"
          @tap="goToSetting(item)"
        >
          <view class="setting-left">
            <OaIcon :name="item.icon" size="32" color="#666666" />
            <text class="setting-label">{{ item.label }}</text>
          </view>
          <view class="setting-right">
            <text v-if="item.value" class="setting-value">{{ item.value }}</text>
          </view>
        </view>
      </view>

      <view class="btn-area">
        <view class="logout-btn" @tap="handleLogout">
          <text class="logout-text">退出登录</text>
        </view>
      </view>
    </scroll-view>

    <TabBar activeTab="profile" />
  </view>
</template>

<script setup>
import { useUserStore } from '@/stores/user'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import TabBar from '@/components/tab-bar/tab-bar.vue'

const userStore = useUserStore()

const stats = [
  { label: '待审批', count: 3 },
  { label: '待提交', count: 1 },
  { label: '已处理', count: 28 },
  { label: '待阅读', count: 5 }
]

const settingsList = [
  { icon: 'notification', label: '消息通知设置', route: 'notification' },
  { icon: 'security', label: '账号安全', route: 'security' },
  { icon: 'cache', label: '缓存清理', value: '12.5MB', route: 'cache' },
  { icon: 'help', label: '帮助与反馈', route: 'help' },
  { icon: 'info', label: '关于我们', value: 'v1.0.0', route: 'about' }
]

function editProfile() {
  uni.showToast({ title: '编辑个人资料', icon: 'none' })
}

function goToStat(stat) {
  uni.showToast({ title: `查看${stat.label}`, icon: 'none' })
}

function goToSetting(item) {
  uni.showToast({ title: item.label, icon: 'none' })
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
      }
    }
  })
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

.user-card {
  background: linear-gradient(135deg, #2B6DE8 0%, #5B8DF0 100%);
  margin: 20rpx 32rpx;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.user-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.avatar-placeholder {
  font-size: 44rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.user-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.user-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.user-role {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.edit-btn {
  width: 56rpx;
  height: 56rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel {
  background: #FFFFFF;
  margin: 0 32rpx 20rpx;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.stats-card {
  padding: 28rpx 16rpx;
  display: flex;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 0;
  border-right: 1rpx solid #F0F0F0;
}

.stat-item:last-child {
  border-right: none;
}

.stat-number {
  font-size: 40rpx;
  font-weight: 700;
  color: #2B6DE8;
}

.stat-label {
  font-size: 22rpx;
  color: #999999;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #F5F5F5;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-active {
  background: #FAFBFC;
}

.setting-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.setting-label {
  font-size: 28rpx;
  color: #333333;
}

.setting-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.setting-value {
  font-size: 24rpx;
  color: #C0C4CC;
}

.btn-area {
  margin: 20rpx 32rpx;
}

.logout-btn {
  height: 88rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.logout-btn:active {
  background: #F5F5F5;
}

.logout-text {
  font-size: 30rpx;
  color: #FA5151;
  font-weight: 500;
}
</style>
