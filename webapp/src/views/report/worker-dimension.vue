<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getWorkerStats } from '@/api/report'
import type { StatsViewFilter } from '@/api/statsView'
import { createStatsView } from '@/api/statsView'
import FilterDialog from '@/components/FilterDialog.vue'
import SectionCard from '@/components/SectionCard.vue'
import { useTableColumnResize } from '@/composables/useTableColumnResize'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'

// 列宽持久化（人员明细表）
const { bindRef, onHeaderDragEnd } = useTableColumnResize('worker-dimension')

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
    <SectionCard title="按人员维度">
      <template #actions>
        <el-button v-if="userStore.isAdmin" size="small" @click="showFilter = true">筛选</el-button>
        <el-button :icon="Refresh" size="small" text @click="loadWorkers">刷新</el-button>
      </template>
      <el-table :data="workerList" v-loading="workerLoading" stripe border :ref="bindRef" allow-drag-last-column @header-dragend="onHeaderDragEnd">
        <el-table-column prop="name" label="人员" width="120" />
        <el-table-column prop="total" label="总条数" width="100" align="center" sortable />
        <el-table-column prop="monthCount" label="本月" width="80" align="center" sortable />
        <el-table-column prop="lastDate" label="最近提交" width="120" align="center" sortable />
      </el-table>
      <el-empty v-if="!workerLoading && !workerList.length" description="暂无人员数据" />
      <div class="pagination-wrap">
        <span class="total-text">共 {{ workerTotal }} 人</span>
      </div>
    </SectionCard>
    <FilterDialog v-model="showFilter" stat-key="workers" @apply="onFilterApply" />
  </div>
</template>

<style scoped lang="scss">
.pagination-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $spacing-medium;

  .total-text {
    font-size: $font-size-base;
    color: $text-secondary;
  }
}
</style>
