<script setup lang="ts">
import StatCard from '@/components/StatCard.vue'
import type { AllStatsResponse } from '@/api/report'

defineProps<{
  stats: AllStatsResponse | null
  loading: boolean
}>()
</script>

<template>
  <el-row :gutter="16" class="stats-row" v-loading="loading">
    <el-col :span="6">
      <StatCard label="总日志数" :value="stats?.totalLogs ?? '-'" />
    </el-col>
    <el-col :span="6">
      <StatCard label="本月新增" :value="stats?.monthNew ?? '-'" tone="primary" />
    </el-col>
    <el-col :span="6">
      <StatCard label="延迟条数" :value="stats?.delayedTotal ?? '-'" tone="warning" />
    </el-col>
    <el-col :span="6">
      <StatCard label="缺失人次" :value="stats?.missingPersonCount ?? '-'" tone="danger" />
    </el-col>
  </el-row>
</template>

<style scoped lang="scss">
.stats-row {
  margin-bottom: $spacing-medium;
}
</style>
