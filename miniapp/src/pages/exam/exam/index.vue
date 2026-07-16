<template>
  <view class="page">
    <nav-bar title="正式考试" :showBack="true" @back="handleExit" />
    <view v-if="loading" class="loading">加载中...</view>
    <template v-else-if="current">
      <view class="top-bar">
        <text>⏱ {{ fmtTime(remaining) }}</text>
        <text>{{ idx + 1 }}/{{ total }}</text>
      </view>
      <view class="card">
        <view class="q-tag"><text>{{ typeLabel }}</text></view>
        <text class="q-title">{{ current.title }}</text>
        <view class="options">
          <view v-for="o in current.options" :key="o.key" class="opt" :class="{ selected: isSelected(o.key) }" @tap="selectOption(o.key)">
            <text>{{ o.key }}. {{ o.text }}</text>
          </view>
        </view>
      </view>
      <view class="btn-row">
        <view class="btn-outline" @tap="idx = Math.max(0, idx - 1)"><text>上一题</text></view>
        <view v-if="idx < total - 1" class="btn-primary" @tap="idx = Math.min(total - 1, idx + 1)"><text>下一题</text></view>
        <view v-else class="btn-danger" @tap="handleSubmit"><text>交卷</text></view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { examApi } from '@/services/modules/exam'
import { showError, showSuccess } from '@/utils/toast'

const loading = ref(true)
const idx = ref(0); const total = ref(0)
const recordId = ref(0); const snapshot = ref([]); const answers = ref({})
const serverTime = ref(0); const duration = ref(0); const remaining = ref(0)
let timer = null

const current = computed(() => snapshot.value[idx.value] || null)
const typeMap = { single: '单选', multiple: '多选', judge: '判断' }
const typeLabel = computed(() => typeMap[current.value?.type] || '')

function fmtTime(s) { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${String(sec).padStart(2, '0')}` }
function isSelected(k) { return (answers.value[current.value?.id] || '').split(',').includes(k) }
function selectOption(k) {
  const q = current.value; const id = q.id
  if (q.type === 'single' || q.type === 'judge') { answers.value[id] = k }
  else {
    const sel = new Set((answers.value[id] || '').split(',').filter(Boolean))
    sel.has(k) ? sel.delete(k) : sel.add(k)
    answers.value[id] = [...sel].join(',')
  }
}

async function handleSubmit() {
  const r = await new Promise(resolve => uni.showModal({ title: '确认交卷？', content: '交卷后将无法修改答案', confirmText: '确认交卷', success: resolve }))
  if (!r.confirm) return
  try {
    uni.showLoading({ title: '提交中...' })
    const res = await examApi.submitExam({ recordId: recordId.value, answers: answers.value })
    uni.hideLoading()
    if (timer) clearInterval(timer)
    const d = res.data
    uni.redirectTo({ url: `/pages/exam/result/index?recordId=${recordId.value}&score=${d.score}&totalScore=${d.totalScore}&isPass=${d.isPass}` })
  } catch (e) { uni.hideLoading(); showError(e.message || '提交失败') }
}

function handleExit() {
  uni.showModal({ title: '确定退出考试？', content: '退出后计时不暂停，超时自动交卷', success: r => { if (r.confirm) uni.navigateBack() } })
}

onBeforeUnmount(() => { if (timer) clearInterval(timer) })

(async () => {
  const q = getCurrentPages().slice(-1)[0].options || {}
  try {
    const res = await examApi.startExam(Number(q.paperId))
    const d = res.data
    snapshot.value = d.snapshot; total.value = d.snapshot.length; recordId.value = d.recordId
    duration.value = d.duration; serverTime.value = new Date(d.serverTime).getTime()
    remaining.value = d.duration * 60
    timer = setInterval(() => {
      remaining.value = Math.max(0, d.duration * 60 - Math.floor((Date.now() - serverTime.value) / 1000))
      if (remaining.value <= 0) { clearInterval(timer); handleSubmit() }
    }, 1000)
  } catch { showError('加载失败') }
  finally { loading.value = false }
})()
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; }
.loading { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #999; }
.top-bar { display: flex; justify-content: space-between; padding: 16rpx 24rpx; background: #FFF; font-size: 26rpx; color: #333; font-weight: 600; }
.card { background: #FFF; margin: 16rpx 24rpx; border-radius: 16rpx; padding: 24rpx; flex: 1; overflow-y: auto; }
.q-tag { display: inline-block; padding: 4rpx 16rpx; border-radius: 12rpx; font-size: 22rpx; color: #2B6DE8; background: #EDF2FF; margin-bottom: 12rpx; }
.q-title { font-size: 30rpx; font-weight: 600; color: #333; display: block; margin-bottom: 24rpx; line-height: 1.5; }
.options { display: flex; flex-direction: column; gap: 12rpx; }
.opt { padding: 20rpx; border-radius: 12rpx; border: 2rpx solid #E4E7ED; font-size: 28rpx; color: #333; }
.opt.selected { border-color: #2B6DE8; background: #EDF2FF; }
.btn-row { display: flex; gap: 16rpx; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFF; }
.btn-outline { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; border: 2rpx solid #E4E7ED; font-size: 28rpx; color: #666; }
.btn-primary { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); }
.btn-primary text { font-size: 28rpx; font-weight: 600; color: #FFF; }
.btn-danger { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; background: #EF4444; }
.btn-danger text { font-size: 28rpx; font-weight: 600; color: #FFF; }
</style>
