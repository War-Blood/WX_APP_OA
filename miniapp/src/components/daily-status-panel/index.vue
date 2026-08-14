<template>
  <view class="daily-panel">
    <!-- 摘要统计条 -->
    <view v-if="response" class="summary-bar">
      <view class="summary-item summary-item--submitted">
        <text class="summary-val">{{ submittedCount }}</text>
        <text class="summary-lbl">已提交</text>
      </view>
      <view class="summary-item summary-item--missing">
        <text class="summary-val" :class="{ 'summary-val--danger': missingCount > 0 }">{{ missingCount }}</text>
        <text class="summary-lbl">缺失</text>
      </view>
      <view v-if="showTotal" class="summary-item summary-item--total">
        <text class="summary-val">{{ submittedCount + missingCount }}</text>
        <text class="summary-lbl">总人数</text>
      </view>
    </view>

    <!-- 加载 / 空状态 -->
    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-else-if="!response" class="empty"><text>暂无数据</text></view>

    <!-- 分组列表 -->
    <scroll-view
      v-else
      class="daily-scroll"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="emit('refresherrefresh')"
    >
      <!-- 缺失人员 -->
      <view v-if="missingWorkers.length" class="daily-section">
        <text class="section-header section-header--missing">未提交 ({{ missingWorkers.length }})</text>
        <view class="daily-card-list">
          <view v-for="w in missingWorkers" :key="w.userId" class="worker-card worker-card--missing">
            <view class="card-left">
              <text class="card-name">{{ w.userName }}</text>
              <text class="card-code">{{ w.workerCode || '' }}</text>
            </view>
            <text class="card-status-tag tag--missing">未提交</text>
          </view>
        </view>
      </view>

      <!-- 补公出 -->
      <view v-if="supplementWorkers.length" class="daily-section">
        <text class="section-header section-header--supplement">补公出 ({{ supplementWorkers.length }})</text>
        <view class="daily-card-list">
          <view v-for="w in supplementWorkers" :key="w.userId" class="worker-card" :class="cardBarClass(w)" @tap="onGoDetail(w)">
            <view class="card-left">
              <text class="card-name">{{ w.userName }}</text>
              <text class="card-code">{{ w.workerCode || '' }}</text>
            </view>
            <view class="card-mid">
              <text v-if="w.project" class="card-project">{{ w.project }}</text>
              <text v-if="w.area" class="card-area">{{ w.area }}</text>
            </view>
            <view class="card-right">
              <text class="card-status-tag tag--supplement">补公出</text>
              <text v-if="w.workType" class="card-work-type">{{ w.workType }}</text>
              <text v-if="w.submittedAt" class="card-time">{{ fmtTime(w.submittedAt) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 请假/调休 -->
      <view v-if="leaveWorkers.length" class="daily-section">
        <text class="section-header section-header--leave">请假/调休 ({{ leaveWorkers.length }})</text>
        <view class="daily-card-list">
          <view v-for="w in leaveWorkers" :key="w.userId" class="worker-card" :class="cardBarClass(w)">
            <view class="card-left">
              <text class="card-name">{{ w.userName }}</text>
              <text class="card-code">{{ w.workerCode || '' }}</text>
            </view>
            <text class="card-status-tag" :class="'tag--' + w.status">{{ statusLabel(w.status) }}</text>
          </view>
        </view>
      </view>

      <!-- 已提交 -->
      <view v-if="activeWorkers.length" class="daily-section">
        <text class="section-header section-header--active">已提交 ({{ activeWorkers.length }})</text>
        <view class="daily-card-list">
          <view v-for="w in activeWorkers" :key="w.userId" class="worker-card" :class="cardBarClass(w)" @tap="onGoDetail(w)">
            <view class="card-left">
              <text class="card-name">{{ w.userName }}</text>
              <text class="card-code">{{ w.workerCode || '' }}</text>
            </view>
            <view class="card-mid">
              <text v-if="w.project" class="card-project">{{ w.project }}</text>
              <text v-if="w.area" class="card-area">{{ w.area }}</text>
            </view>
            <view class="card-right">
              <text class="card-status-tag" :class="'tag--' + w.status">{{ statusLabel(w.status) }}</text>
              <text v-if="w.workType" class="card-work-type">{{ w.workType }}</text>
              <text v-if="w.submittedAt" class="card-time">{{ fmtTime(w.submittedAt) }}</text>
            </view>
          </view>
        </view>
      </view>
      <view class="spacer" />
    </scroll-view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  response: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  showTotal: { type: Boolean, default: true },
  refreshing: { type: Boolean, default: false }
})

const emit = defineEmits(['go-detail', 'refresherrefresh'])

// 分组逻辑与 pages/profile/stats.vue 完全一致
const workers = computed(() => props.response?.workers || [])
const summary = computed(() => props.response?.summary || {})

const missingWorkers = computed(() => workers.value.filter(w => w.status === 'missing'))
const supplementWorkers = computed(() => workers.value.filter(w => w.status === 'supplement'))
const activeWorkers = computed(() => workers.value.filter(w => w.status !== 'missing' && w.status !== 'leave' && w.status !== 'supplement'))
const leaveWorkers = computed(() => workers.value.filter(w => w.status === 'leave'))

// 摘要：已提交 = submitted + substituted + supplement + office + leave
const submittedCount = computed(() => {
  if (!props.response) return 0
  const s = summary.value
  return (s.submitted || 0) + (s.substituted || 0) + (s.supplement || 0) + (s.office || 0) + (s.leave || 0)
})
const missingCount = computed(() => summary.value.missing || 0)

function fmtTime(dt) {
  if (!dt) return ''
  const p = String(dt).split(' ')
  return p[1] ? p[1].slice(0, 5) : dt
}

function statusLabel(s) {
  const m = { submitted: '已提交', supplement: '补公出', office: '工作日报', substituted: '已代填', leave: '请假', missing: '未提交' }
  return m[s] || s
}

// 卡片左侧色条按工作状态（today_work_type）着色：待工=淡黄 / 工作（陆/海）=正常绿 / 在途=蓝 / 请假=紫；
// 无工作类型（未提交/工作日报等）回退到提交状态色；代填人员同样取被代填日报的工作类型
const WT_COLOR_KEY = {
  '工作（陆）': 'work',
  '工作（海）': 'work',
  '待工': 'idle',
  '在途': 'travel',
  '请假': 'leave'
}

function cardBarClass(w) {
  const wt = (w.workType || '').trim()
  const key = WT_COLOR_KEY[wt]
  return key ? 'worker-card--' + key : 'worker-card--' + (w.status || 'missing')
}

function onGoDetail(w) {
  if (w.reportId) emit('go-detail', w)
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

// 状态徽章/摘要浅色底（设计规范 §5，暂无独立令牌，本地变量统一管理）
$tint-success: #EFFDF5;
$tint-warning: #FFF8E1;
$tint-danger: #FFF0F0;
$tint-substituted: #FFF0F5;
$tint-leave: #F5F3FF;
$tint-rest: #FDF2F8;
$tint-card-missing: #FFF5F5;
$tint-summary-total: #F0F7FF;

// ===== 今日模式列表体（自 pages/profile/stats.vue 提取） =====
.daily-panel { display:flex; flex-direction:column; flex:1; height:0; min-height:0; }

.summary-bar { display:flex; gap:$spacing-sm; padding:$spacing-sm $spacing-base; flex-shrink:0; }
.summary-item { flex:1; display:flex; align-items:center; gap:8rpx; padding:16rpx 20rpx; border-radius:$radius-base; }
.summary-item--submitted { background:$tint-success; }
.summary-item--missing { background:$tint-danger; }
.summary-item--total { background:$tint-summary-total; }
.summary-val { font-size:36rpx; font-weight:700; color:$success-color; }
.summary-val--danger { color:$danger-color; }
.summary-item--total .summary-val { color:$primary-color; }
.summary-lbl { font-size:$font-sm; color:$text-regular; }

.daily-scroll { flex:1; height:0; padding:0 $spacing-base; }
.daily-section { margin-bottom:$spacing-sm; }
.section-header { font-size:26rpx; font-weight:600; padding:12rpx 0; display:block; }
.section-header--missing { color:$danger-color; }
.section-header--active  { color:$success-color; }
.section-header--leave   { color:$text-secondary; }
.daily-card-list { display:flex; flex-direction:column; gap:$spacing-xs; }
.worker-card {
  display:flex; align-items:center; padding:20rpx $spacing-base; background:$bg-card;
  border-radius:$radius-base; box-shadow:0 2rpx 12rpx rgba(0,0,0,.04);
}
.worker-card--missing { border-left:6rpx solid $danger-color; background:$tint-card-missing; }
.worker-card--submitted { border-left:6rpx solid $success-color; }
.worker-card--supplement { border-left:6rpx solid $warning-color; }
.worker-card--office { border-left:6rpx solid $primary-color; }
.worker-card--substituted { border-left:6rpx solid #6366F1; }

// 卡片左侧色条按工作状态着色（待工=淡黄 / 工作=正常绿 / 在途=蓝 / 请假=紫；无工作类型回退上方状态色）
$bar-idle: #FFD666;
.worker-card--work   { border-left:6rpx solid $success-color; }
.worker-card--idle   { border-left:6rpx solid $bar-idle; background:#FFFBE6; }
.worker-card--travel { border-left:6rpx solid $primary-color; }
.worker-card--leave  { border-left:6rpx solid #8B5CF6; }
.card-left { display:flex; flex-direction:column; gap:4rpx; width:140rpx; flex-shrink:0; }
.card-name { font-size:26rpx; font-weight:600; color:$text-primary; }
.card-code { font-size:$font-xs; color:$text-secondary; }
.card-mid { flex:1; min-width:0; display:flex; flex-direction:column; gap:4rpx; }
.card-project { font-size:$font-sm; color:$text-primary; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.card-area { font-size:$font-xs; color:$text-secondary; }
.card-right { display:flex; flex-direction:column; align-items:flex-end; gap:4rpx; flex-shrink:0; margin-left:$spacing-sm; }
.card-work-type { font-size:$font-xs; color:$primary-color; }
.card-time { font-size:$font-xs; color:$text-placeholder; }
.card-status-tag { font-size:$font-xs; font-weight:500; padding:2rpx 10rpx; border-radius:$radius-sm; }
.tag--submitted   { background:$tint-success; color:$success-color; }
.tag--supplement  { background:$tint-warning; color:$warning-color; }
.tag--office      { background:$primary-bg; color:$primary-color; }
.tag--substituted { background:$tint-substituted; color:#6366F1; }
.tag--leave       { background:$tint-leave; color:#8B5CF6; }
.tag--rest        { background:$tint-rest; color:#EC4899; }
.tag--missing     { background:$tint-danger; color:$danger-color; }

.loading, .empty { display:flex; align-items:center; justify-content:center; padding:160rpx 0; font-size:$font-base; color:$text-secondary; }
.spacer { height:40rpx; }
</style>
