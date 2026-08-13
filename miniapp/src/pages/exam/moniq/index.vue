<template>
  <view class="page">
    <nav-bar title="模拟考试" :showBack="true" />
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
    <view v-else-if="loading" class="empty">正在加载…</view>

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

const categoryId = ref(0)
const loading = ref(false)
const questions = ref([])
const current = ref(0)
const answers = ref({})
const submitted = ref(false)
const cardVisible = ref(false)
const recordId = ref(null)
const remaining = ref(0)
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

async function start() {
  loading.value = true
  try {
    const res = await examApi.mockStart(categoryId.value)
    questions.value = res.data?.snapshot || []
    answers.value = res.data?.savedAnswers || {}
    recordId.value = res.data?.recordId
    remaining.value = res.data?.remainingSeconds ?? (res.data?.duration || 0) * 60
    startTimer()
  } catch (err) { showError(err.message || '加载失败') }
  finally { loading.value = false }
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
    const res = await examApi.mockSubmit(recordId.value, answers.value)
    uni.redirectTo({ url: `/pages/exam/examResult/index?recordId=${recordId.value}` })
  } catch (err) {
    submitted.value = false
    showError(err.message || '提交失败')
  } finally {
    uni.hideLoading()
  }
}

onLoad((options) => {
  categoryId.value = Number(options.categoryId) || 0
  // 选分类后不直接开始：先确认，避免被动进入计时
  uni.showModal({
    title: '开始模拟考试？',
    content: '开始后计时不暂停，超时自动交卷',
    confirmText: '开始考试',
    cancelText: '返回',
    success: (r) => { if (r.confirm) start(); else uni.navigateBack() },
  })
})

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
.top-bar { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; background: #FFF; }
.countdown { font-size: 40rpx; font-weight: 700; color: #1E293B; font-variant-numeric: tabular-nums; }
.countdown.urgent { color: #DC2626; }
.countdown.time-urgent { animation: blink 1s infinite; }
@keyframes blink { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
.top-progress { font-size: 26rpx; color: #909399; }
.save-tip { margin: 16rpx 24rpx 0; padding: 12rpx 24rpx; background: #EFFDF5; color: #22C55E; border-radius: 12rpx; font-size: 24rpx; text-align: center; }
.save-tip--fail { background: #FFF0F0; color: #EF4444; }
.card-btn { padding: 8rpx 24rpx; border: 2rpx solid #E4E7ED; border-radius: 24rpx; font-size: 24rpx; color: #2B6DE8; }
.content { flex: 1; height: 0; padding: 24rpx; }
.empty { text-align: center; padding: 120rpx 0; font-size: 28rpx; color: #999; }
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
