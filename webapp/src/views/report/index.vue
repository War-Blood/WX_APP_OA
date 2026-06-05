<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Download, Delete } from '@element-plus/icons-vue'
import { getReportStats } from '@/api/stats'
import { getReportList, getWorkerStats, deleteReport, reviewAction } from '@/api/report'

// --- 状态 ---
const activeTab = ref('query')
const loading = ref(false)
const statsLoading = ref(true)

// 统计看板
const stats = ref({ total: 0, monthCount: 0, pendingCount: 0, approvedCount: 0, approvalRate: '0%', trend: [] })

// 日报查询
const keyword = ref('')
const statusFilter = ref('')
const startDate = ref('')
const endDate = ref('')
const reportList = ref<any[]>([])
const reportTotal = ref(0)
const reportPage = ref(1)
const reportPageSize = ref(50)

// 人员看板
const workerKeyword = ref('')
const workerList = ref<any[]>([])
const workerTotal = ref(0)
const workerPage = ref(1)
const workerPageSize = ref(20)

// 详情弹窗
const detailVisible = ref(false)
const detailData = ref<any>({})

const statusOptions = [
  { label: '全部', value: '' },
  { label: '已提交', value: 'submitted' },
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
]

const tabItems = [
  { label: '统计看板', name: 'stats' },
  { label: '日报查询', name: 'query' },
  { label: '人员看板', name: 'workers' },
]

// --- 统计看板 ---
async function loadStats() {
  statsLoading.value = true
  try {
    const res = await getReportStats()
    stats.value = res as any
  } catch { ElMessage.warning('统计加载失败') }
  finally { statsLoading.value = false }
}

// --- 日报查询 ---
async function loadReports() {
  loading.value = true
  try {
    const res = await getReportList({
      page: reportPage.value, pageSize: reportPageSize.value,
      keyword: keyword.value || undefined,
      status: statusFilter.value || undefined,
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined,
    })
    reportList.value = res.list || []
    reportTotal.value = res.total || 0
  } catch { reportList.value = [] }
  finally { loading.value = false }
}

function handleSearch() { reportPage.value = 1; loadReports() }
function handleReportPageChange(p: number) { reportPage.value = p; loadReports() }

async function handleExport() {
  try {
    const params: any = {}
    if (statusFilter.value) params.status = statusFilter.value
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    if (keyword.value) params.keyword = keyword.value
    const token = localStorage.getItem('token') || ''
    const res = await fetch('/api/report/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(params)
    })
    if (!res.ok) throw new Error('导出失败')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'report.csv'
    a.click(); URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch { ElMessage.error('导出失败') }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定删除该条记录？', '删除确认', { type: 'warning' })
    await deleteReport(row.id)
    ElMessage.success('已删除')
    loadReports()
  } catch { /* cancelled */ }
}

async function handleReview(row: any, action: 'approve' | 'reject') {
  if (action === 'approve') {
    try {
      await ElMessageBox.confirm('确定通过该条日报？', '审核确认', { type: 'warning' })
      await reviewAction(row.id, action)
      ElMessage.success('已通过')
      loadReports()
    } catch { /* cancelled */ }
  } else {
    try {
      const { value: opinion } = await ElMessageBox.prompt('请输入驳回原因', '驳回确认', {
        inputType: 'textarea',
        inputPlaceholder: '请详细说明驳回原因，帮助提交者了解需要修改的内容',
        inputValidator: (val: string) => !!val.trim(),
        inputErrorMessage: '驳回原因不能为空',
        confirmButtonText: '确定驳回',
        cancelButtonText: '取消',
        distinguishCancelAndClose: true,
      })
      await reviewAction(row.id, action, opinion)
      ElMessage.success('已驳回')
      loadReports()
    } catch { /* cancelled or closed */ }
  }
}

function showDetail(row: any) { detailData.value = row; detailVisible.value = true }

// --- 人员看板 ---
async function loadWorkers() {
  loading.value = true
  try {
    const res = await getWorkerStats({
      page: workerPage.value, pageSize: workerPageSize.value,
      keyword: workerKeyword.value || undefined,
    })
    workerList.value = res.list || []
    workerTotal.value = res.total || 0
  } catch { workerList.value = [] }
  finally { loading.value = false }
}

function handleWorkerSearch() { workerPage.value = 1; loadWorkers() }
function handleWorkerPageChange(p: number) { workerPage.value = p; loadWorkers() }

// 人员看板 → 搜该人员日报
function searchPersonReports(name: string) {
  activeTab.value = 'query'
  keyword.value = name
  handleSearch()
}

function handleTabChange(tab: string) {
  activeTab.value = tab
  if (tab === 'stats') loadStats()
  else if (tab === 'query') loadReports()
  else if (tab === 'workers') loadWorkers()
}

onMounted(() => { loadStats(); loadReports() })
</script>

<template>
  <div class="report-page">
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane v-for="t in tabItems" :key="t.name" :label="t.label" :name="t.name" />
    </el-tabs>

    <!-- ====== Tab 1: 统计看板 ====== -->
    <template v-if="activeTab === 'stats'">
      <el-row :gutter="16" class="stats-row" v-loading="statsLoading">
        <el-col :span="4"><el-card class="stat-card" shadow="hover"><div class="stat-val">{{ stats.total }}</div><div class="stat-lbl">总日报数</div></el-card></el-col>
        <el-col :span="4"><el-card class="stat-card" shadow="hover"><div class="stat-val" style="color:#409EFF">{{ stats.monthCount }}</div><div class="stat-lbl">本月提交</div></el-card></el-col>
        <el-col :span="4"><el-card class="stat-card" shadow="hover"><div class="stat-val" style="color:#E6A23C">{{ stats.pendingCount }}</div><div class="stat-lbl">待审核</div></el-card></el-col>
        <el-col :span="4"><el-card class="stat-card" shadow="hover"><div class="stat-val" style="color:#67C23A">{{ stats.approvedCount }}</div><div class="stat-lbl">已通过</div></el-card></el-col>
        <el-col :span="8"><el-card class="stat-card" shadow="hover"><div class="stat-val" style="color:#6366F1">{{ stats.approvalRate }}</div><div class="stat-lbl">通过率</div></el-card></el-col>
      </el-row>
    </template>

    <!-- ====== Tab 2: 日报查询 ====== -->
    <template v-if="activeTab === 'query'">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input v-model="keyword" placeholder="搜索项目/人员/工作内容" clearable :prefix-icon="Search" style="width:260px" @clear="handleSearch" @keyup.enter="handleSearch" />
          <el-select v-model="statusFilter" placeholder="状态" style="width:120px" @change="handleSearch"><el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" /></el-select>
          <el-date-picker v-model="startDate" type="date" placeholder="开始日期" style="width:140px" @change="handleSearch" value-format="YYYY-MM-DD" />
          <el-date-picker v-model="endDate" type="date" placeholder="结束日期" style="width:140px" @change="handleSearch" value-format="YYYY-MM-DD" />
          <el-button :icon="Refresh" @click="handleSearch">刷新</el-button>
          <el-button type="success" :icon="Download" @click="handleExport">导出CSV</el-button>
        </div>
      </div>
      <el-table :data="reportList" v-loading="loading" stripe border highlight-current-row @row-click="showDetail" style="cursor:pointer">
        <el-table-column prop="reportDate" label="日报时间" width="110" fixed="left" />
        <el-table-column prop="submitter" label="填写人" width="100" show-overflow-tooltip />
        <el-table-column prop="entryDate" label="入场时间" width="110" />
        <el-table-column prop="initialBizTripDate" label="初始出差" width="110" />
        <el-table-column prop="project" label="项目名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="area" label="项目区域" width="100" show-overflow-tooltip />
        <el-table-column prop="relatedParty" label="相关方" width="120" show-overflow-tooltip />
        <el-table-column prop="workers" label="作业人员" width="130" show-overflow-tooltip />
        <el-table-column prop="machineModel" label="机型" width="100" show-overflow-tooltip />
        <el-table-column prop="workerCount" label="人数" width="60" align="center" />
        <el-table-column prop="workContent" label="工作内容" min-width="150" show-overflow-tooltip />
        <el-table-column prop="requiredQty" label="需完成量" width="80" align="center" />
        <el-table-column prop="completedQty" label="累计完成量" width="90" align="center" />
        <el-table-column prop="progressPercent" label="进度" width="70" align="center" />
        <el-table-column prop="todayWork" label="今日工作" min-width="180" show-overflow-tooltip />
        <el-table-column prop="tomorrowPlan" label="明日计划" min-width="150" show-overflow-tooltip />
        <el-table-column prop="todayWorkType" label="今日类型" width="80" />
        <el-table-column prop="tomorrowWorkType" label="明日类型" width="80" />
        <el-table-column prop="remark" label="备注" width="120" show-overflow-tooltip />
        <el-table-column prop="personalBizTripDays" label="个人出差天数" width="110" align="center" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'submitted'" type="info" size="small">已提交</el-tag>
            <el-tag v-else-if="row.status === 'pending'" type="warning" size="small">待审核</el-tag>
            <el-tag v-else-if="row.status === 'approved'" type="success" size="small">已通过</el-tag>
            <el-tag v-else-if="row.status === 'rejected'" type="danger" size="small">已驳回</el-tag>
            <el-tag v-else size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" size="small" type="success" @click.stop="handleReview(row, 'approve')">通过</el-button>
            <el-button v-if="row.status === 'pending'" size="small" type="danger" @click.stop="handleReview(row, 'reject')">驳回</el-button>
            <el-button size="small" type="danger" link :icon="Delete" @click.stop="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <span class="total-text">共 {{ reportTotal }} 条</span>
        <el-pagination v-model:current-page="reportPage" :page-size="reportPageSize" :total="reportTotal" layout="prev, pager, next" background @current-change="handleReportPageChange" />
      </div>
    </template>

    <!-- ====== Tab 3: 人员看板 ====== -->
    <template v-if="activeTab === 'workers'">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input v-model="workerKeyword" placeholder="搜索人员姓名" clearable :prefix-icon="Search" style="width:240px" @clear="handleWorkerSearch" @keyup.enter="handleWorkerSearch" />
          <el-button :icon="Refresh" @click="handleWorkerSearch">刷新</el-button>
        </div>
      </div>
      <el-table :data="workerList" v-loading="loading" stripe border>
        <el-table-column prop="name" label="人员" width="120" />
        <el-table-column prop="total" label="日报总数" width="100" align="center" sortable />
        <el-table-column prop="monthCount" label="本月数" width="100" align="center" sortable />
        <el-table-column prop="lastDate" label="最后提交" width="120" align="center" sortable />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="searchPersonReports(row.name)">查看日报</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <span class="total-text">共 {{ workerTotal }} 人</span>
        <el-pagination v-model:current-page="workerPage" :page-size="workerPageSize" :total="workerTotal" layout="prev, pager, next" background @current-change="handleWorkerPageChange" />
      </div>
    </template>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="日报详情" width="700px" destroy-on-close>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="日期">{{ detailData.reportDate || detailData.date || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag v-if="detailData.status === 'submitted'" type="info" size="small">已提交</el-tag>
          <el-tag v-else-if="detailData.status === 'pending'" type="warning" size="small">待审核</el-tag>
          <el-tag v-else-if="detailData.status === 'approved'" type="success" size="small">已通过</el-tag>
          <el-tag v-else-if="detailData.status === 'rejected'" type="danger" size="small">已驳回</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="项目">{{ detailData.project || '-' }}</el-descriptions-item>
        <el-descriptions-item label="区域">{{ detailData.area || '-' }}</el-descriptions-item>
        <el-descriptions-item label="作业人员">{{ detailData.workers || '-' }}</el-descriptions-item>
        <el-descriptions-item label="机型">{{ detailData.machineModel || '-' }}</el-descriptions-item>
        <el-descriptions-item label="工作类型">{{ detailData.todayWorkType || '-' }}</el-descriptions-item>
        <el-descriptions-item label="人数">{{ detailData.workerCount || '-' }}</el-descriptions-item>
        <el-descriptions-item label="今日工作" :span="2">{{ detailData.todayWork || '-' }}</el-descriptions-item>
        <el-descriptions-item label="明日计划" :span="2">{{ detailData.tomorrowPlan || '-' }}</el-descriptions-item>
        <el-descriptions-item label="工作内容" :span="2">{{ detailData.workContent || '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailData.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.report-page { padding: 20px; }
.stats-row { margin-bottom: 16px; .stat-card { text-align: center; .stat-val { font-size: 28px; font-weight: 700; } .stat-lbl { font-size: 13px; color: #999; margin-top: 4px; } } }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; .toolbar-left { display: flex; gap: 12px; align-items: center; } }
.pagination-wrap { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; .total-text { font-size: 14px; color: #999; } }
</style>
