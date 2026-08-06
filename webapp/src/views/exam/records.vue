<template>
  <div class="records-page">
    <el-card>
      <template #header>
        <div class="toolbar">
          <span class="title">考试记录</span>
          <div class="actions">
            <el-input v-model="keyword" placeholder="搜索考生" clearable style="width:200px" @clear="loadData" @keyup.enter="loadData" />
            <el-select v-model="filterPaper" placeholder="按试卷" clearable style="width:180px" @change="loadData">
              <el-option v-for="p in paperOptions" :key="p.id" :label="p.title" :value="p.id" />
            </el-select>
            <el-select v-model="filterStatus" placeholder="状态" clearable style="width:110px" @change="loadData">
              <el-option label="已提交" value="submitted" /><el-option label="进行中" value="doing" />
              <el-option label="已超时" value="timeout" /><el-option label="作弊" value="cheated" />
            </el-select>
            <el-button @click="loadData">搜索</el-button>
            <el-button type="primary" @click="handleExport" :loading="exporting">导出</el-button>
          </div>
        </div>
      </template>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="userName" label="考生" width="100" />
        <el-table-column prop="departmentName" label="部门" width="110" />
        <el-table-column prop="paperTitle" label="试卷" min-width="150" />
        <el-table-column label="模式" width="70"><template #default="{ row }"><el-tag size="small" :type="row.mode==='exam'?'primary':'info'">{{ row.mode==='exam'?'考试':'练习' }}</el-tag></template></el-table-column>
        <el-table-column label="分数" width="70" align="center"><template #default="{ row }">{{ row.resultPending ? '待公布' : (row.score ?? '-') }}</template></el-table-column>
        <el-table-column label="合格" width="70" align="center"><template #default="{ row }">{{ row.isPass ? '✅' : row.isPass===0 ? '❌' : '-' }}</template></el-table-column>
        <el-table-column prop="warnCount" label="截屏" width="60" align="center" />
        <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ row.resultPending ? '待公布' : statusLabel(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="时间" width="160"><template #default="{ row }">{{ row.startTime?.slice(0,16)?.replace('T',' ') }}</template></el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total,prev,pager,next" background style="margin-top:16px;justify-content:flex-end" @current-change="loadData" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { toast } from '@/utils/toast'
import type { ExamRecord, PaperRow } from '@/api/exam'
import { getRecordList, getPaperList, exportRecords } from '@/api/exam'

const loading = ref(false)
const exporting = ref(false)
const tableData = ref<ExamRecord[]>([])
const total = ref(0)
const page = ref(1)
const keyword = ref('')
const filterPaper = ref<number | null>(null)
const filterStatus = ref<string | null>(null)
const paperOptions = ref<PaperRow[]>([])

const statusType = (s: string): '' | 'success' | 'warning' | 'danger' | 'primary' =>
  ({ submitted: 'success', doing: 'primary', timeout: 'warning', cheated: 'danger' } as Record<string, '' | 'success' | 'warning' | 'danger' | 'primary'>)[s] || ''
const statusLabel = (s: string): string => ({ submitted: '已提交', doing: '进行中', timeout: '已超时', cheated: '作弊' })[s] || s

async function loadData() {
  loading.value = true
  try {
    const res = await getRecordList({
      page: page.value, pageSize: 20,
      keyword: keyword.value || undefined,
      paperId: filterPaper.value || undefined,
      status: filterStatus.value || undefined,
    })
    tableData.value = res.list || []
    total.value = res.total || 0
  } catch { toast.error('加载失败') }
  finally { loading.value = false }
}

// 导出成绩 CSV(带 BOM,Excel 直接打开)
async function handleExport() {
  exporting.value = true
  try {
    const res = await exportRecords({
      paperId: filterPaper.value || undefined,
      keyword: keyword.value || undefined,
    })
    const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = res.filename || 'exam-records.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('导出成功')
  } catch { toast.error('导出失败') }
  finally { exporting.value = false }
}

onMounted(async () => {
  loadData()
  try {
    const res = await getPaperList({ pageSize: 99 })
    paperOptions.value = res.list || []
  } catch { /* */ }
})
</script>

<style lang="scss" scoped>
.records-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 18px; font-weight: 600; }
.actions { display: flex; gap: 12px; }
</style>
