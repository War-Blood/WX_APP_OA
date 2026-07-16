<template>
  <view class="page">
    <nav-bar title="模拟练习" :showBack="true" @back="handleExit" />
    <view v-if="loading" class="loading">加载中...</view>
    <template v-else-if="current">
      <view class="progress"><text>{{ idx + 1 }}/{{ total }}</text></view>
      <view class="card">
        <view class="q-tag"><text>{{ typeLabel }}</text></view>
        <text class="q-title">{{ current.title }}</text>
        <view class="options">
          <view v-for="o in current.options" :key="o.key" class="opt" :class="{ selected: isSelected(o.key), correct: showResult && o.key === current.answer, wrong: showResult && isSelected(o.key) && o.key !== current.answer }" @tap="selectOption(o.key)">
            <text>{{ o.key }}. {{ o.text }}</text>
          </view>
        </view>
        <view v-if="showResult" class="analysis">
          <text class="a-label">{{ isCorrect ? '✅ 正确' : '❌ 错误' }}</text>
          <text v-if="current.analysis" class="a-text">{{ current.analysis }}</text>
        </view>
      </view>
      <view class="btn-row">
        <view class="btn-outline" @tap="idx = Math.max(0, idx - 1)"><text>上一题</text></view>
        <view v-if="idx < total - 1" class="btn-primary" @tap="idx = Math.min(total - 1, idx + 1)"><text>下一题</text></view>
        <view v-else class="btn-primary" @tap="handleSubmit"><text>提交查看结果</text></view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { examApi } from '@/services/modules/exam'
import { showError, showSuccess } from '@/utils/toast'

const loading = ref(true)
const idx = ref(0)
const total = ref(0)
const recordId = ref(0)
const snapshot = ref([])
const answers = ref({})

const current = computed(() => snapshot.value[idx.value] || null)
const typeMap = { single: '单选', multiple: '多选', judge: '判断' }
const typeLabel = computed(() => typeMap[current.value?.type] || '')
const showResult = ref(false) // 可扩展为每题的result状态

function isSelected(k) { return (answers.value[current.value?.id] || '').split(',').includes(k) }
const isCorrect = computed(() => showResult.value && answers.value[current.value?.id] === current.value?.answer)

function selectOption(k) {
  if (showResult.value) return
  const q = current.value; const id = q.id
  if (q.type === 'single' || q.type === 'judge') {
    answers.value[id] = k
  } else {
    const sel = new Set((answers.value[id] || '').split(',').filter(Boolean))
    sel.has(k) ? sel.delete(k) : sel.add(k)
    answers.value[id] = [...sel].join(',')
  }
}

async function handleSubmit() {
  showResult.value = true
  try {
    const res = await examApi.submitPractice({ recordId: recordId.value, answers: answers.value })
    if (res.code === 0 || res.data) {
      const d = res.data
      uni.showModal({
        title: '练习结果',
        content: `正确 ${d.correctCount} / ${d.totalCount} 题`,
        confirmText: '返回首页',
        success: r => { if (r.confirm) uni.navigateBack() }
      })
    }
  } catch { showError('提交失败') }
}
function handleExit() {
  uni.showModal({ title: '确定退出练习？', content: '退出后进度不保存', success: r => { if (r.confirm) uni.navigateBack() } })
}

(async () => {
  const q = getCurrentPages().slice(-1)[0].options || {}
  try {
    const res = await examApi.startPractice({ type: (q.type || 'single').split(','), count: Number(q.count) || 20 })
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
.a-text { font-size: 24rpx; color: #666; margin-top: 8rpx; display: block; }
.btn-row { display: flex; gap: 16rpx; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFF; }
.btn-outline { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; border: 2rpx solid #E4E7ED; font-size: 28rpx; color: #666; }
.btn-primary { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); }
.btn-primary text { font-size: 28rpx; font-weight: 600; color: #FFF; }
</style>
