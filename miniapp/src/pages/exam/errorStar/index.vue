<template>
  <view class="page">
    <nav-bar title="我的收藏" :showBack="true" />
    <scroll-view class="content" scroll-y @scrolltolower="loadMore">
      <view v-for="item in list" :key="item.questionId" class="fav-item">
        <question-card :question="item" :selected="''" :interactive="false" :show-answer="true" />
        <view class="item-actions">
          <view class="unfav-btn" @tap="unfavorite(item)"><text>☆ 取消收藏</text></view>
        </view>
      </view>
      <view v-if="loading" class="empty">加载中…</view>
      <view v-else-if="!list.length" class="empty">暂无收藏</view>
      <view v-if="hasMore" class="loading-more">上拉加载更多</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import QuestionCard from '@/components/question-card/index.vue'
import { examApi } from '@/services/modules/exam'
import { showError } from '@/utils/toast'

const list = ref([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const hasMore = ref(true)

async function load(append = false) {
  if (loading.value) return
  loading.value = true
  try {
    const res = await examApi.favoriteList({ page: page.value, pageSize: 20 })
    const rows = res.data?.list || []
    list.value = append ? [...list.value, ...rows] : rows
    total.value = res.data?.total || 0
    hasMore.value = list.value.length < total.value
  } catch (err) { showError(err.message || '加载失败') }
  finally { loading.value = false }
}

function loadMore() { if (hasMore.value) { page.value += 1; load(true) } }

async function unfavorite(item) {
  try {
    await examApi.favoriteToggle(item.questionId)
    list.value = list.value.filter(x => x.questionId !== item.questionId)
    total.value -= 1
  } catch { showError('操作失败') }
}

onShow(() => { page.value = 1; load() })
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F0F2F8; display: flex; flex-direction: column; }
.content { flex: 1; height: 0; padding: 24rpx; }
.fav-item { margin-bottom: 24rpx; }
.item-actions { display: flex; justify-content: flex-end; margin-top: 12rpx; padding: 0 8rpx; }
.unfav-btn { padding: 6rpx 24rpx; border-radius: 24rpx; background: #EDF2FF; }
.unfav-btn text { font-size: 24rpx; color: #2B6DE8; }
.empty { text-align: center; padding: 120rpx 0; font-size: 28rpx; color: #999; }
.loading-more { text-align: center; font-size: 24rpx; color: #C0C4CC; padding: 16rpx 0; }
</style>
