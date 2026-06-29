<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Download, Delete } from '@element-plus/icons-vue'
import { getStats } from '@/api/report'
import { getReportList, getReportDetail, getWorkerStats, deleteReport, reviewAction, reviewSupplement, updateReport } from '@/api/report'
import type { ReportUpdateResult } from '@/api/report'
import type { AllStatsResponse } from '@/api/report'

// --- 状态 ---
const activeTab = ref('query')
const loading = ref(false)
const statsLoading = ref(true)

// 统计看板 — v2.0 对接 getStats('all')
const stats = ref<AllStatsResponse | null>(null)

// 日报查询 — 新增筛选
const keyword = ref('')
const statusFilter = ref('')
const reportTypeFilter = ref('')
const workTypeFilter = ref('')
const startDate = ref('')
const endDate = ref('')
const attendanceMonth = ref(new Date().toISOString().slice(0, 7))
const reportList = ref<Record<string, unknown>[]>([])
const reportTotal = ref(0)
const reportPage = ref(1)
const reportPageSize = ref(50)

// 人员看板
const workerKeyword = ref('')
const workerList = ref<Record<string, unknown>[]>([])
const workerTotal = ref(0)

// 详情弹窗
const detailVisible = ref(false)
const detailData = ref<Record<string, any>>({})

// 审核弹窗（补公出）
const reviewVisible = ref(false)
const reviewItem = ref<Record<string, unknown> | null>(null)
const reviewDecision = ref<'special' | 'forget'>('special')
const reviewComment = ref('')

// 编辑弹窗
const editVisible = ref(false)
const editData = ref<Record<string, unknown>>({})
const editSaving = ref(false)

const statusOptions = [
  { label: '全部', value: '' },
  { label: '已提交', value: 'submitted' },
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' }
]

const reportTypeOptions = [
  { label: '全部', value: '' },
  { label: '公出日志', value: 'biz_trip' },
  { label: '补公出日志', value: 'biz_trip_supplement' }
]

const workTypeOptions = [
  { label: '全部', value: '' },
  { label: '工作（陆）', value: '工作（陆）' },
  { label: '工作（海）', value: '工作（海）' },
  { label: '待工', value: '待工' },
  { label: '在途', value: '在途' },
  { label: '请假', value: '请假' }
]

const tabItems = [
  { label: '统计看板', name: 'stats' },
  { label: '日报查询', name: 'query' },
  { label: '人员看板', name: 'workers' }
]

// 日志类型 tag 映射
function getReportTypeTag(reportType: string): { text: string; type: string } {
  const map: Record<string, { text: string; type: string }> = {
    biz_trip: { text: '公出日志', type: 'success' },
    biz_trip_supplement: { text: '补公出', type: 'warning' }
  }
  return map[reportType] || { text: reportType, type: '' }
}

// --- 统计看板 ---
async function loadStats() {
  statsLoading.value = true
  try {
    stats.value = await getStats('all')
  } catch {
    ElMessage.warning('统计加载失败')
  } finally {
    statsLoading.value = false
  }
}

// --- 日报查询 ---
async function loadReports() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      page: reportPage.value,
      pageSize: reportPageSize.value
    }
    if (keyword.value) params.keyword = keyword.value
    if (statusFilter.value) params.status = statusFilter.value
    if (reportTypeFilter.value) params.reportType = reportTypeFilter.value
    if (workTypeFilter.value) params.workType = workTypeFilter.value
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    const res = await getReportList(params as Parameters<typeof getReportList>[0])
    reportList.value = (res.list || []) as unknown as Record<string, unknown>[]
    reportTotal.value = res.total || 0
  } catch {
    reportList.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() { reportPage.value = 1; loadReports() }
function handleReportPageChange(p: number) { reportPage.value = p; loadReports() }

async function handleExport() {
  try {
    const params: Record<string, unknown> = {}
    if (statusFilter.value) params.status = statusFilter.value
    if (reportTypeFilter.value) params.reportType = reportTypeFilter.value
    if (workTypeFilter.value) params.workType = workTypeFilter.value
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
  } catch {
    ElMessage.error('导出失败')
  }
}

async function handleExportAttendance() {
  if (!attendanceMonth.value) { ElMessage.warning('请选择月份'); return }
  try {
    const token = localStorage.getItem('token') || ''
    const res = await fetch('/api/report/export-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ month: attendanceMonth.value })
    })
    if (!res.ok) throw new Error('导出失败')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'attendance-' + attendanceMonth.value + '.csv'
    a.click(); URL.revokeObjectURL(url)
    ElMessage.success('考勤导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

async function handleDelete(row: Record<string, unknown>) {
  try {
    await ElMessageBox.confirm('确定删除该条记录？', '删除确认', { type: 'warning' })
    await deleteReport(row.id as string)
    ElMessage.success('已删除')
    loadReports()
  } catch { /* cancelled */ }
}

async function handleReview(row: Record<string, unknown>, action: 'approve' | 'reject') {
  if (action === 'approve') {
    try {
      await ElMessageBox.confirm('确定通过该条日报？', '审核确认', { type: 'warning' })
      await reviewAction(row.id as string, action)
      ElMessage.success('已通过')
      loadReports()
    } catch { /* cancelled */ }
  } else {
    try {
      const { value: opinion } = await ElMessageBox.prompt('请输入驳回原因', '驳回确认', {
        inputType: 'textarea',
        inputPlaceholder: '请详细说明驳回原因',
        inputValidator: (val: string) => !!val.trim(),
        inputErrorMessage: '驳回原因不能为空',
        confirmButtonText: '确定驳回',
        cancelButtonText: '取消',
        distinguishCancelAndClose: true
      })
      await reviewAction(row.id as string, action, opinion)
      ElMessage.success('已驳回')
      loadReports()
    } catch { /* cancelled or closed */ }
  }
}

async function showDetail(row: Record<string, unknown>) {
  try {
    detailData.value = await getReportDetail(String(row.id))
  } catch {
    detailData.value = row  // fallback to table row
  }
  detailVisible.value = true
}

// --- 补公出审核 ---
function openSupplementReview(row: Record<string, unknown>) {
  reviewItem.value = row
  reviewDecision.value = 'special'
  reviewComment.value = ''
  reviewVisible.value = true
}

async function handleSupplementReview() {
  if (!reviewItem.value) return
  try {
    await reviewSupplement({
      reportId: reviewItem.value.id as number,
      decision: reviewDecision.value,
      comment: reviewComment.value || undefined
    })
    ElMessage.success('审核完成')
    reviewVisible.value = false
    loadReports()
  } catch {
    // 错误已由拦截器处理
  }
}

// ===== 编辑公出日志 =====
function openEdit(row: Record<string, unknown>) {
  editData.value = {
    reportId: row.id,
    reportDate: row.reportDate || row.date || '',
    reportType: row.reportType || 'biz_trip',
    project: row.project || '',
    area: row.area || '',
    todayWorkType: row.todayWorkType || '',
    workContent: row.workContent || '',
    machineModel: row.machineModel || '',
    workers: row.workers || '',
    relatedParty: row.relatedParty || '',
    remark: row.remark || '',
    todayWork: row.todayWork || '',
    tomorrowPlan: row.tomorrowPlan || '',
    entryDate: row.entryDate || '',
    initialBizTripDate: row.initialBizTripDate || '',
    requiredQty: Number(row.requiredQty) || undefined,
    completedQty: Number(row.completedQty) || undefined,
    personalBizTripDays: Number(row.personalBizTripDays) || undefined,
    bizTripDays: Number(row.bizTripDays) || undefined,
    supplementDate: row.supplementDate || '',
    supplementReason: row.supplementReason || '',
    issues: row.issues || '',
    content: row.content || '',
    // 只读展示用
    submitter: row.submitter || '',
    status: row.status || '',
  }
  editVisible.value = true
}

async function handleEditSubmit() {
  editSaving.value = true
  try {
    const res: ReportUpdateResult = await updateReport({
      reportId: editData.value.reportId as number,
      reportDate: editData.value.reportDate as string,
      reportType: editData.value.reportType as string,
      project: editData.value.project as string,
      area: editData.value.area as string,
      todayWorkType: editData.value.todayWorkType as string,
      workContent: editData.value.workContent as string,
      machineModel: editData.value.machineModel as string,
      workers: editData.value.workers as string,
      relatedParty: editData.value.relatedParty as string,
      remark: editData.value.remark as string,
      todayWork: editData.value.todayWork as string,
      tomorrowPlan: editData.value.tomorrowPlan as string,
      entryDate: editData.value.entryDate as string,
      initialBizTripDate: editData.value.initialBizTripDate as string,
      requiredQty: editData.value.requiredQty as number,
      completedQty: editData.value.completedQty as number,
      personalBizTripDays: editData.value.personalBizTripDays as number,
      bizTripDays: editData.value.bizTripDays as number,
      supplementDate: editData.value.supplementDate as string,
      supplementReason: editData.value.supplementReason as string,
      issues: editData.value.issues as string,
      content: editData.value.content as string,
    })
    editVisible.value = false
    if (res.changes && res.changes.length > 0) {
      ElMessage.success(`已修改 ${res.changes.length} 个字段`)
    } else {
      ElMessage.info('未检测到变更')
    }
    loadReports()
  } catch {
    // 错误已由拦截器处理
  } finally {
    editSaving.value = false
  }
}

// --- 人员看板（全量显示，不分页） ---
async function loadWorkers() {
  loading.value = true
  try {
    const res = await getWorkerStats({
      keyword: workerKeyword.value || undefined
    })
    workerList.value = (res.list || []) as unknown as Record<string, unknown>[]
    workerTotal.value = res.total || 0
  } catch {
    workerList.value = []
  } finally {
    loading.value = false
  }
}

function handleWorkerSearch() { loadWorkers() }

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
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-val">{{ stats?.totalLogs ?? '-' }}</div>
            <div class="stat-lbl">总日志数</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-val" style="color:#409EFF">{{ stats?.monthNew ?? '-' }}</div>
            <div class="stat-lbl">本月新增</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-val" style="color:#E6A23C">{{ stats?.delayedTotal ?? '-' }}</div>
            <div class="stat-lbl">延迟条数</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-val" style="color:#F56C6C">{{ stats?.missingPersonCount ?? '-' }}</div>
            <div class="stat-lbl">缺失人次</div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <!-- ====== Tab 2: 日报查询 ====== -->
    <template v-if="activeTab === 'query'">
      <div class="toolbar">
        <div class="toolbar-row">
          <el-input v-model="keyword" placeholder="搜索项目/人员/工作内容" clearable :prefix-icon="Search" style="width:240px" @clear="handleSearch" @keyup.enter="handleSearch" />
          <el-select v-model="statusFilter" placeholder="状态" style="width:110px" @change="handleSearch">
            <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <el-select v-model="reportTypeFilter" placeholder="日志类型" style="width:130px" @change="handleSearch">
            <el-option v-for="o in reportTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <el-select v-model="workTypeFilter" placeholder="工作类型" style="width:130px" @change="handleSearch">
            <el-option v-for="o in workTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <el-date-picker v-model="startDate" type="date" placeholder="开始日期" style="width:140px" @change="handleSearch" value-format="YYYY-MM-DD" />
          <el-date-picker v-model="endDate" type="date" placeholder="结束日期" style="width:140px" @change="handleSearch" value-format="YYYY-MM-DD" />
        </div>
        <div class="toolbar-row">
          <el-button :icon="Refresh" @click="handleSearch">刷新</el-button>
          <el-button type="success" :icon="Download" @click="handleExport">导出CSV</el-button>
          <el-date-picker v-model="attendanceMonth" type="month" placeholder="选择月份" style="width:140px" format="YYYY-MM" value-format="YYYY-MM" />
          <el-button type="primary" :icon="Download" @click="handleExportAttendance">导出考勤</el-button>
        </div>
      </div>
      <el-table :data="reportList" v-loading="loading" stripe border highlight-current-row @row-click="showDetail" style="cursor:pointer">
        <el-table-column prop="reportDate" label="日报时间" width="110" fixed="left" />
        <el-table-column label="日志类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getReportTypeTag(row.reportType as string).type as 'success' | 'warning' | 'info' | '' || 'info'" size="small">
              {{ getReportTypeTag(row.reportType as string).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submitter" label="填写人" width="100" show-overflow-tooltip />
        <el-table-column prop="entryDate" label="入场时间" width="110" />
        <el-table-column prop="project" label="项目名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="todayWorkType" label="工作类型" width="100" />
        <el-table-column prop="workers" label="作业人员" width="130" show-overflow-tooltip />
        <el-table-column prop="workContent" label="工作内容" min-width="140" show-overflow-tooltip />
        <el-table-column prop="todayWork" label="今日工作" min-width="160" show-overflow-tooltip />
        <el-table-column prop="tomorrowPlan" label="明日计划" min-width="140" show-overflow-tooltip />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'submitted'" type="info" size="small">已提交</el-tag>
            <el-tag v-else-if="row.status === 'pending'" type="warning" size="small">待审核</el-tag>
            <el-tag v-else-if="row.status === 'approved'" type="success" size="small">已通过</el-tag>
            <el-tag v-else-if="row.status === 'rejected'" type="danger" size="small">已驳回</el-tag>
            <el-tag v-else size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" size="small" type="success" @click.stop="handleReview(row, 'approve')">通过</el-button>
            <el-button v-if="row.status === 'pending'" size="small" type="danger" @click.stop="handleReview(row, 'reject')">驳回</el-button>
            <el-button v-if="(row.reportType as string) === 'biz_trip_supplement'" size="small" type="primary" @click.stop="openSupplementReview(row)">审核</el-button>
            <el-button size="small" type="warning" link @click.stop="openEdit(row)">编辑</el-button>
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
            <el-button size="small" type="primary" link @click="searchPersonReports(row.name as string)">查看日报</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <span class="total-text">共 {{ workerTotal }} 人</span>
      </div>
    </template>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="日报详情" width="750px" destroy-on-close>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="日期">{{ detailData.reportDate || detailData.date || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag v-if="detailData.status === 'submitted'" type="info" size="small">已提交</el-tag>
          <el-tag v-else-if="detailData.status === 'pending'" type="warning" size="small">待审核</el-tag>
          <el-tag v-else-if="detailData.status === 'approved'" type="success" size="small">已通过</el-tag>
          <el-tag v-else-if="detailData.status === 'rejected'" type="danger" size="small">已驳回</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="日志类型">
          <el-tag :type="getReportTypeTag(detailData.reportType as string).type as 'success' | 'warning' | 'info' || 'info'" size="small">
            {{ getReportTypeTag(detailData.reportType as string).text }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="及时性">{{ detailData.timeliness === 'delayed' ? '延迟' : detailData.timeliness === 'on_time' ? '正常' : '-' }}</el-descriptions-item>
        <el-descriptions-item label="项目">{{ detailData.project || '-' }}</el-descriptions-item>
        <el-descriptions-item label="区域">{{ detailData.area || '-' }}</el-descriptions-item>
        <el-descriptions-item label="作业人员">{{ detailData.workers || '-' }}</el-descriptions-item>
        <el-descriptions-item label="机型">{{ detailData.machineModel || '-' }}</el-descriptions-item>
        <el-descriptions-item label="工作类型">{{ detailData.todayWorkType || '-' }}</el-descriptions-item>
        <el-descriptions-item label="人数">{{ detailData.workerCount || '-' }}</el-descriptions-item>
        <el-descriptions-item label="入场日期">{{ detailData.entryDate || '-' }}</el-descriptions-item>
        <el-descriptions-item label="初始出差日期">{{ detailData.initialBizTripDate || '-' }}</el-descriptions-item>
        <el-descriptions-item label="需求数量">{{ detailData.requiredQty ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="完成数量">{{ detailData.completedQty ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="个人出差天数">{{ detailData.personalBizTripDays ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="项目出差天数">{{ detailData.bizTripDays ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="补录日期">{{ detailData.supplementDate || '-' }}</el-descriptions-item>
        <el-descriptions-item label="补录原因">{{ detailData.supplementReason || '-' }}</el-descriptions-item>
        <el-descriptions-item label="今日工作" :span="2">{{ detailData.todayWork || '-' }}</el-descriptions-item>
        <el-descriptions-item label="明日计划" :span="2">{{ detailData.tomorrowPlan || '-' }}</el-descriptions-item>
        <el-descriptions-item label="工作内容" :span="2">{{ detailData.workContent || '-' }}</el-descriptions-item>
        <el-descriptions-item label="相关方" :span="2">{{ detailData.relatedParty || '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailData.remark || '-' }}</el-descriptions-item>
        <el-descriptions-item label="问题反馈" :span="2">{{ detailData.issues || '-' }}</el-descriptions-item>
        <el-descriptions-item label="协调事项" :span="2">{{ detailData.content || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detailData.createTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ detailData.updateTime || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 补公出审核弹窗 -->
    <el-dialog v-model="reviewVisible" title="补公出日志审核" width="550px" destroy-on-close>
      <template v-if="reviewItem">
        <el-descriptions :column="1" border size="small" class="review-detail">
          <el-descriptions-item label="提交人">{{ reviewItem.submitter }}</el-descriptions-item>
          <el-descriptions-item label="补录日期">{{ reviewItem.supplementDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="项目">{{ reviewItem.project }}</el-descriptions-item>
          <el-descriptions-item label="补录原因">{{ reviewItem.supplementReason || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <div class="review-section">
          <p class="section-title">审核判定</p>
          <el-radio-group v-model="reviewDecision">
            <el-radio value="special">特殊情况 — 日志标记为正常</el-radio>
            <el-radio value="forget">非特殊/忘记 — 日志标记为延迟</el-radio>
          </el-radio-group>
        </div>

        <div class="review-section">
          <p class="section-title">审核意见</p>
          <el-input
            v-model="reviewComment"
            type="textarea"
            :rows="3"
            placeholder="请输入审核意见（可选）"
          />
        </div>
      </template>

      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSupplementReview" :disabled="!reviewItem">确认</el-button>
      </template>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" title="编辑公出日志" width="750px" destroy-on-close>
      <template v-if="editVisible">
        <el-descriptions :column="3" border size="small" class="edit-readonly">
          <el-descriptions-item label="填写人">{{ editData.submitter }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag v-if="editData.status === 'approved'" type="success" size="small">已通过</el-tag>
            <el-tag v-else-if="editData.status === 'submitted'" type="info" size="small">已提交</el-tag>
            <el-tag v-else-if="editData.status === 'pending'" type="warning" size="small">待审核</el-tag>
            <el-tag v-else-if="editData.status === 'rejected'" type="danger" size="small">已驳回</el-tag>
            <el-tag v-else size="small">{{ editData.status }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <el-form :model="editData" label-width="110px" label-position="right" size="default">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="日报日期">
                <el-date-picker v-model="editData.reportDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="日志类型">
                <el-select v-model="editData.reportType" style="width:100%">
                  <el-option v-for="o in reportTypeOptions.filter(o => o.value)" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="项目名称">
                <el-input v-model="editData.project" placeholder="项目名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="项目区域">
                <el-input v-model="editData.area" placeholder="项目区域" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="工作类型">
                <el-select v-model="editData.todayWorkType" style="width:100%">
                  <el-option v-for="o in workTypeOptions.filter(o => o.value)" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="机型">
                <el-input v-model="editData.machineModel" placeholder="机型" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="入场日期">
                <el-date-picker v-model="editData.entryDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="初始出差日期">
                <el-date-picker v-model="editData.initialBizTripDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="需求数量">
                <el-input-number v-model="editData.requiredQty" :min="0" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="完成数量">
                <el-input-number v-model="editData.completedQty" :min="0" style="width:100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="个人出差天数">
                <el-input-number v-model="editData.personalBizTripDays" :min="0" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="项目出差天数">
                <el-input-number v-model="editData.bizTripDays" :min="0" style="width:100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16" v-if="editData.reportType === 'biz_trip_supplement'">
            <el-col :span="12">
              <el-form-item label="补录日期">
                <el-date-picker v-model="editData.supplementDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="补录原因">
                <el-input v-model="editData.supplementReason" placeholder="补录原因" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="作业人员">
            <el-input v-model="editData.workers" placeholder="多个人员用、分隔" />
          </el-form-item>
          <el-form-item label="相关方单位">
            <el-input v-model="editData.relatedParty" placeholder="相关方单位" />
          </el-form-item>
          <el-form-item label="工作内容">
            <el-input v-model="editData.workContent" type="textarea" :rows="3" placeholder="从事工作内容" />
          </el-form-item>
          <el-form-item label="今日工作小结">
            <el-input v-model="editData.todayWork" type="textarea" :rows="3" placeholder="当日工作小结" />
          </el-form-item>
          <el-form-item label="明日计划">
            <el-input v-model="editData.tomorrowPlan" type="textarea" :rows="2" placeholder="明日工作计划" />
          </el-form-item>
          <el-form-item label="问题反馈">
            <el-input v-model="editData.issues" type="textarea" :rows="2" placeholder="存在问题" />
          </el-form-item>
          <el-form-item label="协调事项">
            <el-input v-model="editData.content" type="textarea" :rows="2" placeholder="需要协调的事项" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="editData.remark" type="textarea" :rows="2" placeholder="备注信息" />
          </el-form-item>
        </el-form>
      </template>

      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSaving" @click="handleEditSubmit">保存修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.report-page { padding: 20px; }
.stats-row { margin-bottom: 16px; .stat-card { text-align: center; .stat-val { font-size: 28px; font-weight: 700; } .stat-lbl { font-size: 13px; color: #999; margin-top: 4px; } } }
.toolbar { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.toolbar-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.toolbar-left { display: flex; gap: 12px; align-items: center; }
.pagination-wrap { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; .total-text { font-size: 14px; color: #999; } }
.review-detail { margin-bottom: 8px; }
.review-section { margin-bottom: 16px; .section-title { font-weight: 600; margin-bottom: 8px; color: #303133; } }
.edit-readonly { margin-bottom: 8px; }
</style>
