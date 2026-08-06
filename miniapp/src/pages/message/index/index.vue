<template>
  <view class="message-page">
    <nav-bar title="消息中心" :showBack="true" />

    <view class="tabs-bar">
      <view v-for="tab in tabs" :key="tab.key" class="tab-item" @tap="switchTab(tab.key)">
        <text class="tab-text" :class="{ 'tab-text-active': activeTab === tab.key }">{{ tab.label }}</text>
        <view v-if="activeTab === tab.key" class="tab-indicator" />
      </view>
    </view>

    <scroll-view class="content-scroll" scroll-y refresher-enabled
      :refresher-triggered="isRefreshing" @refresherrefresh="onRefresh">
      <view v-if="filteredList.length > 0" class="msg-list">
        <view v-for="(item, index) in filteredList" :key="item.id"
          class="msg-swipe-wrapper">
          <view class="msg-item"
            :class="{ 'msg-item-unread': !item.isRead }"
            hover-class="msg-hover"
            @tap="goToDetail(item)">
            <view v-if="!item.isRead" class="unread-dot" />
            <view v-else class="read-spacer" />
            <view class="msg-icon" :style="{ backgroundColor: item.iconBg }">
              <image class="msg-icon-img" :src="getIconSrc(item.type)" mode="aspectFit" />
            </view>
            <view class="msg-info">
              <text class="msg-title" :class="{ 'msg-title-unread': !item.isRead }">{{ item.title }}</text>
              <text class="msg-desc">{{ item.desc }}</text>
            </view>
            <text class="msg-time">{{ item.time }}</text>
            <view class="msg-delete-btn" @tap.stop="handleDelete(item, index)">
              <text class="delete-icon">✕</text>
            </view>
          </view>
          <view v-if="index < filteredList.length - 1" class="msg-divider" />
        </view>
      </view>
      <view v-else class="empty-state">
        <image class="empty-icon" src="/static/icons/feat-bell.svg" mode="aspectFit" />
        <text class="empty-text">暂无消息</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { messageApi } from '@/services/modules/message'
import { showSuccess, showError, showToast } from '@/utils/toast'

const activeTab = ref('notification')

const tabs = [
  { key: 'notification', label: '消息通知' },
  { key: 'announcement', label: '系统公告' },
  { key: 'reminder', label: '待办提醒' },
]

const messageList = ref([])
const isRefreshing = ref(false)

const filteredList = computed(() => {
  if (activeTab.value === 'notification') {
    return messageList.value.filter((m) =>
      ['notification', 'approval', 'report', 'task', 'exam'].includes(m.type)
    )
  }
  return messageList.value.filter((m) => m.type === activeTab.value)
})

onMounted(() => { loadMessages() })

async function loadMessages() {
  try {
    const res = await messageApi.getList({ page: 1, pageSize: 50 })
    const list = (res.data && res.data.list) ? res.data.list : []
    messageList.value = list.map((item) => ({
      id: item.id,
      title: item.title || '',
      desc: item.desc || item.subtitle || '',
      time: item.time || item.createTime || '',
      type: item.type || 'notification',
      isRead: item.isRead !== undefined ? item.isRead : true,
      iconBg: getIconBg(item.type),
    }))
  } catch (err) {
    console.error('加载消息失败', err)
    messageList.value = []
  }
}

async function handleDelete(item, index) {
  const res = await uni.showModal({ title: '删除消息', content: '确定删除该消息吗？', confirmColor: '#EF4444' })
  if (!res.confirm) return
  try {
    await messageApi.deleteMsg(item.id)
    const list = messageList.value
    const realIdx = list.findIndex((m) => m.id === item.id)
    if (realIdx > -1) list.splice(realIdx, 1)
  } catch (err) {
    showError('删除失败')
  }
}

function getIconBg(type) {
  const map = {
    approval: '#EDF2FF', report: '#F0FDF4', system: '#F3E8FF',
    announcement: '#F3E8FF', task: '#FFF3E1', reminder: '#EDF2FF', notification: '#EDF2FF',
    exam: '#F0FDF4',
  }
  return map[type] || '#F5F5F5'
}

function getIconSrc(type) {
  const map = {
    approval: '/static/icons/quick-clipboard.svg', report: '/static/icons/quick-document.svg',
    system: '/static/icons/feat-bell.svg', announcement: '/static/icons/feat-bell.svg',
    task: '/static/icons/quick-check.svg', reminder: '/static/icons/feat-clipboard.svg',
    notification: '/static/icons/quick-bell.svg',
    exam: '/static/icons/quick-check.svg',
  }
  return map[type] || '/static/icons/feat-bell.svg'
}

function switchTab(key) { activeTab.value = key }

async function onRefresh() {
  isRefreshing.value = true; await loadMessages(); isRefreshing.value = false
}

async function goToDetail(item) {
  try {
    if (!item.isRead) { await messageApi.markRead(item.id); item.isRead = true }
  } catch { /* ignore */ }
  // 考试通知/催考 → 直接跳答题模块考试列表
  if (item.type === 'exam') {
    uni.navigateTo({ url: '/pages/exam/index/index' })
    return
  }
  uni.navigateTo({ url: `/pages/message/detail?id=${item.id}` })
}
</script>

<style lang="scss" scoped>
.message-page { display: flex; flex-direction: column; height: 100vh; background: #F7F7F7; }

.tabs-bar { display: flex; height: 88rpx; background: #FFFFFF; flex-shrink: 0; }
.tab-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
.tab-text { font-size: 28rpx; font-weight: 400; color: #999999; }
.tab-text-active { color: #2B6DE8; font-weight: 600; }
.tab-indicator { position: absolute; bottom: 8rpx; width: 48rpx; height: 6rpx; background: #2B6DE8; border-radius: 4rpx; }

.content-scroll { flex: 1; height: 0; }
.msg-list { display: flex; flex-direction: column; }

.msg-item {
  display: flex; align-items: center;
  min-height: 136rpx; padding: 16rpx 24rpx; background: #FFFFFF;
  position: relative;
  margin: 8rpx 24rpx;
  border-radius: 12rpx;
  box-shadow: 0 1rpx 4rpx rgba(0,0,0,.04);
}
.msg-item-unread { background: #FAFBFF; }
.msg-hover { background: #F0F0F0; }

.unread-dot {
  width: 16rpx; height: 16rpx; border-radius: 8rpx;
  background: #EF4444; flex-shrink: 0; margin-right: 24rpx;
}
.read-spacer { width: 40rpx; flex-shrink: 0; }

.msg-icon { width: 80rpx; height: 80rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.msg-icon-img { width: 40rpx; height: 40rpx; }

.msg-info { flex: 1; display: flex; flex-direction: column; gap: 8rpx; margin-left: 24rpx; min-width: 0; }
.msg-title { font-size: 28rpx; font-weight: 400; color: #333333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.msg-title-unread { font-weight: 600; color: #1A1A1A; }
.msg-desc { font-size: 24rpx; color: #999999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.msg-time { font-size: 22rpx; color: #B0B0B0; flex-shrink: 0; margin-left: 8rpx; }

.msg-delete-btn {
  width: 48rpx; height: 48rpx; border-radius: 50%;
  background: #F5F5F5; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-left: 12rpx;
}
.msg-delete-btn:active { background: #FEE2E2; }
.delete-icon { font-size: 24rpx; color: #CCCCCC; }
.msg-delete-btn:active .delete-icon { color: #EF4444; }

.msg-divider { height: 1rpx; background: #F5F5F5; margin: 0 24rpx; }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 240rpx; }
.empty-icon { width: 120rpx; height: 120rpx; opacity: 0.3; }
.empty-text { font-size: 28rpx; color: #B0B0B0; margin-top: 24rpx; }
</style>
