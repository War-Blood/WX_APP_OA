<template>
  <div class="biz-trip-manage">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>出差管理</span>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="员工出差状态" name="status">
          <div class="filters">
            <el-input
              v-model="statusFilters.keyword"
              placeholder="搜索姓名/工号/部门"
              clearable
              style="width: 220px"
              @clear="handleStatusSearch"
              @keyup.enter="handleStatusSearch"
            />
            <el-select
              v-model="statusFilters.status"
              placeholder="状态"
              clearable
              style="width: 150px"
              @change="handleStatusSearch"
            >
              <el-option label="全部" value="" />
              <el-option label="出差中" value="in_progress" />
              <el-option label="未出差" value="none" />
            </el-select>
            <el-button @click="handleStatusSearch">搜索</el-button>
            <el-button :loading="statusLoading" @click="loadStatusList">刷新</el-button>
            <el-button type="primary" @click="openStartDialog()">开始出差</el-button>
          </div>

          <div class="status-summary">
            <span class="summary-item">
              出差中
              <b class="summary-num warning">{{ statusSummary.inProgress }}</b>
              人
            </span>
            <el-divider direction="vertical" />
            <span class="summary-item">
              未出差
              <b class="summary-num">{{ statusSummary.none }}</b>
              人
            </span>
            <span class="summary-tip">数据为当前在职人员实时统计</span>
          </div>

          <el-table :data="statusList" v-loading="statusLoading" stripe>
            <el-table-column label="员工" min-width="150">
              <template #default="{ row }">
                <div class="user-cell">
                  <span class="user-name">{{ row.userName }}</span>
                  <span v-if="row.workerCode" class="user-sub">{{ row.workerCode }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="departmentName" label="部门" width="140">
              <template #default="{ row }">{{ row.departmentName || '-' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="130">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.tripStatus)" size="small">
                  {{ statusLabel(row.tripStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="项目/备注" min-width="200">
              <template #default="{ row }">
                <span class="cell-text" :title="row.projectName || ''">{{ displayText(row.projectName) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="开始日期" width="110">
              <template #default="{ row }">{{ formatStart(row.tripStartedAt) }}</template>
            </el-table-column>
            <el-table-column label="已持续" width="90" align="center">
              <template #default="{ row }">{{ row.tripDays ? `${row.tripDays} 天` : '-' }}</template>
            </el-table-column>
            <el-table-column label="来源" width="100">
              <template #default="{ row }">{{ sourceLabel(row.source) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.tripStatus === 'compliance_only'"
                  size="small"
                  type="primary"
                  @click="openStartDialog(row)"
                >
                  补录考勤
                </el-button>
                <el-button
                  v-else-if="row.tripStatus === 'in_progress'"
                  size="small"
                  type="warning"
                  @click="openEndDialog(row)"
                >
                  结束出差
                </el-button>
                <span v-else class="row-placeholder">-</span>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="statusPage"
            v-model:page-size="statusPageSize"
            :page-sizes="[10, 20, 50]"
            :total="statusTotal"
            layout="total, sizes, prev, pager, next"
            style="margin-top: 16px; justify-content: flex-end"
            @current-change="handleStatusPageChange"
            @size-change="handleStatusSizeChange"
          />
        </el-tab-pane>

        <el-tab-pane label="出差记录" name="records">
          <div class="filters">
            <el-select
              v-model="recordFilters.status"
              placeholder="状态"
              clearable
              style="width: 130px"
              @change="handleRecordSearch"
            >
              <el-option label="全部" value="" />
              <el-option label="出差中" value="in_progress" />
              <el-option label="已结束" value="ended" />
            </el-select>
            <el-input
              v-model="recordFilters.keyword"
              placeholder="搜索姓名/工号/部门/项目"
              clearable
              style="width: 220px"
              @clear="handleRecordSearch"
              @keyup.enter="handleRecordSearch"
            />
            <el-date-picker
              v-model="recordFilters.dateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              start-placeholder="开始日期从"
              end-placeholder="开始日期至"
              style="flex: none; width: 270px"
              @change="handleRecordSearch"
            />
            <el-button @click="handleRecordSearch">查询</el-button>
            <el-button @click="resetRecordFilters">重置</el-button>
            <el-button :loading="loading" @click="loadTripList">刷新</el-button>
            <el-button type="primary" @click="openStartDialog()">开始出差</el-button>
          </div>

          <el-table :data="tripList" v-loading="loading" stripe class="record-table">
            <el-table-column label="员工" min-width="150">
              <template #default="{ row }">
                <div class="user-cell">
                  <span class="user-name">{{ row.userName }}</span>
                  <span v-if="row.workerCode" class="user-sub">{{ row.workerCode }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="departmentName" label="部门" width="140">
              <template #default="{ row }">{{ row.departmentName || '-' }}</template>
            </el-table-column>
            <el-table-column label="项目/备注" min-width="200">
              <template #default="{ row }">
                <span class="cell-text" :title="row.projectName || ''">{{ displayText(row.projectName) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="startDate" label="开始日期" width="110" />
            <el-table-column label="结束日期" width="110">
              <template #default="{ row }">
                <span v-if="row.endDate">{{ row.endDate }}</span>
                <span v-else class="ongoing">出差中</span>
              </template>
            </el-table-column>
            <el-table-column label="天数" width="90" align="center">
              <template #default="{ row }">{{ row.tripDays ? `${row.tripDays} 天` : '-' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="130">
              <template #default="{ row }">
                <el-tag :type="row.tripStatus === 'in_progress' ? 'warning' : 'info'" size="small">
                  {{ row.tripStatus === 'in_progress' ? '出差中' : '已结束' }}
                </el-tag>
                <el-tooltip
                  v-if="row.inconsistent"
                  content="考勤记录已结束，合规记录仍为出差中，请编辑或结束该记录"
                  placement="top"
                >
                  <el-icon class="warn-icon"><WarningFilled /></el-icon>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column label="来源" width="100">
              <template #default="{ row }">{{ sourceLabel(row.source) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
                <el-button
                  v-if="row.tripStatus === 'in_progress'"
                  size="small"
                  type="warning"
                  @click="handleEndRecordTrip(row)"
                >
                  结束
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            :total="total"
            layout="total, sizes, prev, pager, next"
            style="margin-top: 16px; justify-content: flex-end"
            @current-change="handleRecordPageChange"
            @size-change="handleRecordSizeChange"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="showStartDialog" title="开始出差" width="520px" destroy-on-close>
      <el-form :model="startForm" label-width="100px">
        <el-form-item label="员工" required>
          <el-input
            v-if="startTarget"
            :model-value="startTarget.userName + (startTarget.workerCode ? ' (' + startTarget.workerCode + ')' : '')"
            disabled
          />
          <el-select
            v-else
            v-model="startForm.userId"
            placeholder="请选择员工"
            filterable
            remote
            reserve-keyword
            clearable
            :remote-method="loadUserOptions"
            :loading="userOptionsLoading"
            style="width: 100%"
          >
            <el-option
              v-for="user in userOptions"
              :key="user.userId"
              :label="user.userName + (user.workerCode ? ' (' + user.workerCode + ')' : '')"
              :value="user.userId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="项目名称">
          <el-input v-model="startForm.projectName" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="开始日期" required>
          <el-date-picker
            v-model="startForm.startDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择开始日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="startForm.reason"
            type="textarea"
            :rows="2"
            placeholder="出差原因或补充说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showStartDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleStartSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showEndDialog" title="结束出差" width="520px" destroy-on-close>
      <el-form :model="endForm" label-width="100px">
        <el-form-item label="员工">
          <el-input :model-value="endTargetName" disabled />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-input :model-value="endTargetStart" disabled />
        </el-form-item>
        <el-form-item label="结束日期" required>
          <el-date-picker
            v-model="endForm.endDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择结束日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="endForm.reason"
            type="textarea"
            :rows="2"
            placeholder="结束说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEndDialog = false">取消</el-button>
        <el-button type="warning" :loading="ending" @click="handleEndSubmit">确定结束</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showEditDialog" title="修改出差记录" width="520px" destroy-on-close>
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="员工">
          <el-input :model-value="editTargetName" disabled />
        </el-form-item>
        <el-form-item label="记录来源">
          <el-input :model-value="editTargetSource" disabled />
        </el-form-item>
        <el-form-item label="开始日期" required>
          <el-date-picker
            v-model="editForm.startDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择开始日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="editForm.endDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="留空表示仍在出差中"
            clearable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="项目/备注">
          <el-input
            v-model="editForm.remark"
            type="textarea"
            :rows="2"
            placeholder="项目名称或补充备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleEditSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@/utils/toast'
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { WarningFilled } from '@element-plus/icons-vue'
import {
  getAdminBizTripStatusList,
  getAdminBizTripRecords,
  adminStartBizTrip,
  adminEndBizTrip,
  adminUpdateBizTripRecord,
  type BizTripUserStatus,
  type BizTripRecord,
} from '@/api/attendance'
import { currentDateInBeijing } from '@/utils/date'

interface StartForm {
  userId: number | null
  projectName: string
  reason: string
  startDate: string
}

interface EndForm {
  endDate: string
  reason: string
}

interface EditForm {
  startDate: string
  endDate: string
  remark: string
}

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

const activeTab = ref('status')
const statusList = ref<BizTripUserStatus[]>([])
const statusLoading = ref(false)
const statusFilters = ref({ keyword: '', status: '' })
const statusPage = ref(1)
const statusPageSize = ref(20)
const statusTotal = ref(0)
const statusSummary = ref({ inProgress: 0, none: 0 })

const userOptions = ref<BizTripUserStatus[]>([])
const userOptionsLoading = ref(false)
const startTarget = ref<BizTripUserStatus | null>(null)
const showStartDialog = ref(false)
const submitting = ref(false)
const startForm = ref<StartForm>({
  userId: null,
  projectName: '',
  reason: '',
  startDate: '',
})

const endTarget = ref<BizTripUserStatus | null>(null)
const showEndDialog = ref(false)
const ending = ref(false)
const endForm = ref<EndForm>({ endDate: '', reason: '' })

const tripList = ref<BizTripRecord[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const recordFilters = ref<{ status: string; keyword: string; dateRange: [string, string] | null }>({
  status: '',
  keyword: '',
  dateRange: null,
})

const editTarget = ref<BizTripRecord | null>(null)
const showEditDialog = ref(false)
const saving = ref(false)
const editForm = ref<EditForm>({ startDate: '', endDate: '', remark: '' })

const endTargetName = computed(() => {
  const row = endTarget.value
  if (!row) return ''
  return row.userName + (row.workerCode ? ` (${row.workerCode})` : '')
})

const endTargetStart = computed(() => {
  const value = endTarget.value?.tripStartedAt
  return value ? String(value).slice(0, 16).replace('T', ' ') : '-'
})

const editTargetName = computed(() => {
  const row = editTarget.value
  if (!row) return ''
  return row.userName + (row.workerCode ? ` (${row.workerCode})` : '')
})

const editTargetSource = computed(() => sourceLabel(editTarget.value?.source))

onMounted(() => {
  loadStatusList()
  loadTripList()
})

function handleTabChange(name: string | number) {
  if (name === 'status') loadStatusList()
  else loadTripList()
}

async function loadStatusList() {
  statusLoading.value = true
  try {
    const res = await getAdminBizTripStatusList({
      page: statusPage.value,
      pageSize: statusPageSize.value,
      keyword: statusFilters.value.keyword || undefined,
      status: statusFilters.value.status || undefined,
    })
    statusList.value = res.list || []
    statusTotal.value = res.total || 0
    statusSummary.value = {
      inProgress: res.summary?.inProgress ?? 0,
      none: res.summary?.none ?? 0,
    }
  } catch (err) {
    toast.error(getErrorMessage(err, '加载员工出差状态失败'))
  } finally {
    statusLoading.value = false
  }
}

function handleStatusSearch() {
  statusPage.value = 1
  loadStatusList()
}

function handleStatusPageChange(page: number) {
  statusPage.value = page
  loadStatusList()
}

function handleStatusSizeChange(size: number) {
  statusPageSize.value = size
  statusPage.value = 1
  loadStatusList()
}

async function loadUserOptions(keyword?: string) {
  userOptionsLoading.value = true
  try {
    const res = await getAdminBizTripStatusList({
      page: 1,
      pageSize: 200,
      keyword,
    })
    userOptions.value = res.list || []
  } catch {
    userOptions.value = []
    toast.error('加载员工列表失败')
  } finally {
    userOptionsLoading.value = false
  }
}

function resetStartForm() {
  startTarget.value = null
  startForm.value = {
    userId: null,
    projectName: '',
    reason: '',
    startDate: currentDateInBeijing(),
  }
}

function openStartDialog(row?: BizTripUserStatus) {
  resetStartForm()
  if (row) {
    startTarget.value = row
    startForm.value.userId = row.userId
    startForm.value.projectName = row.projectName || ''
    if (row.tripStatus === 'compliance_only' && row.tripStartedAt) {
      startForm.value.startDate = String(row.tripStartedAt).slice(0, 10)
    }
  } else {
    loadUserOptions()
  }
  showStartDialog.value = true
}

async function handleStartSubmit() {
  if (!startForm.value.userId || !startForm.value.startDate) {
    toast.warning('请选择员工并填写开始日期')
    return
  }

  submitting.value = true
  try {
    await adminStartBizTrip({
      userId: startForm.value.userId,
      projectName: startForm.value.projectName || undefined,
      reason: startForm.value.reason || undefined,
      startDate: startForm.value.startDate,
    })
    toast.success('出差已开始')
    showStartDialog.value = false
    loadStatusList()
    loadTripList()
  } catch (err) {
    toast.error(getErrorMessage(err, '开始出差失败'))
  } finally {
    submitting.value = false
  }
}

function openEndDialog(row: BizTripUserStatus) {
  endTarget.value = row
  endForm.value = {
    endDate: currentDateInBeijing(),
    reason: '',
  }
  showEndDialog.value = true
}

async function handleEndSubmit() {
  if (!endTarget.value || !endForm.value.endDate) {
    toast.warning('请填写结束日期')
    return
  }

  ending.value = true
  try {
    await adminEndBizTrip({
      userId: endTarget.value.userId,
      reason: endForm.value.reason || undefined,
      endDate: endForm.value.endDate,
    })
    toast.success('出差已结束')
    showEndDialog.value = false
    loadStatusList()
    loadTripList()
  } catch (err) {
    toast.error(getErrorMessage(err, '结束出差失败'))
  } finally {
    ending.value = false
  }
}

function statusLabel(status: BizTripUserStatus['tripStatus']) {
  const map = {
    in_progress: '出差中',
    compliance_only: '合规记录出差中',
    none: '未出差',
  }
  return map[status]
}

function statusTagType(status: BizTripUserStatus['tripStatus']) {
  const map = {
    in_progress: 'warning',
    compliance_only: 'danger',
    none: 'info',
  }
  return map[status] as 'warning' | 'danger' | 'info'
}

function sourceLabel(source?: string | null) {
  if (!source) return '-'
  const map: Record<string, string> = {
    self: '员工打卡',
    admin: '管理员录入',
    compliance: '合规记录',
  }
  return map[source] || source
}

function formatStart(value?: string | null) {
  return value ? String(value).slice(0, 10) : '-'
}

function displayText(text?: string | null, max = 16) {
  if (!text) return '-'
  return text.length > max ? `${text.slice(0, max)}…` : text
}

async function loadTripList() {
  loading.value = true
  try {
    const range = recordFilters.value.dateRange
    const res = await getAdminBizTripRecords({
      status: recordFilters.value.status || undefined,
      keyword: recordFilters.value.keyword || undefined,
      startDate: range?.[0] || undefined,
      endDate: range?.[1] || undefined,
      page: currentPage.value,
      pageSize: pageSize.value,
    })
    tripList.value = res.list || []
    total.value = res.total || 0
  } catch (err) {
    toast.error(getErrorMessage(err, '加载出差记录失败'))
  } finally {
    loading.value = false
  }
}

function handleRecordSearch() {
  currentPage.value = 1
  loadTripList()
}

function resetRecordFilters() {
  recordFilters.value = { status: '', keyword: '', dateRange: null }
  handleRecordSearch()
}

function handleRecordPageChange(page: number) {
  currentPage.value = page
  loadTripList()
}

function handleRecordSizeChange(size: number) {
  pageSize.value = size
  currentPage.value = 1
  loadTripList()
}

function openEditDialog(row: BizTripRecord) {
  editTarget.value = row
  editForm.value = {
    startDate: row.startDate,
    endDate: row.endDate || '',
    remark: row.projectName || '',
  }
  showEditDialog.value = true
}

async function handleEditSubmit() {
  if (!editTarget.value || !editForm.value.startDate) {
    toast.warning('请填写开始日期')
    return
  }
  if (editForm.value.endDate && editForm.value.endDate < editForm.value.startDate) {
    toast.warning('结束日期不能早于开始日期')
    return
  }

  saving.value = true
  try {
    await adminUpdateBizTripRecord({
      recordType: editTarget.value.recordType,
      recordId: editTarget.value.recordId,
      startDate: editForm.value.startDate,
      endDate: editForm.value.endDate || undefined,
      remark: editForm.value.remark,
    })
    toast.success('出差记录已更新')
    showEditDialog.value = false
    loadTripList()
    loadStatusList()
  } catch (err) {
    toast.error(getErrorMessage(err, '更新出差记录失败'))
  } finally {
    saving.value = false
  }
}

async function handleEndRecordTrip(row: BizTripRecord) {
  try {
    await ElMessageBox.confirm(`确认结束 ${row.userName} ${row.startDate} 开始的出差吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await adminUpdateBizTripRecord({
      recordType: row.recordType,
      recordId: row.recordId,
      startDate: row.startDate,
      endDate: currentDateInBeijing(),
    })
    toast.success('出差已结束')
    loadTripList()
    loadStatusList()
  } catch (err) {
    if (err !== 'cancel') {
      toast.error(getErrorMessage(err, '结束出差失败'))
    }
  }
}
</script>

<style scoped>
.biz-trip-manage {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 16px;
}

.filters,
.record-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.record-table {
  margin-top: 16px;
}

.status-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 8px 12px;
  background: #f7f9fc;
  border-radius: 6px;
  color: #606266;
  font-size: 13px;
}

.status-summary + .el-table {
  margin-top: 8px;
}

.summary-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.summary-num {
  color: #303133;
  font-size: 15px;
}

.summary-num.warning {
  color: #f59e0b;
}

.summary-tip {
  margin-left: auto;
  color: #a8abb2;
  font-size: 12px;
}

.row-placeholder {
  color: #c0c4cc;
}

.cell-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
  cursor: default;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.user-name {
  font-weight: 500;
  color: #303133;
}

.user-sub {
  color: #909399;
  font-size: 12px;
}

.ongoing {
  color: #f59e0b;
}

.warn-icon {
  margin-left: 6px;
  color: #ef4444;
  vertical-align: middle;
}
</style>
