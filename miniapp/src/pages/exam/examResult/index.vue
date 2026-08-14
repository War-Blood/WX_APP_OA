<template>
  <view class="page">
    <nav-bar :title="title" :showBack="true" />
    <scroll-view class="content" scroll-y v-if="questions.length">
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
    <view v-else-if="loading" class="empty loading-state"><text>加载中…</text></view>
    <view v-else-if="loadError" class="empty">
      <text class="err-text">{{ loadError }}</text>
      <view class="retry-row">
        <view class="btn-secondary retry-btn" @tap="reload"><text>重新加载</text></view>
      </view>
    </view>
    <view v-else class="empty"><text>暂无结果数据</text></view>

    <view class="bottom-bar">
      <view v-if="mode === 'practice'" class="btn-primary" @tap="again"><text>再练一组</text></view>
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

const title = ref('答题结果')
const score = ref(null)
const totalScore = ref(0)
const status = ref('')
const passScore = ref(null)
const questions = ref([])
const loading = ref(false)
const loadError = ref('')
const recordIdRef = ref(null)
const mode = ref('')
const categoryId = ref(0)

const statusLabel = computed(() => {
  if (status.value === 'timeout') return '⏰ 已超时'
  if (score.value == null) return '—'
  // 通过判定统一口径：正式考试按人工设置的合格线(passScore)；练习/模拟无合格线时按总分 60% 兜底
  const pass = passScore.value != null ? passScore.value : Math.round(totalScore.value * 0.6)
  return score.value >= pass ? '✅ 通过' : '❌ 未通过'
})

function parseOptions(opts) {
  if (Array.isArray(opts)) return opts
  try { return JSON.parse(opts) } catch { return [] }
}

async function loadByRecord(recordId) {
  recordIdRef.value = recordId
  loading.value = true
  loadError.value = ''
  try {
    const res = await examApi.recordDetail(recordId)
    const d = res.data
    score.value = d.score
    totalScore.value = d.totalScore
    status.value = d.status
    passScore.value = d.passScore ?? null
    mode.value = d.mode || ''
    categoryId.value = d.categoryId || 0
    title.value = { practice: '练习结果', mock: '模拟考试结果', exam: '正式考试结果' }[d.mode] || '答题结果'
    questions.value = (d.details || []).map(dt => ({
      userAnswer: dt.userAnswer,
      question: {
        id: dt.questionId, type: dt.type, title: dt.title,
        options: parseOptions(dt.options), answer: dt.rightAnswer,
        analysis: dt.analysis, score: dt.totalPoints,
      },
    }))
  } catch (err) {
    loadError.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function reload() { if (recordIdRef.value) loadByRecord(recordIdRef.value) }

function again() {
  uni.navigateTo({ url: '/pages/exam/dati/index?mode=learn&categoryId=' + categoryId.value })
}

onLoad((options) => {
  if (options.recordId) loadByRecord(options.recordId)
  else loadError.value = '缺少答题记录'
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
.empty { text-align: center; padding: 120rpx 0; font-size: 28rpx; color: #999; }
.loading-state text { color: #2B6DE8; }
.err-text { display: block; color: #DC2626; margin-bottom: 24rpx; font-size: 28rpx; }
.retry-row { display: flex; gap: 24rpx; justify-content: center; }
.retry-btn { width: 220rpx; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFF; display: flex; gap: 16rpx; }
.btn-primary { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); }
.btn-primary text { font-size: 30rpx; font-weight: 600; color: #FFF; }
.btn-secondary { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; background: #F0F2F5; }
.btn-secondary text { font-size: 30rpx; color: #666; }
</style>
