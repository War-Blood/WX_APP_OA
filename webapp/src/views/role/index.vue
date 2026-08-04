<template>
  <div class="role-page">
    <!-- 左侧角色分组树 -->
    <div class="tree-panel">
      <div class="panel-header">
        <h4>角色与权限</h4>
        <el-button v-if="isSuperAdmin" :icon="Plus" size="small" type="primary" @click="openCreateGroup">新增分组</el-button>
      </div>
      <div class="role-tree">
        <div v-for="group in groupList" :key="group.id" class="role-group">
          <div
            class="group-title"
            :class="{ active: selectedGroupId === group.id }"
            @click="selectGroup(group.id)"
          >
            <el-icon :size="16"><FolderOpened /></el-icon>
            <span>{{ group.name }}</span>
            <el-tag v-if="group.isSystem" size="small" type="info" class="sys-tag">系统</el-tag>
          </div>
          <div v-if="selectedGroupId === group.id || expandedGroups.has(group.id)" class="group-roles">
            <div
              v-for="role in getRolesByGroup(group.id)"
              :key="role.id"
              class="role-item"
              :class="{ active: selectedRole?.id === role.id }"
              @click="selectRole(role)"
            >
              <span class="role-name">{{ role.name }}</span>
              <el-tag :type="role.status === 'active' ? 'success' : 'info'" size="small">
                {{ role.status === 'active' ? '启用' : '禁用' }}
              </el-tag>
            </div>
            <div class="group-actions">
              <el-button link size="small" type="primary" @click="openCreateRole(group.id)">+ 添加角色</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧详情面板 -->
    <div class="detail-panel" v-if="selectedRole">
      <!-- 角色信息头 -->
      <div class="role-header">
        <div>
          <h3>{{ selectedRole.name }}</h3>
          <span class="role-code">{{ selectedRole.code }}</span>
          <el-tag v-if="selectedRole.isSystem" size="small" type="warning" style="margin-left:8px">系统角色</el-tag>
        </div>
        <div>
          <el-button size="small" @click="openEditRole(selectedRole)">编辑</el-button>
          <el-button v-if="!selectedRole.isSystem" size="small" type="danger" @click="handleDeleteRole(selectedRole)">删除</el-button>
        </div>
      </div>

      <!-- 标签页 -->
      <el-tabs v-model="activeTab" class="role-tabs">
        <el-tab-pane label="角色成员" name="members">
          <div class="member-panel">
            <div class="member-toolbar">
              <span class="member-total">共 {{ memberTotal }} 人</span>
              <el-button
                v-if="selectedRole.code !== 'employee'"
                size="small"
                type="primary"
                @click="openMemberDialog"
              >
                添加成员
              </el-button>
            </div>
            <el-table :data="roleMembers" v-loading="memberLoading" stripe border>
              <el-table-column label="姓名" min-width="120">
                <template #default="{ row }">{{ row.nickName || row.userName }}</template>
              </el-table-column>
              <el-table-column label="部门" min-width="140">
                <template #default="{ row }">{{ row.department || '-' }}</template>
              </el-table-column>
              <el-table-column label="状态" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                    {{ getMemberStatusLabel(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="90" align="center">
                <template #default="{ row }">
                  <el-button
                    v-if="selectedRole.code !== 'employee'"
                    size="small"
                    link
                    type="danger"
                    @click="removeMember(row)"
                  >
                    移除
                  </el-button>
                  <span v-else>—</span>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!roleMembers.length && !memberLoading" description="暂无成员" :image-size="60" />
          </div>
        </el-tab-pane>

        <el-tab-pane label="功能权限" name="permissions">
          <div class="perm-matrix">
            <el-checkbox
              v-model="selectAllPerms"
              :indeterminate="isIndeterminate"
              @change="handleSelectAllPerms"
              style="margin-bottom:12px"
            >
              全选
            </el-checkbox>

            <div v-for="group in permissionGroups" :key="group.groupCode" class="perm-group-card">
              <div class="perm-group-header">
                <el-checkbox
                  :model-value="isGroupAllSelected(group)"
                  :indeterminate="isGroupPartial(group)"
                  @change="(val: boolean) => toggleGroup(group, val)"
                >
                  {{ group.groupName }}
                </el-checkbox>
              </div>
              <div class="perm-items">
                <el-checkbox
                  v-for="perm in group.permissions"
                  :key="perm.id"
                  :model-value="checkedPermIds.includes(perm.id)"
                  size="small"
                  @change="(val: boolean) => togglePerm(perm.id, val)"
                >
                  {{ perm.name }}
                </el-checkbox>
              </div>
            </div>
          </div>
          <div style="margin-top:16px">
            <el-button type="primary" :loading="permSaving" @click="handleSavePermissions">保存权限</el-button>
          </div>
        </el-tab-pane>

        <el-tab-pane label="数据范围" name="datascope">
          <div class="tab-placeholder">
            <el-alert type="info" :closable="false" title="数据范围功能已预留，暂不启用" description="后续版本将支持按角色设置查看范围（本人/本部门/本部门及下属/全部）和管理范围（我负责的/我创建的/我参与的/我可见的）。" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 空状态 -->
    <div class="detail-panel empty-panel" v-else>
      <el-empty description="选择左侧角色查看权限配置" :image-size="80" />
    </div>

    <!-- 新增/编辑角色弹窗 -->
    <el-dialog v-model="roleDialogVisible" :title="isRoleEdit ? '编辑角色' : '新增角色'" width="440px" destroy-on-close>
      <el-form ref="roleFormRef" :model="roleForm" :rules="roleFormRules" label-width="80px">
        <el-form-item label="角色标识" prop="code">
          <el-input v-model="roleForm.code" placeholder="小写字母+数字+下划线" :disabled="isRoleEdit" />
        </el-form-item>
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" placeholder="角色名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="roleForm.description" placeholder="可选描述" />
        </el-form-item>
        <el-form-item label="所属分组">
          <el-select v-model="roleForm.groupId" placeholder="选择分组" style="width:100%">
            <el-option v-for="g in groupList" :key="g.id" :label="g.name" :value="g.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="roleSaving" @click="handleSaveRole">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新增分组弹窗 -->
    <el-dialog v-model="groupDialogVisible" title="新增角色分组" width="400px" destroy-on-close>
      <el-form ref="groupFormRef" :model="groupForm" :rules="groupFormRules" label-width="80px">
        <el-form-item label="分组标识" prop="code">
          <el-input v-model="groupForm.code" placeholder="小写字母+数字+下划线" />
        </el-form-item>
        <el-form-item label="分组名称" prop="name">
          <el-input v-model="groupForm.name" placeholder="分组名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="groupForm.description" placeholder="可选描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="groupSaving" @click="handleSaveGroup">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加角色成员 -->
    <el-dialog v-model="memberDialogVisible" title="添加角色成员" width="520px" destroy-on-close>
      <el-select
        v-model="memberCandidateId"
        filterable
        remote
        reserve-keyword
        clearable
        placeholder="搜索用户姓名"
        :remote-method="loadMemberCandidates"
        :loading="memberCandidateLoading"
        style="width: 100%"
      >
        <el-option
          v-for="user in memberCandidates"
          :key="user.userId"
          :label="`${user.nickName || user.userName} (${user.department || '未分配部门'})`"
          :value="user.userId"
        />
      </el-select>
      <template #footer>
        <el-button @click="memberDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="memberSaving" @click="handleAddMember">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@/utils/toast'
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, FolderOpened } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  getRoleList, getRoleDetail, createRole, updateRole, deleteRole,
  getPermissionList, setRolePermissions,
  getRoleGroupList, createRoleGroup,
  type RoleItem, type PermissionGroup, type RoleGroupItem,
} from '@/api/role'
import { getUserList, updateUser, type UserItem } from '@/api/user'

const userStore = useUserStore()
const isSuperAdmin = computed(() => userStore.userInfo?.role === 'superadmin')

// ---- 分组 & 角色树 ----
const groupList = ref<RoleGroupItem[]>([])
const roleList = ref<RoleItem[]>([])
const selectedGroupId = ref<number | null>(null)
const selectedRole = ref<RoleItem | null>(null)
const expandedGroups = ref(new Set<number>())

function getRolesByGroup(groupId: number) {
  return roleList.value.filter(r => r.groupId === groupId)
}

async function selectGroup(groupId: number) {
  selectedGroupId.value = groupId
  expandedGroups.value.add(groupId)
}

async function selectRole(role: RoleItem) {
  selectedRole.value = role
  loadRoleMembers()
  // 加载角色权限
  try {
    const detail = await getRoleDetail(role.id)
    checkedPermIds.value = (detail.permissions || []).map(p => p.id)
  } catch { checkedPermIds.value = [] }
}

async function loadTree() {
  try {
    const [groups, roles] = await Promise.all([getRoleGroupList(), getRoleList()])
    groupList.value = groups
    roleList.value = roles
    if (groups.length && !selectedGroupId.value) {
      selectedGroupId.value = groups[0].id
      expandedGroups.value.add(groups[0].id)
    }
  } catch {
    groupList.value = []
    roleList.value = []
  }
}

// ---- 权限矩阵 ----
const activeTab = ref('permissions')
const permissionGroups = ref<PermissionGroup[]>([])
const checkedPermIds = ref<number[]>([])
const permSaving = ref(false)
const selectAllPerms = computed(() => {
  const all = permissionGroups.value.flatMap(g => g.permissions)
  return checkedPermIds.value.length === all.length && all.length > 0
})
const isIndeterminate = computed(() => {
  const all = permissionGroups.value.flatMap(g => g.permissions)
  return checkedPermIds.value.length > 0 && checkedPermIds.value.length < all.length
})

function isGroupAllSelected(group: PermissionGroup): boolean {
  return group.permissions.every(p => checkedPermIds.value.includes(p.id))
}
function isGroupPartial(group: PermissionGroup): boolean {
  const selected = group.permissions.filter(p => checkedPermIds.value.includes(p.id))
  return selected.length > 0 && selected.length < group.permissions.length
}
function toggleGroup(group: PermissionGroup, val: boolean) {
  const ids = group.permissions.map(p => p.id)
  if (val) {
    ids.forEach(id => { if (!checkedPermIds.value.includes(id)) checkedPermIds.value.push(id) })
  } else {
    checkedPermIds.value = checkedPermIds.value.filter(id => !ids.includes(id))
  }
}
function togglePerm(id: number, val: boolean) {
  if (val) { if (!checkedPermIds.value.includes(id)) checkedPermIds.value.push(id) }
  else { checkedPermIds.value = checkedPermIds.value.filter(i => i !== id) }
}
function handleSelectAllPerms(val: boolean) {
  if (val) {
    checkedPermIds.value = permissionGroups.value.flatMap(g => g.permissions.map(p => p.id))
  } else {
    checkedPermIds.value = []
  }
}

async function handleSavePermissions() {
  if (!selectedRole.value) return
  permSaving.value = true
  try {
    await setRolePermissions(selectedRole.value.id, checkedPermIds.value)
    toast.success('权限已保存')
  } catch { /* handled */ }
  finally { permSaving.value = false }
}

// ---- 角色 CRUD ----
const roleDialogVisible = ref(false)
const isRoleEdit = ref(false)
const roleSaving = ref(false)
const roleForm = ref({ code: '', name: '', description: '', groupId: null as number | null })
const roleFormRef = ref<FormInstance>()
const roleFormRules: FormRules = {
  code: [
    { required: true, message: '请输入角色标识', trigger: 'blur' },
    { pattern: /^[a-z0-9_]+$/, message: '仅支持小写字母、数字和下划线', trigger: 'blur' }
  ],
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }]
}

// ---- 角色成员 ----
const roleMembers = ref<UserItem[]>([])
const memberTotal = ref(0)
const memberLoading = ref(false)
const memberDialogVisible = ref(false)
const memberCandidateId = ref<string | null>(null)
const memberCandidates = ref<UserItem[]>([])
const memberCandidateLoading = ref(false)
const memberSaving = ref(false)

async function loadRoleMembers() {
  if (!selectedRole.value) return
  memberLoading.value = true
  try {
    const res = await getUserList({
      page: 1,
      pageSize: 200,
      role: selectedRole.value.code
    })
    roleMembers.value = res.list
    memberTotal.value = res.total
  } catch {
    roleMembers.value = []
    memberTotal.value = 0
  } finally {
    memberLoading.value = false
  }
}

function getMemberStatusLabel(status: string) {
  const map: Record<string, string> = {
    active: '正常',
    pending: '待审核',
    disabled: '已禁用'
  }
  return map[status] || status
}

async function openMemberDialog() {
  memberDialogVisible.value = true
  memberCandidateId.value = null
  await loadMemberCandidates()
}

async function loadMemberCandidates(keyword?: string) {
  memberCandidateLoading.value = true
  try {
    const res = await getUserList({ page: 1, pageSize: 50, keyword })
    const memberIds = new Set(roleMembers.value.map(member => member.userId))
    memberCandidates.value = res.list.filter(user => !memberIds.has(user.userId))
  } catch {
    memberCandidates.value = []
  } finally {
    memberCandidateLoading.value = false
  }
}

async function handleAddMember() {
  if (!selectedRole.value || !memberCandidateId.value) {
    toast.warning('请选择要添加的用户')
    return
  }
  memberSaving.value = true
  try {
    await updateUser(memberCandidateId.value, { role: selectedRole.value.code })
    toast.success('成员已添加')
    memberDialogVisible.value = false
    loadRoleMembers()
  } catch {
    // handled by interceptor
  } finally {
    memberSaving.value = false
  }
}

async function removeMember(row: UserItem) {
  if (!selectedRole.value) return
  try {
    await ElMessageBox.confirm(`确定将「${row.nickName || row.userName}」移出该角色？`, '移除成员', {
      type: 'warning',
      confirmButtonText: '确定移除',
      cancelButtonText: '取消'
    })
    await updateUser(row.userId, { role: 'employee' })
    toast.success('成员已移除')
    loadRoleMembers()
  } catch {
    // cancelled or handled by interceptor
  }
}

function openCreateRole(groupId: number) {
  isRoleEdit.value = false
  roleForm.value = { code: '', name: '', description: '', groupId }
  roleDialogVisible.value = true
}
function openEditRole(role: RoleItem) {
  isRoleEdit.value = true
  roleForm.value = { code: role.code, name: role.name, description: role.description || '', groupId: role.groupId ?? null }
  roleDialogVisible.value = true
}
async function handleSaveRole() {
  const valid = await roleFormRef.value?.validate().catch(() => false)
  if (!valid) return
  roleSaving.value = true
  try {
    if (isRoleEdit.value && selectedRole.value) {
      await updateRole(selectedRole.value.id, {
        name: roleForm.value.name,
        description: roleForm.value.description,
        groupId: roleForm.value.groupId
      })
      toast.success('角色已更新')
    } else {
      await createRole({
        code: roleForm.value.code,
        name: roleForm.value.name,
        description: roleForm.value.description,
        groupId: roleForm.value.groupId
      })
      toast.success('角色已创建')
    }
    roleDialogVisible.value = false
    loadTree()
  } catch { /* handled */ }
  finally { roleSaving.value = false }
}
async function handleDeleteRole(role: RoleItem) {
  try {
    await ElMessageBox.confirm(`确定要删除「${role.name}」吗？`, '删除角色', { type: 'error', confirmButtonText: '删除' })
    await deleteRole(role.id)
    toast.success('已删除')
    selectedRole.value = null
    loadTree()
  } catch { /* cancel */ }
}

// ---- 分组 CRUD ----
const groupDialogVisible = ref(false)
const groupSaving = ref(false)
const groupForm = ref({ code: '', name: '', description: '' })
const groupFormRef = ref<FormInstance>()
const groupFormRules: FormRules = {
  code: [
    { required: true, message: '请输入分组标识', trigger: 'blur' },
    { pattern: /^[a-z0-9_]+$/, message: '仅支持小写字母、数字和下划线', trigger: 'blur' }
  ],
  name: [{ required: true, message: '请输入分组名称', trigger: 'blur' }]
}

function openCreateGroup() {
  groupForm.value = { code: '', name: '', description: '' }
  groupDialogVisible.value = true
}
async function handleSaveGroup() {
  const valid = await groupFormRef.value?.validate().catch(() => false)
  if (!valid) return
  groupSaving.value = true
  try {
    await createRoleGroup({ code: groupForm.value.code, name: groupForm.value.name, description: groupForm.value.description })
    toast.success('分组已创建')
    groupDialogVisible.value = false
    loadTree()
  } catch { /* handled */ }
  finally { groupSaving.value = false }
}

// ---- init ----
onMounted(async () => {
  await loadTree()
  try { permissionGroups.value = await getPermissionList() } catch { permissionGroups.value = [] }
})
</script>

<style scoped lang="scss">
.role-page {
  display: flex; height: calc(100vh - 136px); gap: 0;

  .tree-panel {
    width: 240px; min-width: 240px;
    background: #fff; border-right: 1px solid #E4E7ED;
    display: flex; flex-direction: column;
    overflow-y: auto;

    .panel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 12px 8px;
      h4 { margin: 0; font-size: 14px; }
    }

    .role-group {
      .group-title {
        display: flex; align-items: center; gap: 6px;
        padding: 8px 12px; cursor: pointer; font-size: 13px; color: #303133;
        border-radius: 4px; margin: 2px 8px;
        .sys-tag { margin-left: auto; }
        &:hover { background: #F0F2F5; }
        &.active { background: #E6F1FB; color: #2B6DE8; }
      }
      .group-roles { padding-left: 8px; }
      .role-item {
        display: flex; align-items: center; justify-content: space-between;
        padding: 6px 12px 6px 28px; cursor: pointer; font-size: 13px; border-radius: 4px; margin: 1px 8px;
        &:hover { background: #F0F2F5; }
        &.active { background: #E6F1FB; color: #2B6DE8; font-weight: 500; }
      }
      .group-actions { padding: 4px 12px 4px 28px; }
    }
  }

  .detail-panel {
    flex: 1; overflow-y: auto; padding: 16px 20px; background: #F5F7FA;

    .role-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px;
      h3 { margin: 0; display: inline; font-size: 16px; }
      .role-code { font-size: 12px; color: #909399; margin-left: 8px; }
    }

    .role-tabs { background: #fff; border-radius: 8px; padding: 0 16px 16px; }

    .perm-matrix {
      .perm-group-card {
        border: 1px solid #E4E7ED; border-radius: 6px; padding: 12px; margin-bottom: 12px;
        .perm-group-header { margin-bottom: 8px; font-weight: 500; }
        .perm-items { display: flex; flex-wrap: wrap; gap: 8px 24px; padding-left: 8px; }
      }
    }

    .tab-placeholder { padding: 40px 0; }

    .member-panel {
      .member-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;

        .member-total {
          font-size: 13px;
          color: #909399;
        }
      }
    }
  }

  .empty-panel { display: flex; align-items: center; justify-content: center; }
}
</style>
