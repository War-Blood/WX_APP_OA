<template>
  <view class="page">
    <nav-bar :title="title" :showBack="true" />
    <scroll-view class="content" scroll-y>
      <view v-for="c in flatCategories" :key="c.id" class="cat-card" @tap="choose(c)">
        <view class="cat-info">
          <text class="cat-name">{{ c.name }}</text>
          <view class="cat-meta">
            <text>{{ c.questionNum }}题</text>
            <text>·</text>
            <text>{{ c.time }}分钟</text>
          </view>
        </view>
        <view class="cat-right">
          <!-- 练习模式快速开始：跳过练习设置，默认随机20题全题型 -->
          <view v-if="mode === 'learn'" class="quick-btn" @tap.stop="quickStart(c)"><text>快速练习</text></view>
          <text class="arrow">›</text>
        </view>
      </view>
      <view v-if="!flatCategories.length" class="empty">暂无题库分类</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { examApi } from '@/services/modules/exam'
import { showError } from '@/utils/toast'

const mode = ref('learn')
const flatCategories = ref([])
const useLearn = ref(true)

const titleMap = { learn: '选择题库', moniq: '选择模拟考试', exam: '选择正式考试', rank: '选择排行榜' }
const title = computed(() => titleMap[mode.value] || '选择分类')

onLoad(async (options) => {
  mode.value = options.mode || 'learn'
  try {
    const res = await examApi.getCategoryTree()
    flatCategories.value = (res.data || []).map(n => ({ ...n, indent: '' }))
  } catch { /* */ }
  try {
    const s = await examApi.getSettings()
    useLearn.value = s.data?.use_learn !== '0'
  } catch { /* */ }
})

function choose(c) {
  const route = { learn: '/pages/exam/learn/index', moniq: '/pages/exam/moniq/index', exam: '/pages/exam/exam/index', rank: '/pages/exam/rank/index' }[mode.value]
  uni.navigateTo({ url: `${route}?categoryId=${c.id}` })
}

/** 练习模式快速开始：默认随机20题全题型，跳过练习设置页，将流程从3步缩到2步（与首页门禁口径一致） */
function quickStart(c) {
  if (mode.value === 'learn' && !useLearn.value) {
    showError('练习模式未开启')
    return
  }
  uni.navigateTo({ url: `/pages/exam/dati/index?mode=learn&categoryId=${c.id}&types=single,multiple,judge&count=20&back=0&drawMode=random` })
}
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F0F2F8; display: flex; flex-direction: column; }
.content { flex: 1; height: 0; padding: 24rpx; }
.cat-card { background: #FFF; border-radius: 16rpx; padding: 28rpx 24rpx; margin-bottom: 16rpx; display: flex; justify-content: space-between; align-items: center; }
.cat-info { display: flex; flex-direction: column; gap: 8rpx; }
.cat-name { font-size: 30rpx; font-weight: 600; color: #333; }
.cat-meta { display: flex; gap: 8rpx; font-size: 24rpx; color: #909399; }
.cat-right { display: flex; align-items: center; gap: 16rpx; }
.quick-btn { padding: 8rpx 20rpx; background: #EDF2FF; border-radius: 24rpx; font-size: 24rpx; color: #2B6DE8; }
.quick-btn:active { background: #D6E4FF; }
.arrow { color: #C0C4CC; font-size: 36rpx; }
.empty { text-align: center; padding: 120rpx 0; font-size: 28rpx; color: #999; }
</style>