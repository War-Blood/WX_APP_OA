<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getStats, type AllStatsResponse } from '@/api/report'

const statsLoading = ref(true)
const summary = ref<AllStatsResponse | null>(null)

async function loadSummary() {
  statsLoading.value = true
  try {
    summary.value = await getStats('all')
  } catch {
    // ignore
  } finally {
    statsLoading.value = false
  }
}

onMounted(loadSummary)
</script>

<template>
  <div class="overview-page">
    <el-row :gutter="16" class="stats-row" v-loading="statsLoading">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-val">{{ summary?.totalLogs ?? '-' }}</div>
          <div class="stat-lbl">总日志数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-val" style="color:#409EFF">{{ summary?.monthNew ?? '-' }}</div>
          <div class="stat-lbl">本月新增</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-val" style="color:#E6A23C">{{ summary?.delayedTotal ?? '-' }}</div>
          <div class="stat-lbl">延迟条数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-val" style="color:#F56C6C">{{ summary?.missingPersonCount ?? '-' }}</div>
          <div class="stat-lbl">缺失人次</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.overview-page { padding: 20px; }

.stats-row {
  .stat-card {
    text-align: center;

    .stat-val {
      font-size: 28px;
      font-weight: 700;
    }

    .stat-lbl {
      font-size: 13px;
      color: #909399;
      margin-top: 4px;
    }
  }
}
</style>
