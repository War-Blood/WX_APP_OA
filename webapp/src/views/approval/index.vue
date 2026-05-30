<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'

interface ApprovalItem {
  id: string; title: string; type: string; applicant: string;
  applicantDept: string; date: string; status: string; statusText: string
}

const loading = ref(false)
const list = ref<ApprovalItem[]>([])
const total = ref(0)
const activeTab = ref('pending')

const tabs = [
  { key: 'pending', label: '待审批' },
  { key: 'mine', label: '我发起的' },
  { key: 'done', label: '已处理' }
]

const typeMap: Record<string, string> = {
  leave: '请假', expense: '报销', seal: '售后', travel: '出差', purchase: '采购', general: '通用'
}

function getStatusType(s: string) { return s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning' }

onMounted(async () => {
  loading.value = true
  try {
    const { default: request } = await import('@/utils/request')
    const res = await request.post('/approval/list', { tab: 'pending', page: 1, pageSize: 50 })
    list.value = res.list || []
    total.value = res.total || 0
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="approval-page">
    <div class="toolbar">
      <span class="title">审批管理</span>
      <el-button :icon="Refresh" @click="onMounted">刷新</el-button>
    </div>

    <el-table :data="list" v-loading="loading" stripe border empty-text="暂无审批数据">
      <el-table-column prop="title" label="审批标题" min-width="160" />
      <el-table-column label="类型" width="80">
        <template #default="{ row }">{{ typeMap[row.type] || row.type }}</template>
      </el-table-column>
      <el-table-column prop="applicant" label="申请人" width="80" />
      <el-table-column prop="applicantDept" label="部门" width="100" />
      <el-table-column prop="date" label="日期" width="110" />
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrap">
      <span class="total-text">共 {{ total }} 条</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.approval-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
  .title { font-size: 18px; font-weight: 600; color: #333; }
}
.pagination-wrap { margin-top: 16px; .total-text { font-size: 14px; color: #999; } }
</style>
