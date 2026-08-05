<template>
  <view class="page">
    <nav-bar title="模拟练习" :showBack="true" @back="handleExit" />
    <view v-if="loading" class="loading">加载中...</view>
    <template v-else-if="current">
      <view class="progress"><text>已答 {{ answeredCount }}/{{ total }} · 第 {{ idx + 1 }} 题</text></view>
      <view class="card">
        <view class="q-tag"><text>{{ typeLabel }}</text></view>
        <text class="q-title">{{ current.title }}</text>
        <view class="options">
          <view
            v-for="o in current.options"
            :key="o.key"
            class="opt"
            :class="{
              selected: isSelected(o.key),
              correct: showResult && o.key === current.answer,
              wrong: showResult && isSelected(o.key) && o.key !== current.answer
            }"
            @tap="selectOption(o.key)"
          >
            <text>{{ o.key }}. {{ o.text }}</text>
          </view>
        </view>
        <view v-if="showResult" class="analysis">
          <text class="a-label" :class="isCorrect ? 'a-correct' : 'a-wrong'">{{ isCorrect ? '✅ 回答正确' : '❌ 回答错误' }}</text>
          <text class="a-answer">正确答案：{{ current.answer }}</text>
          <text v-if="current.analysis" class="a-text">解析：{{ current.analysis }}</text>
        </view>
        <view v-else-if="current.type === 'multiple' && hasMultipleSelection" class="analysis">
          <view class="btn-confirm" @tap="confirmMultiple"><text>确认答案</text></view>
        </view>
      </view>
      <view class="bottom-bar">
        <view class="btn-outline" @tap="prevQuestion"><text>上一题</text></view>
        <view v-if="idx < total - 1" class="btn-primary" @tap="nextQuestion"><text>下一题</text></view>
        <view v-else class="btn-primary" @tap="handleSubmit"><text>提交查看结果</text></view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { examApi } from '@/services/modules/exam'
import { showError } from '@/utils/toast'

const loading = ref(true)
const idx = ref(0)
const total = ref(0)
const recordId = ref(0)
const snapshot = ref([])
const answers = ref({})
const showResult = ref(false)

const current = computed(() => snapshot.value[idx.value] || null)
const typeMap = { single: '单选', multiple: '多选', judge: '判断' }
const typeLabel = computed(() => typeMap[current.value?.type] || '')
const answeredCount = computed(() => Object.keys(answers.value).filter(k => answers.value[k]).length)
const hasMultipleSelection = computed(() => current.value?.type === 'multiple' && !!answers.value[current.value?.id])
const isCorrect = computed(() => {
  if (!showResult.value || !current.value) return false
  const q = current.value
  const u = answers.value[q.id] || ''
  if (q.type === 'multiple') {
    return u.split(',').sort().join(',') === q.answer.split(',').sort().join(',')
  }
  return u === q.answer
})

// 切题时重置反馈态
watch(idx, () => { showResult.value = false })

function isSelected(k) { return (answers.value[current.value?.id] || '').split(',').includes(k) }

function selectOption(k) {
  if (showResult.value) return
  const q = current.value; const id = q.id
  if (q.type === 'single' || q.type === 'judge') {
    answers.value[id] = k
    showResult.value = true // 单选/判断: 选中立即判定
  } else {
    const sel = new Set((answers.value[id] || '').split(',').filter(Boolean))
    sel.has(k) ? sel.delete(k) : sel.add(k)
    answers.value[id] = [...sel].join(',')
  }
}

function confirmMultiple() {
  if (showResult.value) return
  if (!hasMultipleSelection.value) { showError('请先选择答案'); return }
  showResult.value = true // 多选: 点"确认答案"后判定
}

function prevQuestion() { idx.value = Math.max(0, idx.value - 1) }
function nextQuestion() { idx.value = Math.min(total.value - 1, idx.value + 1) }

async function handleSubmit() {
  try {
    uni.showLoading({ title: '提交中...' })
    const res = await examApi.submitPractice({ recordId: recordId.value, answers: answers.value })
    uni.hideLoading()
    // 进入结果页复盘(逐题详情,查漏补缺)
    uni.redirectTo({ url: `/pages/exam/result/index?recordId=${recordId.value}` })
  } catch (e) { uni.hideLoading(); showError(e.message || '提交失败') }
}

function handleExit() {
  uni.showModal({ title: '确定退出练习？', content: '退出后进度不保存', success: r => { if (r.confirm) uni.navigateBack() } })
}

(async () => {
  const q = getCurrentPages().slice(-1)[0].options || {}
  try {
    const res = await examApi.startPractice({ categoryId: Number(q.categoryId) || 0, type: (q.type || 'single').split(','), count: Number(q.count) || 20 })
    const d = res.data
    snapshot.value = d.snapshot; total.value = d.snapshot.length; recordId.value = d.recordId
  } catch { showError('加载失败') }
  finally { loading.value = false }
})()
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; }
.loading { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #999; }
.progress { padding: 16rpx 24rpx; font-size: 24rpx; color: #999; text-align: center; background: #FFF; }
.card { background: #FFF; margin: 16rpx 24rpx; border-radius: 16rpx; padding: 24rpx; flex: 1; overflow-y: auto; }
.q-tag { display: inline-block; padding: 4rpx 16rpx; border-radius: 12rpx; font-size: 22rpx; color: #2B6DE8; background: #EDF2FF; margin-bottom: 12rpx; }
.q-title { font-size: 30rpx; font-weight: 600; color: #333; display: block; margin-bottom: 24rpx; line-height: 1.5; }
.options { display: flex; flex-direction: column; gap: 12rpx; }
.opt { padding: 20rpx; border-radius: 12rpx; border: 2rpx solid #E4E7ED; font-size: 28rpx; color: #333; }
.opt.selected { border-color: #2B6DE8; background: #EDF2FF; }
.opt.correct { border-color: #22C55E; background: #F0FDF4; }
.opt.wrong { border-color: #EF4444; background: #FEF2F2; }
.analysis { margin-top: 20rpx; padding: 16rpx; background: #F9FAFB; border-radius: 8rpx; }
.a-label { font-size: 26rpx; font-weight: 600; display: block; }
.a-correct { color: #22C55E; }
.a-wrong { color: #EF4444; }
.a-answer { font-size: 24rpx; color: #2B6DE8; margin-top: 8rpx; display: block; }
.a-text { font-size: 24rpx; color: #666; margin-top: 8rpx; display: block; }
.btn-confirm { height: 72rpx; display: flex; align-items: center; justify-content: center; border-radius: 36rpx; background: #2B6DE8; }
.btn-confirm text { font-size: 26rpx; font-weight: 600; color: #FFF; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 16rpx; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFF; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,.04); }
.btn-outline { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; border: 2rpx solid #E4E7ED; font-size: 28rpx; color: #666; }
.btn-primary { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); }
.btn-primary text { font-size: 28rpx; font-weight: 600; color: #FFF; }
</style>
