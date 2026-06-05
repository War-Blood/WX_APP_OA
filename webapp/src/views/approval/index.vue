<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Refresh, Setting } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getApprovalTypes, updateApprovalType, type ApprovalTypeItem } from '@/api/approval-type'

interface ApprovalItem {
  id: string; title: string; type: string; applicant: string;
  applicantDept: string; date: string; status: string; statusText: string
}

// 审批列表
const loading = ref(false)
const list = ref<ApprovalItem[]>([])
const total = ref(0)
const activeTab = ref('pending')

const tabs = [
  { key: 'pending', label: '待审批' },
  { key: 'mine', label: '我发起的' },
  { key: 'done', label: '已处理' },
  { key: 'config', label: '审批配置' }
]

const typeMap: Record<string, string> = {
  leave: '请假', expense: '报销', seal: '售后', travel: '出差', purchase: '采购', general: '通用'
}

const typeKeyLabels: Record<string, string> = {
  leave: '请假', expense: '报销', seal: '用印', travel: '出差', purchase: '采购', general: '通用审批'
}

function getStatusType(s: string) { return s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning' }

async function loadApprovals() {
  loading.value = true
  try {
    const { default: request } = await import('@/utils/request')
    const res = await request.post('/approval/list', { tab: activeTab.value, page: 1, pageSize: 50 })
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch { list.value = [] }
  finally { loading.value = false }
}

// 审批类型配置
const configLoading = ref(false)
const approvalTypes = ref<ApprovalTypeItem[]>([])
const editTypeId = ref<number | null>(null)
const editForm = ref<Partial<ApprovalTypeItem>>({})

async function loadTypes() {
  configLoading.value = true
  try {
    approvalTypes.value = await getApprovalTypes()
  } catch { approvalTypes.value = [] }
  finally { configLoading.value = false }
}

function startEdit(row: ApprovalTypeItem) {
  editTypeId.value = row.id
  editForm.value = {
    name: row.name,
    sortOrder: row.sortOrder,
    needAttachment: row.needAttachment,
    needRemark: row.needRemark,
    status: row.status,
  }
}

function cancelEdit() {
  editTypeId.value = null
  editForm.value = {}
}

async function saveEdit(row: ApprovalTypeItem) {
  try {
    await updateApprovalType(row.id, editForm.value)
    ElMessage.success('配置已保存')
    cancelEdit()
    loadTypes()
  } catch { /* handled by interceptor */ }
}

async function toggleStatus(row: ApprovalTypeItem) {
  const newStatus = row.status === 'active' ? 'disabled' : 'active'
  try {
    await updateApprovalType(row.id, { status: newStatus })
    ElMessage.success(newStatus === 'active' ? '已启用' : '已禁用')
    loadTypes()
  } catch { /* handled by interceptor */ }
}

watch(activeTab, (val) => {
  if (val === 'config') loadTypes()
  else loadApprovals()
})

onMounted(() => { loadApprovals() })
</script>

<template>
  <div class="approval-page">
    <div class="toolbar">
      <span class="title">审批管理</span>
      <el-button :icon="Refresh" @click="activeTab === 'config' ? loadTypes() : loadApprovals()">刷新</el-button>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane
        v-for="tab in tabs" :key="tab.key"
        :label="tab.label" :name="tab.key"
      />
    </el-tabs>

    <!-- 审批列表 -->
    <template v-if="activeTab !== 'config'">
      <el-table :data="list" v-loading="loading" stripe border empty-text="暂无审批数据">
        <el-table-column prop="title" label="审批标题" min-width="160" />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">{{ typeMap[row.type] || row.type }}</template>
        </el-table-column>
        <el-table-column prop="applicant" label="申请人" width="80" />
        <el-table-column prop="applicantDept" label="部门" width="100" />
        <el-table-column prop="date" label="日期" width="110" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <span class="total-text">共 {{ total }} 条</span>
      </div>
    </template>

    <!-- 审批配置 -->
    <template v-else>
      <el-table :data="approvalTypes" v-loading="configLoading" stripe border>
        <el-table-column label="图标" width="60" align="center">
          <template #default="{ row }">{{ row.icon || '📋' }}</template>
        </el-table-column>
        <el-table-column label="审批名称" min-width="120">
          <template #default="{ row }">
            <template v-if="editTypeId === row.id">
              <el-input v-model="editForm.name" size="small" style="width: 140px" />
            </template>
            <template v-else>{{ row.name }}</template>
          </template>
        </el-table-column>
        <el-table-column label="标识" width="100">
          <template #default="{ row }">{{ typeKeyLabels[row.typeKey] || row.typeKey }}</template>
        </el-table-column>
        <el-table-column label="排序" width="70" align="center">
          <template #default="{ row }">
            <template v-if="editTypeId === row.id">
              <el-input-number v-model="editForm.sortOrder" size="small" :min="0" :max="99" style="width: 60px" />
            </template>
            <template v-else>{{ row.sortOrder }}</template>
          </template>
        </el-table-column>
        <el-table-column label="需要附件" width="90" align="center">
          <template #default="{ row }">
            <template v-if="editTypeId === row.id">
              <el-switch v-model="editForm.needAttachment" size="small" />
            </template>
            <template v-else>
              <el-tag :type="row.needAttachment ? 'success' : 'info'" size="small">{{ row.needAttachment ? '是' : '否' }}</el-tag>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="需要备注" width="90" align="center">
          <template #default="{ row }">
            <template v-if="editTypeId === row.id">
              <el-switch v-model="editForm.needRemark" size="small" />
            </template>
            <template v-else>
              <el-tag :type="row.needRemark ? 'success' : 'info'" size="small">{{ row.needRemark ? '是' : '否' }}</el-tag>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="80" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 'active'"
              size="small"
              @change="toggleStatus(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <template v-if="editTypeId === row.id">
              <el-button size="small" type="primary" @click="saveEdit(row)">保存</el-button>
              <el-button size="small" @click="cancelEdit">取消</el-button>
            </template>
            <template v-else>
              <el-button size="small" :icon="Setting" link @click="startEdit(row)">编辑</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<style scoped lang="scss">
.approval-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
  .title { font-size: 18px; font-weight: 600; color: #333; }
}
.pagination-wrap { margin-top: 16px; .total-text { font-size: 14px; color: #999; } }
</style>
