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
        <text class="countdown" :class="{ urgent: remaining <= 60, 'time-urgent': remaining <= 10 }">{{ formatTime(remaining) }}</text>
        <text class="top-progress">{{ current + 1 }}/{{ questions.length }}</text>
        <view class="card-btn" @tap="cardVisible = true"><text>答题卡</text></view>
      </view>
      <!-- 保存状态轻提示（成功淡出 / 失败可点击重试） -->
      <view v-if="savedTip || saveFailed" class="save-tip" :class="{ 'save-tip--fail': saveFailed }" @tap="saveFailed && saveProgress(true)">
        <text>{{ saveFailed ? '保存失败，点击重试' : savedTip }}</text>
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
      <view v-else-if="starting" class="empty loading-state"><text>正在进入考试…</text></view>
      <view v-else-if="startError" class="empty">
        <text class="err-text">{{ startError }}</text>
        <view class="retry-row">
          <view class="btn-secondary retry-btn" @tap="doStart(lastPaperId)"><text>重试</text></view>
          <view class="btn-secondary retry-btn" @tap="started = false; startError = ''"><text>返回列表</text></view>
        </view>
      </view>
      <view v-else class="empty">暂无题目</view>

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
import { onLoad, onUnload, onHide, onShow } from '@dcloudio/uni-app'
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
const starting = ref(false)
const startError = ref('')
const lastPaperId = ref(null)
const savedTip = ref('')
const saveFailed = ref(false)
let timer = null
let saveTimer = null
let advanceTimer = null
let endTime = 0
let timeoutHandled = false

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
  lastPaperId.value = paperId
  started.value = true
  starting.value = true
  startError.value = ''
  examApi.examStart(paperId).then((res) => {
    starting.value = false
    questions.value = res.data?.snapshot || []
    answers.value = res.data?.savedAnswers || {}
    recordId.value = res.data?.recordId
    remaining.value = res.data?.remainingSeconds ?? (res.data?.duration || 0) * 60
    startTimer()
  }).catch((err) => {
    starting.value = false
    // 失败保持答题界面并提供重试，不再闪回列表
    startError.value = err.message || '开始失败'
  })
}

function goResult(p) {
  uni.navigateTo({ url: `/pages/exam/examResult/index?recordId=${p.recordId}` })
}

function saveProgress(immediate = false) {
  if (!recordId.value || !Object.keys(answers.value).length) return
  const doSave = async () => {
    try {
      await examApi.saveProgress(recordId.value, answers.value)
      saveFailed.value = false
      savedTip.value = '已自动保存'
      setTimeout(() => { savedTip.value = '' }, 1500)
    } catch (err) {
      saveFailed.value = true
      savedTip.value = ''
      uni.showToast({ title: '保存失败，请检查网络', icon: 'none' })
    }
  }
  if (immediate) doSave()
  else {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(doSave, 2000)
  }
}

function onSelect(val) {
  answers.value[questions.value[current.value].id] = val
  saveProgress()
  // 单选/判断自动跳下一题（300ms 视觉确认；已提交 / 末题不跳）
  const q = questions.value[current.value]
  if (q && (q.type === 'single' || q.type === 'judge') && current.value < questions.value.length - 1) {
    clearTimeout(advanceTimer)
    advanceTimer = setTimeout(() => {
      if (!submitted.value && current.value < questions.value.length - 1) current.value++
    }, 300)
  }
}

function jumpTo(i) {
  current.value = i
  cardVisible.value = false
}

function startTimer() {
  clearInterval(timer)
  endTime = Date.now() + remaining.value * 1000
  timer = setInterval(() => {
    remaining.value = Math.max(0, Math.round((endTime - Date.now()) / 1000))
    if (remaining.value <= 0) {
      clearInterval(timer)
      handleTimeout()
    }
  }, 1000)
}

/** 超时交卷前先明确提示，避免用户不知情被跳转 */
function handleTimeout() {
  if (timeoutHandled) return
  timeoutHandled = true
  uni.showModal({
    title: '⏰ 时间已到',
    content: '考试时间结束，系统正在自动交卷',
    showCancel: false,
    confirmText: '知道了',
    success: () => submit(),
  })
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
  uni.showLoading({ title: '提交中...', mask: true })
  try {
    const res = await examApi.examSubmit(recordId.value, answers.value)
    uni.redirectTo({ url: `/pages/exam/examResult/index?recordId=${recordId.value}` })
  } catch (err) {
    submitted.value = false
    showError(err.message || '提交失败')
  } finally {
    uni.hideLoading()
  }
}

onLoad(() => { loadPapers() })

onShow(() => {
  // 后台切换后按结束时间戳校准剩余时间
  if (endTime && !submitted.value) {
    remaining.value = Math.max(0, Math.round((endTime - Date.now()) / 1000))
    if (remaining.value <= 0) handleTimeout()
  }
})
onHide(() => saveProgress(true))
onUnload(() => {
  saveProgress(true)
  clearInterval(timer)
  clearTimeout(saveTimer)
  clearTimeout(advanceTimer)
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
.countdown.time-urgent { animation: blink 1s infinite; }
@keyframes blink { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
.top-progress { font-size: 26rpx; color: #909399; }
.save-tip { margin: 16rpx 24rpx 0; padding: 12rpx 24rpx; background: #EFFDF5; color: #22C55E; border-radius: 12rpx; font-size: 24rpx; text-align: center; }
.save-tip--fail { background: #FFF0F0; color: #EF4444; }
.loading-state text { color: #2B6DE8; }
.err-text { display: block; color: #DC2626; margin-bottom: 24rpx; }
.retry-row { display: flex; gap: 24rpx; justify-content: center; }
.retry-btn { width: 180rpx; }
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
