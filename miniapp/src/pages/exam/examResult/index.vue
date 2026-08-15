<template>
  <view class="page">
    <nav-bar :title="title" :showBack="true" />
    <scroll-view class="content" scroll-y v-if="questions.length">
      <!-- 分数概览：平铺数字 + 通过/未通过徽标 + 占比进度条 + 用时 -->
      <view class="hero" :class="heroTone">
        <view class="hero-top">
          <view class="score-left">
            <text class="score-num">{{ score ?? '-' }}</text>
            <text class="score-total">/ {{ totalScore }}</text>
          </view>
          <text class="hero-badge">{{ badgeText }}</text>
        </view>
        <view class="hero-bar">
          <view class="hero-bar-fill" :style="{ width: scorePct + '%' }" />
        </view>
        <view class="hero-foot">
          <text class="hero-time">⏱ 用时 {{ useTimeText }}</text>
          <text v-if="passText" class="hero-pass">{{ passText }}</text>
        </view>
      </view>

      <!-- 答题统计：正确 / 错误 / 未答 -->
      <view class="summary">
        <view class="sum-item">
          <text class="sum-n pass">{{ correctCount }}</text>
          <text class="sum-l">正确</text>
        </view>
        <view class="sum-divide" />
        <view class="sum-item">
          <text class="sum-n fail">{{ wrongCount }}</text>
          <text class="sum-l">错误</text>
        </view>
        <view class="sum-divide" />
        <view class="sum-item">
          <text class="sum-n">{{ unansweredCount }}</text>
          <text class="sum-l">未答</text>
        </view>
      </view>

      <view class="detail-list">
        <view v-for="(item, i) in questions" :key="i" class="detail-item">
          <question-card
            :question="item.question"
            :selected="item.userAnswer"
            :interactive="false"
            :show-answer="true"
            :index="i + 1"
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
const isPass = ref(null)
const useTime = ref(0)
const questions = ref([])
const loading = ref(false)
const loadError = ref('')
const recordIdRef = ref(null)
const mode = ref('')
const categoryId = ref(0)

// 分数占比(0~100)，用于 hero 进度条
const scorePct = computed(() => {
  if (!totalScore.value || score.value == null) return 0
  return Math.max(0, Math.min(100, Math.round((score.value / totalScore.value) * 100)))
})

// 逐题判分统计：正确/错误/未答(错误含部分得分题；未答=完全未作答)
const correctCount = computed(() => {
  let c = 0, w = 0, u = 0
  questions.value.forEach((it) => {
    const empty = !it.userAnswer || it.userAnswer === '' || it.userAnswer.trim?.() === ''
    // question-card 内部按 answer 判定 correctness，结果与 quality 同口径
    const q = it.question
    const correctKeys = String(q?.answer || '').split(',').map((s) => s.trim()).filter(Boolean)
    const uKeys = String(it.userAnswer || '').split(',').map((s) => s.trim()).filter(Boolean)
    if (!uKeys.length || empty) { u += 1; return }
    let right = false
    if (q?.type === 'multiple') {
      right = correctKeys.length === uKeys.length && uKeys.every((k) => correctKeys.includes(k))
    } else {
      right = uKeys.length > 0 && uKeys[0] === q.answer
    }
    if (right) c += 1; else w += 1
  })
  return c
})
const wrongCount = computed(() => {
  let w = 0
  questions.value.forEach((it) => {
    const uKeys = String(it.userAnswer || '').split(',').map((s) => s.trim()).filter(Boolean)
    if (!uKeys.length) return
    const q = it.question
    const correctKeys = String(q?.answer || '').split(',').map((s) => s.trim()).filter(Boolean)
    let right = false
    if (q?.type === 'multiple') {
      right = correctKeys.length === uKeys.length && uKeys.every((k) => correctKeys.includes(k))
    } else {
      right = uKeys[0] === q.answer
    }
    if (!right) w += 1
  })
  return w
})
const unansweredCount = computed(() => Math.max(0, questions.value.length - correctCount.value - wrongCount.value))

// 用时文案：秒 → m分s秒 / m分
const useTimeText = computed(() => {
  const s = Number(useTime.value) || 0
  const m = Math.floor(s / 60)
  const r = s % 60
  if (!m) return r + '秒'
  if (!r) return m + '分'
  return m + '分' + r + '秒'
})

// 徽标文案 + 色调
const badgeText = computed(() => {
  if (status.value === 'timeout') return '⏰ 已超时'
  if (score.value == null) return '—'
  return isPass.value === false ? '❌ 未通过' : '✅ 通过'
})
const heroTone = computed(() => {
  if (status.value === 'timeout') return 'tone-warn'
  if (score.value == null) return ''
  return isPass.value === false ? 'tone-fail' : 'tone-pass'
})
const passText = computed(() => {
  if (status.value === 'timeout' || passScore.value == null) return ''
  return '合格线 ' + passScore.value + '分'
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
    // 优先采用后端统一判定的 isPass，无则按合格线本地兜底
    if (d.isPass != null) isPass.value = !!d.isPass
    else if (d.status === 'submitted' && d.score != null) {
      const pass = d.passScore != null ? d.passScore : Math.round(d.totalScore * 0.6)
      isPass.value = d.score >= pass
    } else isPass.value = null
    useTime.value = d.useTime || 0
    mode.value = d.mode || ''
    categoryId.value = d.categoryId || 0
    title.value = { practice: '练习结果', mock: '模拟考试结果', exam: '正式考试结果' }[d.mode] || '答题结果'
    questions.value = (d.details || []).map((dt) => ({
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

/* 分数概览 */
.hero { background: #FFF; border-radius: 16rpx; padding: 40rpx 32rpx 28rpx; margin-bottom: 20rpx; }
.hero-top { display: flex; align-items: flex-end; justify-content: space-between; }
.score-left { display: flex; align-items: baseline; gap: 6rpx; }
.score-num { font-size: 84rpx; font-weight: 700; color: #2B6DE8; font-variant-numeric: tabular-nums; line-height: 1; }
.score-total { font-size: 30rpx; color: #909399; }
.hero-badge { font-size: 28rpx; font-weight: 600; color: #16A34A; background: #F0FDF4; padding: 8rpx 24rpx; border-radius: 28rpx; }
.hero.tone-fail .score-num { color: #DC2626; }
.hero.tone-fail .hero-badge { color: #DC2626; background: #FEF2F2; }
.hero.tone-warn .score-num { color: #D97706; }
.hero.tone-warn .hero-badge { color: #D97706; background: #FFF7E6; }
.hero-bar { margin-top: 24rpx; height: 16rpx; border-radius: 8rpx; background: #F1F5F9; overflow: hidden; }
.hero-bar-fill { height: 100%; border-radius: 8rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); transition: width .4s ease; }
.hero.tone-fail .hero-bar-fill { background: linear-gradient(135deg, #DC2626, #F87171); }
.hero.tone-warn .hero-bar-fill { background: linear-gradient(135deg, #D97706, #FBBF24); }
.hero-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 16rpx; }
.hero-time { font-size: 24rpx; color: #909399; }
.hero-pass { font-size: 24rpx; color: #909399; }

/* 答题统计三宫格 */
.summary { display: flex; align-items: center; background: #FFF; border-radius: 16rpx; padding: 28rpx 0; margin-bottom: 24rpx; }
.sum-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.sum-n { font-size: 44rpx; font-weight: 700; color: #1E293B; font-variant-numeric: tabular-nums; }
.sum-n.pass { color: #16A34A; }
.sum-n.fail { color: #DC2626; }
.sum-l { font-size: 24rpx; color: #909399; }
.sum-divide { width: 1rpx; height: 56rpx; background: #F0F2F5; }

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