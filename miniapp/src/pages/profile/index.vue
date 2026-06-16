<template>
  <view class="page">
    <NavBar title="个人中心" />
    <scroll-view class="content" scroll-y>
      <view class="section">
        <view class="user-card">
          <view class="user-avatar">
            <image v-if="userStore.userAvatar" :src="userStore.userAvatar" class="avatar-img" mode="aspectFill" />
            <text v-else class="avatar-text">{{ userStore.userName.charAt(0) }}</text>
          </view>
          <view class="user-info">
            <text class="user-name">{{ userStore.userName }}</text>
            <text class="user-role">{{ roleLabel }}<text v-if="userStore.department"> · {{ userStore.department }}</text></text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="stats-row">
          <view
            v-for="stat in stats"
            :key="stat.key"
            class="stat-item"
            hover-class="stat-item-hover"
            :hover-stay-time="100"
            @tap="goToStat(stat)"
          >
            <view class="stat-num-box">
              <text class="stat-num" :style="{ color: stat.color }">{{ stat.value ?? 0 }}</text>
            </view>
            <view class="stat-label-box">
              <text class="stat-label">{{ stat.label }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="settings-list">
          <view
            v-for="item in settingsList"
            :key="item.label"
            class="setting-item"
            hover-class="setting-item-hover"
            :hover-stay-time="100"
            @tap="goToSetting(item)"
          >
            <view class="setting-icon" :style="{ backgroundColor: item.iconBg }">
              <image class="setting-icon-img" :src="item.iconSrc" mode="aspectFit" />
            </view>
            <text class="setting-label">{{ item.label }}</text>
            <view class="setting-right">
              <text v-if="item.value" class="setting-value">{{ item.value }}</text>
              <text class="setting-arrow">›</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <button class="invite-btn" open-type="share" hover-class="invite-btn-hover">
          <image class="invite-icon" src="/static/icons/invite.svg" mode="aspectFit" />
          <text class="invite-text">邀请同事</text>
        </button>
      </view>

      <view class="section">
        <view class="logout-btn" hover-class="logout-btn-hover" :hover-stay-time="100" @tap="handleLogout">
          <text class="logout-text">退出登录</text>
        </view>
      </view>
    </scroll-view>
    <TabBar activeTab="profile" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { statsApi } from '@/services/modules/stats'
import { messageApi } from '@/services/modules/message'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import TabBar from '@/components/tab-bar/tab-bar.vue'

const userStore = useUserStore()

const roleLabel = computed(() => {
  const map = { admin: '管理员', superadmin: '超级管理员', employee: '员工' }
  return map[userStore.role] || '员工'
})

const stats = ref([
  { key: 'pending', label: '待审批', value: 0, color: '#2B6DE8', route: '/pages/approval/index/index' },
  { key: 'submit', label: '待提交', value: 0, color: '#F59E0B', route: '/pages/employee/report-edit/index' },
  { key: 'processed', label: '已处理', value: 0, color: '#22C55E', route: '' },
  { key: 'unread', label: '待阅读', value: 0, color: '#6366F1', route: '/pages/message/index/index' }
])

const SET = '/static/icons/set-'

const settingsList = computed(() => {
  const common = [
    { label: '消息通知', iconSrc: `${SET}notification.svg`, iconBg: '#F0F0FF', route: '/pages/settings/notification/index' },
    { label: '账号安全', iconSrc: `${SET}shield.svg`, iconBg: '#FFF0F0', route: '/pages/settings/security/index' },
    { label: '帮助反馈', iconSrc: `${SET}help.svg`, iconBg: '#F0FDF4', route: '/pages/settings/help/index' },
    { label: '关于我们', value: 'v1.0.0', iconSrc: `${SET}info.svg`, iconBg: '#F5F5F5', route: '/pages/settings/about/index' }
  ]
  if (userStore.isAdmin) {
    return [
      { label: '用户管理', iconSrc: `${SET}person.svg`, iconBg: '#EDF2FF', route: '/pages/admin/review-list/index' },
      ...common
    ]
  }
  return common
})

onMounted(async () => {
  try {
    await loadStats()
  } catch (err) {
    console.error('加载统计数据失败', err)
  }
})

async function loadStats() {
  try {
    const role = userStore.isAdmin ? 'admin' : 'employee'
    const [statsRes, unreadRes] = await Promise.all([
      statsApi.getHomeStats(role),
      messageApi.getUnreadCount()
    ])

    const data = statsRes.data
    const unreadCount = unreadRes.data?.count || 0
    console.log('[Profile] statsRes.data:', JSON.stringify(data))
    console.log('[Profile] submitCount:', data.submitCount)

    if (role === 'admin') {
      stats.value = [
        { key: 'pending', label: '待审批', value: data.pendingCount || 0, color: '#2B6DE8', route: '/pages/approval/index/index' },
        { key: 'review', label: '待审核', value: data.reviewCount || 0, color: '#F59E0B', route: '/pages/admin/review-list/index' },
        { key: 'processed', label: '已处理', value: data.processedCount || 0, color: '#22C55E', route: '' },
        { key: 'unread', label: '待阅读', value: unreadCount || 0, color: '#6366F1', route: '/pages/message/index/index' }
      ]
    } else {
      stats.value = [
        { key: 'pending', label: '待审批', value: data.pendingCount || 0, color: '#2B6DE8', route: '/pages/approval/index/index' },
        { key: 'submit', label: '待提交', value: data.submitCount || 0, color: '#F59E0B', route: '/pages/employee/report-history/index' },
        { key: 'processed', label: '已处理', value: data.processedCount || 0, color: '#22C55E', route: '' },
        { key: 'unread', label: '待阅读', value: unreadCount || 0, color: '#6366F1', route: '/pages/message/index/index' }
      ]
    }
  } catch (err) {
    // 保持默认值
  }
}
function goToStat(stat) {
  if (stat.route) {
    uni.navigateTo({ url: stat.route })
  } else {
    uni.showToast({ title: '功能待开发', icon: 'none' })
  }
}

function goToSetting(item) {
  if (item.route) uni.navigateTo({ url: item.route })
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

// 微信分享 — 邀请同事
import { onShareAppMessage } from '@dcloudio/uni-app'

onShareAppMessage(() => {
  return {
    title: '智慧办公助手 — 高效协同，一手掌握',
    path: '/pages/login/index',
    imageUrl: ''
  }
})
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.page {
  width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; overflow: hidden;
}

.content {
  flex: 1;
  height: 0;
}

.section {
  padding: 0 24rpx;
  margin-top: 24rpx;
}

/* === User Card === */
.user-card {
  background: linear-gradient(135deg, $primary-color, $primary-light);
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

.avatar-text {
  font-size: 44rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.user-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #FFFFFF;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-role {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-btn {
  width: 56rpx;
  height: 56rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.edit-btn-hover {
  background: rgba(255, 255, 255, 0.4);
}

.edit-icon {
  font-size: 28rpx;
  color: #FFFFFF;
}

/* === Stats Row === */
.stats-row {
  background: $bg-card;
  border-radius: 16rpx;
  padding: 28rpx 0;
  display: flex;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  border-right: 1rpx solid #F0F0F0;
  padding: 8rpx 0;
}

.stat-item:last-child {
  border-right: none;
}

.stat-item-hover {
  background: #FAFBFC;
  border-radius: 12rpx;
}

.stat-num-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48rpx;
}

.stat-num {
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label-box {
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-label {
  font-size: 22rpx;
  color: #999999;
  line-height: 1.3;
}

.stat-label {
  font-size: 22rpx;
  color: $text-secondary;
  line-height: 1.3;
}

/* === Settings List === */
.settings-list {
  background: $bg-card;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-bottom: 1rpx solid #F5F5F5;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item-hover {
  background: #FAFBFC;
}

.setting-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.setting-icon-img { width: 40rpx; height: 40rpx; }

.setting-label {
  flex: 1;
  font-size: $font-base;
  color: $text-primary;
  line-height: 1.3;
}

.setting-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.setting-value {
  font-size: $font-sm;
  color: $text-placeholder;
  line-height: 1.3;
}

.setting-arrow {
  font-size: 32rpx;
  color: $text-placeholder;
  line-height: 1;
}

/* === Invite Button === */
.invite-btn {
  width: 100%;
  height: 88rpx;
  background: $bg-card;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  border: none;
  padding: 0;
  line-height: 88rpx;
}
.invite-btn::after { border: none; }
.invite-btn-hover { background: #EDF2FF; }
.invite-icon { width: 36rpx; height: 36rpx; }
.invite-text { font-size: 30rpx; color: $primary-color; font-weight: 500; }

/* === Logout Button (C类) === */
.logout-btn {
  height: 88rpx;
  background: $bg-card;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.logout-btn-hover {
  background: #F5F5F5;
}

.logout-text {
  font-size: 30rpx;
  color: $danger-color;
  font-weight: 500;
}
</style>
