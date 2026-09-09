<script setup lang="ts">
import { toast } from '@/utils/toast'
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Search, RefreshLeft, Download, Delete, ArrowDown } from '@element-plus/icons-vue'
import { getStats } from '@/api/report'
import { getReportList, getReportDetail, getWorkerStats, deleteReport, restoreReport, updateReport, exportToWecomSheet } from '@/api/report'
import type { ReportUpdateResult } from '@/api/report'
import type { AllStatsResponse } from '@/api/report'
import { currentMonthInBeijing } from '@/utils/date'
import { useAppStore } from '@/stores/app'
import { useTableColumnResize } from '@/composables/useTableColumnResize'
import ReportStatsPanel from '@/components/ReportStatsPanel.vue'
import ReportWorkersPanel from '@/components/ReportWorkersPanel.vue'
import ReportTrashPanel from '@/components/ReportTrashPanel.vue'
import ReportDetailDialog from '@/components/ReportDetailDialog.vue'

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

// --- 状态 ---
const activeTab = ref('query')
const loading = ref(false)
const statsLoading = ref(true)

// 列宽持久化（日报查询表）
const { bindRef, onHeaderDragEnd } = useTableColumnResize('query')

// 统计看板 — v2.0 对接 getStats('all')
const stats = ref<AllStatsResponse | null>(null)

// 日报查询 — 筛选条件
const route = useRoute()
const keyword = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')
const statusFilter = ref('')
const reportTypeFilter = ref('')
const workTypeFilter = ref('')
const startDate = ref('')
const endDate = ref('')
const wecomExporting = ref(false)
const reportList = ref<Record<string, unknown>[]>([])
const reportTotal = ref(0)
const reportPage = ref(1)
const reportPageSize = ref(50)

// 日期区间（单个控件，内部同步 startDate/endDate）
const dateRange = computed<[string, string] | null>({
  get: (): [string, string] | null =>
    startDate.value && endDate.value ? [startDate.value, endDate.value] : null,
  set: (val: [string, string] | null) => {
    startDate.value = val?.[0] || ''
    endDate.value = val?.[1] || ''
  }
})

// 已应用的筛选条件数量（用于结果区提示）
const activeFilterCount = computed(() =>
  [keyword.value, statusFilter.value, reportTypeFilter.value, workTypeFilter.value, startDate.value || endDate.value]
    .filter(Boolean).length
)

// 窄屏分页：只保留翻页，并减少页码按钮，避免溢出面板
const appStore = useAppStore()
const paginationLayout = computed(() =>
  appStore.isMobile ? 'prev, pager, next' : 'sizes, prev, pager, next, jumper'
)
const paginationPagerCount = computed(() => (appStore.isMobile ? 5 : 7))

// 人员看板
const workerKeyword = ref('')
const workerList = ref<Record<string, unknown>[]>([])
const workerTotal = ref(0)

// 详情弹窗
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<Record<string, any>>({})

// 编辑弹窗
const editVisible = ref(false)
const editData = ref<Record<string, unknown>>({})
const editSaving = ref(false)

const statusOptions = [
  { label: '全部', value: '' },
  { label: '草稿', value: 'draft' },
  { label: '已提交', value: 'submitted' },
  { label: '待审核', value: 'pending_review' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' }
]

const reportTypeOptions = [
  { label: '全部', value: '' },
  { label: '公出日志', value: 'biz_trip' },
  { label: '补公出日志', value: 'biz_trip_supplement' },
  { label: '工作日报', value: 'office' },
  { label: '请假单', value: 'leave' }
]

const workTypeOptions = [
  { label: '全部', value: '' },
  { label: '工作（陆）', value: '工作（陆）' },
  { label: '工作（海）', value: '工作（海）' },
  { label: '待工', value: '待工' },
  { label: '在途', value: '在途' },
  { label: '请假', value: '请假' }
]

// 表头筛选选项（与工具栏下拉共用同一筛选状态）
const statusHeaderFilters = statusOptions.filter(o => o.value).map(o => ({ text: o.label, value: o.value }))
const reportTypeHeaderFilters = reportTypeOptions.filter(o => o.value).map(o => ({ text: o.label, value: o.value }))
const workTypeHeaderFilters = workTypeOptions.filter(o => o.value).map(o => ({ text: o.label, value: o.value }))

// 排序（服务端排序：点击表头触发，全量生效而非仅当前页）
const sortBy = ref('')
const sortOrder = ref('')

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
    biz_trip_supplement: { text: '补公出', type: 'warning' },
    office: { text: '工作日报', type: 'info' },
    leave: { text: '请假单', type: 'danger' }
  }
  return map[reportType] || { text: reportType, type: '' }
}

// 状态 tag 映射（pending_review 为 v2.0 补公出待审核，pending 为旧版遗留值）
function getStatusTag(status: string): { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' } {
  const map: Record<string, { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
    draft: { text: '草稿', type: 'info' },
    submitted: { text: '已提交', type: 'info' },
    pending: { text: '待审核', type: 'warning' },
    pending_review: { text: '待审核', type: 'warning' },
    approved: { text: '已通过', type: 'success' },
    rejected: { text: '已驳回', type: 'danger' }
  }
  return map[status] || { text: status, type: '' }
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
    const params: Parameters<typeof getReportList>[0] = {
      page: reportPage.value,
      pageSize: reportPageSize.value
    }
    if (keyword.value) params.keyword = keyword.value
    if (statusFilter.value) params.status = statusFilter.value
    if (reportTypeFilter.value) params.reportType = reportTypeFilter.value
    if (workTypeFilter.value) params.workType = workTypeFilter.value
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    if (sortBy.value) { params.sortBy = sortBy.value; params.sortOrder = sortOrder.value }
    const res = await getReportList(params)
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

// 重置筛选：清空条件 + 排序，回到第一页
function handleResetFilters() {
  keyword.value = ''
  statusFilter.value = ''
  reportTypeFilter.value = ''
  workTypeFilter.value = ''
  startDate.value = ''
  endDate.value = ''
  sortBy.value = ''
  sortOrder.value = ''
  reportPage.value = 1
  loadReports()
}

// 表头点击排序（Element Plus order: ascending / descending / null）
function handleSortChange({ prop, order }: { prop: string | null; order: string | null }) {
  if (!prop || !order) {
    sortBy.value = ''
    sortOrder.value = ''
  } else {
    sortBy.value = prop
    sortOrder.value = order === 'ascending' ? 'asc' : 'desc'
  }
  reportPage.value = 1
  loadReports()
}

// 表头筛选（与工具栏下拉双向同步）
function handleFilterChange(filters: Record<string, string[]>) {
  if ('status' in filters) statusFilter.value = filters.status?.[0] || ''
  if ('reportType' in filters) reportTypeFilter.value = filters.reportType?.[0] || ''
  if ('todayWorkType' in filters) workTypeFilter.value = filters.todayWorkType?.[0] || ''
  reportPage.value = 1
  loadReports()
}

// 导出菜单分发（4 类导出收进一个下拉，避免按钮堆叠）
function handleExportCommand(command: string) {
  if (command === 'csv') handleExport()
  else if (command === 'attendance') handleExportAttendance()
  else if (command === 'statusBoard') handleExportStatusBoard()
  else if (command === 'wecom') handleExportWecom()
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
  // 月份改为导出时询问，工具栏不再常驻月份选择器
  let month = ''
  try {
    const { value } = await ElMessageBox.prompt('选择要导出的月份', '导出月度考勤', {
      confirmButtonText: '导出',
      cancelButtonText: '取消',
      inputType: 'month',
      inputPlaceholder: '选择月份',
      inputValue: currentMonthInBeijing(),
    })
    month = value || ''
  } catch {
    return
  }
  if (!month) { toast.warning('请选择月份'); return }
  try {
    const token = localStorage.getItem('token') || ''
    const res = await fetch(`${apiBase}/report/export-attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ month })
    })
    if (!res.ok) throw new Error('导出失败')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'attendance-' + month + '.csv'
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
      + '\n\n休息日公出日志（除请假外）计入加班天数，工作/在途另计补贴天数，确认导出？'

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
    a.href = url; a.download = month + '浙江贝良公出加班统计表.xlsx'
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
    <!-- 页签导航 -->
    <div class="tabs-bar">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane v-for="t in tabItems" :key="t.name" :label="t.label" :name="t.name" />
      </el-tabs>
    </div>

    <!-- ====== Tab 1: 统计看板 ====== -->
    <ReportStatsPanel v-if="activeTab === 'stats'" :stats="stats" :loading="statsLoading" />

    <!-- ====== Tab 2: 日报查询 ====== -->
    <el-card v-if="activeTab === 'query'" class="panel" shadow="never">
      <!-- 筛选条件 + 导出操作 -->
      <div class="filter-bar">
        <div class="filter-fields">
          <el-input
            v-model="keyword"
            class="f-search"
            placeholder="搜索项目/人员/工作内容"
            clearable
            :prefix-icon="Search"
            @clear="handleSearchWithValidation"
            @keyup.enter="handleSearchWithValidation"
          />
          <el-select v-model="statusFilter" class="f-select" placeholder="状态" @change="handleSearch">
            <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <el-select v-model="reportTypeFilter" class="f-select" placeholder="日志类型" @change="handleSearch">
            <el-option v-for="o in reportTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <el-select v-model="workTypeFilter" class="f-select" placeholder="工作类型" @change="handleSearch">
            <el-option v-for="o in workTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <el-date-picker
            v-model="dateRange"
            class="f-date"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleSearchWithValidation"
          />
        </div>

        <div class="filter-actions">
          <el-button type="primary" :icon="Search" @click="handleSearchWithValidation">查询</el-button>
          <el-button :icon="RefreshLeft" @click="handleResetFilters">重置</el-button>
          <el-dropdown trigger="click" class="export-dropdown" @command="handleExportCommand">
            <el-button :icon="Download" :loading="wecomExporting">
              导出<el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="csv">导出 CSV</el-dropdown-item>
                <el-dropdown-item command="attendance">导出月度考勤</el-dropdown-item>
                <el-dropdown-item command="statusBoard">导出加班表</el-dropdown-item>
                <el-dropdown-item command="wecom">导出到企微表格</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <el-table
        :data="reportList"
        v-loading="loading"
        class="report-table"
        stripe
        border
        highlight-current-row
        :ref="bindRef"
        allow-drag-last-column
        @header-dragend="onHeaderDragEnd"
        @sort-change="handleSortChange"
        @filter-change="handleFilterChange"
        @row-click="showDetail"
      >
        <el-table-column prop="reportDate" label="日报时间" width="104" fixed="left" sortable="custom" :sort-orders="['descending', 'ascending', null]" />
        <el-table-column
          prop="reportType"
          column-key="reportType"
          label="日志类型"
          width="96"
          align="center"
          sortable="custom"
          :filters="reportTypeHeaderFilters"
          :filtered-value="reportTypeFilter ? [reportTypeFilter] : []"
        >
          <template #default="{ row }">
            <el-tag :type="getReportTypeTag(row.reportType as string).type || 'info'" size="small">
              {{ getReportTypeTag(row.reportType as string).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submitter" label="填写人" width="92" sortable="custom" show-overflow-tooltip />
        <el-table-column prop="entryDate" label="入场时间" width="104" sortable="custom" :sort-orders="['descending', 'ascending', null]" />
        <el-table-column prop="project" label="项目名称" min-width="200" sortable="custom" show-overflow-tooltip />
        <el-table-column
          prop="todayWorkType"
          column-key="todayWorkType"
          label="工作类型"
          width="96"
          sortable="custom"
          :filters="workTypeHeaderFilters"
          :filtered-value="workTypeFilter ? [workTypeFilter] : []"
        />
        <el-table-column prop="workers" label="作业人员" width="120" sortable="custom" show-overflow-tooltip />
        <el-table-column prop="workContent" label="工作内容" min-width="130" sortable="custom" show-overflow-tooltip />
        <el-table-column prop="todayWork" label="今日工作" min-width="150" sortable="custom" show-overflow-tooltip />
        <el-table-column prop="tomorrowPlan" label="明日计划" min-width="130" sortable="custom" show-overflow-tooltip />
        <el-table-column
          prop="status"
          column-key="status"
          label="状态"
          width="76"
          align="center"
          sortable="custom"
          :filters="statusHeaderFilters"
          :filtered-value="statusFilter ? [statusFilter] : []"
        >
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status as string).type || 'info'" size="small">
              {{ getStatusTag(row.status as string).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="warning" link @click.stop="openEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" link :icon="Delete" @click.stop="handleDelete(row)" />
          </template>
        </el-table-column>

        <template #empty>
          <el-empty
            :description="activeFilterCount > 0 ? '没有符合条件的日报，试试调整筛选条件' : '暂无日报数据'"
            :image-size="70"
          >
            <el-button v-if="activeFilterCount > 0" size="small" @click="handleResetFilters">清除筛选</el-button>
          </el-empty>
        </template>
      </el-table>

      <div class="table-footer">
        <div class="footer-left">
          <span class="total-text">共 <b>{{ reportTotal }}</b> 条</span>
          <template v-if="activeFilterCount > 0">
            <el-divider direction="vertical" />
            <span class="filter-hint">已筛选 {{ activeFilterCount }} 项</span>
            <el-button link type="primary" size="small" @click="handleResetFilters">清除筛选</el-button>
          </template>
        </div>
        <el-pagination
          v-model:current-page="reportPage"
          v-model:page-size="reportPageSize"
          :page-sizes="[20, 50, 100]"
          :total="reportTotal"
          :layout="paginationLayout"
          :pager-count="paginationPagerCount"
          :small="appStore.isMobile"
          background
          @current-change="handleReportPageChange"
          @size-change="handleReportSizeChange"
        />
      </div>
    </el-card>

    <!-- ====== Tab 3: 人员看板 ====== -->
    <el-card v-if="activeTab === 'workers'" class="panel" shadow="never">
      <ReportWorkersPanel
        v-model:worker-keyword="workerKeyword"
        :worker-list="workerList"
        :worker-total="workerTotal"
        :loading="loading"
        @search="handleWorkerSearch"
        @refresh="handleWorkerSearch"
        @view-reports="searchPersonReports"
      />
    </el-card>

    <!-- ====== Tab 4: 回收站 ====== -->
    <el-card v-if="activeTab === 'trash'" class="panel" shadow="never">
      <ReportTrashPanel @restored="loadReports" />
    </el-card>

    <!-- 详情弹窗 -->
    <ReportDetailDialog
      :visible="detailVisible"
      :data="detailData"
      :loading="detailLoading"
      @update:visible="detailVisible = $event"
    />

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" title="编辑公出日志" width="750px" destroy-on-close>
      <template v-if="editVisible">
        <el-descriptions :column="2" border size="small" class="edit-readonly">
          <el-descriptions-item label="填写人">{{ editData.submitter }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTag(editData.status as string).type || 'info'" size="small">
              {{ getStatusTag(editData.status as string).text }}
            </el-tag>
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
// 页面骨架：页签导航 + 内容面板，统一 16px 节奏
.report-page {
  display: flex;
  flex-direction: column;
  gap: $spacing-medium;
}

// 页签导航（白色条，与内容面板同宽）
.tabs-bar {
  background: $bg-white;
  border: 1px solid $border-lighter;
  border-radius: $border-radius-large;
  padding: 0 $spacing-medium;

  :deep(.el-tabs__header) {
    margin: 0;
  }

  :deep(.el-tabs__item) {
    height: 48px;
    line-height: 48px;
    font-size: $font-size-base;
  }
}

// 内容面板
.panel {
  border-radius: $border-radius-large;

  :deep(.el-card__body) {
    padding: $spacing-medium;
  }
}

// 筛选区：条件一行、动作一行，动作行导出按钮靠右
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: $spacing-base;
  margin-bottom: $spacing-medium;
}

.filter-fields {
  display: flex;
  align-items: center;
  gap: $spacing-small $spacing-base;
  flex-wrap: wrap;

  .f-search { width: 220px; }
  .f-select { width: 120px; }
  .f-date { width: 240px; }
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: $spacing-small;
  flex-wrap: wrap;

  .export-dropdown {
    margin-left: auto;
  }
}

// 表格
.report-table {
  width: 100%;

  :deep(.el-table__row) {
    cursor: pointer;
  }
}

// 结果区：左统计、右分页
.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-base;
  flex-wrap: wrap;
  margin-top: $spacing-medium;

  .footer-left {
    display: flex;
    align-items: center;
    gap: $spacing-small;
    font-size: $font-size-small;
    color: $text-secondary;

    b {
      color: $text-primary;
      font-weight: 600;
    }

    .filter-hint {
      color: $primary-color;
    }
  }
}

.edit-readonly {
  margin-bottom: $spacing-small;
}

@media (max-width: 768px) {
  .filter-fields {
    .f-search,
    .f-date { width: 100%; }
  }

  // 窄屏动作行整体换行，导出按钮不再右推
  .filter-actions {
    .export-dropdown { margin-left: 0; }
  }
}
</style>
