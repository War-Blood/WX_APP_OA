<template>
  <view class="page">
    <nav-bar title="考勤中心" :showBack="true" />
    <view class="tabs">
      <view v-for="t in filterTabs" :key="t.key" class="tab" @tap="switchTab(t.key)">
        <text :class="{ active: activeTab === t.key }">{{ t.label }}</text>
      </view>
    </view>
    <scroll-view class="content" scroll-y :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh" @scrolltolower="loadMore">
      <view v-if="list.length" class="list">
        <view v-for="item in list" :key="item.id" class="card" @tap="goDetail(item)">
          <view class="card-head">
            <text class="card-type">{{ item.requestType === 'biz_trip' ? '出差' : '请假' }}</text>
            <view class="status-tag" :class="'tag-' + item.status">{{ statusMap[item.status] }}</view>
          </view>
          <view class="card-body">
            <template v-if="item.requestType === 'biz_trip'">
              <text class="info">开始：{{ fmt(item.tripStartedAt) }}</text>
              <text v-if="item.tripEndedAt" class="info">结束：{{ fmt(item.tripEndedAt) }}</text>
              <text v-else class="info active">进行中</text>
            </template>
            <template v-else>
              <text class="info">{{ leaveTypeMap[item.leaveSubtype] || item.leaveSubtype }} · {{ item.startDate }} → {{ item.endDate }}（{{ item.days }}天）</text>
            </template>
          </view>
          <view class="card-foot">
            <text class="card-time">{{ fmt(item.createdAt) }}</text>
            <view v-if="item.requestType === 'biz_trip' && item.status === 'in_progress'" class="card-end-btn" @tap.stop="goEndTrip">
              <text>结束出差</text>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无记录</view>
    </scroll-view>
    <view class="bottom-bar">
      <view class="bb-btn" @tap="goPage('/pages/attendance/leave-apply/index')"><text>请假申请</text></view>
      <view class="bb-btn primary" @tap="goPage('/pages/attendance/trip-start/index')"><text>出差开始</text></view>
      <view v-if="hasInProgressTrip" class="bb-btn end-trip" @tap="goEndTrip"><text>结束出差</text></view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { attendanceApi } from '@/services/modules/attendance'

const filterTabs = [{ key: '', label: '全部' }, { key: 'leave', label: '请假' }, { key: 'biz_trip', label: '出差' }]
const statusMap = { active: '生效中', cancelled: '已撤销', in_progress: '进行中', ended: '已结束' }
const leaveTypeMap = { annual: '年假', sick: '病假', personal: '事假', marriage: '婚假', funeral: '丧假', other: '其他' }

const activeTab = ref('')
const list = ref([])
const page = ref(1)
const refreshing = ref(false)

function fmt(t) { if (!t) return ''; return t.slice(0, 16).replace('T', ' ') }

const hasInProgressTrip = ref(false)

function goPage(url) {
  uni.navigateTo({ url, fail: () => uni.showToast({ title: '页面跳转失败', icon: 'none' }) })
}
function switchTab(k) { activeTab.value = k; page.value = 1; loadData(true) }
function goDetail(item) {
  uni.navigateTo({ url: `/pages/attendance/leave-detail/index?${new URLSearchParams({ id: String(item.id) }).toString()}`, fail: () => uni.showToast({ title: '页面跳转失败', icon: 'none' }) })
}
function goEndTrip() {
  uni.navigateTo({ url: '/pages/attendance/trip-end/index', fail: () => uni.showToast({ title: '页面跳转失败', icon: 'none' }) })
}

async function loadData(reset = true) {
  if (reset) { list.value = []; page.value = 1; }
  try {
    const params = { page: page.value, pageSize: 10 }
    if (activeTab.value) params.requestType = activeTab.value
    const res = await attendanceApi.getMyLeaveList(params)
    if (reset) list.value = res.data.list || []
    else list.value = [...list.value, ...(res.data.list || [])]
    // 检测是否有进行中的出差
    hasInProgressTrip.value = list.value.some(item => item.requestType === 'biz_trip' && item.status === 'in_progress')
  } catch { uni.showToast({ title: '加载失败', icon: 'none' }) }
}

async function loadMore() { page.value++; try { await loadData(false) } catch { page.value-- } }
async function onRefresh() { refreshing.value = true; await loadData(true); refreshing.value = false; }

onShow(() => loadData())
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; }
.tabs { display: flex; background: #FFF; padding: 0 24rpx; }
.tab { flex: 1; text-align: center; padding: 24rpx 0; font-size: 28rpx; color: #999; }
.tab .active { color: #2B6DE8; font-weight: 600; border-bottom: 4rpx solid #2B6DE8; padding-bottom: 4rpx; }
.content { flex: 1; height: 0; padding: 24rpx; }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.card { background: #FFF; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-type { font-size: 28rpx; font-weight: 600; color: #333; }
.status-tag { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 20rpx; font-weight: 500; }
.tag-active { background: #EFFDF5; color: #22C55E; }
.tag-cancelled { background: #F5F5F5; color: #999; }
.tag-in_progress { background: #FFF8E1; color: #F59E0B; }
.tag-ended { background: #EDF2FF; color: #2B6DE8; }
.card-body { display: flex; flex-direction: column; gap: 4rpx; }
.info { font-size: 24rpx; color: #666; }
.info.active { color: #F59E0B; font-weight: 500; }
.card-time { font-size: 22rpx; color: #BBB; }
.card-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 8rpx; }
.card-end-btn { padding: 8rpx 20rpx; background: #2B6DE8; border-radius: 20rpx; font-size: 22rpx; color: #FFF; }
.empty { text-align: center; padding: 120rpx 0; font-size: 28rpx; color: #999; }
.bottom-bar { display: flex; gap: 16rpx; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFF; box-shadow: 0 -2rpx 8rpx rgba(0,0,0,.06); }
.bb-btn { flex: 1; text-align: center; padding: 20rpx 0; border-radius: 44rpx; background: #EDF2FF; font-size: 28rpx; color: #2B6DE8; font-weight: 500; }
.bb-btn.primary { background: #2B6DE8; color: #FFF; }
.bb-btn.end-trip { background: #FFF; color: #EF4444; border: 2rpx solid #EF4444; }
</style>
