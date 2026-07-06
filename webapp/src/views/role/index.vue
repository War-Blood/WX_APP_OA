import { toast } from '@/utils/toast'
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Refresh } from '@element-plus/icons-vue'
import {
  getRoleList, createRole, updateRole, deleteRole,
  getPermissionList, setRolePermissions, getRoleDetail,
  type RoleItem, type PermissionGroup
} from '@/api/role'

// 表格数据
const loading = ref(false)
const roleList = ref<RoleItem[]>([])
const permissionGroups = ref<PermissionGroup[]>([])

// 创建/编辑弹窗
const dialogVisible = ref(false)
const dialogLoading = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const form = ref({ code: '', name: '', description: '' })

// 权限配置弹窗
const permVisible = ref(false)
const permLoading = ref(false)
const currentRole = ref<RoleItem | null>(null)
const checkedPermIds = ref<number[]>([])

async function loadRoles() {
  loading.value = true
  try {
    roleList.value = await getRoleList()
  } catch { roleList.value = [] }
  finally { loading.value = false }
}

async function loadPermissions() {
  try {
    permissionGroups.value = await getPermissionList()
  } catch { permissionGroups.value = [] }
}

// 打开创建弹窗
function openCreate() {
  isEdit.value = false
  editId.value = null
  form.value = { code: '', name: '', description: '' }
  dialogVisible.value = true
}

// 打开编辑弹窗
function openEdit(row: RoleItem) {
  isEdit.value = true
  editId.value = row.id
  form.value = { code: row.code, name: row.name, description: row.description || '' }
  dialogVisible.value = true
}

// 保存角色
async function handleSave() {
  if (!form.value.name.trim()) { toast.warning('请输入角色名称'); return }
  if (!isEdit.value && !form.value.code.trim()) { toast.warning('请输入角色标识'); return }

  dialogLoading.value = true
  try {
    if (isEdit.value && editId.value) {
      await updateRole(editId.value, { name: form.value.name, description: form.value.description })
      toast.success('角色已更新')
    } else {
      await createRole({ code: form.value.code, name: form.value.name, description: form.value.description })
      toast.success('角色已创建')
    }
    dialogVisible.value = false
    loadRoles()
  } catch { /* handled by interceptor */ }
  finally { dialogLoading.value = false }
}

// 删除角色
async function handleDelete(row: RoleItem) {
  if (row.isSystem) { toast.warning('系统角色不可删除'); return }
  try {
    await ElMessageBox.confirm(`确定要删除角色「${row.name}」吗？`, '删除角色', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'error' })
    await deleteRole(row.id)
    toast.success('角色已删除')
    loadRoles()
  } catch { /* cancel */ }
}

// 打开权限配置弹窗
async function openPermission(row: RoleItem) {
  currentRole.value = row
  permVisible.value = true
  try {
    const detail = await getRoleDetail(row.id)
    checkedPermIds.value = (detail.permissions || []).map(p => p.id)
  } catch {
    checkedPermIds.value = []
  }
}

// 保存权限配置
async function handleSavePermissions() {
  if (!currentRole.value) return
  permLoading.value = true
  try {
    await setRolePermissions(currentRole.value.id, checkedPermIds.value)
    toast.success('权限已更新')
    permVisible.value = false
    loadRoles()
  } catch { /* handled by interceptor */ }
  finally { permLoading.value = false }
}

onMounted(() => { loadRoles(); loadPermissions() })
</script>

<template>
  <div class="role-page">
    <div class="toolbar">
      <h3>角色管理</h3>
      <div class="toolbar-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">新增角色</el-button>
        <el-button :icon="Refresh" @click="loadRoles">刷新</el-button>
      </div>
    </div>

    <el-table :data="roleList" v-loading="loading" stripe border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="code" label="角色标识" width="140" />
      <el-table-column prop="name" label="角色名称" min-width="140" />
      <el-table-column prop="description" label="描述" min-width="180">
        <template #default="{ row }">{{ row.description || '-' }}</template>
      </el-table-column>
      <el-table-column label="类型" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isSystem ? 'warning' : 'info'" size="small">
            {{ row.isSystem ? '系统角色' : '自定义' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
            {{ row.status === 'active' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="openPermission(row)">权限配置</el-button>
          <el-button size="small" link :icon="Edit" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm
            v-if="!row.isSystem"
            title="确定要删除这个角色吗？"
            confirm-button-text="删除"
            cancel-button-text="取消"
            @confirm="handleDelete(row)"
          >
            <template #reference>
              <el-button size="small" type="danger" link :icon="Delete">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑角色' : '新增角色'" width="480px" destroy-on-close>
      <el-form :model="form" label-width="80px">
        <el-form-item label="角色标识" required>
          <el-input v-model="form.code" :disabled="isEdit" placeholder="小写字母+数字+下划线" />
        </el-form-item>
        <el-form-item label="角色名称" required>
          <el-input v-model="form.name" placeholder="角色名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="角色描述（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dialogLoading" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 权限配置弹窗 -->
    <el-dialog v-model="permVisible" :title="`权限配置 - ${currentRole?.name || ''}`" width="640px" destroy-on-close>
      <el-checkbox-group v-model="checkedPermIds">
        <div v-for="group in permissionGroups" :key="group.groupCode" class="perm-group">
          <div class="perm-group-title">{{ group.groupName }}</div>
          <div class="perm-group-items">
            <el-checkbox v-for="perm in group.permissions" :key="perm.id" :value="perm.id">
              {{ perm.name }}
            </el-checkbox>
          </div>
        </div>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="permVisible = false">取消</el-button>
        <el-button type="primary" :loading="permLoading" @click="handleSavePermissions">保存权限</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.role-page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
  h3 { margin: 0; font-size: 18px; }
  .toolbar-actions { display: flex; gap: 8px; }
}
.perm-group { margin-bottom: 16px; border: 1px solid #ebeef5; border-radius: 4px; padding: 12px;
  .perm-group-title { font-weight: bold; margin-bottom: 8px; color: #303133; padding-bottom: 8px; border-bottom: 1px solid #ebeef5; }
  .perm-group-items { display: flex; flex-wrap: wrap; gap: 12px; }
}
</style>
