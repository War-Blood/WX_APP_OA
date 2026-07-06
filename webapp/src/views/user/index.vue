import { toast } from '@/utils/toast'
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Edit } from '@element-plus/icons-vue'
import {
  getUserList, updateUser, setAdminRole, toggleUserStatus,
  createUser, approveUser, deleteUser, getDepartmentList, getRoleList,
  type UserItem, type DepartmentItem, type RoleItem
} from '@/api/user'
import { generateInviteCode } from '@/api/admin'
import request from '@/utils/request'

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

// 动态数据
const departmentList = ref<DepartmentItem[]>([])
const roleList = ref<RoleItem[]>([])

// 创建用户弹窗
const createVisible = ref(false)
const createLoading = ref(false)
const createForm = ref({ openid: '', userName: '', department: '', role: 'employee' })

// 邀请用户弹窗
const inviteVisible = ref(false)
const inviteLoading = ref(false)
const inviteForm = ref({ openid: '', userName: '', department: '' })

// 生成邀请码弹窗
const genCodeVisible = ref(false)
const genCodeLoading = ref(false)
const genCodeCount = ref(1)

// 邀请码结果弹窗
const genCodeResultVisible = ref(false)
const genCodeList = ref<string[]>([])

// 编辑用户弹窗
const editVisible = ref(false)
const editLoading = ref(false)
const editUser = ref<UserItem | null>(null)
const editForm = ref({ userName: '', email: '', phone: '', departmentId: null as number | null, position: '', role: '' })

// 角色选项（动态）
const roleOptions = ref<{ label: string; value: string }[]>([])

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '正常', value: 'active' },
  { label: '待审核', value: 'pending' },
  { label: '已禁用', value: 'disabled' }
]

async function loadDepartments() {
  try {
    departmentList.value = await getDepartmentList()
  } catch { departmentList.value = [] }
}

async function loadRoles() {
  try {
    roleList.value = await getRoleList()
    roleOptions.value = [
      { label: '全部角色', value: '' },
      ...roleList.value.map(r => ({ label: r.name, value: r.code }))
    ]
  } catch { roleList.value = [] }
}

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

// 编辑用户
function openEditDialog(row: UserItem) {
  editUser.value = row
  editForm.value = {
    userName: row.userName || row.nickName || '',
    email: row.email || '',
    phone: row.phone || '',
    departmentId: row.departmentId ?? null,
    position: row.position || '',
    role: row.role
  }
  editVisible.value = true
}

async function handleEditUser() {
  if (!editUser.value) return
  editLoading.value = true
  try {
    await updateUser(editUser.value.userId, editForm.value)
    toast.success('用户信息已更新')
    editVisible.value = false
    loadUsers()
  } catch { /* error handled by interceptor */ }
  finally { editLoading.value = false }
}

// 角色切换
async function handleRoleSwitch(row: UserItem) {
  const targetRole = row.role === 'admin' ? 'employee' : 'admin'
  const action = targetRole === 'admin' ? '设为管理员' : '取消管理员'
  try {
    await ElMessageBox.confirm(`确定要${action}「${row.nickName}」吗？`, '角色变更', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await setAdminRole(row.userId, targetRole)
    toast.success(`${action}成功`)
    loadUsers()
  } catch { /* cancel */ }
}

// 启用/禁用
async function handleToggleStatus(row: UserItem) {
  const targetStatus = row.status === 'active' ? 'disabled' : 'active'
  const action = targetStatus === 'active' ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确定要${action}「${row.nickName}」吗？`, '账号状态变更', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await toggleUserStatus(row.userId, targetStatus)
    toast.success(`${action}成功`)
    loadUsers()
  } catch { /* cancel */ }
}

// 删除
async function handleDelete(row: UserItem) {
  try {
    await ElMessageBox.confirm(
      `确定要删除「${row.nickName}」吗？此操作不可撤销！`,
      '删除用户',
      { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'error' }
    )
    await deleteUser(row.userId)
    toast.success('已删除')
    loadUsers()
  } catch { /* cancel */ }
}

// 审核
async function handleApprove(row: UserItem) {
  try {
    await ElMessageBox.confirm(`确定审核通过「${row.nickName}」吗？`, '审核用户', { confirmButtonText: '确定通过', cancelButtonText: '取消', type: 'success' })
    await approveUser(row.userId)
    toast.success('审核通过')
    loadUsers()
  } catch { /* cancel */ }
}

// 创建用户
async function handleCreateUser() {
  if (!createForm.value.userName.trim()) {
    toast.warning('请填写用户姓名')
    return
  }
  createLoading.value = true
  try {
    await createUser(createForm.value)
    toast.success('用户已注册，状态为"待审核"')
    createVisible.value = false
    createForm.value = { openid: '', userName: '', department: '', role: 'employee' }
    loadUsers()
  } catch { /* error handled by interceptor */ }
  finally { createLoading.value = false }
}

// 邀请用户
async function handleInviteUser() {
  if (!inviteForm.value.openid.trim()) { toast.warning('请填写微信 OpenID'); return }
  inviteLoading.value = true
  try {
    await request.post('/admin/inviteUser', inviteForm.value)
    toast.success('用户已邀请成功')
    inviteVisible.value = false
    inviteForm.value = { openid: '', userName: '', department: '' }
    loadUsers()
  } catch { /* error handled by interceptor */ }
  finally { inviteLoading.value = false }
}

// 生成邀请码
async function handleGenerateCodes() {
  if (genCodeCount.value < 1 || genCodeCount.value > 100) {
    toast.warning('生成数量须在 1-100 之间')
    return
  }
  genCodeLoading.value = true
  try {
    const res = await generateInviteCode(genCodeCount.value)
    genCodeList.value = res.codes
    genCodeVisible.value = false
    genCodeResultVisible.value = true
  } catch { /* error handled by interceptor */ }
  finally { genCodeLoading.value = false }
}

function copyAllCodes() {
  const text = genCodeList.value.join('\n')
  navigator.clipboard.writeText(text).then(() => {
    toast.success('已复制全部邀请码')
  }).catch(() => {
    toast.warning('复制失败，请手动复制')
  })
}

function getRoleTagType(role: string) {
  const map: Record<string, string> = { superadmin: 'danger', admin: 'warning', employee: 'info' }
  return map[role] || 'info'
}

function getRoleLabel(role: string) {
  const found = roleList.value.find(r => r.code === role)
  return found?.name || role
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = { active: '正常', pending: '待审核', disabled: '已禁用' }
  return map[status] || status
}

function getStatusType(status: string) {
  const map: Record<string, string> = { active: 'success', pending: 'warning', disabled: 'info' }
  return map[status] || 'info'
}

onMounted(() => {
  loadDepartments()
  loadRoles()
  loadUsers()
})
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
        <el-button type="success" :icon="Plus" @click="inviteVisible = true">邀请用户</el-button>
        <el-button type="warning" @click="genCodeVisible = true; genCodeCount = 1">生成邀请码</el-button>
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
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'pending'">
            <el-button size="small" type="success" link @click="handleApprove(row)">审核通过</el-button>
          </template>
          <template v-else>
            <el-button size="small" type="primary" link :icon="Edit" @click="openEditDialog(row)">编辑</el-button>
            <el-button v-if="row.role !== 'superadmin'" size="small" :type="row.role === 'admin' ? 'warning' : 'primary'" link @click="handleRoleSwitch(row)">
              {{ row.role === 'admin' ? '取消管理员' : '设为管理员' }}
            </el-button>
            <el-button size="small" :type="row.status === 'active' ? 'danger' : 'success'" link @click="handleToggleStatus(row)">
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrap">
      <span class="total-text">共 {{ total }} 条</span>
      <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" background @current-change="handlePageChange" />
    </div>

    <!-- 编辑用户弹窗 -->
    <el-dialog v-model="editVisible" title="编辑用户信息" width="500px" destroy-on-close>
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="姓名">
          <el-input v-model="editForm.userName" placeholder="用户姓名" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="editForm.email" placeholder="邮箱地址" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="editForm.phone" placeholder="手机号码" />
        </el-form-item>
        <el-form-item label="部门">
          <el-tree-select
            v-model="editForm.departmentId"
            :data="departmentList"
            :props="{ value: 'id', label: 'name', children: 'children' }"
            placeholder="选择部门"
            check-strictly
            clearable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="职位">
          <el-input v-model="editForm.position" placeholder="职位" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.role" placeholder="选择角色" style="width: 100%">
            <el-option v-for="r in roleList" :key="r.code" :label="r.name" :value="r.code" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="handleEditUser">保存</el-button>
      </template>
    </el-dialog>

    <!-- 创建用户弹窗 -->
    <el-dialog v-model="createVisible" title="注册新用户" width="480px" destroy-on-close>
      <el-alert type="info" :closable="false" style="margin-bottom:16px">
        <template #title>用户打开小程序即自动注册激活。管理员可在此预注册用户并指定角色和部门。</template>
      </el-alert>
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="微信OpenID" required>
          <el-input v-model="createForm.openid" placeholder="仅在需要提前注册时填写" />
        </el-form-item>
        <el-form-item label="姓名" required>
          <el-input v-model="createForm.userName" placeholder="用户姓名" />
        </el-form-item>
        <el-form-item label="部门">
          <el-tree-select
            v-model="createForm.department"
            :data="departmentList"
            :props="{ value: 'name', label: 'name', children: 'children' }"
            placeholder="选择部门"
            check-strictly
            clearable
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreateUser">注册</el-button>
      </template>
    </el-dialog>

    <!-- 邀请用户弹窗 -->
    <el-dialog v-model="inviteVisible" title="邀请用户" width="480px" destroy-on-close>
      <el-alert type="success" :closable="false" style="margin-bottom:16px">
        <template #title>邀请后用户即刻激活，无需等待审核。需要用户的微信 OpenID。</template>
      </el-alert>
      <el-form :model="inviteForm" label-width="80px">
        <el-form-item label="微信OpenID" required>
          <el-input v-model="inviteForm.openid" placeholder="填写用户的微信 OpenID" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="inviteForm.userName" placeholder="用户姓名" />
        </el-form-item>
        <el-form-item label="部门">
          <el-tree-select
            v-model="inviteForm.department"
            :data="departmentList"
            :props="{ value: 'name', label: 'name', children: 'children' }"
            placeholder="选择部门"
            check-strictly
            clearable
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inviteVisible = false">取消</el-button>
        <el-button type="success" :loading="inviteLoading" @click="handleInviteUser">邀请</el-button>
      </template>
    </el-dialog>

    <!-- 生成邀请码弹窗 -->
    <el-dialog v-model="genCodeVisible" title="生成邀请码" width="420px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="生成数量">
          <el-input-number v-model="genCodeCount" :min="1" :max="100" :step="1" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="genCodeVisible = false">取消</el-button>
        <el-button type="primary" :loading="genCodeLoading" @click="handleGenerateCodes">确认生成</el-button>
      </template>
    </el-dialog>

    <!-- 邀请码结果弹窗 -->
    <el-dialog v-model="genCodeResultVisible" title="邀请码已生成" width="500px" destroy-on-close>
      <div class="code-list-box">
        <p v-for="code in genCodeList" :key="code" class="code-item">{{ code }}</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="copyAllCodes">复制全部</el-button>
        <el-button @click="genCodeResultVisible = false">关闭</el-button>
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

.code-list-box {
  max-height: 300px;
  overflow-y: auto;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px 16px;

  .code-item {
    margin: 0;
    padding: 4px 0;
    font-family: monospace;
    font-size: 16px;
    color: #303133;
    border-bottom: 1px dashed #e4e7ed;

    &:last-child { border-bottom: none; }
  }
}
</style>
