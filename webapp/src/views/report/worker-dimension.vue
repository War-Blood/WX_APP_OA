<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getWorkerStats } from '@/api/report'
import type { StatsViewFilter } from '@/api/statsView'
import { createStatsView } from '@/api/statsView'
import FilterDialog from '@/components/FilterDialog.vue'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'

const userStore = useUserStore()
const workerLoading = ref(true)
const workerList = ref<{ name: string; total: number; monthCount: number; lastDate: string }[]>([])
const workerTotal = ref(0)
const showFilter = ref(false)

async function loadWorkers() {
  workerLoading.value = true
  try {
    const res = await getWorkerStats({})
    workerList.value = res.list
    workerTotal.value = res.total
  } catch {
    workerList.value = []
  } finally {
    workerLoading.value = false
  }
}

async function onFilterApply(filter: StatsViewFilter) {
  try {
    await createStatsView({
      statKey: 'workers',
      conditions: filter.conditions || [],
      roleConditions: filter.roleConditions || {},
      visibility: filter.visibility,
    })
    toast.success('视图已保存')
  } catch {
    toast.error('保存失败')
  }
  showFilter.value = false
  loadWorkers()
}

onMounted(loadWorkers)
</script>

<template>
  <div class="worker-page">
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>按人员维度</span>
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
    <FilterDialog v-model="showFilter" stat-key="workers" @apply="onFilterApply" />
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
