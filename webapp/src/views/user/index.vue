<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { getUserList, setAdminRole, toggleUserStatus, createUser, approveUser, type UserItem } from '@/api/user'

// 搜索与筛选
const keyword = ref('')
const roleFilter = ref('')
const statusFilter = ref('')

// 表格数据
const loading = ref(false)
const userList = ref<UserItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 创建用户弹窗
const createVisible = ref(false)
const createLoading = ref(false)
const createForm = ref({ openid: '', userName: '', department: '', role: 'employee' })

// 角色选项
const roleOptions = [
  { label: '全部角色', value: '' },
  { label: '超级管理员', value: 'superadmin' },
  { label: '管理员', value: 'admin' },
  { label: '员工', value: 'employee' }
]

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '正常', value: 'active' },
  { label: '待审核', value: 'pending' },
  { label: '已禁用', value: 'disabled' }
]

async function loadUsers() {
  loading.value = true
  try {
    const res = await getUserList({
      page: page.value, pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      role: roleFilter.value || undefined,
      status: statusFilter.value || undefined
    })
    userList.value = res.list
    total.value = res.total
  } catch { userList.value = [] }
  finally { loading.value = false }
}

function handleSearch() { page.value = 1; loadUsers() }
function handlePageChange(p: number) { page.value = p; loadUsers() }

async function handleRoleSwitch(row: UserItem) {
  const targetRole = row.role === 'admin' ? 'employee' : 'admin'
  const action = targetRole === 'admin' ? '设为管理员' : '取消管理员'
  try {
    await ElMessageBox.confirm(`确定要${action}「${row.nickName}」吗？`, '角色变更', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await setAdminRole(row.userId, targetRole)
    ElMessage.success(`${action}成功`)
    loadUsers()
  } catch { /* cancel */ }
}

async function handleToggleStatus(row: UserItem) {
  const targetStatus = row.status === 'active' ? 'disabled' : 'active'
  const action = targetStatus === 'active' ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确定要${action}「${row.nickName}」吗？`, '账号状态变更', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await toggleUserStatus(row.userId, targetStatus)
    ElMessage.success(`${action}成功`)
    loadUsers()
  } catch { /* cancel */ }
}

async function handleApprove(row: UserItem) {
  try {
    await ElMessageBox.confirm(`确定审核通过「${row.nickName}」吗？审核通过后用户即可登录使用。`, '审核用户', { confirmButtonText: '确定通过', cancelButtonText: '取消', type: 'success' })
    await approveUser(row.userId)
    ElMessage.success('审核通过，用户现在可以登录了')
    loadUsers()
  } catch { /* cancel */ }
}

async function handleCreateUser() {
  createLoading.value = true
  try {
    await createUser(createForm.value)
    ElMessage.success('用户已注册，状态为"待审核"')
    createVisible.value = false
    createForm.value = { openid: '', userName: '', department: '', role: 'employee' }
    loadUsers()
  } catch { /* error handled by interceptor */ }
  finally { createLoading.value = false }
}

function getRoleTagType(role: string) {
  const map: Record<string, string> = { superadmin: 'danger', admin: 'warning', employee: 'info' }
  return map[role] || 'info'
}

function getRoleLabel(role: string) {
  const map: Record<string, string> = { superadmin: '超级管理员', admin: '管理员', employee: '员工' }
  return map[role] || role
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = { active: '正常', pending: '待审核', disabled: '已禁用' }
  return map[status] || status
}

function getStatusType(status: string) {
  const map: Record<string, string> = { active: 'success', pending: 'warning', disabled: 'info' }
  return map[status] || 'info'
}

onMounted(() => { loadUsers() })
</script>

<template>
  <div class="user-page">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input v-model="keyword" placeholder="搜索用户名 / 部门" clearable :prefix-icon="Search" style="width: 240px" @clear="handleSearch" @keyup.enter="handleSearch" />
        <el-select v-model="roleFilter" placeholder="角色" style="width: 130px" @change="handleSearch">
          <el-option v-for="opt in roleOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="状态" style="width: 120px" @change="handleSearch">
          <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-button @click="handleSearch">搜索</el-button>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" :icon="Plus" @click="createVisible = true">注册新用户</el-button>
        <el-button :icon="Refresh" @click="loadUsers">刷新</el-button>
      </div>
    </div>

    <!-- 表格 -->
    <el-table :data="userList" v-loading="loading" stripe border>
      <el-table-column prop="nickName" label="用户名" min-width="120" />
      <el-table-column prop="department" label="部门" min-width="110" />
      <el-table-column label="角色" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getRoleTagType(row.role)" size="small">{{ getRoleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="phone" label="手机号" width="130"><template #default="{ row }">{{ row.phone || '-' }}</template></el-table-column>
      <el-table-column prop="email" label="邮箱" min-width="150"><template #default="{ row }">{{ row.email || '-' }}</template></el-table-column>
      <el-table-column prop="lastLoginTime" label="最后登录" width="160"><template #default="{ row }">{{ row.lastLoginTime || '-' }}</template></el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'pending'">
            <el-button size="small" type="success" link @click="handleApprove(row)">审核通过</el-button>
            <el-button size="small" type="danger" link @click="handleToggleStatus(row)">拒绝</el-button>
          </template>
          <template v-else>
            <el-button v-if="row.role !== 'superadmin'" size="small" :type="row.role === 'admin' ? 'warning' : 'primary'" link @click="handleRoleSwitch(row)">
              {{ row.role === 'admin' ? '取消管理员' : '设为管理员' }}
            </el-button>
            <el-button size="small" :type="row.status === 'active' ? 'danger' : 'success'" link @click="handleToggleStatus(row)">
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrap">
      <span class="total-text">共 {{ total }} 条</span>
      <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" background @current-change="handlePageChange" />
    </div>

    <!-- 创建用户弹窗 -->
    <el-dialog v-model="createVisible" title="注册新用户" width="480px" destroy-on-close>
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="微信OpenID" required>
          <el-input v-model="createForm.openid" placeholder="用户微信小程序的 OpenID" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="createForm.userName" placeholder="用户姓名（可选）" />
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="createForm.department" placeholder="选择部门" style="width:100%">
            <el-option label="管理部" value="管理部" />
            <el-option label="技术部" value="技术部" />
            <el-option label="工程运维部" value="工程运维部" />
            <el-option label="市场部" value="市场部" />
            <el-option label="财务部" value="财务部" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="createForm.role" style="width:100%">
            <el-option label="员工" value="employee" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreateUser">注册</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.user-page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
  .toolbar-left { display: flex; align-items: center; gap: 12px; }
  .toolbar-right { display: flex; align-items: center; gap: 8px; }
}
.pagination-wrap { display: flex; align-items: center; justify-content: space-between; margin-top: 16px;
  .total-text { font-size: 14px; color: #999; }
}
</style>
