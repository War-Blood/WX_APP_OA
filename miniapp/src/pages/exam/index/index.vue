<template>
  <view class="page">
    <nav-bar title="在线考试" :showBack="true" />
    <view class="tabs">
      <view v-for="t in tabs" :key="t.key" class="tab" @tap="activeTab = t.key">
        <text :class="{ active: activeTab === t.key }">{{ t.label }}</text>
      </view>
    </view>
    <!-- 练习Tab -->
    <scroll-view v-if="activeTab === 'practice'" class="content" scroll-y>
      <view class="card">
        <text class="card-title">选择分类</text>
        <picker :range="categoryLabels" @change="onCategoryChange">
          <view class="picker">{{ categoryLabels[categoryIdx] || '全部分类' }}</view>
        </picker>
      </view>
      <view class="card">
        <text class="card-title">选择题型</text>
        <view class="type-row">
          <view v-for="t in questionTypes" :key="t.key" class="type-item" :class="{ checked: typeSelections.includes(t.key) }" @tap="toggleType(t.key)">
            <text>{{ t.label }}</text>
          </view>
        </view>
      </view>
      <view class="card">
        <text class="card-title">题目数量</text>
        <view class="stepper">
          <view class="step-btn" @tap="count = Math.max(5, count - 5)"><text>-</text></view>
          <text class="step-val">{{ count }}</text>
          <view class="step-btn" @tap="count = Math.min(100, count + 5)"><text>+</text></view>
        </view>
      </view>
      <view class="btn-primary" @tap="handleStartPractice"><text>开始练习</text></view>
    </scroll-view>

    <!-- 考试Tab -->
    <scroll-view v-else class="content" scroll-y>
      <view v-if="examList.length" class="list">
        <view v-for="item in examList" :key="item.paperId" class="exam-card">
          <text class="exam-title">{{ item.title }}</text>
          <view class="exam-meta">
            <text>⏱ {{ item.duration }}分钟</text>
            <text>🎯 合格线：{{ item.passScore }}分</text>
          </view>
          <view v-if="item.hasSubmitted" class="exam-result">
            <text :style="{ color: item.isPass ? '#22C55E' : '#EF4444' }">{{ item.score }}分 {{ item.isPass ? '✅ 已通过' : '❌ 未通过' }}</text>
          </view>
          <view class="exam-actions">
            <view v-if="item.hasSubmitted" class="btn-secondary" @tap="goResult(item.paperId)"><text>查看成绩</text></view>
            <view v-else class="btn-primary small" @tap="handleStartExam(item)"><text>开始考试</text></view>
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无可用考试</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { examApi } from '@/services/modules/exam'
import { showError } from '@/utils/toast'

const tabs = [{ key: 'practice', label: '练习' }, { key: 'exam', label: '考试' }]
const activeTab = ref('practice')
const categoryLabels = ref(['全部分类'])
const categoryIdx = ref(0)
const questionTypes = [{ key: 'single', label: '单选' }, { key: 'multiple', label: '多选' }, { key: 'judge', label: '判断' }]
const typeSelections = ref(['single', 'multiple'])
const count = ref(20)
const examList = ref([])

function toggleType(k) {
  const idx = typeSelections.value.indexOf(k)
  if (idx > -1) typeSelections.value.splice(idx, 1)
  else typeSelections.value.push(k)
}
function onCategoryChange(e) { categoryIdx.value = e.detail.value }

async function handleStartPractice() {
  if (!typeSelections.value.length) return showError('请选择题型')
  uni.navigateTo({ url: `/pages/exam/practice/index?type=${typeSelections.value.join(',')}&count=${count.value}` })
}

async function handleStartExam(item) {
  const r = await new Promise(resolve => uni.showModal({
    title: item.title,
    content: `时长：${item.duration}分钟\n合格线：${item.passScore}分\n开始后计时不暂停，超时自动交卷`,
    confirmText: '开始考试',
    success: resolve
  }))
  if (r.confirm) {
    uni.navigateTo({ url: `/pages/exam/exam/index?paperId=${item.paperId}` })
  }
}
function goResult(paperId) {
  uni.navigateTo({ url: `/pages/exam/result/index?paperId=${paperId}` })
}

onShow(async () => {
  try { const res = await examApi.getExamList(); if (res.data) examList.value = res.data } catch { /* silent */ }
})
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; }
.tabs { display: flex; background: #FFF; padding: 0 24rpx; }
.tab { flex: 1; text-align: center; padding: 24rpx 0; font-size: 28rpx; color: #999; }
.tab .active { color: #2B6DE8; font-weight: 600; border-bottom: 4rpx solid #2B6DE8; }
.content { flex: 1; height: 0; padding: 24rpx; }
.card { background: #FFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.card-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-bottom: 16rpx; }
.picker { font-size: 28rpx; color: #2B6DE8; padding: 12rpx 0; }
.type-row { display: flex; gap: 16rpx; }
.type-item { padding: 12rpx 28rpx; border-radius: 24rpx; border: 2rpx solid #E4E7ED; font-size: 26rpx; color: #666; }
.type-item.checked { background: #EDF2FF; border-color: #2B6DE8; color: #2B6DE8; }
.stepper { display: flex; align-items: center; gap: 24rpx; }
.step-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; background: #EDF2FF; border-radius: 12rpx; font-size: 28rpx; color: #2B6DE8; }
.step-val { font-size: 36rpx; font-weight: 600; color: #333; }
.btn-primary { margin-top: 24rpx; height: 96rpx; display: flex; align-items: center; justify-content: center; border-radius: 48rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); }
.btn-primary text { font-size: 32rpx; font-weight: 600; color: #FFF; }
.btn-primary.small { height: 60rpx; border-radius: 30rpx; width: 180rpx; }
.btn-secondary { height: 60rpx; border-radius: 30rpx; display: flex; align-items: center; justify-content: center; background: #F0F2F5; width: 180rpx; }
.btn-secondary text { font-size: 26rpx; color: #666; }
.exam-card { background: #FFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.exam-title { font-size: 30rpx; font-weight: 600; color: #333; display: block; }
.exam-meta { display: flex; gap: 24rpx; margin-top: 12rpx; font-size: 24rpx; color: #999; }
.exam-result { margin-top: 8rpx; font-size: 26rpx; font-weight: 600; }
.exam-actions { margin-top: 16rpx; display: flex; justify-content: flex-end; }
.empty { text-align: center; padding: 120rpx 0; font-size: 28rpx; color: #999; }
</style>
