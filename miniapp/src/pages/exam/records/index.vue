<template>
  <view class="page">
    <nav-bar title="考试记录" :showBack="true" />
    <scroll-view class="content" scroll-y :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh" @scrolltolower="loadMore">
      <view v-if="list.length" class="list">
        <view v-for="item in list" :key="item.id" class="card" @tap="goResult(item)">
          <view class="card-head">
            <text class="c-title">{{ item.paperTitle || (item.mode === 'practice' ? '模拟练习' : '考试') }}</text>
            <view class="c-tag" :style="{ color: statusColor(item.status) }">{{ statusLabel(item.status) }}</view>
          </view>
          <view class="card-body">
            <text class="c-info">{{ fmtDate(item.startTime) }}</text>
            <text class="c-info">{{ item.mode === 'practice' ? '练习' : '考试' }}</text>
            <text v-if="item.score != null" class="c-info" :style="{ color: item.isPass ? '#22C55E' : '#EF4444', fontWeight: '600' }">{{ item.score }}分</text>
          </view>
        </view>
      </view>
      <view v-else-if="!loading" class="empty">暂无记录</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onShow } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { examApi } from '@/services/modules/exam'
import { showError } from '@/utils/toast'

const list = ref([]); const page = ref(1); const loading = ref(true); const refreshing = ref(false)
const statusLabels = { doing: '进行中', submitted: '已提交', timeout: '已超时', cheated: '无效' }
const statusColors = { doing: '#F59E0B', submitted: '#22C55E', timeout: '#F59E0B', cheated: '#EF4444' }
function statusLabel(s) { return statusLabels[s] || s }
function statusColor(s) { return statusColors[s] || '#999' }
function fmtDate(t) { if (!t) return ''; return t.slice(0, 10) }

async function loadData(reset) {
  if (reset) { list.value = []; page.value = 1; }
  loading.value = true
  try {
    const res = await examApi.getMyRecords({ page: page.value, pageSize: 10 })
    const data = res.data?.list || res.data || []
    if (reset) list.value = data; else list.value = [...list.value, ...data]
  } catch { if (reset) showError('加载失败') }
  finally { loading.value = false }
}

function loadMore() { page.value++; loadData(false) }
async function onRefresh() { refreshing.value = true; await loadData(true); refreshing.value = false }
function goResult(item) {
  uni.navigateTo({ url: `/pages/exam/result/index?recordId=${item.id}&paperId=${item.paperId}` })
}

onShow(() => loadData(true))
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; }
.content { flex: 1; height: 0; padding: 24rpx; }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.card { background: #FFF; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.c-title { font-size: 28rpx; font-weight: 600; color: #333; }
.c-tag { font-size: 22rpx; font-weight: 500; }
.card-body { display: flex; gap: 16rpx; }
.c-info { font-size: 24rpx; color: #999; }
.empty { text-align: center; padding: 120rpx 0; font-size: 28rpx; color: #999; }
</style>
