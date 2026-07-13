<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getWorkerWorkTypes, type WorkerWorkTypeItem } from '@/api/report'

const workTypeLoading = ref(false)
const workTypeList = ref<WorkerWorkTypeItem[]>([])
const workTypeMonth = ref(new Date().toISOString().slice(0, 7))

async function loadWorkTypes() {
  workTypeLoading.value = true
  try {
    const res = await getWorkerWorkTypes(workTypeMonth.value)
    workTypeList.value = res.workers
  } catch {
    workTypeList.value = []
  } finally {
    workTypeLoading.value = false
  }
}

function prevWorkTypeMonth() {
  const d = new Date(workTypeMonth.value + '-01')
  d.setMonth(d.getMonth() - 1)
  workTypeMonth.value = d.toISOString().slice(0, 7)
  loadWorkTypes()
}

function nextWorkTypeMonth() {
  const d = new Date(workTypeMonth.value + '-01')
  d.setMonth(d.getMonth() + 1)
  workTypeMonth.value = d.toISOString().slice(0, 7)
  loadWorkTypes()
}

function maxInColumn(key: string) {
  return Math.max(1, ...workTypeList.value.map(w => (w as any).workTypes?.[key] || 0))
}

function cellBg(val: number, maxVal: number) {
  if (!val || maxVal === 0) return 'transparent'
  const pct = val / maxVal
  if (pct <= 0.25) return '#E8F5E9'
  if (pct <= 0.5) return '#A5D6A7'
  if (pct <= 0.75) return '#66BB6A'
  return '#388E3C'
}

function cellColor(val: number, maxVal: number) {
  if (!val || maxVal === 0) return '#333'
  return val / maxVal > 0.5 ? '#fff' : '#333'
}

onMounted(loadWorkTypes)
</script>

<template>
  <div class="worktype-page">
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>人员工作类型分布</span>
          <div class="card-header-right">
            <el-button size="small" @click="prevWorkTypeMonth">‹</el-button>
            <span class="month-label">{{ workTypeMonth }}</span>
            <el-button size="small" @click="nextWorkTypeMonth">›</el-button>
            <el-button :icon="Refresh" size="small" text @click="loadWorkTypes">刷新</el-button>
          </div>
        </div>
      </template>
      <el-table :data="workTypeList" v-loading="workTypeLoading" stripe border>
        <el-table-column prop="userName" label="姓名" width="90" />
        <el-table-column prop="workerCode" label="工号" width="80" />
        <el-table-column v-for="wt in ['工作（陆）','工作（海）','待工','在途','请假']" :key="wt" :label="wt.replace('工作（','').replace('）','')" width="76" align="center">
          <template #default="{ row }">
            <span
              :style="{
                background: cellBg((row as any).workTypes?.[wt] || 0, maxInColumn(wt)),
                color: cellColor((row as any).workTypes?.[wt] || 0, maxInColumn(wt)),
                padding: '2px 8px', borderRadius: '4px', fontWeight: '600'
              }"
            >{{ (row as any).workTypes?.[wt] || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="total" label="总计" width="70" align="center">
          <template #default="{ row }">
            <b>{{ (row as any).total }}</b>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.worktype-page { padding: 20px; }

.section-card {
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 500;

    .card-header-right {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .month-label {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      min-width: 80px;
      text-align: center;
    }
  }
}
</style>
