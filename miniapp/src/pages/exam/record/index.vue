<template>
  <view class="page">
    <nav-bar title="答题记录" :showBack="true" />
    <scroll-view class="content" scroll-y @scrolltolower="loadMore">
      <view v-for="item in list" :key="item.id" class="rec-card" @tap="goResult(item)">
        <view class="rec-head">
          <text class="rec-cat">{{ item.categoryName }}</text>
          <text class="rec-mode" :class="item.mode">{{ modeLabel(item.mode) }}</text>
        </view>
        <view class="rec-body">
          <text class="rec-score">{{ item.score ?? '-' }}/{{ item.totalScore }}</text>
          <text class="rec-meta">{{ statusLabel(item.status) }} · {{ item.useTime }}秒 · {{ (item.endTime || '').slice(0, 16).replace('T', ' ') }}</text>
        </view>
      </view>
      <view v-if="loading" class="empty">加载中…</view>
      <view v-else-if="!list.length" class="empty">暂无答题记录</view>
      <view v-if="hasMore" class="loading-more">上拉加载更多</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { examApi } from '@/services/modules/exam'
import { showError } from '@/utils/toast'

const list = ref([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const hasMore = ref(true)

const modeLabel = (m) => ({ practice: '练习', exam: '正式考试', mock: '模拟考试' }[m] || m)
const statusLabel = (s) => ({ doing: '进行中', submitted: '已提交', timeout: '已超时' }[s] || s)

async function load(append = false) {
  if (loading.value) return
  loading.value = true
  try {
    const res = await examApi.myRecords({ page: page.value, pageSize: 20 })
    const rows = res.data?.list || []
    list.value = append ? [...list.value, ...rows] : rows
    total.value = res.data?.total || 0
    hasMore.value = list.value.length < total.value
  } catch (err) { showError(err.message || '加载失败') }
  finally { loading.value = false }
}

function loadMore() { if (hasMore.value) { page.value += 1; load(true) } }
function goResult(item) { uni.navigateTo({ url: `/pages/exam/examResult/index?recordId=${item.id}` }) }

onShow(() => { page.value = 1; load() })
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F0F2F8; display: flex; flex-direction: column; }
.content { flex: 1; height: 0; padding: 24rpx; }
.rec-card { background: #FFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.rec-head { display: flex; justify-content: space-between; align-items: center; }
.rec-cat { font-size: 30rpx; font-weight: 600; color: #333; }
.rec-mode { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; }
.rec-mode.exam { background: #EDF2FF; color: #2B6DE8; }
.rec-mode.mock { background: #FFF7E6; color: #D97706; }
.rec-mode.practice { background: #F0F2F5; color: #909399; }
.rec-body { display: flex; justify-content: space-between; align-items: center; margin-top: 16rpx; }
.rec-score { font-size: 36rpx; font-weight: 700; color: #2B6DE8; }
.rec-meta { font-size: 24rpx; color: #909399; }
.empty { text-align: center; padding: 120rpx 0; font-size: 28rpx; color: #999; }
.loading-more { text-align: center; font-size: 24rpx; color: #C0C4CC; padding: 16rpx 0; }
</style>
