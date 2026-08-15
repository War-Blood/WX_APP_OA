<template>
  <view class="page">
    <nav-bar title="答题" :showBack="true" />
    <view class="tabs">
      <view class="tab" :class="{ active: tab === 'answer' }" @tap="switchTab('answer')"><text>答题模式</text></view>
      <view class="tab" :class="{ active: tab === 'back' }" @tap="switchTab('back')"><text>背题模式</text></view>
    </view>

    <!-- 答题模式 -->
    <template v-if="tab === 'answer'">
      <!-- 保存状态轻提示（成功淡出 / 失败可点击重试） -->
      <view v-if="savedTip || saveFailed" class="save-tip" :class="{ 'save-tip--fail': saveFailed }" @tap="saveFailed && saveProgress(true)">
        <text>{{ saveFailed ? '保存失败，点击重试' : savedTip }}</text>
      </view>
      <scroll-view class="content" scroll-y v-if="questions.length">
        <view class="answer-progress">
          <text class="ap-text">已答 {{ answeredCount }}/{{ questions.length }}</text>
          <view class="ap-bar"><view class="ap-fill" :style="{ width: progressPct + '%' }" /></view>
          <text class="ap-cur">第 {{ current + 1 }} 题</text>
        </view>
        <question-card
          :question="questions[current]"
          :selected="answers[questions[current].id] || ''"
          :interactive="!submitted"
          :show-answer="false"
          :index="current + 1"
          @update:selected="onSelect"
        />
      </scroll-view>
      <view v-else-if="loading" class="empty">正在加载…</view>
      <view v-else class="empty">暂无题目</view>

      <view class="bottom-bar" v-if="questions.length && !submitted">
        <view class="btn-nav" @tap="current = Math.max(0, current - 1)"><text>上一题</text></view>
        <view class="btn-nav" @tap="current = Math.min(questions.length - 1, current + 1)"><text>下一题</text></view>
        <view class="btn-submit" @tap="openAnswerCard"><text>答题卡</text></view>
        <view class="btn-submit primary" @tap="confirmSubmit"><text>交卷</text></view>
      </view>
    </template>

    <!-- 背题模式 -->
    <template v-else>
      <scroll-view class="content back-list" scroll-y v-if="backQuestions.length">
        <question-card
          v-for="q in backQuestions"
          :key="q.id"
          :question="q"
          :interactive="false"
          :show-answer="true"
          :selected="q.answer"
        />
      </scroll-view>
      <view v-else-if="loading" class="empty">正在加载…</view>
      <view v-else class="empty">暂无题目</view>
    </template>

    <!-- 答题卡浮层 -->
    <view v-if="cardVisible" class="mask" @tap="cardVisible = false">
      <view class="card-panel" @tap.stop>
        <view class="panel-title">答题卡</view>
        <answer-card :questions="questions" :answers="answers" :current="current" @jump="jumpTo" />
        <view class="btn-submit primary" @tap="cardVisible = false; confirmSubmit()"><text>交卷</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onHide, onUnload } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import QuestionCard from '@/components/question-card/index.vue'
import AnswerCard from '@/components/answer-card/index.vue'
import { examApi } from '@/services/modules/exam'
import { showError } from '@/utils/toast'

const tab = ref('answer')
const categoryId = ref(0)
const types = ref([])
const count = ref(20)
const backMemorize = ref(false)
const drawMode = ref('random')

// 已答数(非空答案题数)与作答进度百分比
const answeredCount = computed(() =>
  questions.value.filter((q) => {
    const v = answers.value[q.id]
    return v != null && String(v) !== ''
  }).length
)
const progressPct = computed(() => {
  if (!questions.value.length) return 0
  return Math.round((answeredCount.value / questions.value.length) * 100)
})

const loading = ref(false)
const questions = ref([])
const backQuestions = ref([])
const current = ref(0)
const answers = ref({})
const submitted = ref(false)
const cardVisible = ref(false)
const recordId = ref(null)
const savedTip = ref('')
const saveFailed = ref(false)

let saveTimer = null
let advanceTimer = null

onLoad((options) => {
  categoryId.value = Number(options.categoryId) || 0
  types.value = (options.types || '').split(',').filter(Boolean)
  count.value = Number(options.count) || 20
  backMemorize.value = options.back === '1'
  drawMode.value = options.drawMode || 'random'
  tab.value = options.back === '1' ? 'back' : 'answer'
  load()
})

onHide(() => { saveProgress(true) })
onUnload(() => { saveProgress(true); clearTimeout(saveTimer); clearTimeout(advanceTimer) })

async function load() {
  loading.value = true
  try {
    const isBack = tab.value === 'back'
    const res = await examApi.learnStart({
      categoryId: categoryId.value || undefined,
      type: types.value.length ? types.value : undefined,
      mode: drawMode.value,
      count: count.value,
      backMemorize: isBack,
    })
    if (isBack) backQuestions.value = res.data?.snapshot || []
    else {
      questions.value = res.data?.snapshot || []
      answers.value = res.data?.savedAnswers || {}
      recordId.value = res.data?.recordId || null
    }
  } catch (err) { showError(err.message || '加载失败') }
  finally { loading.value = false }
}

function switchTab(t) {
  if (t === tab.value) return
  saveProgress(true) // 切换前冲刷未保存的答案
  tab.value = t
  current.value = 0
  // 仅目标列表为空才请求，避免重载覆盖已答进度
  if (t === 'back' && !backQuestions.value.length) load()
  else if (t !== 'back' && !questions.value.length) load()
}

function onSelect(val) {
  answers.value[questions.value[current.value].id] = val
  if (tab.value === 'answer') saveProgress()
  // 单选/判断自动跳下一题（300ms 视觉确认；背题 Tab / 已提交 / 末题不跳）
  const q = questions.value[current.value]
  if (q && (q.type === 'single' || q.type === 'judge') && current.value < questions.value.length - 1) {
    clearTimeout(advanceTimer)
    advanceTimer = setTimeout(() => {
      if (!submitted.value && current.value < questions.value.length - 1) current.value++
    }, 300)
  }
}

/** 练习进度保存（防抖 2s，服务端持久化；失败给出提示与重试入口） */
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

function confirmSubmit() {
  const answered = Object.keys(answers.value).filter(k => answers.value[k] !== '').length
  uni.showModal({
    title: '交卷确认',
    content: `已答 ${answered}/${questions.value.length} 题，确认提交？`,
    confirmText: '确认交卷',
    success: (r) => { if (r.confirm) submit() },
  })
}

function jumpTo(i) {
  current.value = i
  cardVisible.value = false
}

function openAnswerCard() { cardVisible.value = true }

async function submit() {
  if (!questions.value.length) return
  if (!recordId.value) return showError('练习未开始')
  submitted.value = true
  uni.showLoading({ title: '提交中...', mask: true })
  try {
    const res = await examApi.learnSubmit(recordId.value, answers.value)
    // 练习模式改 navigateTo：可返回检查；结果按 recordId 直连后端（不再依赖本地 storage）
    uni.navigateTo({ url: '/pages/exam/examResult/index?recordId=' + (res.data?.recordId || recordId.value) })
  } catch (err) {
    submitted.value = false
    showError(err.message || '提交失败')
  } finally {
    uni.hideLoading()
  }
}
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F0F2F8; display: flex; flex-direction: column; }
.tabs { display: flex; background: #FFF; padding: 0 24rpx; }
.tab { flex: 1; text-align: center; padding: 24rpx 0; font-size: 28rpx; color: #999; }
.tab.active { color: #2B6DE8; font-weight: 600; border-bottom: 4rpx solid #2B6DE8; }
.content { flex: 1; height: 0; padding: 24rpx; }
.save-tip { margin: 16rpx 24rpx 0; padding: 12rpx 24rpx; background: #EFFDF5; color: #22C55E; border-radius: 12rpx; font-size: 24rpx; text-align: center; }
.save-tip--fail { background: #FFF0F0; color: #EF4444; }
.back-list { display: flex; flex-direction: column; gap: 24rpx; }
.answer-progress { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.ap-text { font-size: 24rpx; color: #606266; white-space: nowrap; font-variant-numeric: tabular-nums; }
.ap-bar { flex: 1; height: 12rpx; border-radius: 6rpx; background: #F1F5F9; overflow: hidden; }
.ap-fill { height: 100%; border-radius: 6rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); transition: width .3s ease; }
.ap-cur { font-size: 24rpx; color: #2B6DE8; white-space: nowrap; font-weight: 600; }
.empty { text-align: center; padding: 120rpx 0; font-size: 28rpx; color: #999; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFF; display: flex; gap: 16rpx; }
.btn-nav { flex: 1; height: 84rpx; display: flex; align-items: center; justify-content: center; background: #F0F2F5; border-radius: 42rpx; }
.btn-nav text { font-size: 28rpx; color: #666; }
.btn-submit { flex: 1; height: 84rpx; display: flex; align-items: center; justify-content: center; background: #FFF; border: 2rpx solid #E4E7ED; border-radius: 42rpx; }
.btn-submit.primary { background: #2B6DE8; border-color: #2B6DE8; }
.btn-submit text { font-size: 28rpx; color: #333; }
.btn-submit.primary text { color: #FFF; font-weight: 600; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 99; display: flex; align-items: flex-end; }
.card-panel { width: 100%; background: #FFF; border-radius: 24rpx 24rpx 0 0; padding: 24rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); }
.panel-title { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }
</style>
