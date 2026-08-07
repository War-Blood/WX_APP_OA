<template>
  <view class="page">
    <nav-bar :title="title" :showBack="true" />
    <scroll-view class="content" scroll-y>
      <view class="score-card">
        <text class="score-num">{{ score ?? '-' }}</text>
        <text class="score-total">/ {{ totalScore }}</text>
        <text class="score-label">{{ statusLabel }}</text>
      </view>
      <view class="detail-list">
        <view v-for="(item, i) in questions" :key="i" class="detail-item">
          <question-card
            :question="item.question"
            :selected="item.userAnswer"
            :interactive="false"
            :show-answer="true"
          />
        </view>
      </view>
    </scroll-view>
    <view class="bottom-bar">
      <view class="btn-secondary" @tap="goRecord"><text>查看记录</text></view>
      <view class="btn-primary" @tap="goHome"><text>返回首页</text></view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import QuestionCard from '@/components/question-card/index.vue'
import { examApi } from '@/services/modules/exam'
import { showError } from '@/utils/toast'

const title = ref('答题结果')
const score = ref(null)
const totalScore = ref(0)
const status = ref('')
const questions = ref([])

const statusLabel = computed(() => {
  if (status.value === 'timeout') return '⏰ 已超时'
  if (score.value == null) return '—'
  return score.value >= totalScore.value / 2 ? '✅ 通过' : '❌ 未通过'
})

function parseOptions(opts) {
  if (Array.isArray(opts)) return opts
  try { return JSON.parse(opts) } catch { return [] }
}

async function loadByRecord(recordId) {
  try {
    const res = await examApi.recordDetail(recordId)
    const d = res.data
    score.value = d.score
    totalScore.value = d.totalScore
    status.value = d.status
    title.value = `${d.mode === 'mock' ? '模拟考试' : '正式考试'}结果`
    questions.value = (d.details || []).map(dt => ({
      userAnswer: dt.userAnswer,
      question: {
        id: dt.questionId, type: dt.type, title: dt.title,
        options: parseOptions(dt.options), answer: dt.rightAnswer,
        analysis: dt.analysis, score: dt.totalPoints,
      },
    }))
  } catch (err) { showError(err.message || '加载失败') }
}

function loadPractice() {
  const r = uni.getStorageSync('exam_practice_result')
  if (!r) return
  score.value = r.score
  totalScore.value = r.totalScore
  status.value = 'submitted'
  questions.value = (r.details || []).map(dt => ({
    userAnswer: dt.userAnswer,
    question: {
      id: dt.questionId, type: dt.type, title: dt.title,
      options: parseOptions(dt.options), answer: dt.rightAnswer,
      analysis: dt.analysis, score: dt.totalPoints,
    },
  }))
}

onLoad((options) => {
  if (options.recordId) loadByRecord(options.recordId)
  else if (options.mode === 'learn') loadPractice()
})

function goHome() { uni.reLaunch({ url: '/pages/features/index' }) }
function goRecord() { uni.navigateTo({ url: '/pages/exam/record/index' }) }
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F0F2F8; display: flex; flex-direction: column; }
.content { flex: 1; height: 0; padding: 24rpx; }
.score-card { background: #FFF; border-radius: 16rpx; padding: 48rpx 0; display: flex; align-items: baseline; justify-content: center; gap: 8rpx; margin-bottom: 24rpx; }
.score-num { font-size: 80rpx; font-weight: 700; color: #2B6DE8; font-variant-numeric: tabular-nums; }
.score-total { font-size: 32rpx; color: #909399; }
.score-label { display: block; width: 100%; text-align: center; font-size: 26rpx; color: #666; margin-top: 8rpx; }
.detail-list { display: flex; flex-direction: column; gap: 24rpx; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFF; display: flex; gap: 16rpx; }
.btn-primary { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); }
.btn-primary text { font-size: 30rpx; font-weight: 600; color: #FFF; }
.btn-secondary { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; background: #F0F2F5; }
.btn-secondary text { font-size: 30rpx; color: #666; }
</style>
