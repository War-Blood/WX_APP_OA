<template>
  <div class="operation-log-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>操作日志</span>
        </div>
      </template>

      <div class="filters">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索用户 / 模块 / 详情"
          clearable
          style="width: 220px"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="filters.module" placeholder="模块" clearable style="width: 150px" @change="handleSearch">
          <el-option v-for="item in moduleOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="filters.action" placeholder="操作" clearable style="width: 150px" @change="handleSearch">
          <el-option v-for="item in actionOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-date-picker
          v-model="filters.startDate"
          type="date"
          placeholder="开始日期"
          value-format="YYYY-MM-DD"
          style="width: 150px"
        />
        <el-date-picker
          v-model="filters.endDate"
          type="date"
          placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 150px"
        />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button :loading="exporting" @click="handleExport">导出CSV</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe border style="margin-top: 16px">
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="userName" label="用户" width="120" show-overflow-tooltip />
        <el-table-column label="模块" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ row.module || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130">
          <template #default="{ row }">
            <el-tag :type="actionTagType(row.action)" size="small">{{ row.action || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="目标" width="150">
          <template #default="{ row }">
            <span v-if="row.targetType || row.targetId">{{ row.targetType || '-' }} / {{ row.targetId ?? '-' }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="详情" min-width="220" show-overflow-tooltip />
        <el-table-column prop="ipAddress" label="IP" width="130" show-overflow-tooltip />
        <el-table-column prop="userAgent" label="User Agent" min-width="180" show-overflow-tooltip />
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        background
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="loadData"
        @size-change="handleSizeChange"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { toast } from '@/utils/toast'
import { getOperationLogs, type OperationLogItem } from '@/api/operation-log'

const moduleOptions = ['AUTH', 'ADMIN', 'REPORT', 'APPROVAL', 'ATTENDANCE', 'COMPLIANCE', 'PROJECT', 'MESSAGE', 'REVIEW', 'INVITE', 'SYSTEM']
const actionOptions = ['login', 'logout', 'create', 'update', 'delete', 'approve', 'reject', 'review', 'export', 'toggle', 'reset_password']

const loading = ref(false)
const exporting = ref(false)
const list = ref<OperationLogItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({
  keyword: '',
  module: '',
  action: '',
  startDate: '',
  endDate: '',
})

onMounted(loadData)

async function loadData() {
  loading.value = true
  try {
    const params: {
      page: number
      pageSize: number
      keyword?: string
      module?: string
      action?: string
      startDate?: string
      endDate?: string
    } = { page: page.value, pageSize: pageSize.value }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.module) params.module = filters.module
    if (filters.action) params.action = filters.action
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate
    const res = await getOperationLogs(params)
    list.value = res.list || []
    total.value = res.total || 0
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadData()
}

function handleReset() {
  filters.keyword = ''
  filters.module = ''
  filters.action = ''
  filters.startDate = ''
  filters.endDate = ''
  handleSearch()
}

function handleSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  loadData()
}

function formatTime(value?: string) {
  return value ? String(value).slice(0, 19).replace('T', ' ') : '-'
}

function actionTagType(action: string) {
  const danger = new Set(['delete', 'reject', 'logout'])
  const warning = new Set(['update', 'toggle', 'reset_password'])
  if (danger.has(action)) return 'danger'
  if (warning.has(action)) return 'warning'
  return 'primary'
}

async function handleExport() {
  exporting.value = true
  try {
    const params: Parameters<typeof getOperationLogs>[0] = { page: 1, pageSize: 10000 }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.module) params.module = filters.module
    if (filters.action) params.action = filters.action
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate
    const res = await getOperationLogs(params)
    const headers = ['id', 'userId', 'userName', 'action', 'module', 'targetId', 'targetType', 'detail', 'ipAddress', 'userAgent', 'createdAt']
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const rows = (res.list || []).map(row => [
      row.id, row.userId, row.userName, row.action, row.module, row.targetId, row.targetType,
      row.detail, row.ipAddress, row.userAgent, row.createdAt,
    ].map(escape).join(','))
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'operation-logs.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`已导出 ${rows.length} 条操作日志`)
  } catch {
    toast.error('导出操作日志失败')
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.operation-log-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 16px;
}

.filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
