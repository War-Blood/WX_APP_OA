<template>
  <view class="page">
    <nav-bar title="错题本" :showBack="true" />
    <view class="top-actions">
      <view class="btn-secondary" @tap="goLearn"><text>错题重练</text></view>
    </view>
    <scroll-view class="content" scroll-y @scrolltolower="loadMore">
      <view v-for="item in list" :key="item.questionId" class="wrong-item">
        <question-card :question="item" :selected="''" :interactive="false" :show-answer="true" />
        <view class="item-actions">
          <text class="wrong-count">错 {{ item.wrongCount }} 次</text>
          <view class="remove-btn" @tap="remove(item)"><text>移除</text></view>
        </view>
      </view>
      <view v-if="loading" class="empty">加载中…</view>
      <view v-else-if="!list.length" class="empty">暂无错题，继续保持！</view>
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
    const res = await examApi.wrongList({ page: page.value, pageSize: 20 })
    const rows = res.data?.list || []
    list.value = append ? [...list.value, ...rows] : rows
    total.value = res.data?.total || 0
    hasMore.value = list.value.length < total.value
  } catch (err) { showError(err.message || '加载失败') }
  finally { loading.value = false }
}

function loadMore() { if (hasMore.value) { page.value += 1; load(true) } }

async function remove(item) {
  try {
    await examApi.wrongRemove(item.questionId)
    list.value = list.value.filter(x => x.questionId !== item.questionId)
    total.value -= 1
  } catch { showError('移除失败') }
}

function goLearn() { uni.navigateTo({ url: '/pages/exam/learn/index' }) }

onShow(() => { page.value = 1; load() })
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F0F2F8; display: flex; flex-direction: column; }
.top-actions { padding: 16rpx 24rpx; display: flex; justify-content: flex-end; }
.btn-secondary { padding: 12rpx 32rpx; border-radius: 30rpx; background: #FFF; border: 2rpx solid #2B6DE8; }
.btn-secondary text { font-size: 26rpx; color: #2B6DE8; }
.content { flex: 1; height: 0; padding: 0 24rpx 24rpx; }
.wrong-item { margin-bottom: 24rpx; }
.item-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; padding: 0 8rpx; }
.wrong-count { font-size: 24rpx; color: #909399; }
.remove-btn { padding: 6rpx 24rpx; border-radius: 24rpx; background: #FEF2F2; }
.remove-btn text { font-size: 24rpx; color: #DC2626; }
.empty { text-align: center; padding: 120rpx 0; font-size: 28rpx; color: #999; }
.loading-more { text-align: center; font-size: 24rpx; color: #C0C4CC; padding: 16rpx 0; }
</style>
