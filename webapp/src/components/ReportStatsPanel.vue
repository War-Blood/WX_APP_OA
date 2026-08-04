<script setup lang="ts">
import type { AllStatsResponse } from '@/api/report'

defineProps<{
  stats: AllStatsResponse | null
  loading: boolean
}>()
</script>

<template>
  <el-row :gutter="16" class="stats-row" v-loading="loading">
    <el-col :span="6">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-val">{{ stats?.totalLogs ?? '-' }}</div>
        <div class="stat-lbl">总日志数</div>
      </el-card>
    </el-col>
    <el-col :span="6">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-val" style="color:#409EFF">{{ stats?.monthNew ?? '-' }}</div>
        <div class="stat-lbl">本月新增</div>
      </el-card>
    </el-col>
    <el-col :span="6">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-val" style="color:#E6A23C">{{ stats?.delayedTotal ?? '-' }}</div>
        <div class="stat-lbl">延迟条数</div>
      </el-card>
    </el-col>
    <el-col :span="6">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-val" style="color:#F56C6C">{{ stats?.missingPersonCount ?? '-' }}</div>
        <div class="stat-lbl">缺失人次</div>
      </el-card>
    </el-col>
  </el-row>
</template>

<style scoped lang="scss">
.stats-row {
  margin-bottom: 16px;

  .stat-card {
    text-align: center;

    .stat-val {
      font-size: 28px;
      font-weight: 700;
    }

    .stat-lbl {
      font-size: 13px;
      color: #999;
      margin-top: 4px;
    }
  }
}
</style>
