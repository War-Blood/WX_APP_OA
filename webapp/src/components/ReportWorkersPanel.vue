<script setup lang="ts">
import { Search, Refresh } from '@element-plus/icons-vue'

defineProps<{
  workerList: Record<string, unknown>[]
  workerTotal: number
  loading: boolean
  workerKeyword: string
}>()

defineEmits<{
  'update:workerKeyword': [value: string]
  search: []
  refresh: []
  'view-reports': [name: string]
}>()
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <el-input
        :model-value="workerKeyword"
        placeholder="搜索人员姓名"
        clearable
        :prefix-icon="Search"
        style="width:240px"
        @update:model-value="$emit('update:workerKeyword', $event)"
        @clear="$emit('search')"
        @keyup.enter="$emit('search')"
      />
      <el-button :icon="Refresh" @click="$emit('refresh')">刷新</el-button>
    </div>
  </div>
  <el-table :data="workerList" v-loading="loading" stripe border>
    <el-table-column prop="name" label="人员" width="120" />
    <el-table-column prop="total" label="日报总数" width="100" align="center" sortable />
    <el-table-column prop="monthCount" label="本月数" width="100" align="center" sortable />
    <el-table-column prop="lastDate" label="最后提交" width="120" align="center" sortable />
    <el-table-column label="操作" width="120">
      <template #default="{ row }">
        <el-button
          size="small"
          type="primary"
          link
          @click="$emit('view-reports', row.name as string)"
        >
          查看日报
        </el-button>
      </template>
    </el-table-column>
  </el-table>
  <div class="pagination-wrap">
    <span class="total-text">共 {{ workerTotal }} 人</span>
  </div>
</template>

<style scoped lang="scss">
.toolbar {
  .toolbar-left {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 16px;
  }
}

.pagination-wrap {
  margin-top: 16px;

  .total-text {
    font-size: 14px;
    color: #999;
  }
}
</style>
