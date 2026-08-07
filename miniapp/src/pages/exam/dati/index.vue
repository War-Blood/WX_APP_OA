<template>
  <view class="page">
    <nav-bar title="答题" :showBack="true" />
    <view class="tabs">
      <view class="tab" :class="{ active: tab === 'answer' }" @tap="switchTab('answer')"><text>答题模式</text></view>
      <view class="tab" :class="{ active: tab === 'back' }" @tap="switchTab('back')"><text>背题模式</text></view>
    </view>

    <!-- 答题模式 -->
    <template v-if="tab === 'answer'">
      <scroll-view class="content" scroll-y v-if="questions.length">
        <view class="progress"><text>第 {{ current + 1 }}/{{ questions.length }} 题</text></view>
        <question-card
          :question="questions[current]"
          :selected="answers[questions[current].id] || ''"
          :interactive="!submitted"
          :show-answer="false"
          @update:selected="onSelect"
        />
      </scroll-view>
      <view v-else-if="loading" class="empty">正在加载…</view>
      <view v-else class="empty">暂无题目</view>

      <view class="bottom-bar" v-if="questions.length && !submitted">
        <view class="btn-nav" @tap="current = Math.max(0, current - 1)"><text>上一题</text></view>
        <view class="btn-nav" @tap="current = Math.min(questions.length - 1, current + 1)"><text>下一题</text></view>
        <view class="btn-submit" @tap="openAnswerCard"><text>答题卡</text></view>
        <view class="btn-submit primary" @tap="submit"><text>交卷</text></view>
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
        <view class="btn-submit primary" @tap="cardVisible = false; submit()"><text>交卷</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
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

const loading = ref(false)
const questions = ref([])
const backQuestions = ref([])
const current = ref(0)
const answers = ref({})
const submitted = ref(false)
const cardVisible = ref(false)
const recordId = ref(null)

onLoad((options) => {
  categoryId.value = Number(options.categoryId) || 0
  types.value = (options.types || '').split(',').filter(Boolean)
  count.value = Number(options.count) || 20
  backMemorize.value = options.back === '1'
  tab.value = options.back === '1' ? 'back' : 'answer'
  load()
})

async function load() {
  loading.value = true
  try {
    const isBack = tab.value === 'back'
    const res = await examApi.learnStart({
      categoryId: categoryId.value || undefined,
      type: types.value.length ? types.value : undefined,
      mode: 'random',
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
  tab.value = t
  current.value = 0
  load()
}

function onSelect(val) {
  answers.value[questions.value[current.value].id] = val
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
  try {
    const res = await examApi.learnSubmit(recordId.value, answers.value)
    uni.setStorageSync('exam_practice_result', {
      score: res.data.score,
      totalScore: res.data.totalScore,
      details: res.data.details,
    })
    uni.redirectTo({ url: '/pages/exam/examResult/index?mode=learn' })
  } catch (err) {
    submitted.value = false
    showError(err.message || '提交失败')
  }
}
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F0F2F8; display: flex; flex-direction: column; }
.tabs { display: flex; background: #FFF; padding: 0 24rpx; }
.tab { flex: 1; text-align: center; padding: 24rpx 0; font-size: 28rpx; color: #999; }
.tab.active { color: #2B6DE8; font-weight: 600; border-bottom: 4rpx solid #2B6DE8; }
.content { flex: 1; height: 0; padding: 24rpx; }
.back-list { display: flex; flex-direction: column; gap: 24rpx; }
.progress { font-size: 24rpx; color: #909399; margin-bottom: 16rpx; }
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
