<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'
import {
  getDailyStatus,
  type DailyStatusWorker, type DailyStatusSummary, type DailyStatusResponse
} from '@/api/report'

// 日期
const date = ref('')

// 数据
const loading = ref(false)
const response = ref<DailyStatusResponse | null>(null)

// 筛选
const keyword = ref('')
const statusFilter = ref('')

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '已提交', value: 'submitted' },
  { label: '已代填', value: 'substituted' },
  { label: '补公出', value: 'supplement' },
  { label: '公司日报', value: 'office' },
  { label: '请假', value: 'leave' },
  { label: '调休', value: 'rest' },
  { label: '未提交', value: 'missing' }
]

const statusLabelMap: Record<string, string> = {
  submitted: '已提交',
  supplement: '补公出',
  office: '公司日报',
  substituted: '已代填',
  leave: '请假',
  rest: '调休',
  missing: '未提交'
}

const statusTagTypeMap: Record<string, string> = {
  submitted: 'success',
  supplement: 'warning',
  office: 'primary',
  substituted: '',
  leave: 'info',
  rest: 'info',
  missing: 'danger'
}

// 异常优先排序
const sortOrder: Record<string, number> = {
  missing: 0,
  supplement: 1,
  substituted: 2,
  submitted: 3,
  office: 4,
  leave: 5,
  rest: 6
}

// 过滤后的数据
const filteredWorkers = computed<DailyStatusWorker[]>(() => {
  if (!response.value) return []
  let workers = response.value.workers

  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    workers = workers.filter(
      w => w.userName.toLowerCase().includes(kw) || w.workerCode.toLowerCase().includes(kw)
    )
  }

  if (statusFilter.value) {
    workers = workers.filter(w => w.status === statusFilter.value)
  }

  // 异常优先排序
  return [...workers].sort((a, b) => {
    const orderDiff = (sortOrder[a.status] ?? 99) - (sortOrder[b.status] ?? 99)
    if (orderDiff !== 0) return orderDiff
    // 同状态下按提交时间排序
    if (a.submittedAt && b.submittedAt) return a.submittedAt.localeCompare(b.submittedAt)
    return 0
  })
})

const summaryItems = computed<{ key: string; label: string; count: number; color: string }[]>(() => {
  if (!response.value) return []
  const s: DailyStatusSummary = response.value.summary
  return [
    { key: 'submitted', label: '已提交', count: s.submitted, color: '#67C23A' },
    { key: 'substituted', label: '已代填', count: s.substituted, color: '#909399' },
    { key: 'supplement', label: '补公出', count: s.supplement, color: '#E6A23C' },
    { key: 'office', label: '公司日报', count: s.office, color: '#409EFF' },
    { key: 'leave', label: '请假', count: s.leave, color: '#909399' },
    { key: 'rest', label: '调休', count: s.rest, color: '#909399' },
    { key: 'missing', label: '缺失', count: s.missing, color: '#F56C6C' }
  ]
})

async function loadData() {
  loading.value = true
  try {
    const params: { date?: string } = {}
    if (date.value) params.date = date.value
    response.value = await getDailyStatus(params)
  } catch {
    response.value = null
  } finally {
    loading.value = false
  }
}

function handleDateChange() {
  loadData()
}

function handleSearch() {
  // computed 属性自动响应
}

function getStatusTagType(status: string): 'success' | 'warning' | 'danger' | 'info' | '' {
  return (statusTagTypeMap[status] as 'success' | 'warning' | 'danger' | 'info' | '') || 'info'
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="daily-status-page">
    <!-- 日期选择 -->
    <div class="top-bar">
      <el-date-picker
        v-model="date"
        type="date"
        placeholder="选择日期"
        value-format="YYYY-MM-DD"
        @change="handleDateChange"
      />
      <span class="date-hint" v-if="response">共 {{ response.totalWorkers }} 人</span>
    </div>

    <!-- 汇总统计 -->
    <el-row :gutter="12" class="summary-row" v-if="response">
      <el-col v-for="item in summaryItems" :key="item.key" :span="3" style="max-width:14.28%">
        <div class="summary-item" :style="{ borderTopColor: item.color }">
          <div class="summary-count" :style="{ color: item.color }">{{ item.count }}</div>
          <div class="summary-label">{{ item.label }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- 搜索筛选 -->
    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索姓名/工号"
        clearable
        :prefix-icon="Search"
        style="width: 240px"
        @input="handleSearch"
      />
      <el-select v-model="statusFilter" placeholder="全部状态" style="width: 130px" @change="handleSearch">
        <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
      </el-select>
    </div>

    <!-- 表格 -->
    <el-table :data="filteredWorkers" v-loading="loading" stripe border>
      <el-table-column prop="userName" label="姓名" width="100" />
      <el-table-column prop="workerCode" label="工号" width="100" />
      <el-table-column prop="project" label="项目" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.project || '—' }}
        </template>
      </el-table-column>
      <el-table-column prop="workType" label="工作类型" width="110">
        <template #default="{ row }">
          {{ row.workType || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)" size="small">
            {{ statusLabelMap[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="submittedAt" label="提交时间" width="160">
        <template #default="{ row }">
          {{ row.submittedAt || '—' }}
        </template>
      </el-table-column>
      <el-table-column prop="substituteBy" label="代填人" width="100">
        <template #default="{ row }">
          <span v-if="row.substituteBy" class="substitute-name">{{ row.substituteBy }}</span>
          <span v-else>—</span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped lang="scss">
.daily-status-page { padding: 20px; }

.top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .date-hint {
    color: #909399;
    font-size: 14px;
  }
}

.summary-row {
  margin-bottom: 16px;

  .summary-item {
    text-align: center;
    padding: 12px 8px;
    background: #fff;
    border-radius: 6px;
    border: 1px solid #ebeef5;
    border-top: 3px solid #dcdfe6;

    .summary-count {
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
    }

    .summary-label {
      font-size: 12px;
      color: #909399;
      margin-top: 4px;
    }
  }
}

.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.substitute-name {
  color: #909399;
  font-size: 12px;
}
</style>
