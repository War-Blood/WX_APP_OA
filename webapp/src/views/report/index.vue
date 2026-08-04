<script setup lang="ts">
import { toast } from '@/utils/toast'
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Search, Refresh, Download, Delete } from '@element-plus/icons-vue'
import { getStats } from '@/api/report'
import { getReportList, getReportDetail, getWorkerStats, deleteReport, restoreReport, reviewAction, batchReviewAction, reviewSupplement, updateReport, exportToWecomSheet } from '@/api/report'
import type { ReportUpdateResult } from '@/api/report'
import type { AllStatsResponse } from '@/api/report'
import { currentMonthInBeijing } from '@/utils/date'
import ReportStatsPanel from '@/components/ReportStatsPanel.vue'
import ReportWorkersPanel from '@/components/ReportWorkersPanel.vue'
import ReportTrashPanel from '@/components/ReportTrashPanel.vue'
import ReportDetailDialog from '@/components/ReportDetailDialog.vue'

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

// --- 状态 ---
const activeTab = ref('query')
const loading = ref(false)
const statsLoading = ref(true)

// 统计看板 — v2.0 对接 getStats('all')
const stats = ref<AllStatsResponse | null>(null)

// 日报查询 — 新增筛选
const route = useRoute()
const keyword = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')
const statusFilter = ref('')
const reportTypeFilter = ref('')
const workTypeFilter = ref('')
const startDate = ref('')
const endDate = ref('')
const attendanceMonth = ref(currentMonthInBeijing())
const wecomExporting = ref(false)
const reportList = ref<Record<string, unknown>[]>([])
const reportTotal = ref(0)
const reportPage = ref(1)
const reportPageSize = ref(50)
const selectedRows = ref<Record<string, unknown>[]>([])

// 人员看板
const workerKeyword = ref('')
const workerList = ref<Record<string, unknown>[]>([])
const workerTotal = ref(0)

// 详情弹窗
const detailVisible = ref(false)
const detailLoading = ref(false)
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
  { label: '人员看板', name: 'workers' },
  { label: '回收站', name: 'trash' }
]

// 回收站
// 日志类型 tag 映射
function getReportTypeTag(reportType: string): { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' } {
  const map: Record<string, { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
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
    toast.warning('统计加载失败')
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
function handleReportSizeChange(size: number) {
  reportPageSize.value = size
  reportPage.value = 1
  loadReports()
}

function validateDateRange() {
  if (startDate.value && endDate.value && startDate.value > endDate.value) {
    toast.warning('开始日期不能晚于结束日期')
    return false
  }
  return true
}

function handleSearchWithValidation() {
  if (!validateDateRange()) return
  handleSearch()
}

function handleSelectionChange(rows: Record<string, unknown>[]) {
  selectedRows.value = rows
}

function isSelectableRow(row: Record<string, unknown>) {
  return row.status === 'pending'
}

async function handleBatchReview(action: 'approve' | 'reject') {
  const pendingRows = selectedRows.value.filter(row => row.status === 'pending')
  const skipped = selectedRows.value.length - pendingRows.length
  const ids = pendingRows.map(row => row.id as string).filter(Boolean)
  if (!ids.length) {
    toast.warning(skipped > 0 ? '所选日报均非待审核状态' : '请先选择待审核日报')
    return
  }
  if (skipped > 0) {
    toast.warning(`已跳过 ${skipped} 条非待审核日报`)
  }

  let opinion: string | undefined
  if (action === 'reject') {
    try {
      const { value } = await ElMessageBox.prompt('请输入驳回原因', '批量驳回', {
        inputType: 'textarea',
        inputPlaceholder: '请填写驳回原因',
        inputValidator: (val: string) => !!val.trim(),
        inputErrorMessage: '驳回原因不能为空',
        confirmButtonText: '确定驳回',
        cancelButtonText: '取消'
      })
      opinion = value
    } catch {
      return
    }
  } else {
    try {
      await ElMessageBox.confirm(`确认批量通过 ${ids.length} 条日报？`, '批量通过', {
        type: 'warning'
      })
    } catch {
      return
    }
  }

  try {
    const result = await batchReviewAction(ids, action, opinion)
    toast.success(`已处理 ${result.processed} 条日报`)
    selectedRows.value = []
    loadReports()
  } catch {
    selectedRows.value = []
    loadReports()
  }
}

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
    const res = await fetch(`${apiBase}/report/export`, {
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
    toast.success('导出成功')
  } catch {
    toast.error('导出失败')
  }
}

async function handleExportAttendance() {
  if (!attendanceMonth.value) { toast.warning('请选择月份'); return }
  try {
    const token = localStorage.getItem('token') || ''
    const res = await fetch(`${apiBase}/report/export-attendance`, {
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
    toast.success('考勤导出成功')
  } catch {
    toast.error('导出失败')
  }
}

async function handleExportWecom() {
  if (!startDate.value || !endDate.value) {
    toast.warning('请选择开始和结束日期')
    return
  }
  wecomExporting.value = true
  try {
    const res = await exportToWecomSheet({ startDate: startDate.value, endDate: endDate.value })
    toast.success(`成功导出 ${res.totalRecords} 条记录到企业微信智能表格`)
  } catch (err: any) {
    toast.error(err?.message || '导出到企业微信表格失败')
  } finally {
    wecomExporting.value = false
  }
}

async function handleExportStatusBoard() {
  try {
    // Step 1: pick month
    const { value: month } = await ElMessageBox.prompt('选择要导出的月份', '导出加班表', {
      confirmButtonText: '下一步',
      cancelButtonText: '取消',
      inputType: 'month',
      inputPlaceholder: '选择月份',
      inputValue: currentMonthInBeijing(),
    })
    if (!month) return

    // Step 2: fetch schedule from 出勤日历
    const token = localStorage.getItem('token') || ''
    const previewRes = await fetch(`${apiBase}/attendance/schedule/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ month })
    })
    if (!previewRes.ok) throw new Error('获取排班失败')
    const { data } = await previewRes.json()
    if (!data || !data.days) throw new Error('无效的排班数据')

    // Step 3: extract rest days from schedule
    const allRestDays: string[] = []
    data.days.forEach((d: any) => {
      if (d.status === 'rest') allRestDays.push(d.date)
    })

    // Step 4: show summary & confirm
    const weekendCount = data.days.filter((d: any) => d.dayOfWeek === 0 || d.dayOfWeek === 6).length
    const holidayCount = allRestDays.length - weekendCount
    const msg = `${month}\n\n工作日 ${data.workDays} 天 · 休息日 ${data.restDays} 天`
      + (holidayCount > 0 ? `\n其中节假日 ${holidayCount} 天（非周末休息日）` : '')
      + '\n\n休息日有公出日志即算加班，确认导出？'

    await ElMessageBox.confirm(msg, '加班表 — 出勤日历排班', {
      confirmButtonText: '确认导出',
      cancelButtonText: '取消',
      type: 'info',
    })

    // Step 5: export (后端自动查询 company_schedules 计算加班)
    const res = await fetch(`${apiBase}/report/export-status-board`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ month, restDays: allRestDays })
    })
    if (!res.ok) throw new Error('导出失败')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = month + '技术工程中心公出加班统计表.xlsx'
    a.click(); URL.revokeObjectURL(url)
    toast.success('导出成功')
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') toast.error('导出失败')
  }
}

async function handleDelete(row: Record<string, unknown>) {
  try {
    await ElMessageBox.confirm('确定删除该条记录？删除后可在回收站恢复。', '删除确认', { type: 'warning' })
    await deleteReport(row.id as string)
    // 显示可撤销的提示（10秒内可点撤销恢复）
    ElMessage({
      message: '已删除，10 秒内可撤销',
      type: 'success',
      duration: 10000,
      showClose: true,
      customClass: 'undo-toast',
      onClick: () => {
        restoreReport(row.id as string).then(() => {
          toast.success('已恢复')
          loadReports()
        }).catch(() => toast.error('恢复失败'))
      }
    } as any)
    loadReports()
  } catch { /* cancelled */ }
}

async function handleReview(row: Record<string, unknown>, action: 'approve' | 'reject') {
  if (action === 'approve') {
    try {
      await ElMessageBox.confirm('确定通过该条日报？', '审核确认', { type: 'warning' })
    } catch { return }
    try {
      await reviewAction(row.id as string, action)
      toast.success('已通过')
    } catch { toast.error('操作失败'); return }
    loadReports()
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
      if (!opinion) return
      await reviewAction(row.id as string, action, opinion)
      toast.success('已驳回')
      loadReports()
    } catch { /* cancelled or API error */ }
  }
}

async function showDetail(row: Record<string, unknown>) {
  detailLoading.value = true
  try {
    detailData.value = await getReportDetail(String(row.id))
  } catch {
    detailData.value = row  // fallback to table row
  } finally {
    detailLoading.value = false
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
    toast.success('审核完成')
  } catch {
    // 错误已由拦截器处理
  } finally {
    reviewVisible.value = false
    loadReports()
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
  if (!editData.value.reportDate) {
    toast.warning('请选择日报日期')
    return
  }
  const requiredQty = Number(editData.value.requiredQty)
  const completedQty = Number(editData.value.completedQty)
  if (requiredQty > 0 && completedQty > requiredQty) {
    toast.warning('完成数量不能大于需求数量')
    return
  }
  if (['approved', 'rejected', 'submitted'].includes(String(editData.value.status))) {
    try {
      await ElMessageBox.confirm('该日志已进入审核流程，确认继续修改？', '修改确认', {
        confirmButtonText: '确认修改',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return
    }
  }

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
      toast.success(`已修改 ${res.changes.length} 个字段`)
    } else {
      toast.info('未检测到变更')
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
      <ReportStatsPanel :stats="stats" :loading="statsLoading" />
    </template>

    <!-- ====== Tab 2: 日报查询 ====== -->
    <template v-if="activeTab === 'query'">
      <div class="toolbar">
        <div class="toolbar-row">
          <el-input v-model="keyword" placeholder="搜索项目/人员/工作内容" clearable :prefix-icon="Search" style="width:240px" @clear="handleSearchWithValidation" @keyup.enter="handleSearchWithValidation" />
          <el-select v-model="statusFilter" placeholder="状态" style="width:110px" @change="handleSearch">
            <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <el-select v-model="reportTypeFilter" placeholder="日志类型" style="width:130px" @change="handleSearch">
            <el-option v-for="o in reportTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <el-select v-model="workTypeFilter" placeholder="工作类型" style="width:130px" @change="handleSearch">
            <el-option v-for="o in workTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <el-date-picker v-model="startDate" type="date" placeholder="开始日期" style="width:140px" @change="handleSearchWithValidation" value-format="YYYY-MM-DD" />
          <el-date-picker v-model="endDate" type="date" placeholder="结束日期" style="width:140px" @change="handleSearchWithValidation" value-format="YYYY-MM-DD" />
        </div>
        <div class="toolbar-row">
          <el-button :icon="Refresh" @click="handleSearchWithValidation">刷新</el-button>
          <el-button type="success" :disabled="!selectedRows.length" @click="handleBatchReview('approve')">
            批量通过
          </el-button>
          <el-button type="danger" :disabled="!selectedRows.length" @click="handleBatchReview('reject')">
            批量驳回
          </el-button>
          <el-button type="success" :icon="Download" @click="handleExport">导出CSV</el-button>
          <el-date-picker v-model="attendanceMonth" type="month" placeholder="选择月份" style="width:140px" format="YYYY-MM" value-format="YYYY-MM" />
          <el-button type="primary" :icon="Download" @click="handleExportAttendance">导出考勤</el-button>
          <el-button type="danger" :icon="Download" @click="handleExportStatusBoard">导出加班表</el-button>
          <el-button type="warning" :icon="Download" :loading="wecomExporting" @click="handleExportWecom">导出到企微表格</el-button>
        </div>
      </div>
      <el-table
        :data="reportList"
        v-loading="loading"
        stripe
        border
        highlight-current-row
        @row-click="showDetail"
        @selection-change="handleSelectionChange"
        style="cursor:pointer"
      >
        <el-table-column type="selection" width="48" :selectable="isSelectableRow" />
        <el-table-column prop="reportDate" label="日报时间" width="110" fixed="left" />
        <el-table-column label="日志类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getReportTypeTag(row.reportType as string).type || 'info'" size="small">
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
        <el-pagination
          v-model:current-page="reportPage"
          v-model:page-size="reportPageSize"
          :page-sizes="[20, 50, 100]"
          :total="reportTotal"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="handleReportPageChange"
          @size-change="handleReportSizeChange"
        />
      </div>
    </template>

    <!-- ====== Tab 3: 人员看板 ====== -->
    <template v-if="activeTab === 'workers'">
      <ReportWorkersPanel
        v-model:worker-keyword="workerKeyword"
        :worker-list="workerList"
        :worker-total="workerTotal"
        :loading="loading"
        @search="handleWorkerSearch"
        @refresh="handleWorkerSearch"
        @view-reports="searchPersonReports"
      />
    </template>

    <!-- ====== Tab 4: 回收站 ====== -->
    <template v-if="activeTab === 'trash'">
      <ReportTrashPanel @restored="loadReports" />
    </template>

    <!-- 详情弹窗 -->
    <ReportDetailDialog
      :visible="detailVisible"
      :data="detailData"
      :loading="detailLoading"
      @update:visible="detailVisible = $event"
    />

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
.toolbar { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.toolbar-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.toolbar-left { display: flex; gap: 12px; align-items: center; }
.pagination-wrap { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; .total-text { font-size: 14px; color: #999; } }
.review-detail { margin-bottom: 8px; }
.review-section { margin-bottom: 16px; .section-title { font-weight: 600; margin-bottom: 8px; color: #303133; } }
.edit-readonly { margin-bottom: 8px; }
</style>
