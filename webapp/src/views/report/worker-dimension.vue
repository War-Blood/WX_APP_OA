<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getWorkerStats } from '@/api/report'
import type { StatsViewFilter } from '@/api/statsView'
import ViewSelector from '@/components/ViewSelector.vue'
import FilterDialog from '@/components/FilterDialog.vue'
import SaveViewDialog from '@/components/SaveViewDialog.vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const workerLoading = ref(true)
const workerList = ref<{ name: string; total: number; monthCount: number; lastDate: string }[]>([])
const workerTotal = ref(0)
const currentViewId = ref<number | null>(null)
const showFilter = ref(false)
const showSave = ref(false)
const saveFilter = ref<StatsViewFilter>({})
const tempFilter = ref<StatsViewFilter>({})

async function loadWorkers() {
  workerLoading.value = true
  try {
    const res = await getWorkerStats({ viewId: currentViewId.value ?? undefined })
    workerList.value = res.list
    workerTotal.value = res.total
  } catch {
    workerList.value = []
  } finally {
    workerLoading.value = false
  }
}

function onViewChange(viewId: number | null) {
  currentViewId.value = viewId
  loadWorkers()
}
function onFilterApply(filter: StatsViewFilter) {
  tempFilter.value = filter
  currentViewId.value = null
  loadWorkers()
}
function onFilterSave(filter: StatsViewFilter) {
  saveFilter.value = filter
  showSave.value = true
}

onMounted(loadWorkers)
</script>

<template>
  <div class="worker-page">
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>按人员维度</span>
          <ViewSelector stat-key="workers" @change="onViewChange" />
          <el-button v-if="userStore.isAdmin" size="small" @click="showFilter = true">筛选</el-button>
          <el-button :icon="Refresh" size="small" text @click="loadWorkers">刷新</el-button>
        </div>
      </template>
      <el-table :data="workerList" v-loading="workerLoading" stripe border>
        <el-table-column prop="name" label="人员" width="120" />
        <el-table-column prop="total" label="总条数" width="100" align="center" sortable />
        <el-table-column prop="monthCount" label="本月" width="80" align="center" sortable />
        <el-table-column prop="lastDate" label="最近提交" width="120" align="center" sortable />
      </el-table>
      <div class="pagination-wrap">
        <span class="total-text">共 {{ workerTotal }} 人</span>
      </div>
    </el-card>
    <FilterDialog v-model="showFilter" stat-key="workers" :filter="tempFilter" @apply="onFilterApply" @save="onFilterSave" />
    <SaveViewDialog v-model="showSave" stat-key="workers" :filter="saveFilter" @saved="loadWorkers" />
  </div>
</template>

<style scoped lang="scss">
.worker-page { padding: 20px; }

.section-card {
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 500;
  }
}

.pagination-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;

  .total-text {
    font-size: 14px;
    color: #909399;
  }
}
</style>
