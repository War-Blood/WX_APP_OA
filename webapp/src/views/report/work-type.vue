<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getWorkerWorkTypes, type WorkerWorkTypeItem } from '@/api/report'
import { currentMonthInBeijing, shiftMonth } from '@/utils/date'
import StatsFilterBar from '@/components/StatsFilterBar.vue'

const workTypeLoading = ref(false)
const workTypeList = ref<WorkerWorkTypeItem[]>([])
const workTypeMonth = ref(currentMonthInBeijing())
const WT_LABELS = ['工作（陆）','工作（海）','待工','在途','请假']

// 汇总行：各列合计 + 补录合计 + 工作日报合计 + 总计
const wtSummary = computed(() => {
  const s: Record<string, number> = { supplement: 0, office: 0, total: 0 }
  WT_LABELS.forEach(l => { s[l] = 0 })
  workTypeList.value.forEach(w => {
    WT_LABELS.forEach(l => { s[l] += (w as any).workTypes?.[l] || 0 })
    s.supplement += w.supplementCount || 0
    s.office += w.officeCount || 0
    s.total += w.total || 0
  })
  return s
})

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
  workTypeMonth.value = shiftMonth(workTypeMonth.value, -1)
  loadWorkTypes()
}

function nextWorkTypeMonth() {
  workTypeMonth.value = shiftMonth(workTypeMonth.value, 1)
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
          <span>工作类型分布</span>
          <div class="card-header-right">
            <StatsFilterBar view="worktypes" :show="{ dept: true, fieldOnly: true, workType: true, province: false }" @change="loadWorkTypes" />
            <el-button size="small" @click="prevWorkTypeMonth">‹</el-button>
            <span class="month-label">{{ workTypeMonth }}</span>
            <el-button size="small" @click="nextWorkTypeMonth">›</el-button>
            <el-button :icon="Refresh" size="small" text @click="loadWorkTypes">刷新</el-button>
          </div>
        </div>
      </template>
      <el-table :data="workTypeList" v-loading="workTypeLoading" stripe border>
        <!-- 汇总行 -->
        <template #append>
          <tr class="wt-summary">
            <td class="wt-sum-cell wt-sum-name">汇总</td>
            <td class="wt-sum-cell wt-sum-supp">{{ wtSummary.supplement }}</td>
            <td class="wt-sum-cell wt-sum-office">{{ wtSummary.office }}</td>
            <td v-for="wt in WT_LABELS" :key="wt" class="wt-sum-cell">{{ wtSummary[wt] }}</td>
            <td class="wt-sum-cell wt-sum-total">{{ wtSummary.total }}</td>
          </tr>
        </template>
        <el-table-column prop="userName" label="姓名" width="90" />
        <el-table-column label="补" width="60" align="center">
          <template #default="{ row }">
            <span class="wt-supp">{{ (row as any).supplementCount || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="公" width="60" align="center">
          <template #default="{ row }">
            <span class="wt-office">{{ (row as WorkerWorkTypeItem).officeCount || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column v-for="wt in WT_LABELS" :key="wt" :label="wt.replace('工作（','').replace('）','')" width="76" align="center">
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

.wt-summary {
  background: #F0F7FF;
  font-weight: 600;

  .wt-sum-cell {
    padding: 8px 0;
    text-align: center;
    color: #333;
    border-bottom: 1px solid #E5E7EB;
  }

  .wt-sum-name {
    padding-left: 12px;
    text-align: left;
  }

  .wt-sum-supp { color: #F59E0B; }

  .wt-sum-office { color: #22C55E; }

  .wt-sum-total { color: #2B6DE8; font-weight: 700; }
}

.wt-supp {
  color: #F59E0B;
  font-weight: 600;
}

.wt-office {
  color: #22C55E;
  font-weight: 600;
}

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
