<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <el-card class="section-card" shadow="never">
    <template #header>
      <div class="card-header">
        <div class="card-title-wrap">
          <span class="card-title">{{ title }}</span>
          <span v-if="subtitle" class="card-subtitle">{{ subtitle }}</span>
        </div>
        <div class="card-header-right">
          <slot name="actions" />
        </div>
      </div>
    </template>
    <slot />
  </el-card>
</template>

<style scoped lang="scss">
.section-card {
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 500;

    .card-title-wrap {
      display: flex;
      align-items: center;
      gap: $spacing-base;

      .card-title {
        font-weight: 600;
        color: $text-primary;
      }

      .card-subtitle {
        font-size: $font-size-small;
        font-weight: 400;
        color: $text-secondary;
      }
    }

    .card-header-right {
      display: flex;
      align-items: center;
      gap: 4px;

      // 兼容已有页面通过 #actions 插槽传入的月份导航标签
      :deep(.month-label) {
        font-size: $font-size-base;
        font-weight: 600;
        color: $text-primary;
        min-width: 80px;
        text-align: center;
      }
    }
  }
}
</style>
