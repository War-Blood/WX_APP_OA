<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getWorkerWorkTypes, type WorkerWorkTypeItem } from '@/api/report'
import { currentMonthInBeijing, shiftMonth } from '@/utils/date'
import type { StatsViewFilter } from '@/api/statsView'
import { createStatsView } from '@/api/statsView'
import FilterDialog from '@/components/FilterDialog.vue'
import SectionCard from '@/components/SectionCard.vue'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'

const userStore = useUserStore()
const workTypeLoading = ref(false)
const workTypeList = ref<WorkerWorkTypeItem[]>([])
const workTypeMonth = ref(currentMonthInBeijing())
const WT_LABELS = ['工作（陆）','工作（海）','待工','在途','请假']
const showFilter = ref(false)

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

// 「应用」即保存为该统计页的唯一视图（UPSERT），随后刷新
async function onFilterApply(filter: StatsViewFilter) {
  try {
    await createStatsView({
      statKey: 'worktypes',
      conditions: filter.conditions || [],
      roleConditions: filter.roleConditions || {},
      visibility: filter.visibility,
    })
    toast.success('视图已保存')
  } catch {
    toast.error('保存失败')
  }
  showFilter.value = false
  loadWorkTypes()
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

function cellClass(val: number, maxVal: number): number {
  if (!val || maxVal === 0) return 0
  const pct = val / maxVal
  if (pct <= 0.25) return 1
  if (pct <= 0.5) return 2
  return 3
}

onMounted(loadWorkTypes)
</script>

<template>
  <div class="worktype-page">
    <SectionCard title="工作类型分布">
      <template #actions>
        <el-button v-if="userStore.isAdmin" size="small" @click="showFilter = true">筛选</el-button>
        <el-button size="small" @click="prevWorkTypeMonth">‹</el-button>
        <span class="month-label">{{ workTypeMonth }}</span>
        <el-button size="small" @click="nextWorkTypeMonth">›</el-button>
        <el-button :icon="Refresh" size="small" text @click="loadWorkTypes">刷新</el-button>
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
              :class="['cell-heat', `cell-heat--${cellClass((row as any).workTypes?.[wt] || 0, maxInColumn(wt))}`]"
            >{{ (row as any).workTypes?.[wt] || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="total" label="总计" width="70" align="center">
          <template #default="{ row }">
            <b>{{ (row as any).total }}</b>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!workTypeLoading && !workTypeList.length" description="暂无工作类型数据" />
    </SectionCard>
    <FilterDialog v-model="showFilter" stat-key="worktypes" @apply="onFilterApply" />
  </div>
</template>

<style scoped lang="scss">
.wt-summary {
  background: $primary-bg;
  font-weight: 600;

  .wt-sum-cell {
    padding: 8px 0;
    text-align: center;
    color: $text-primary;
    border-bottom: 1px solid $border-color;
  }

  .wt-sum-name {
    padding-left: 12px;
    text-align: left;
  }

  .wt-sum-supp { color: $warning-color; }

  .wt-sum-office { color: $success-color; }

  .wt-sum-total { color: $primary-color; font-weight: 700; }
}

.wt-supp {
  color: $warning-color;
  font-weight: 600;
}

.wt-office {
  color: $success-color;
  font-weight: 600;
}

.cell-heat {
  padding: 2px 8px;
  border-radius: $border-radius-base;
  font-weight: 600;
  color: $text-primary;
}

.cell-heat--0 { background: transparent; }
.cell-heat--1 { background: #E8F5E9; }
.cell-heat--2 { background: #A5D6A7; }
.cell-heat--3 { background: #66BB6A; }
</style>
