<template>
  <view class="page">
    <nav-bar title="正式考试" :showBack="true" />

    <!-- 试卷列表（可参加） -->
    <template v-if="!started">
      <scroll-view class="content" scroll-y>
        <view v-for="p in papers" :key="p.paperId" class="paper-card">
          <view class="paper-head">
            <text class="paper-title">{{ p.title }}</text>
            <text class="paper-status" :class="{ done: p.myStatus === 'submitted' }">{{ myStatusLabel(p) }}</text>
          </view>
          <view class="paper-meta">
            <text>⏱ {{ p.duration }}分钟</text>
            <text>🎯 合格线：{{ p.passScore }}分</text>
            <text>🔄 剩余 {{ remainingCount(p) }} 次</text>
          </view>
          <view v-if="p.description" class="paper-desc">{{ p.description }}</view>
          <view class="paper-actions">
            <view v-if="p.myStatus === 'doing'" class="btn-secondary" @tap="startPaper(p)"><text>继续考试</text></view>
            <view v-else-if="p.myStatus === 'submitted'" class="btn-secondary" @tap="goResult(p)"><text>查看成绩</text></view>
            <view v-else class="btn-primary small" :class="{ disabled: !p.canTake }" @tap="p.canTake && startPaper(p)"><text>{{ p.canTake ? '开始考试' : '已用完次数' }}</text></view>
          </view>
        </view>
        <view v-if="!papers.length && !loading" class="empty">暂无可用考试</view>
        <view v-if="loading" class="empty">加载中…</view>
      </scroll-view>
    </template>

    <!-- 答题中 -->
    <template v-else>
      <view class="top-bar">
        <text class="countdown" :class="{ urgent: remaining <= 60 }">{{ formatTime(remaining) }}</text>
        <text class="top-progress">{{ current + 1 }}/{{ questions.length }}</text>
        <view class="card-btn" @tap="cardVisible = true"><text>答题卡</text></view>
      </view>
      <scroll-view class="content" scroll-y v-if="questions.length">
        <question-card
          :question="questions[current]"
          :selected="answers[questions[current].id] || ''"
          :interactive="!submitted"
          :show-answer="false"
          @update:selected="onSelect"
        />
      </scroll-view>
      <view v-else class="empty">正在加载…</view>

      <view class="bottom-bar" v-if="questions.length && !submitted">
        <view class="btn-nav" @tap="current = Math.max(0, current - 1)"><text>上一题</text></view>
        <view class="btn-nav" @tap="current = Math.min(questions.length - 1, current + 1)"><text>下一题</text></view>
        <view class="btn-submit danger" @tap="confirmSubmit"><text>交卷</text></view>
      </view>

      <view v-if="cardVisible" class="mask" @tap="cardVisible = false">
        <view class="card-panel" @tap.stop>
          <view class="panel-title">答题卡</view>
          <answer-card :questions="questions" :answers="answers" :current="current" @jump="jumpTo" />
          <view class="btn-submit danger" @tap="cardVisible = false; confirmSubmit()"><text>交卷</text></view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onUnload, onHide } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import QuestionCard from '@/components/question-card/index.vue'
import AnswerCard from '@/components/answer-card/index.vue'
import { examApi } from '@/services/modules/exam'
import { showError } from '@/utils/toast'

const loading = ref(false)
const papers = ref([])
const started = ref(false)

// 答题状态
const questions = ref([])
const current = ref(0)
const answers = ref({})
const submitted = ref(false)
const cardVisible = ref(false)
const recordId = ref(null)
const remaining = ref(0)
let timer = null
let saveTimer = null

function formatTime(sec) {
  const s = Math.max(0, sec)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m < 10 ? '0' + m : m}:${r < 10 ? '0' + r : r}`
}

function remainingCount(p) {
  return p.maxAttempts === 0 ? '不限' : Math.max(0, p.maxAttempts - p.attemptsUsed)
}

function myStatusLabel(p) {
  if (p.myStatus === 'doing') return '进行中'
  if (p.myStatus === 'submitted') return p.myPass ? `已通过 ${p.myScore}分` : `未通过 ${p.myScore}分`
  return p.attemptsUsed > 0 ? '已考完' : '未参加'
}

async function loadPapers() {
  loading.value = true
  try {
    const res = await examApi.getAvailablePapers()
    papers.value = res.data || []
  } catch (err) { showError(err.message || '加载失败') }
  finally { loading.value = false }
}

function startPaper(p) {
  uni.showModal({
    title: p.title,
    content: `时长：${p.duration}分钟\n合格线：${p.passScore}分\n剩余次数：${remainingCount(p)}\n开始后计时不暂停，超时自动交卷`,
    confirmText: '开始考试',
    success: (r) => { if (r.confirm) doStart(p.paperId) },
  })
}

function doStart(paperId) {
  started.value = true
  examApi.examStart(paperId).then((res) => {
    questions.value = res.data?.snapshot || []
    answers.value = res.data?.savedAnswers || {}
    recordId.value = res.data?.recordId
    remaining.value = res.data?.remainingSeconds ?? (res.data?.duration || 0) * 60
    startTimer()
  }).catch((err) => {
    started.value = false
    showError(err.message || '开始失败')
  })
}

function goResult(p) {
  uni.navigateTo({ url: `/pages/exam/examResult/index?recordId=${p.recordId}` })
}

function saveProgress(immediate = false) {
  if (!recordId.value || !Object.keys(answers.value).length) return
  const doSave = () => examApi.saveProgress(recordId.value, answers.value).catch(() => {})
  if (immediate) doSave()
  else {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(doSave, 2000)
  }
}

function onSelect(val) {
  answers.value[questions.value[current.value].id] = val
  saveProgress()
}

function jumpTo(i) {
  current.value = i
  cardVisible.value = false
}

function startTimer() {
  clearInterval(timer)
  timer = setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) {
      clearInterval(timer)
      submit()
    }
  }, 1000)
}

function confirmSubmit() {
  uni.showModal({
    title: '交卷确认',
    content: `已答 ${Object.keys(answers.value).filter(k => answers.value[k] !== '').length}/${questions.value.length} 题，交卷后不可修改`,
    confirmText: '确认交卷',
    success: (r) => { if (r.confirm) submit() },
  })
}

async function submit() {
  if (!recordId.value || submitted.value) return
  submitted.value = true
  clearInterval(timer)
  clearTimeout(saveTimer)
  try {
    const res = await examApi.examSubmit(recordId.value, answers.value)
    uni.redirectTo({ url: `/pages/exam/examResult/index?recordId=${recordId.value}` })
  } catch (err) {
    submitted.value = false
    showError(err.message || '提交失败')
  }
}

onLoad(() => { loadPapers() })

onHide(() => saveProgress(true))
onUnload(() => {
  saveProgress(true)
  clearInterval(timer)
  clearTimeout(saveTimer)
})
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F0F2F8; display: flex; flex-direction: column; }
.content { flex: 1; height: 0; padding: 24rpx; }
.paper-card { background: #FFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.paper-head { display: flex; justify-content: space-between; align-items: center; }
.paper-title { font-size: 30rpx; font-weight: 600; color: #333; flex: 1; }
.paper-status { font-size: 24rpx; color: #2B6DE8; }
.paper-status.done { color: #16A34A; }
.paper-meta { display: flex; gap: 24rpx; margin-top: 12rpx; font-size: 24rpx; color: #909399; flex-wrap: wrap; }
.paper-desc { margin-top: 8rpx; font-size: 24rpx; color: #999; }
.paper-actions { margin-top: 16rpx; display: flex; justify-content: flex-end; }
.btn-primary.small { height: 60rpx; border-radius: 30rpx; width: 180rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); }
.btn-primary.small text { font-size: 26rpx; color: #FFF; }
.btn-primary.small.disabled { background: #C0C4CC; }
.btn-secondary { height: 60rpx; border-radius: 30rpx; display: flex; align-items: center; justify-content: center; background: #F0F2F5; width: 180rpx; }
.btn-secondary text { font-size: 26rpx; color: #666; }
.empty { text-align: center; padding: 120rpx 0; font-size: 28rpx; color: #999; }
.top-bar { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; background: #FFF; }
.countdown { font-size: 40rpx; font-weight: 700; color: #1E293B; font-variant-numeric: tabular-nums; }
.countdown.urgent { color: #DC2626; }
.top-progress { font-size: 26rpx; color: #909399; }
.card-btn { padding: 8rpx 24rpx; border: 2rpx solid #E4E7ED; border-radius: 24rpx; font-size: 24rpx; color: #2B6DE8; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFF; display: flex; gap: 16rpx; }
.btn-nav { flex: 1; height: 84rpx; display: flex; align-items: center; justify-content: center; background: #F0F2F5; border-radius: 42rpx; }
.btn-nav text { font-size: 28rpx; color: #666; }
.btn-submit { flex: 1; height: 84rpx; display: flex; align-items: center; justify-content: center; border-radius: 42rpx; }
.btn-submit.danger { background: #DC2626; }
.btn-submit text { font-size: 28rpx; color: #FFF; font-weight: 600; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 99; display: flex; align-items: flex-end; }
.card-panel { width: 100%; background: #FFF; border-radius: 24rpx 24rpx 0 0; padding: 24rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); }
.panel-title { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }
</style>
