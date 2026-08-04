<template>
  <div class="org-page">
    <!-- 左侧部门树面板 -->
    <div class="tree-panel">
      <div class="panel-header">
        <h4>部门树</h4>
        <el-button
          v-if="isSuperAdmin"
          size="small"
          type="primary"
          :icon="Plus"
          @click="openCreate()"
        >
          新增根部门
        </el-button>
        <el-tooltip v-else content="右键部门节点进行操作">
          <span class="hint">右键操作</span>
        </el-tooltip>
      </div>

      <div
        class="unassigned-node"
        :class="{ active: isUnassigned }"
        @click="handleUnassigned"
      >
        <el-icon :size="14"><User /></el-icon>
        <span>未分配人员</span>
        <el-tag size="small" type="info" v-if="unassignedCount > 0">{{ unassignedCount }}</el-tag>
      </div>

      <el-input
        v-model="filterText"
        placeholder="搜索部门"
        clearable
        size="small"
        class="tree-filter"
      />

      <el-tree
        ref="treeRef"
        :data="departmentTree"
        :props="{ children: 'children', label: 'name' }"
        :filter-node-method="filterNode"
        :expand-on-click-node="false"
        node-key="id"
        default-expand-all
        highlight-current
        draggable
        :allow-drop="allowDrop"
        @node-click="handleNodeClick"
        @node-contextmenu="handleContextMenu"
        @node-drop="handleDrop"
      >
        <template #default="{ data }">
          <span class="tree-node">
            <span class="node-name">{{ data.name }}</span>
            <span class="node-count" v-if="data.children?.length">
              {{ data.children.length }}
            </span>
          </span>
        </template>
      </el-tree>

      <!-- 右键菜单 -->
      <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      >
        <div class="menu-item" @click="openCreate(contextMenu.node!)">
          新增子部门
        </div>
        <div class="menu-item" @click="openEdit(contextMenu.node!)">
          编辑部门
        </div>
        <div class="menu-item danger" @click="handleDelete(contextMenu.node!)">
          删除部门
        </div>
      </div>
    </div>

    <!-- 右侧详情面板 -->
    <div class="detail-panel">
      <!-- 部门信息 -->
      <div class="panel-section">
        <div class="section-header">
          <h4>{{ selectedDept ? selectedDept.name : '部门详情' }}</h4>
          <el-button
            v-if="isSuperAdmin && selectedDept"
            type="primary"
            size="small"
            :icon="Plus"
            @click="openCreate(selectedDept)"
          >
            新增子部门
          </el-button>
        </div>

        <el-descriptions v-if="selectedDept" :column="2" border size="small">
          <el-descriptions-item label="部门名称" :span="2">
            {{ selectedDept.name }}
          </el-descriptions-item>
          <el-descriptions-item label="上级部门">
            {{ parentDeptName || '无（根部门）' }}
          </el-descriptions-item>
          <el-descriptions-item label="下级部门数">
            {{ selectedDept.children?.length || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ selectedDept.description || '暂无描述' }}
          </el-descriptions-item>
        </el-descriptions>

        <el-empty v-else description="请选择左侧部门查看详情" :image-size="80" />
      </div>

      <!-- 部门人员 -->
      <div class="panel-section" v-if="selectedDept || isUnassigned">
        <div class="section-header">
          <h4>{{ isUnassigned ? '未分配人员' : selectedDept?.name }} ({{ usersTotal }})</h4>
        </div>

        <el-table
          :data="departmentUsers"
          v-loading="usersLoading"
          stripe
          border
          size="small"
        >
          <el-table-column prop="userName" label="用户名" min-width="100" />
          <el-table-column prop="workerCode" label="工号" width="120" align="center">
            <template #default="{ row }">
              <span>{{ row.workerCode || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="phone" label="手机" width="130" align="center">
            <template #default="{ row }">
              <span>{{ row.phone || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="email" label="邮箱" min-width="160">
            <template #default="{ row }">
              <span>{{ row.email || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" fixed="right" align="center">
            <template #default="{ row }">
              <el-button size="small" type="primary" link @click="openUserEdit(row)">
                编辑
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="table-footer" v-if="usersTotal > 0">
          <span class="text-muted">共 {{ usersTotal }} 人</span>
        </div>
      </div>
    </div>

    <!-- 新增/编辑部门弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑部门' : '新增部门'"
      width="440px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="80px"
        @submit.prevent
      >
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入部门名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="上级部门" prop="parentId">
          <el-tree-select
            v-model="form.parentId"
            :data="departmentTree"
            :props="{ children: 'children', label: 'name', value: 'id' }"
            placeholder="请选择上级部门"
            check-strictly
            clearable
            :render-after-expand="false"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            placeholder="部门描述（选填）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dialogLoading" @click="handleSave">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑员工弹窗 -->
    <el-dialog
      v-model="userEditVisible"
      title="编辑员工信息"
      width="420px"
      destroy-on-close
    >
      <el-form :model="userEditForm" label-width="80px">
        <el-form-item label="员工">
          <span class="form-static">{{ editingUser?.nickname || editingUser?.userName }}</span>
        </el-form-item>
        <el-form-item label="部门">
          <el-tree-select
            v-model="userEditForm.departmentId"
            :data="departmentTree"
            :props="{ value: 'id', label: 'name', children: 'children' }"
            placeholder="选择部门"
            check-strictly
            clearable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="职位">
          <el-select v-model="userEditForm.position" placeholder="选择职位" clearable style="width:100%">
            <el-option v-for="p in positionOptions" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userEditVisible = false">取消</el-button>
        <el-button type="primary" :loading="userEditLoading" @click="handleUserEdit">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { toast } from '@/utils/toast'
import { ref, onMounted, nextTick, computed } from 'vue'
import { ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, User } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  getDepartmentTree, createDepartment, updateDepartment, deleteDepartment,
  getDepartmentUsers, getUnassignedUsers,
  type DepartmentItem, type DepartmentUser,
} from '@/api/org'
import { updateUser } from '@/api/user'

const userStore = useUserStore()
const isSuperAdmin = computed(() => userStore.userInfo?.role === 'superadmin')

// ---- 部门树 ----
const treeRef = ref()
const filterText = ref('')
const departmentTree = ref<DepartmentItem[]>([])
const selectedDept = ref<DepartmentItem | null>(null)
const isUnassigned = ref(false)
const unassignedCount = ref(0)
const parentDeptName = ref('')
const loading = ref(false)

watch(filterText, (val) => {
  treeRef.value?.filter(val)
})

function filterNode(value: string, data: DepartmentItem): boolean {
  if (!value) return true
  return data.name.includes(value)
}

// 查找父部门名称
function findParentName(tree: DepartmentItem[], targetId: number): string {
  for (const node of tree) {
    if (node.children) {
      const found = node.children.find(c => c.id === targetId)
      if (found) return node.name
      const deep = findParentName(node.children, targetId)
      if (deep) return deep
    }
  }
  return ''
}

function handleNodeClick(data: DepartmentItem) {
  isUnassigned.value = false
  selectedDept.value = data
  parentDeptName.value = data.parentId
    ? findParentName(departmentTree.value, data.id)
    : ''
  loadDepartmentUsers(data.id)
}

async function handleUnassigned() {
  isUnassigned.value = true
  selectedDept.value = null
  parentDeptName.value = ''
  await loadUnassignedUsers()
}

async function loadUnassignedUsers() {
  usersLoading.value = true
  try {
    const res = await getUnassignedUsers({ pageSize: 200 })
    departmentUsers.value = res.list || []
    usersTotal.value = res.total || 0
    unassignedCount.value = res.total || 0
  } catch {
    departmentUsers.value = []
    usersTotal.value = 0
  } finally {
    usersLoading.value = false
  }
}

// 首次加载时获取未分配人员数量
async function refreshUnassignedCount() {
  try {
    const res = await getUnassignedUsers({ pageSize: 1 })
    unassignedCount.value = res.total || 0
  } catch { /* ignore */ }
}

// ---- 右键菜单 ----
const contextMenu = ref({ visible: false, x: 0, y: 0, node: null as DepartmentItem | null })

function handleContextMenu(event: MouseEvent, data: DepartmentItem) {
  event.preventDefault()
  const menuWidth = 160
  const menuHeight = 112
  const x = Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8))
  const y = Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8))
  contextMenu.value = {
    visible: true,
    x,
    y,
    node: data,
  }
  // 点击其他区域关闭
  nextTick(() => {
    document.addEventListener('click', closeContextMenu, { once: true })
  })
}

function closeContextMenu() {
  contextMenu.value.visible = false
}

// ---- 拖拽排序 ----
import type Node from 'element-plus/es/components/tree/src/model/node'

function allowDrop(draggingNode: Node, dropNode: Node): boolean {
  // 禁止拖到自己里面（循环引用）
  if (draggingNode.data.id === dropNode.data.id) return false
  // 禁止拖到自己的后代节点下
  if (dropNode.parent) {
    let parent: Node | null = dropNode.parent
    while (parent) {
      if (parent.data.id === draggingNode.data.id) return false
      parent = parent.parent
    }
  }
  return isSuperAdmin.value
}

async function handleDrop(
  draggingNode: Node,
  dropNode: Node,
  dropType: string,
) {
  if (!isSuperAdmin.value) return
  const dragId = draggingNode.data.id as number
  let newParentId: number | null = null

  if (dropType === 'inner') {
    // 拖入节点内部 → 设为子节点
    newParentId = dropNode.data.id as number
  } else if (dropType === 'before' || dropType === 'after') {
    // 拖到同级 → parent_id 取目标节点的 parent_id
    newParentId = dropNode.data.parentId ?? null
  }

  try {
    await updateDepartment(dragId, { parentId: newParentId })
    toast.success('部门层级已更新')
    await loadTree()
  } catch {
    // revert handled by reloading
    loadTree()
  }
}

// ---- CRUD ----
const dialogVisible = ref(false)
const dialogLoading = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const form = ref({
  name: '',
  parentId: null as number | null,
  sortOrder: 0,
  description: '',
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
}

function openCreate(parent?: DepartmentItem) {
  if (!isSuperAdmin.value) { toast.warning('仅超级管理员可操作'); return }
  isEdit.value = false
  editId.value = null
  form.value = {
    name: '',
    parentId: parent?.id ?? null,
    sortOrder: 0,
    description: '',
  }
  dialogVisible.value = true
}

function openEdit(node: DepartmentItem) {
  if (!isSuperAdmin.value) { toast.warning('仅超级管理员可操作'); return }
  isEdit.value = true
  editId.value = node.id
  form.value = {
    name: node.name,
    parentId: node.parentId,
    sortOrder: node.sortOrder,
    description: node.description || '',
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  dialogLoading.value = true
  try {
    const payload = {
      name: form.value.name,
      parentId: form.value.parentId,
      sortOrder: form.value.sortOrder,
      description: form.value.description || undefined,
    }
    if (isEdit.value && editId.value) {
      await updateDepartment(editId.value, payload)
      toast.success('部门已更新')
    } else {
      await createDepartment(payload)
      toast.success('部门已创建')
    }
    dialogVisible.value = false
    await loadTree()
  } catch {
    // handled by interceptor
  } finally {
    dialogLoading.value = false
  }
}

async function handleDelete(node: DepartmentItem) {
  if (!isSuperAdmin.value) { toast.warning('仅超级管理员可操作'); return }
  try {
    await ElMessageBox.confirm(
      `确定要删除「${node.name}」及其所有子部门吗？\n该部门下的员工将从部门中移出。`,
      '删除部门',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'error' },
    )
    const result = await deleteDepartment(node.id)
    toast.success(`已删除 ${result.deletedDeptCount} 个部门`)
    if (selectedDept.value?.id === node.id) selectedDept.value = null
    await loadTree()
  } catch {
    // user cancelled or API error handled by interceptor
  }
}

function resetForm() {
  formRef.value?.resetFields()
}

// ---- 部门人员 ----
const departmentUsers = ref<DepartmentUser[]>([])
const usersTotal = ref(0)
const usersLoading = ref(false)

async function loadDepartmentUsers(deptId: number) {
  usersLoading.value = true
  try {
    const res = await getDepartmentUsers(deptId)
    departmentUsers.value = res.list || []
    usersTotal.value = res.total || 0
  } catch {
    departmentUsers.value = []
    usersTotal.value = 0
  } finally {
    usersLoading.value = false
  }
}

// ---- 角色标签 ----
const positionOptions = ['员工', '组长', '部长', '经理', '总经理', '管理', '非员工']

// ---- 编辑员工 ----
const userEditVisible = ref(false)
const userEditLoading = ref(false)
const editingUser = ref<DepartmentUser | null>(null)
const userEditForm = ref({ departmentId: null as number | null, position: '' })

function openUserEdit(row: DepartmentUser) {
  editingUser.value = row
  userEditForm.value = {
    departmentId: row.departmentId ?? null,
    position: row.position || '',
  }
  userEditVisible.value = true
}

async function handleUserEdit() {
  if (!editingUser.value) return
  userEditLoading.value = true
  try {
    await updateUser(editingUser.value.userId, {
      departmentId: userEditForm.value.departmentId,
      position: userEditForm.value.position,
    })
    toast.success('员工信息已更新')
    userEditVisible.value = false
    // 刷新当前部门人员列表
    if (isUnassigned.value) {
      await loadUnassignedUsers()
    } else if (selectedDept.value) {
      await loadDepartmentUsers(selectedDept.value.id)
    }
    refreshUnassignedCount()
  } catch {
    // handled by interceptor
  } finally {
    userEditLoading.value = false
  }
}

// ---- 初始化 ----
async function loadTree() {
  loading.value = true
  try {
    departmentTree.value = await getDepartmentTree()
  } catch {
    departmentTree.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTree()
  refreshUnassignedCount()
})
</script>

<style scoped lang="scss">
.org-page {
  display: flex;
  height: calc(100vh - 100px);
  gap: 0;

  .tree-panel {
    width: 280px;
    min-width: 280px;
    border-right: 1px solid #e4e7ed;
    background: #fff;
    display: flex;
    flex-direction: column;
    position: relative;

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 16px 8px;
      h4 { margin: 0; font-size: 14px; }
      .hint { font-size: 11px; color: #909399; }
    }

    .unassigned-node {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; margin: 0 8px 4px;
      border-radius: 6px; cursor: pointer; font-size: 13px; color: #606266;
      background: #F5F7FA; border: 1px dashed #D3D1C7;
      &:hover { background: #E6F1FB; border-color: #2B6DE8; }
      &.active { background: #E6F1FB; color: #2B6DE8; border-color: #2B6DE8; font-weight: 500; }
    }

    .tree-filter {
      padding: 0 16px 8px;
    }

    :deep(.el-tree) {
      flex: 1;
      overflow: auto;
      padding: 4px 8px;

      .el-tree-node__content {
        height: 32px;
      }
    }
  }

  .detail-panel {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    background: #f5f7fa;

    .panel-section {
      background: #fff;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;

      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        h4 { margin: 0; font-size: 14px; }
      }
    }
  }
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 4px;

  .node-count {
    font-size: 11px;
    color: #909399;
    background: #f0f2f5;
    border-radius: 8px;
    padding: 0 6px;
    min-width: 20px;
    text-align: center;
  }
}

.context-menu {
  position: fixed;
  z-index: 3000;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0,0,0,.12);
  padding: 4px 0;
  min-width: 140px;

  .menu-item {
    padding: 8px 16px;
    font-size: 13px;
    cursor: pointer;
    &:hover { background: #f0f2f5; }
    &.danger { color: #f56c6c; &:hover { background: #fef0f0; } }
  }
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-muted {
  color: #909399;
  font-size: 12px;
}

.table-footer {
  padding: 8px 0 0;
}

.form-static {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}
</style>
