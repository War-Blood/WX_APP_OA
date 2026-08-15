<template>
  <view class="page">
    <nav-bar title="排行榜" :showBack="true" />
    <scroll-view class="content" scroll-y>
      <view v-for="(item, i) in list" :key="item.userId" class="rank-row" :class="{ self: item.isSelf }">
        <text class="rank-medal">{{ medal(i + 1) }}</text>
        <view class="rank-info">
          <text class="rank-name">{{ item.userName }}</text>
          <text class="rank-dept">{{ item.departmentName }}</text>
        </view>
        <view class="rank-score">
          <text class="score">{{ item.score }}分</text>
          <text class="time">{{ item.useTime }}秒</text>
        </view>
      </view>
      <view v-if="!list.length" class="empty">暂无成绩</view>
    </scroll-view>
    <!-- 置底「我的排名」固定条，方便自己排名靠后时一键定位 -->
    <view v-if="list.length" class="my-rank" :class="{ self: !!selfRow }">
      <view class="mr-left">
        <text class="mr-label">我的排名</text>
        <text v-if="selfRank" class="mr-rank">第 {{ selfRank }} 名</text>
        <text v-else class="mr-rank mr-empty">暂未上榜</text>
      </view>
      <text v-if="selfRow" class="mr-score">{{ selfRow.score }}分</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { examApi } from '@/services/modules/exam'
import { showError } from '@/utils/toast'

const list = ref([])

// 我的排名：从已加载列表中定位自己(未在列表内则为 0)
const selfRow = computed(() => list.value.find((r) => r.isSelf))
const selfRank = computed(() => {
  const idx = list.value.findIndex((r) => r.isSelf)
  return idx === -1 ? 0 : idx + 1
})

function medal(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return rank
}

onLoad(async (options) => {
  const categoryId = Number(options.categoryId) || 0
  try {
    const res = await examApi.rankList(categoryId)
    const userId = uni.getStorageSync('userInfo')?.userId
    list.value = (res.data || []).map(r => ({ ...r, isSelf: r.userId === userId }))
  } catch (err) { showError(err.message || '加载失败') }
})
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F0F2F8; display: flex; flex-direction: column; }
.content { flex: 1; height: 0; padding: 24rpx; padding-bottom: 140rpx; }
.rank-row { background: #FFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; display: flex; align-items: center; gap: 20rpx; }
.rank-row.self { border: 2rpx solid #2B6DE8; }
.rank-medal { font-size: 40rpx; width: 64rpx; text-align: center; }
.rank-info { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.rank-name { font-size: 28rpx; font-weight: 600; color: #333; }
.rank-dept { font-size: 24rpx; color: #909399; }
.rank-score { display: flex; flex-direction: column; align-items: flex-end; gap: 4rpx; }
.score { font-size: 30rpx; font-weight: 700; color: #2B6DE8; }
.time { font-size: 24rpx; color: #909399; }
.empty { text-align: center; padding: 120rpx 0; font-size: 28rpx; color: #999; }
.my-rank { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFF; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,.05); display: flex; align-items: center; justify-content: space-between; border-top: 1rpx solid #F0F2F5; }
.my-rank.self { border-top-color: #2B6DE8; }
.mr-left { display: flex; align-items: baseline; gap: 16rpx; }
.mr-label { font-size: 26rpx; color: #909399; }
.mr-rank { font-size: 32rpx; font-weight: 700; color: #2B6DE8; font-variant-numeric: tabular-nums; }
.mr-rank.mr-empty { color: #C0C4CC; font-size: 28rpx; font-weight: 500; }
.mr-score { font-size: 30rpx; font-weight: 700; color: #2B6DE8; font-variant-numeric: tabular-nums; }
</style>
