<template>
  <div class="biz-trip-manage">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>出差管理</span>
        </div>
      </template>

      <el-tabs v-model="activeTab">
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
            <el-button type="primary" @click="openStartDialog()">开始出差</el-button>
          </div>

          <el-table :data="statusList" v-loading="statusLoading" stripe style="margin-top: 16px">
            <el-table-column label="员工" min-width="170">
              <template #default="{ row }">
                <div class="user-cell">
                  <span class="user-name">{{ row.userName }}</span>
                  <span v-if="row.workerCode" class="user-sub">{{ row.workerCode }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="departmentName" label="部门" min-width="110">
              <template #default="{ row }">{{ row.departmentName || '-' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.tripStatus)" size="small">
                  {{ statusLabel(row.tripStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="项目/备注" min-width="140">
              <template #default="{ row }">{{ row.projectName || '-' }}</template>
            </el-table-column>
            <el-table-column label="开始时间" width="130">
              <template #default="{ row }">{{ formatStart(row.tripStartedAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.tripStatus !== 'in_progress'"
                  size="small"
                  type="primary"
                  @click="openStartDialog(row)"
                >
                  {{ row.tripStatus === 'compliance_only' ? '补录考勤' : '开始出差' }}
                </el-button>
                <el-button
                  v-if="row.tripStatus !== 'none'"
                  size="small"
                  type="warning"
                  @click="openEndDialog(row)"
                >
                  结束出差
                </el-button>
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
          <div class="record-toolbar">
            <el-button type="primary" @click="openStartDialog()">设置出差</el-button>
          </div>

          <el-table :data="tripList" v-loading="loading" stripe style="margin-top: 16px">
            <el-table-column prop="user_name" label="员工" min-width="120" />
            <el-table-column prop="project_name" label="项目" min-width="140">
              <template #default="{ row }">{{ row.project_name || '-' }}</template>
            </el-table-column>
            <el-table-column prop="start_date" label="开始日期" width="120" />
            <el-table-column label="出差天数" width="100">
              <template #default="{ row }">{{ calculateDays(row.start_date, row.end_date) }} 天</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                  {{ row.status === 'active' ? '进行中' : '已结束' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="130" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'active'"
                  size="small"
                  type="warning"
                  @click="handleEndRecordTrip(row)"
                >
                  结束出差
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
  </div>
</template>

<script setup lang="ts">
import { toast } from '@/utils/toast'
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { complianceApi } from '@/api/compliance'
import {
  getAdminBizTripStatusList,
  adminStartBizTrip,
  adminEndBizTrip,
  type BizTripUserStatus,
} from '@/api/attendance'
import { currentDateInBeijing } from '@/utils/date'

interface TripItem {
  id: number
  user_name: string
  project_name?: string
  start_date: string
  end_date?: string
  status: 'active' | 'completed'
}

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

const endTargetName = computed(() => {
  const row = endTarget.value
  if (!row) return ''
  return row.userName + (row.workerCode ? ` (${row.workerCode})` : '')
})

const endTargetStart = computed(() => {
  const value = endTarget.value?.tripStartedAt
  return value ? String(value).slice(0, 16).replace('T', ' ') : '-'
})

const tripList = ref<TripItem[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

onMounted(() => {
  loadStatusList()
  loadTripList()
})

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
  startForm.value.startDate = currentDateInBeijing()
  if (row) {
    startTarget.value = row
    startForm.value.userId = row.userId
    startForm.value.projectName = row.projectName || ''
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

function formatStart(value?: string | null) {
  return value ? String(value).slice(0, 10) : '-'
}

async function loadTripList() {
  loading.value = true
  try {
    const res = await complianceApi.getBizTripList({
      status: 'active',
      page: currentPage.value,
      pageSize: pageSize.value,
    }) as { list?: TripItem[]; total?: number }
    tripList.value = (res.list || []) as TripItem[]
    total.value = res.total || 0
  } catch (err) {
    toast.error(getErrorMessage(err, '加载出差记录失败'))
  } finally {
    loading.value = false
  }
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

function calculateDays(startDate?: string, endDate?: string) {
  if (!startDate) return 0
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return diff + 1
}

async function handleEndRecordTrip(row: TripItem) {
  try {
    await ElMessageBox.confirm(`确认结束 ${row.user_name} 的出差吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await complianceApi.endBizTrip(row.id, currentDateInBeijing())
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
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-weight: 500;
  color: #303133;
}

.user-sub {
  color: #909399;
  font-size: 12px;
}
</style>
