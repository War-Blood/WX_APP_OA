<script setup lang="ts">
import { toast } from '@/utils/toast'
import { ref, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Search, Refresh, Delete } from '@element-plus/icons-vue'
import { getReportList, getReportDetail, deleteReport, restoreReport, updateReport } from '@/api/report'
import type { ReportUpdateResult } from '@/api/report'
import ReportDetailDialog from '@/components/ReportDetailDialog.vue'

const loading = ref(false)
const list = ref<Record<string, unknown>[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(50)

const keyword = ref('')
const statusFilter = ref('')
const startDate = ref('')
const endDate = ref('')

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<Record<string, any>>({})

const editVisible = ref(false)
const editData = ref<Record<string, unknown>>({})
const editSaving = ref(false)

const statusOptions = [
  { label: '全部', value: '' },
  { label: '已提交', value: 'submitted' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' }
]

async function loadReports() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      page: page.value,
      pageSize: pageSize.value,
      reportType: 'office'
    }
    if (keyword.value) params.keyword = keyword.value
    if (statusFilter.value) params.status = statusFilter.value
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    const res = await getReportList(params as Parameters<typeof getReportList>[0])
    list.value = (res.list || []) as unknown as Record<string, unknown>[]
    total.value = res.total || 0
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() { page.value = 1; loadReports() }
function handlePageChange(p: number) { page.value = p; loadReports() }
function handleSizeChange(size: number) { pageSize.value = size; page.value = 1; loadReports() }

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

async function showDetail(row: Record<string, unknown>) {
  detailLoading.value = true
  try {
    detailData.value = await getReportDetail(String(row.id))
  } catch {
    detailData.value = row
  } finally {
    detailLoading.value = false
  }
  detailVisible.value = true
}

function openEdit(row: Record<string, unknown>) {
  editData.value = {
    reportId: row.id,
    reportDate: row.reportDate || row.date || '',
    todayWork: row.todayWork || '',
    tomorrowPlan: row.tomorrowPlan || '',
    issues: row.issues || '',
    content: row.content || '',
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
      reportType: 'office',
      todayWork: editData.value.todayWork as string,
      tomorrowPlan: editData.value.tomorrowPlan as string,
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

async function handleDelete(row: Record<string, unknown>) {
  try {
    await ElMessageBox.confirm('确定删除该条记录？删除后可在回收站恢复。', '删除确认', { type: 'warning' })
    await deleteReport(row.id as string)
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

onMounted(() => { loadReports() })
</script>

<template>
  <div class="report-page">
    <div class="toolbar">
      <div class="toolbar-row">
        <el-input v-model="keyword" placeholder="搜索填写人/今日工作/明日计划" clearable :prefix-icon="Search" style="width:240px" @clear="handleSearchWithValidation" @keyup.enter="handleSearchWithValidation" />
        <el-select v-model="statusFilter" placeholder="状态" style="width:110px" @change="handleSearch">
          <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
        <el-date-picker v-model="startDate" type="date" placeholder="开始日期" style="width:140px" @change="handleSearchWithValidation" value-format="YYYY-MM-DD" />
        <el-date-picker v-model="endDate" type="date" placeholder="结束日期" style="width:140px" @change="handleSearchWithValidation" value-format="YYYY-MM-DD" />
        <el-button :icon="Refresh" @click="handleSearchWithValidation">刷新</el-button>
      </div>
    </div>

    <el-table
      :data="list"
      v-loading="loading"
      stripe
      border
      highlight-current-row
      @row-click="showDetail"
      style="cursor:pointer"
    >
      <el-table-column prop="reportDate" label="日报时间" width="110" fixed="left" />
      <el-table-column prop="submitter" label="填写人" width="100" show-overflow-tooltip />
      <el-table-column prop="todayWork" label="今日工作" min-width="200" show-overflow-tooltip />
      <el-table-column prop="tomorrowPlan" label="明日计划" min-width="160" show-overflow-tooltip />
      <el-table-column prop="issues" label="遇到的问题" min-width="140" show-overflow-tooltip />
      <el-table-column prop="content" label="需协调事项" min-width="140" show-overflow-tooltip />
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.status === 'submitted'" type="info" size="small">已提交</el-tag>
          <el-tag v-else-if="row.status === 'pending'" type="warning" size="small">待审核</el-tag>
          <el-tag v-else-if="row.status === 'approved'" type="success" size="small">已通过</el-tag>
          <el-tag v-else-if="row.status === 'rejected'" type="danger" size="small">已驳回</el-tag>
          <el-tag v-else size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="warning" link @click.stop="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" link :icon="Delete" @click.stop="handleDelete(row)" />
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrap">
      <span class="total-text">共 {{ total }} 条</span>
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <ReportDetailDialog
      :visible="detailVisible"
      :data="detailData"
      :loading="detailLoading"
      @update:visible="detailVisible = $event"
    />

    <el-dialog v-model="editVisible" title="编辑工作日报" width="600px" destroy-on-close>
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
          <el-form-item label="日报日期">
            <el-date-picker v-model="editData.reportDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
          </el-form-item>
          <el-form-item label="今日工作内容">
            <el-input v-model="editData.todayWork" type="textarea" :rows="4" placeholder="今日工作内容" />
          </el-form-item>
          <el-form-item label="明日工作计划">
            <el-input v-model="editData.tomorrowPlan" type="textarea" :rows="3" placeholder="明日工作计划" />
          </el-form-item>
          <el-form-item label="遇到的问题">
            <el-input v-model="editData.issues" type="textarea" :rows="2" placeholder="遇到的问题" />
          </el-form-item>
          <el-form-item label="需协调事项">
            <el-input v-model="editData.content" type="textarea" :rows="2" placeholder="需协调事项" />
          </el-form-item>
        </el-form>
      </template>

      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSaving" @click="handleEditSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 16px;
}
.toolbar-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 16px;
  gap: 12px;
}
.total-text {
  color: #909399;
  font-size: 13px;
}
</style>
