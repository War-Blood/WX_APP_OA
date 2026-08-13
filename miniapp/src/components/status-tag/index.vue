<template>
  <view class="badge" :class="badgeClass">
    <text>{{ label }}</text>
  </view>
</template>

<script setup>
import { computed } from 'vue'

// 状态值 → { label, modifier } 映射
// 依据 .AI/rules/miniapp-design-patterns.md §5 徽章体系 + 代码中实际出现的状态值
// （stats.vue statusLabel / report-history reportType、supplementStatus / report-detail status）
const STATUS_MAP = {
  // 已提交 / 通过（success）
  submitted: { label: '已提交', modifier: 'success' },
  approved:  { label: '已通过', modifier: 'success' },
  // 公出日志 / 工作日报（primary）
  office:   { label: '工作日报', modifier: 'office' },
  bizTrip:  { label: '公出', modifier: 'office' },
  biz_trip: { label: '公出', modifier: 'office' },
  // 补公出 / 待审核（warning）
  supplement:          { label: '补公出', modifier: 'supplement' },
  bizTripSupplement:   { label: '补公出', modifier: 'supplement' },
  biz_trip_supplement: { label: '补公出', modifier: 'supplement' },
  pending:        { label: '待审核', modifier: 'supplement' },
  pending_review: { label: '审核中', modifier: 'supplement' },
  // 通过(特殊)（primary）
  special: { label: '通过(特殊)', modifier: 'office' },
  // 缺失 / 驳回 / 延迟（danger）
  missing:  { label: '未提交', modifier: 'missing' },
  rejected: { label: '已驳回', modifier: 'missing' },
  delayed:  { label: '延迟', modifier: 'missing' },
  // 被代填
  substituted: { label: '已代填', modifier: 'substituted' },
  // 请假 / 调休
  leave: { label: '请假', modifier: 'leave' },
  rest:  { label: '调休', modifier: 'rest' },
  // 草稿（中性）
  draft: { label: '草稿', modifier: 'default' }
}

const props = defineProps({
  status: { type: String, default: '' },
  label: { type: String, default: '' }
})

const badgeClass = computed(() => {
  const m = STATUS_MAP[props.status]
  return m ? 'badge--' + m.modifier : 'badge--default'
})

const label = computed(() => {
  if (props.label) return props.label
  const m = STATUS_MAP[props.status]
  return m ? m.label : (props.status || '未知')
})
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.badge {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 12rpx;
  border-radius: $radius-sm;
  font-size: $font-xs;
  font-weight: 500;
  line-height: 1.4;
}

.badge--success     { background: #EFFDF5; color: $success-color; }
.badge--supplement  { background: #FFF8E1; color: $warning-color; }
.badge--office      { background: $primary-bg; color: $primary-color; }
.badge--missing     { background: #FFF0F0; color: $danger-color; }
.badge--substituted { background: #FFF0F5; color: #6366F1; }
.badge--leave       { background: #F5F3FF; color: #8B5CF6; }
.badge--rest        { background: #FDF2F8; color: #EC4899; }
.badge--default     { background: $bg-form; color: $text-secondary; }
</style>
