<template>
  <view class="page">
    <nav-bar title="考试结果" :showBack="true" />
    <scroll-view class="content" scroll-y>
      <view class="score-area">
        <text class="score-num">{{ score }}</text>
        <text class="score-label">分</text>
        <view class="pass-tag" :class="isPass ? 'tag-pass' : 'tag-fail'">
          <text>{{ isPass ? '✅ 已通过' : '❌ 未通过' }}</text>
        </view>
      </view>
      <view class="stat-card">
        <text class="stat-label">总分 {{ totalScore }} · 用时 {{ fmtTime(elapsed) }}</text>
      </view>
      <!-- TODO: 逐题详情 — 需 API 返回 details 数组 -->
      <view class="card" v-if="details.length">
        <text class="card-title">答题详情</text>
        <view v-for="(d, i) in details" :key="i" class="detail-item" :class="d.correct ? 'd-correct' : 'd-wrong'">
          <text class="d-status">{{ d.correct ? '✅' : '❌' }} {{ i + 1 }}. [{{ typeLabel(d.type) }}]</text>
          <text class="d-title">{{ d.title }}</text>
          <text class="d-answer">你的答案: {{ d.userAnswer || '未答' }}</text>
          <text v-if="!d.correct" class="d-right">正确答案: {{ d.rightAnswer }}</text>
          <text v-if="d.analysis" class="d-analysis">解析：{{ d.analysis }}</text>
        </view>
      </view>
    </scroll-view>
    <view class="bottom-bar">
      <view class="btn-primary" @tap="goHome"><text>返回首页</text></view>
      <view class="btn-outline" @tap="goRecords"><text>考试记录</text></view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { examApi } from '@/services/modules/exam'
import { showError } from '@/utils/toast'

const recordId = ref('')
const score = ref(0); const totalScore = ref(0); const isPass = ref(false)
const elapsed = ref(0); const details = ref([]); const loading = ref(false)

const typeLabels = { single: '单选', multiple: '多选', judge: '判断' }
function typeLabel(t) { return typeLabels[t] || t || '' }
function fmtTime(s) { if (s == null || isNaN(s)) return '--'; const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}分${sec}秒` }
function goHome() { uni.reLaunch({ url: '/pages/home/index' }) }
function goRecords() { uni.navigateTo({ url: '/pages/exam/records/index' }) }

onLoad((q) => {
  recordId.value = q?.recordId || ''
  // URL 参数兜底（无 recordId 时）
  score.value = Number(q?.score) || 0
  totalScore.value = Number(q?.totalScore) || 0
  isPass.value = q?.isPass === 'true' || q?.isPass === '1'
  elapsed.value = Number(q?.elapsed) || 0
})

onMounted(async () => {
  if (!recordId.value) return
  loading.value = true
  try {
    const res = await examApi.getRecordDetail(recordId.value)
    const d = res.data || {}
    if (d.score != null) score.value = d.score
    if (d.totalScore != null) totalScore.value = d.totalScore
    if (d.isPass != null) isPass.value = !!d.isPass
    details.value = d.details || []
    if (d.startTime && d.endTime) {
      elapsed.value = Math.round((new Date(d.endTime) - new Date(d.startTime)) / 1000)
    }
  } catch {
    showError('加载详情失败')
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; }
.content { flex: 1; height: 0; padding: 24rpx; }
.score-area { text-align: center; padding: 40rpx 0; }
.score-num { font-size: 96rpx; font-weight: 700; color: #333; }
.score-label { font-size: 32rpx; color: #999; margin-left: 8rpx; }
.pass-tag { display: inline-block; margin-top: 16rpx; padding: 8rpx 32rpx; border-radius: 24rpx; font-size: 28rpx; font-weight: 600; }
.tag-pass { background: #EFFDF5; color: #22C55E; }
.tag-fail { background: #FEF2F2; color: #EF4444; }
.stat-card { background: #FFF; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; text-align: center; }
.stat-label { font-size: 26rpx; color: #666; }
.card { background: #FFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.card-title { font-size: 28rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; display: block; }
.detail-item { padding: 16rpx 0; border-bottom: 1rpx solid #F0F0F0; }
.detail-item:last-child { border-bottom: none; }
.d-correct { border-left: 4rpx solid #22C55E; padding-left: 12rpx; }
.d-wrong { border-left: 4rpx solid #EF4444; padding-left: 12rpx; }
.d-status { font-size: 26rpx; color: #333; font-weight: 500; display: block; }
.d-title { font-size: 26rpx; color: #333; margin-top: 6rpx; display: block; line-height: 1.5; }
.d-answer { font-size: 24rpx; color: #666; margin-top: 4rpx; display: block; }
.d-right { font-size: 24rpx; color: #22C55E; margin-top: 4rpx; display: block; }
.d-analysis { font-size: 24rpx; color: #F59E0B; margin-top: 4rpx; display: block; }
.bottom-bar { display: flex; gap: 16rpx; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFF; }
.btn-primary { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); }
.btn-primary text { font-size: 28rpx; font-weight: 600; color: #FFF; }
.btn-outline { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 44rpx; border: 2rpx solid #E4E7ED; font-size: 28rpx; color: #666; }
</style>
