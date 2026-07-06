import { toast } from '@/utils/toast'
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Edit } from '@element-plus/icons-vue'
import {
  getWorkerList, createWorker, updateWorker, toggleWorker, deleteWorker,
  getNonRosterUsers,
  type WorkerItem, type NonRosterUser
} from '@/api/admin'

// 搜索
const keyword = ref('')

// 表格
const loading = ref(false)
const list = ref<WorkerItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 新增/编辑弹窗
const dialogVisible = ref(false)
const dialogTitle = ref('新增外场人员')
const dialogLoading = ref(false)
const isEdit = ref(false)
const editUserId = ref<number | null>(null)
const form = ref({
  userName: '',
  workerCode: ''
})

// 未入花名册用户选择
const nonRosterUsers = ref<NonRosterUser[]>([])
const nonRosterLoading = ref(false)

async function loadNonRosterUsers(keyword?: string) {
  nonRosterLoading.value = true
  try {
    nonRosterUsers.value = await getNonRosterUsers(keyword || undefined)
  } catch {
    nonRosterUsers.value = []
  } finally {
    nonRosterLoading.value = false
  }
}

const selectedNonRosterId = ref<number | null>(null)

function onSelectNonRoster(userId: number | null) {
  if (!userId) return
  const user = nonRosterUsers.value.find((u: NonRosterUser) => u.userId === userId)
  if (user) {
    form.value.userName = user.userName
  }
}

async function loadData() {
  loading.value = true
  try {
    const res = await getWorkerList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined
    })
    list.value = res.list
    total.value = res.total
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadData()
}

function handlePageChange(p: number) {
  page.value = p
  loadData()
}

function openCreateDialog() {
  isEdit.value = false
  editUserId.value = null
  dialogTitle.value = '新增外场人员'
  form.value = { userName: '', workerCode: '' }
  dialogVisible.value = true
  loadNonRosterUsers()
}

function openEditDialog(row: WorkerItem) {
  isEdit.value = true
  editUserId.value = row.userId
  dialogTitle.value = '编辑外场人员'
  form.value = {
    userName: row.userName,
    workerCode: row.workerCode
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.userName.trim()) {
    toast.warning('请输入姓名')
    return
  }
  if (!form.value.workerCode.trim()) {
    toast.warning('请输入工号')
    return
  }
  dialogLoading.value = true
  try {
    if (isEdit.value && editUserId.value) {
      await updateWorker({
        userId: editUserId.value,
        userName: form.value.userName
      })
      toast.success('更新成功')
    } else {
      await createWorker({
        userName: form.value.userName,
        workerCode: form.value.workerCode
      })
      toast.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } catch {
    // 错误由拦截器处理
  } finally {
    dialogLoading.value = false
  }
}

async function handleToggleStatus(row: WorkerItem) {
  const targetStatus = row.workerStatus === 'active' ? 'inactive' : 'active'
  const action = targetStatus === 'inactive' ? '设为离职' : '恢复在职'
  try {
    await ElMessageBox.confirm(
      `确定将「${row.userName}」${action}吗？`,
      '状态变更',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    await toggleWorker(row.userId, targetStatus)
    toast.success(`${action}成功`)
    loadData()
  } catch {
    // 取消操作
  }
}

async function handleToggleField(row: WorkerItem) {
  const newValue = !row.isFieldWorker
  const action = newValue ? '标记为作业人员' : '取消作业人员标记'
  try {
    await ElMessageBox.confirm(
      `确定${action}「${row.userName}」吗？`,
      '作业人员标记变更',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    await updateWorker({
      userId: row.userId,
      isFieldWorker: newValue
    })
    toast.success(`${action}成功`)
    loadData()
  } catch {
    // 取消操作
  }
}

async function handleDelete(row: WorkerItem) {
  try {
    await ElMessageBox.confirm(
      `确定要删除「${row.userName}」吗？此操作不可撤销！`,
      '删除确认',
      { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'error' }
    )
    await deleteWorker(row.userId)
    toast.success('已删除')
    loadData()
  } catch {
    // 取消操作
  }
}

function getStatusTagType(status: string): 'success' | 'info' {
  return status === 'active' ? 'success' : 'info'
}

function getStatusLabel(status: string): string {
  return status === 'active' ? '在职' : '离职'
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="workers-page">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="keyword"
          placeholder="搜索姓名/工号"
          clearable
          :prefix-icon="Search"
          style="width: 240px"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <el-button @click="handleSearch">搜索</el-button>
        <el-button :icon="Refresh" @click="loadData">刷新</el-button>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" :icon="Plus" @click="openCreateDialog">新增人员</el-button>
      </div>
    </div>

    <!-- 表格 -->
    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="userName" label="姓名" width="100" />
      <el-table-column prop="workerCode" label="工号" width="100" />
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.workerStatus)" size="small">
            {{ getStatusLabel(row.workerStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="作业人员" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isFieldWorker ? 'success' : 'info'" size="small">
            {{ row.isFieldWorker ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" link :icon="Edit" @click="openEditDialog(row)">
            编辑
          </el-button>
          <el-button
            size="small"
            :type="row.workerStatus === 'active' ? 'warning' : 'success'"
            link
            @click="handleToggleStatus(row)"
          >
            {{ row.workerStatus === 'active' ? '设为离职' : '恢复在职' }}
          </el-button>
          <el-button
            size="small"
            :type="row.isFieldWorker ? 'warning' : 'primary'"
            link
            @click="handleToggleField(row)"
          >
            {{ row.isFieldWorker ? '取消作业' : '标记作业' }}
          </el-button>
          <el-button size="small" type="danger" link @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrap">
      <span class="total-text">共 {{ total }} 人</span>
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        background
        @current-change="handlePageChange"
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px" destroy-on-close>
      <el-form :model="form" label-width="80px">
        <el-form-item v-if="!isEdit" label="快速选择">
          <el-select
            v-model="selectedNonRosterId"
            filterable
            remote
            reserve-keyword
            clearable
            placeholder="搜索未入花名册用户（可选）"
            :remote-method="loadNonRosterUsers"
            :loading="nonRosterLoading"
            style="width: 100%"
            @change="onSelectNonRoster"
          >
            <el-option
              v-for="u in nonRosterUsers"
              :key="u.userId"
              :label="u.userName"
              :value="u.userId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="姓名" required>
          <el-input v-model="form.userName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="工号" required>
          <el-input v-model="form.workerCode" placeholder="如 BL050" />
        </el-form-item>
        <el-form-item v-else label="工号">
          <el-input :model-value="form.workerCode" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dialogLoading" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.workers-page { padding: 20px; }

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.pagination-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;

  .total-text {
    font-size: 14px;
    color: #909399;
  }
}
</style>
