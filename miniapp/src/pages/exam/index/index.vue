<template>
  <view class="page">
    <nav-bar title="答题中心" :showBack="true" />
    <scroll-view class="content" scroll-y>
      <!-- 模式入口 -->
      <view class="grid">
        <view class="grid-item" @tap="goCategory('learn')">
          <text class="icon">📖</text><text class="name">练习刷题</text>
        </view>
        <view class="grid-item" @tap="goCategory('moniq')">
          <text class="icon">⏱</text><text class="name">模拟考试</text>
        </view>
        <view class="grid-item" @tap="goExam()">
          <text class="icon">📝</text><text class="name">正式考试</text>
        </view>
        <view class="grid-item" @tap="goCategory('rank')">
          <text class="icon">🏆</text><text class="name">排行榜</text>
        </view>
      </view>

      <!-- 个人学习入口 -->
      <view class="card">
        <view class="link-row" @tap="go('/pages/exam/wrong/index')">
          <text>错题本</text><text class="arrow">›</text>
        </view>
        <view class="link-row" @tap="go('/pages/exam/errorStar/index')">
          <text>我的收藏</text><text class="arrow">›</text>
        </view>
        <view class="link-row" @tap="go('/pages/exam/record/index')">
          <text>答题记录</text><text class="arrow">›</text>
        </view>
      </view>

      <!-- 推荐分类 -->
      <view class="card">
        <text class="card-title">推荐题库</text>
        <view v-if="categories.length" class="cat-list">
          <view v-for="c in categories" :key="c.id" class="cat-item" @tap="goCategory('learn', c.id)">
            <text class="cat-name">{{ c.name }}</text>
            <view class="cat-meta">
              <text>{{ c.questionNum }}题</text>
              <text>·</text>
              <text>{{ c.time }}分钟</text>
            </view>
          </view>
        </view>
        <view v-else class="empty">管理员暂未配置题库</view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { examApi } from '@/services/modules/exam'
import { showError } from '@/utils/toast'

const categories = ref([])
const useLearn = ref(true)

async function load() {
  try {
    const catRes = await examApi.getCategoryTree()
    categories.value = (catRes.data || []).filter(c => c.parentId === 0)
  } catch { /* */ }
  try {
    const s = await examApi.getSettings()
    useLearn.value = s.data?.use_learn !== '0'
  } catch { /* */ }
}

function goCategory(mode, categoryId) {
  if (mode === 'learn' && !useLearn.value) {
    showError('练习模式未开启')
    return
  }
  const base = '/pages/exam/category/index?mode='
  uni.navigateTo({ url: `${base}${mode}${categoryId ? `&categoryId=${categoryId}` : ''}` })
}

function go(page) {
  uni.navigateTo({ url: page })
}

function goExam() {
  uni.navigateTo({ url: '/pages/exam/exam/index' })
}

onShow(load)
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F0F2F8; display: flex; flex-direction: column; }
.content { flex: 1; height: 0; padding: 24rpx; }
.grid { display: flex; flex-wrap: wrap; gap: 20rpx; margin-bottom: 24rpx; }
.grid-item { width: calc(50% - 10rpx); background: #FFF; border-radius: 16rpx; padding: 32rpx 0; display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.icon { font-size: 48rpx; }
.name { font-size: 28rpx; font-weight: 600; color: #333; }
.card { background: #FFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.card-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-bottom: 12rpx; }
.link-row { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 8rpx; border-bottom: 1rpx solid #F5F5F5; font-size: 28rpx; color: #333; }
.link-row:last-child { border-bottom: none; }
.arrow { color: #C0C4CC; font-size: 32rpx; }
.cat-item { padding: 20rpx 8rpx; border-bottom: 1rpx solid #F5F5F5; display: flex; justify-content: space-between; align-items: center; }
.cat-item:last-child { border-bottom: none; }
.cat-name { font-size: 28rpx; color: #333; }
.cat-meta { display: flex; gap: 8rpx; font-size: 24rpx; color: #909399; }
.empty { text-align: center; padding: 60rpx 0; font-size: 26rpx; color: #999; }
</style>
