<script setup lang="ts">
import { toast } from '@/utils/toast'
import { ref, onMounted } from 'vue'
import { ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, Refresh, Plus, Edit, Download, Upload, View, Key } from '@element-plus/icons-vue'
import {
  getUserList, updateUser, setAdminRole, toggleUserStatus,
  createUser, approveUser, deleteUser, getDepartmentList, getRoleList,
  getUserDetail, setUserPassword, batchImportUsers,
  type UserItem, type UserListParams, type DepartmentItem, type RoleItem, type BatchImportItem, type BatchImportResult
} from '@/api/user'
import { generateInviteCode } from '@/api/admin'
import request from '@/utils/request'
import * as XLSX from 'xlsx'
import { currentDateInBeijing } from '@/utils/date'

// 搜索与筛选
const keyword = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const deptFilter = ref('')

// 表格数据
const loading = ref(false)
const userList = ref<UserItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const selectedRows = ref<UserItem[]>([])

// 动态数据
const departmentList = ref<DepartmentItem[]>([])
const roleList = ref<RoleItem[]>([])

// 创建用户弹窗
const createVisible = ref(false)
const createLoading = ref(false)
const createForm = ref({ openid: '', userName: '', department: '', role: 'employee' })
const createFormRef = ref<FormInstance>()
const createFormRules: FormRules = {
  userName: [{ required: true, message: '请输入用户姓名', trigger: 'blur' }]
}

// 邀请用户弹窗
const inviteVisible = ref(false)
const inviteLoading = ref(false)
const inviteForm = ref({ openid: '', userName: '', department: '' })
const inviteFormRef = ref<FormInstance>()
const inviteFormRules: FormRules = {
  openid: [{ required: true, message: '请填写微信 OpenID', trigger: 'blur' }]
}

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
const editForm = ref({ userName: '', email: '', phone: '', departmentId: null as number | null, position: '员工', role: '' })

// 详情、重置密码、导入导出
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<UserItem | null>(null)

const resetPwdVisible = ref(false)
const resetPwdLoading = ref(false)
const resetPwdTarget = ref<UserItem | null>(null)
const resetPwdForm = ref({ password: '', confirmPassword: '' })

const importVisible = ref(false)
const importLoading = ref(false)
const importFile = ref<File | null>(null)
const importResult = ref<BatchImportResult | null>(null)
const exportLoading = ref(false)

const positionOptions = ['员工', '部长', '经理', '总经理', '管理','非员工']

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
      department: deptFilter.value || undefined,
      // '全部状态'传 all,让后端不过滤 active,待审核/已禁用用户可见
      status: statusFilter.value || 'all'
    })
    userList.value = res.list
    total.value = res.total
  } catch { userList.value = [] }
  finally { loading.value = false }
}

function handleSearch() { page.value = 1; loadUsers() }
function handlePageChange(p: number) { page.value = p; loadUsers() }
function handleSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  loadUsers()
}

function handleSelectionChange(rows: UserItem[]) {
  selectedRows.value = rows
}

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

async function openDetail(row: UserItem) {
  detailVisible.value = true
  detailLoading.value = true
  detailData.value = null
  try {
    detailData.value = await getUserDetail(row.userId)
  } catch {
    detailData.value = row
  } finally {
    detailLoading.value = false
  }
}

function openResetPassword(row: UserItem) {
  resetPwdTarget.value = row
  resetPwdForm.value = { password: '', confirmPassword: '' }
  resetPwdVisible.value = true
}

async function handleResetPassword() {
  if (!resetPwdTarget.value) return
  if (resetPwdForm.value.password.length < 6) {
    toast.warning('新密码至少6位')
    return
  }
  if (resetPwdForm.value.password !== resetPwdForm.value.confirmPassword) {
    toast.warning('两次输入的密码不一致')
    return
  }
  resetPwdLoading.value = true
  try {
    await setUserPassword(resetPwdTarget.value.userId, resetPwdForm.value.password)
    toast.success('密码已重置')
    resetPwdVisible.value = false
  } catch {
    // handled by interceptor
  } finally {
    resetPwdLoading.value = false
  }
}

async function handleBatchStatus(status: 'active' | 'disabled') {
  const ids = selectedRows.value.map(row => row.userId)
  if (!ids.length) {
    toast.warning('请先选择用户')
    return
  }
  const action = status === 'active' ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确认批量${action}选中的 ${ids.length} 个用户？`, '批量操作', {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  const results = await Promise.allSettled(ids.map(id => toggleUserStatus(id, status)))
  const success = results.filter(r => r.status === 'fulfilled').length
  if (success > 0) toast.success(`已${action} ${success} 个用户`)
  if (success < ids.length) toast.error(`${ids.length - success} 个用户操作失败`)
  selectedRows.value = []
  loadUsers()
}

async function handleBatchDelete() {
  const ids = selectedRows.value.map(row => row.userId)
  if (!ids.length) {
    toast.warning('请先选择用户')
    return
  }
  try {
    await ElMessageBox.confirm(`确认批量删除选中的 ${ids.length} 个用户？此操作不可撤销！`, '批量删除', {
      type: 'error',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  const results = await Promise.allSettled(ids.map(id => deleteUser(id)))
  const success = results.filter(r => r.status === 'fulfilled').length
  if (success > 0) toast.success(`已删除 ${success} 个用户`)
  if (success < ids.length) toast.error(`${ids.length - success} 个用户删除失败`)
  selectedRows.value = []
  loadUsers()
}

function handleImportFile(file: { raw?: File }) {
  importFile.value = file.raw || null
  importResult.value = null
}

function parseImportContent(text: string, fileName: string): BatchImportItem[] {
  if (fileName.toLowerCase().endsWith('.json')) {
    const data = JSON.parse(text)
    return Array.isArray(data) ? data : (data.users || [])
  }
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(item => item.trim())
  return lines.slice(1).map(line => {
    const cells = line.split(',').map(item => item.trim())
    const record: Record<string, unknown> = {}
    headers.forEach((header, index) => {
      const value = cells[index] || ''
      record[header] = header === 'departmentId' ? (Number(value) || undefined) : value
    })
    return record as unknown as BatchImportItem
  })
}

async function parseExcelImport(file: File): Promise<BatchImportItem[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
  return rows.map(row => ({
    openid: String(row.openid ?? ''),
    userName: String(row.userName ?? ''),
    department: String(row.department ?? ''),
    departmentId: row.departmentId ? Number(row.departmentId) : undefined,
    role: String(row.role ?? 'employee'),
  }))
}

async function handleImportUsers() {
  if (!importFile.value) {
    toast.warning('请选择导入文件')
    return
  }
  importLoading.value = true
  try {
    const fileName = importFile.value.name.toLowerCase()
    const users = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
      ? await parseExcelImport(importFile.value)
      : parseImportContent(await importFile.value.text(), importFile.value.name)
    if (!users.length) {
      toast.warning('文件中没有可导入的用户')
      return
    }
    importResult.value = await batchImportUsers(users)
    toast.success(`导入完成：成功 ${importResult.value.success}，失败 ${importResult.value.failed}`)
    loadUsers()
  } catch {
    toast.error('导入失败，请检查文件格式')
  } finally {
    importLoading.value = false
  }
}

function downloadExcelImportTemplate() {
  const template: BatchImportItem[] = [{
    openid: '',
    userName: '示例用户',
    department: '技术部',
    departmentId: 1,
    role: 'employee'
  }]
  const worksheet = XLSX.utils.json_to_sheet(template)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '用户导入模板')
  XLSX.writeFile(workbook, 'user-import-template.xlsx')
}

function handleExportUsers() {
  const headers = ['userId', 'userName', 'nickName', 'department', 'role', 'status', 'phone', 'email']
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const rows = userList.value.map(row => [
    row.userId, row.userName, row.nickName, row.department, row.role, row.status, row.phone, row.email
  ].map(escape).join(','))
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'users.csv'
  link.click()
  URL.revokeObjectURL(url)
}

async function handleExportUsersExcel() {
  exportLoading.value = true
  try {
    const params: UserListParams = {
      page: 1,
      pageSize: 10000,
      status: 'all',
    }
    if (keyword.value) params.keyword = keyword.value
    if (roleFilter.value) params.role = roleFilter.value
    if (deptFilter.value) params.department = deptFilter.value

    const res = await getUserList(params)
    const rows = res.list.map(row => ({
      userId: row.userId,
      userName: row.userName || '',
      nickName: row.nickName || '',
      workerCode: row.workerCode || '',
      department: row.department || '',
      departmentId: row.departmentId ?? '',
      position: row.position || '',
      role: row.role || '',
      status: row.status || '',
      phone: row.phone || '',
      email: row.email || '',
      bizTripStatus: row.bizTripStatus || '',
      lastLoginTime: row.lastLoginTime || '',
      createdAt: row.createdAt || '',
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '用户列表')
    XLSX.writeFile(workbook, `users-${currentDateInBeijing()}.xlsx`)
    toast.success(`已导出 ${rows.length} 条用户数据`)
  } catch {
    toast.error('导出Excel失败')
  } finally {
    exportLoading.value = false
  }
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
  const valid = await createFormRef.value?.validate().catch(() => false)
  if (!valid) return
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
  const valid = await inviteFormRef.value?.validate().catch(() => false)
  if (!valid) return
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
        <h3>用户管理</h3>
        <span class="total-hint">共 {{ total }} 人</span>
      </div>
      <div class="toolbar-right">
        <el-input v-model="keyword" placeholder="搜索用户名 / 部门" clearable :prefix-icon="Search" style="width: 220px" size="default" @clear="handleSearch" @keyup.enter="handleSearch" />
        <el-select v-model="roleFilter" placeholder="角色" style="width: 120px" size="default" @change="handleSearch">
          <el-option v-for="opt in roleOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="状态" style="width: 110px" size="default" @change="handleSearch">
          <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-tree-select
          v-model="deptFilter"
          :data="departmentList"
          :props="{ value: 'name', label: 'name', children: 'children' }"
          placeholder="部门"
          check-strictly
          clearable
          style="width: 160px"
          size="default"
          @change="handleSearch"
        />
        <el-button type="primary" :icon="Plus" @click="createVisible = true">注册新用户</el-button>
        <el-button @click="inviteVisible = true">邀请用户</el-button>
        <el-button @click="genCodeVisible = true; genCodeCount = 1">生成邀请码</el-button>
        <el-button :icon="Upload" @click="importVisible = true">导入用户</el-button>
        <el-button :icon="Download" @click="handleExportUsers">导出CSV</el-button>
        <el-button :icon="Download" :loading="exportLoading" @click="handleExportUsersExcel">导出Excel</el-button>
        <el-button @click="downloadExcelImportTemplate">下载Excel模板</el-button>
        <el-button :icon="Refresh" @click="loadUsers">刷新</el-button>
      </div>
    </div>

    <!-- 批量操作 -->
    <div class="batch-bar" v-if="selectedRows.length">
      <span>已选 {{ selectedRows.length }} 人</span>
      <el-button size="small" type="success" @click="handleBatchStatus('active')">批量启用</el-button>
      <el-button size="small" type="warning" @click="handleBatchStatus('disabled')">批量禁用</el-button>
      <el-button size="small" type="danger" @click="handleBatchDelete">批量删除</el-button>
    </div>

    <!-- 表格 -->
    <el-table
      :data="userList"
      v-loading="loading"
      stripe
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="48" />
      <el-table-column label="用户" min-width="180">
        <template #default="{ row }">
          <div class="user-cell">
            <el-avatar :size="32" :src="row.avatarUrl">{{ (row.nickName || row.userName || 'U').charAt(0) }}</el-avatar>
            <div class="user-info">
              <div class="user-name">{{ row.nickName || row.userName }}</div>
              <div class="user-sub" v-if="row.email || row.phone">{{ row.email || row.phone }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="department" label="部门" min-width="110">
        <template #default="{ row }">{{ row.department || '-' }}</template>
      </el-table-column>
      <el-table-column label="角色" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getRoleTagType(row.role)" size="small">{{ getRoleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="职务" width="90" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.position" type="primary" size="small">{{ row.position }}</el-tag>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="出差" width="80" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.bizTripStatus === 'field'" type="warning" size="small">出差</el-tag>
          <el-tag v-else type="info" size="small">公司</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最后登录" width="150">
        <template #default="{ row }">{{ row.lastLoginTime || '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="340" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'pending'">
            <el-button size="small" type="success" link @click="handleApprove(row)">审核通过</el-button>
          </template>
          <template v-else>
            <el-button size="small" link :icon="View" @click="openDetail(row)">详情</el-button>
            <el-button size="small" type="primary" link :icon="Edit" @click="openEditDialog(row)">编辑</el-button>
            <el-button v-if="row.role !== 'superadmin'" size="small" :type="row.role === 'admin' ? 'warning' : 'primary'" link @click="handleRoleSwitch(row)">{{ row.role === 'admin' ? '取消管理员' : '设为管理员' }}</el-button>
            <el-button size="small" link :icon="Key" @click="openResetPassword(row)">重置密码</el-button>
            <el-button size="small" :type="row.status === 'active' ? 'danger' : 'success'" link @click="handleToggleStatus(row)">{{ row.status === 'active' ? '禁用' : '启用' }}</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
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
        <el-form-item label="职务">
          <el-select v-model="editForm.position" placeholder="选择职务" clearable style="width:100%">
            <el-option v-for="p in positionOptions" :key="p" :label="p" :value="p" />
          </el-select>
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
      <el-form ref="createFormRef" :model="createForm" :rules="createFormRules" label-width="80px">
        <el-form-item label="微信OpenID">
          <el-input v-model="createForm.openid" placeholder="仅在需要提前注册时填写" />
        </el-form-item>
        <el-form-item label="姓名" prop="userName">
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
      <el-form ref="inviteFormRef" :model="inviteForm" :rules="inviteFormRules" label-width="80px">
        <el-form-item label="微信OpenID" prop="openid">
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

    <!-- 用户详情弹窗 -->
    <el-dialog v-model="detailVisible" title="用户详情" width="600px" destroy-on-close>
      <div v-loading="detailLoading">
        <el-descriptions v-if="detailData" :column="2" border>
          <el-descriptions-item label="姓名">{{ detailData.nickName || detailData.userName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ detailData.userName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ detailData.department || '-' }}</el-descriptions-item>
          <el-descriptions-item label="职务">{{ detailData.position || '-' }}</el-descriptions-item>
          <el-descriptions-item label="角色">{{ getRoleLabel(detailData.role) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(detailData.status)" size="small">{{ getStatusLabel(detailData.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detailData.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ detailData.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="最后登录">{{ detailData.lastLoginTime || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ detailData.createdAt || '-' }}</el-descriptions-item>
        </el-descriptions>
        <el-empty v-else-if="!detailLoading" description="暂无详情数据" :image-size="60" />
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码弹窗 -->
    <el-dialog v-model="resetPwdVisible" title="重置密码" width="420px" destroy-on-close>
      <el-alert type="warning" :closable="false" style="margin-bottom:16px">
        <template #title>{{ resetPwdTarget?.nickName || resetPwdTarget?.userName }} 的密码将被重置</template>
      </el-alert>
      <el-form :model="resetPwdForm" label-width="90px">
        <el-form-item label="新密码">
          <el-input v-model="resetPwdForm.password" type="password" show-password placeholder="至少6位" />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="resetPwdForm.confirmPassword" type="password" show-password placeholder="再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="resetPwdLoading" @click="handleResetPassword">确认重置</el-button>
      </template>
    </el-dialog>

    <!-- 导入用户弹窗 -->
    <el-dialog v-model="importVisible" title="导入用户" width="560px" destroy-on-close>
      <el-upload
        drag
        :auto-upload="false"
        :on-change="handleImportFile"
        accept=".xlsx,.xls,.json,.csv"
        :limit="1"
        :on-exceed="() => toast.warning('每次只能选择一个文件')"
      >
        <div>拖拽 Excel、JSON 或 CSV 文件到此处，或点击选择</div>
        <template #tip>
          <div class="import-tip">字段：openid、userName、department、departmentId、role；可先下载 Excel 模板。</div>
        </template>
      </el-upload>
      <el-alert
        v-if="importResult"
        :type="importResult.failed ? 'warning' : 'success'"
        :closable="false"
        style="margin-top:16px"
        :title="`成功 ${importResult.success} 条，失败 ${importResult.failed} 条`"
      />
      <template #footer>
        <el-button @click="importVisible = false">关闭</el-button>
        <el-button type="primary" :loading="importLoading" @click="handleImportUsers">开始导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.user-page { padding: 0; }
.toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
  .toolbar-left {
    display: flex; align-items: center; gap: 12px;
    h3 { margin: 0; font-size: 18px; font-weight: 600; color: #303133; }
    .total-hint { font-size: 13px; color: #909399; }
  }
  .toolbar-right { display: flex; align-items: center; gap: 8px; }
}

.user-cell {
  display: flex; align-items: center; gap: 10px;
  .user-name { font-size: 14px; font-weight: 500; color: #303133; }
  .user-sub { font-size: 12px; color: #909399; margin-top: 2px; }
}

.text-muted { color: #C0C4CC; font-size: 13px; }

.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }

.batch-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #F0F7FF;
  border: 1px solid #D6E4FF;
  border-radius: 6px;
  color: #2B6DE8;
  font-size: 13px;
}

.import-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

.code-list-box {
  max-height: 300px; overflow-y: auto;
  background: #f5f7fa; border: 1px solid #e4e7ed; border-radius: 4px;
  padding: 12px 16px;
  .code-item {
    margin: 0; padding: 4px 0;
    font-family: monospace; font-size: 16px; color: #303133;
    border-bottom: 1px dashed #e4e7ed;
    &:last-child { border-bottom: none; }
  }
}
</style>
