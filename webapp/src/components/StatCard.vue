<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  value: string | number
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'lg' | 'md'
  loading?: boolean
}>(), {
  tone: 'default',
  size: 'lg',
  loading: false,
})
</script>

<template>
  <el-card class="stat-card" shadow="hover">
    <el-skeleton v-if="loading" :rows="1" animated class="stat-skeleton" />
    <template v-else>
      <div class="stat-val" :class="[`tone-${tone}`, `size-${size}`]">{{ value }}</div>
      <div class="stat-lbl">{{ label }}</div>
    </template>
  </el-card>
</template>

<style scoped lang="scss">
.stat-card {
  text-align: center;
  border-radius: $border-radius-large;

  :deep(.el-card__body) {
    border-radius: $border-radius-large;
  }

  .stat-skeleton {
    margin: 6px 0 2px;
  }

  .stat-val {
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;

    &.size-md {
      font-size: 24px;
    }

    &.tone-default { color: var(--text-primary); }
    &.tone-primary { color: var(--primary-color); }
    &.tone-success { color: var(--success-color); }
    &.tone-warning { color: var(--warning-color); }
    &.tone-danger { color: var(--danger-color); }
    &.tone-info { color: var(--info-color); }
  }

  .stat-lbl {
    font-size: $font-size-small;
    color: $text-secondary;
    margin-top: 4px;
  }
}
</style>
