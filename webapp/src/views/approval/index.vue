<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Refresh, Setting } from '@element-plus/icons-vue'
import { toast } from '@/utils/toast'
import { useUserStore } from '@/stores/user'
import {
  getApprovalList,
  getApprovalDetail,
  approveApproval,
  type ApprovalDetail,
  type ApprovalItem
} from '@/api/approval'
import { createApprovalType, getApprovalTypes, updateApprovalType, type ApprovalTypeItem } from '@/api/approval-type'

const userStore = useUserStore()

const loading = ref(false)
const list = ref<ApprovalItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
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

const filteredList = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return list.value
  return list.value.filter(item =>
    `${item.title} ${item.applicant} ${item.applicantDept}`.toLowerCase().includes(kw)
  )
})

function getStatusType(s: string) {
  return s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning'
}

async function loadApprovals() {
  loading.value = true
  try {
    const res = await getApprovalList({
      tab: activeTab.value,
      page: page.value,
      pageSize: pageSize.value
    })
    list.value = res.list || []
    total.value = res.total || 0
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadApprovals()
}

function handlePageChange(next: number) {
  page.value = next
  loadApprovals()
}

function handleSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  loadApprovals()
}

// 详情
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<ApprovalDetail | null>(null)

async function openDetail(row: ApprovalItem) {
  detailVisible.value = true
  detailLoading.value = true
  detailData.value = null
  try {
    detailData.value = await getApprovalDetail(row.id)
  } catch {
    detailData.value = null
  } finally {
    detailLoading.value = false
  }
}

function isCurrentApprover(row: ApprovalItem) {
  if (row.status !== 'pending') return false
  const userId = String(userStore.userInfo?.userId || '')
  return Boolean(row.currentApproverId && String(row.currentApproverId) === userId)
}

async function handleApprove(row: ApprovalItem) {
  try {
    await ElMessageBox.confirm('确定通过该审批？', '审批确认', { type: 'warning' })
    await approveApproval(row.id, 'approve')
    toast.success('审批已通过')
    detailVisible.value = false
    loadApprovals()
  } catch {
    // cancelled or handled by interceptor
  }
}

async function handleReject(row: ApprovalItem) {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回审批', {
      inputType: 'textarea',
      inputPlaceholder: '请填写驳回原因',
      inputValidator: (val: string) => !!val.trim(),
      inputErrorMessage: '驳回原因不能为空',
      confirmButtonText: '确定驳回',
      cancelButtonText: '取消'
    })
    await approveApproval(row.id, 'reject', value)
    toast.success('审批已驳回')
    detailVisible.value = false
    loadApprovals()
  } catch {
    // cancelled or handled by interceptor
  }
}

// 审批类型配置
const configLoading = ref(false)
const approvalTypes = ref<ApprovalTypeItem[]>([])
const editTypeId = ref<number | null>(null)
const editForm = ref<Partial<ApprovalTypeItem>>({})
const createTypeVisible = ref(false)
const createTypeSaving = ref(false)
const createTypeForm = ref({
  typeKey: '',
  name: '',
  icon: '',
  sortOrder: 0,
  needAttachment: false,
  needRemark: false
})

async function loadTypes() {
  configLoading.value = true
  try {
    approvalTypes.value = await getApprovalTypes()
  } catch {
    approvalTypes.value = []
  } finally {
    configLoading.value = false
  }
}

function openCreateType() {
  createTypeForm.value = {
    typeKey: '',
    name: '',
    icon: '',
    sortOrder: 0,
    needAttachment: false,
    needRemark: false
  }
  createTypeVisible.value = true
}

async function handleCreateType() {
  if (!createTypeForm.value.typeKey.trim()) {
    toast.warning('请输入类型标识')
    return
  }
  if (!createTypeForm.value.name.trim()) {
    toast.warning('请输入类型名称')
    return
  }
  createTypeSaving.value = true
  try {
    await createApprovalType(createTypeForm.value)
    toast.success('审批类型已创建')
    createTypeVisible.value = false
    loadTypes()
  } catch {
    // handled by interceptor
  } finally {
    createTypeSaving.value = false
  }
}

function startEdit(row: ApprovalTypeItem) {
  editTypeId.value = row.id
  editForm.value = {
    name: row.name,
    sortOrder: row.sortOrder,
    needAttachment: row.needAttachment,
    needRemark: row.needRemark,
    status: row.status
  }
}

function cancelEdit() {
  editTypeId.value = null
  editForm.value = {}
}

async function saveEdit(row: ApprovalTypeItem) {
  try {
    await updateApprovalType(row.id, editForm.value)
    toast.success('配置已保存')
    cancelEdit()
    loadTypes()
  } catch {
    // handled by interceptor
  }
}

async function toggleStatus(row: ApprovalTypeItem) {
  const newStatus = row.status === 'active' ? 'disabled' : 'active'
  try {
    await updateApprovalType(row.id, { status: newStatus })
    toast.success(newStatus === 'active' ? '已启用' : '已禁用')
    loadTypes()
  } catch {
    // handled by interceptor
  }
}

watch(activeTab, (val) => {
  page.value = 1
  if (val === 'config') loadTypes()
  else loadApprovals()
})

onMounted(() => {
  loadApprovals()
})
</script>

<template>
  <div class="approval-page">
    <div class="toolbar">
      <span class="title">审批管理</span>
      <div class="toolbar-actions">
        <el-input
          v-if="activeTab !== 'config'"
          v-model="keyword"
          placeholder="搜索标题/申请人/部门"
          clearable
          style="width: 240px"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <el-button
          :icon="Refresh"
          @click="activeTab === 'config' ? loadTypes() : loadApprovals()"
        >
          刷新
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane
        v-for="tab in tabs"
        :key="tab.key"
        :label="tab.label"
        :name="tab.key"
      />
    </el-tabs>

    <!-- 审批列表 -->
    <template v-if="activeTab !== 'config'">
      <el-table :data="filteredList" v-loading="loading" stripe border empty-text="暂无审批数据">
        <el-table-column prop="title" label="审批标题" min-width="180" show-overflow-tooltip />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.urgent" type="danger" size="small">加急</el-tag>
            {{ typeMap[row.type] || row.type }}
          </template>
        </el-table-column>
        <el-table-column prop="applicant" label="申请人" width="100" />
        <el-table-column prop="applicantDept" label="部门" width="110" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button
              v-if="isCurrentApprover(row)"
              size="small"
              link
              type="success"
              @click="handleApprove(row)"
            >
              通过
            </el-button>
            <el-button
              v-if="isCurrentApprover(row)"
              size="small"
              link
              type="danger"
              @click="handleReject(row)"
            >
              驳回
            </el-button>
          </template>
        </el-table-column>
      </el-table>
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
    </template>

    <!-- 审批配置 -->
    <template v-else>
      <div class="config-toolbar">
        <span class="config-hint">审批类型配置</span>
        <el-button type="primary" size="small" @click="openCreateType">新增审批类型</el-button>
      </div>
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
            <el-switch :model-value="row.status === 'active'" size="small" @change="toggleStatus(row)" />
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

    <!-- 新增审批类型 -->
    <el-dialog v-model="createTypeVisible" title="新增审批类型" width="480px" destroy-on-close>
      <el-form :model="createTypeForm" label-width="100px">
        <el-form-item label="类型标识" required>
          <el-input v-model="createTypeForm.typeKey" placeholder="小写字母+数字+下划线" />
        </el-form-item>
        <el-form-item label="类型名称" required>
          <el-input v-model="createTypeForm.name" placeholder="如 请假审批" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="createTypeForm.icon" placeholder="可选，图标文本或路径" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="createTypeForm.sortOrder" :min="0" :max="99" />
        </el-form-item>
        <el-form-item label="需要附件">
          <el-switch v-model="createTypeForm.needAttachment" />
        </el-form-item>
        <el-form-item label="需要备注">
          <el-switch v-model="createTypeForm.needRemark" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createTypeVisible = false">取消</el-button>
        <el-button type="primary" :loading="createTypeSaving" @click="handleCreateType">保存</el-button>
      </template>
    </el-dialog>

    <!-- 审批详情 -->
    <el-dialog v-model="detailVisible" title="审批详情" width="720px" destroy-on-close>
      <div v-loading="detailLoading">
        <template v-if="detailData">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="标题" :span="2">{{ detailData.title }}</el-descriptions-item>
            <el-descriptions-item label="申请人">{{ detailData.applicant }}</el-descriptions-item>
            <el-descriptions-item label="部门">{{ detailData.applicantDept }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="getStatusType(detailData.status)" size="small">
                {{ detailData.statusText }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ detailData.createdAt || '-' }}</el-descriptions-item>
          </el-descriptions>

          <div class="detail-section" v-if="Object.keys(detailData.formData || {}).length">
            <h4>表单内容</h4>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item
                v-for="(value, key) in detailData.formData"
                :key="key"
                :label="key"
              >
                {{ String(value) }}
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="detail-section">
            <h4>审批进度</h4>
            <el-timeline v-if="detailData.timeline?.length">
              <el-timeline-item
                v-for="node in detailData.timeline"
                :key="node.nodeId"
                :timestamp="node.time || '待处理'"
                :type="node.action === 'approved' ? 'success' : node.action === 'rejected' ? 'danger' : 'primary'"
              >
                {{ node.approverName || '待审批' }}：{{ node.action === 'approved' ? '已通过' : node.action === 'rejected' ? '已驳回' : '待处理' }}
                <div v-if="node.remark" class="timeline-remark">{{ node.remark }}</div>
              </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无审批进度" :image-size="60" />
          </div>
        </template>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.approval-page {
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.config-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  .config-hint {
    font-size: 13px;
    color: #909399;
  }
}

.detail-section {
  margin-top: 20px;

  h4 {
    margin: 0 0 12px;
    font-size: 14px;
    color: #303133;
  }
}

.timeline-remark {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}
</style>
