<template>
  <view class="page">
    <nav-bar title="正式考试" :showBack="true" @back="handleExit" />
    <view v-if="loading" class="loading">加载中...</view>
    <view v-else-if="loadError" class="error">
      <text class="error-icon">⚠️</text>
      <text class="error-title">考试加载失败</text>
      <text class="error-desc">{{ loadError }}</text>
      <view class="error-actions">
        <view class="btn-outline" @tap="retryLoad"><text>重试</text></view>
        <view class="btn-outline" @tap="goBack"><text>返回</text></view>
      </view>
    </view>
    <template v-else-if="current">
      <view class="top-bar">
        <text>⏱ {{ fmtTime(remaining) }}</text>
        <text>{{ idx + 1 }}/{{ total }}</text>
      </view>
      <view class="card">
        <view class="q-tag-row">
          <view class="q-tag"><text>{{ typeLabel }}</text></view>
          <view v-if="current.section" class="q-section"><text>{{ current.section }}</text></view>
        </view>
        <text class="q-title">{{ current.title }}</text>
        <view class="options">
          <view v-for="o in current.options" :key="o.key" class="opt" :class="{ selected: isSelected(o.key) }" @tap="selectOption(o.key)">
            <text>{{ o.key }}. {{ o.text }}</text>
          </view>
        </view>
      </view>
      <view class="bottom-bar">
        <view class="btn-outline" @tap="idx = Math.max(0, idx - 1)"><text>上一题</text></view>
        <view v-if="idx < total - 1" class="btn-primary" @tap="idx = Math.min(total - 1, idx + 1)"><text>下一题</text></view>
        <view v-else class="btn-danger" @tap="handleSubmit"><text>交卷</text></view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { onHide, onUnload } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { examApi } from '@/services/modules/exam'
import { showError } from '@/utils/toast'

const loading = ref(true)
const loadError = ref('')
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
    // 成绩展示控制: manual 未公布 → 结果页显示等待公布
    if (d.resultPending) {
      uni.redirectTo({ url: `/pages/exam/result/index?recordId=${recordId.value}&pending=1` })
      return
    }
    uni.redirectTo({ url: `/pages/exam/result/index?recordId=${recordId.value}&score=${d.score}&totalScore=${d.totalScore}&isPass=${d.isPass}` })
  } catch (e) { uni.hideLoading(); showError(e.message || '提交失败') }
}

function handleExit() {
  uni.showModal({ title: '确定退出考试？', content: '退出后计时不暂停，窗口期内可重新进入继续作答', success: r => { if (r.confirm) { saveProgress(); uni.navigateBack() } } })
}

onBeforeUnmount(() => { if (timer) clearInterval(timer) })

async function loadExam() {
  loadError.value = ''
  loading.value = true
  const q = getCurrentPages().slice(-1)[0].options || {}
  try {
    const res = await examApi.startExam(Number(q.paperId))
    const d = res.data
    snapshot.value = d.snapshot; total.value = d.snapshot.length; recordId.value = d.recordId
    duration.value = d.duration
    if (d.resumed && d.savedAnswers) answers.value = d.savedAnswers // 断线恢复已答
    // 倒计时:以服务端剩余秒数为基准,本地递减(提交时后端仍强校验真实时间)
    const baseRemaining = (d.remainingSeconds != null ? d.remainingSeconds : d.duration * 60)
    remaining.value = baseRemaining
    const startedAt = Date.now()
    timer = setInterval(() => {
      remaining.value = Math.max(0, baseRemaining - Math.floor((Date.now() - startedAt) / 1000))
      if (remaining.value <= 0) { clearInterval(timer); handleSubmit() }
    }, 1000)
  } catch (e) {
    // 显示具体失败原因,杜绝白屏(此前 loading=false 且 current=null → 空白页)
    loadError.value = (e && e.message) || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function retryLoad() { loadExam() }
function goBack() { uni.navigateBack() }

// ===== 断线续答:自动保存答案 =====
let saveTimer = null
watch(answers, () => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveProgress(), 2000)
}, { deep: true })

async function saveProgress() {
  if (!recordId.value) return
  try { await examApi.saveAnswers(recordId.value, answers.value) } catch { /* 静默,下次进入/离开再存 */ }
}

onHide(() => saveProgress())
onUnload(() => saveProgress())

loadExam()
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; }
.loading { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #999; }
.error { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 48rpx; }
.error-icon { font-size: 72rpx; margin-bottom: 16rpx; }
.error-title { font-size: 32rpx; font-weight: 600; color: #333; margin-bottom: 12rpx; }
.error-desc { font-size: 26rpx; color: #EF4444; text-align: center; margin-bottom: 32rpx; }
.error-actions { display: flex; gap: 24rpx; width: 100%; }
.top-bar { display: flex; justify-content: space-between; padding: 16rpx 24rpx; background: #FFF; font-size: 26rpx; color: #333; font-weight: 600; }
.card { background: #FFF; margin: 16rpx 24rpx; border-radius: 16rpx; padding: 24rpx; flex: 1; overflow-y: auto; }
.q-tag-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.q-tag { display: inline-block; padding: 4rpx 16rpx; border-radius: 12rpx; font-size: 22rpx; color: #2B6DE8; background: #EDF2FF; }
.q-section { display: inline-block; padding: 4rpx 16rpx; border-radius: 12rpx; font-size: 22rpx; color: #D97706; background: #FEF3C7; }
.q-title { font-size: 30rpx; font-weight: 600; color: #333; display: block; margin-bottom: 24rpx; line-height: 1.5; }
.options { display: flex; flex-direction: column; gap: 12rpx; }
.opt { padding: 20rpx; border-radius: 12rpx; border: 2rpx solid #E4E7ED; font-size: 28rpx; color: #333; }
.opt.selected { border-color: #2B6DE8; background: #EDF2FF; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 16rpx; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFF; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,.04); padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFF; }
.btn-outline { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; border: 2rpx solid #E4E7ED; font-size: 28rpx; color: #666; }
.btn-primary { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); }
.btn-primary text { font-size: 28rpx; font-weight: 600; color: #FFF; }
.btn-danger { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; background: #EF4444; }
.btn-danger text { font-size: 28rpx; font-weight: 600; color: #FFF; }
</style>
