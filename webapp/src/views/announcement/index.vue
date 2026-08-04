<template>
  <div class="announcement-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>公告管理</span>
        </div>
      </template>

      <div class="filters">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索标题 / 内容"
          clearable
          style="width: 220px"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="filters.status" placeholder="状态" clearable style="width: 130px" @change="handleSearch">
          <el-option label="草稿" value="draft" />
          <el-option label="已发布" value="published" />
          <el-option label="已下线" value="cancelled" />
        </el-select>
        <el-select v-model="filters.priority" placeholder="优先级" clearable style="width: 130px" @change="handleSearch">
          <el-option label="普通" value="normal" />
          <el-option label="低" value="low" />
          <el-option label="高" value="high" />
          <el-option label="紧急" value="urgent" />
        </el-select>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button type="success" @click="openCreate">新建公告</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe border style="margin-top: 16px">
        <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
        <el-table-column label="优先级" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="priorityTagType(row.priority)" size="small">{{ priorityLabel(row.priority) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="authorName" label="发布人" width="120" show-overflow-tooltip />
        <el-table-column label="发布时间" width="170">
          <template #default="{ row }">{{ formatTime(row.publishedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status !== 'published'" size="small" type="success" @click="handlePublish(row)">发布</el-button>
            <el-button v-else size="small" type="warning" @click="handleCancel(row)">下线</el-button>
            <el-button size="small" type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        background
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="loadData"
        @size-change="handleSizeChange"
      />
    </el-card>

    <el-dialog v-model="editVisible" :title="editingId ? '编辑公告' : '新建公告'" width="620px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入公告标题" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="8" placeholder="请输入公告内容" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="form.priority" style="width: 100%">
            <el-option label="普通" value="normal" />
            <el-option label="低" value="low" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="urgent" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { toast } from '@/utils/toast'
import {
  getAnnouncementList,
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  cancelAnnouncement,
  deleteAnnouncement,
  type AnnouncementItem,
} from '@/api/announcement'

const loading = ref(false)
const saving = ref(false)
const list = ref<AnnouncementItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({
  keyword: '',
  status: '',
  priority: '',
})

const editVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const form = reactive({
  title: '',
  content: '',
  priority: 'normal',
})
const rules: FormRules = {
  title: [{ required: true, message: '请输入公告标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入公告内容', trigger: 'blur' }],
}

onMounted(loadData)

async function loadData() {
  loading.value = true
  try {
    const params: {
      page: number
      pageSize: number
      keyword?: string
      status?: string
      priority?: string
    } = { page: page.value, pageSize: pageSize.value }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    const res = await getAnnouncementList(params)
    list.value = res.list || []
    total.value = res.total || 0
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadData()
}

function handleSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  loadData()
}

function openCreate() {
  editingId.value = null
  form.title = ''
  form.content = ''
  form.priority = 'normal'
  editVisible.value = true
}

function openEdit(row: AnnouncementItem) {
  editingId.value = row.id
  form.title = row.title
  form.content = row.content
  form.priority = row.priority
  editVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    if (editingId.value) {
      await updateAnnouncement(editingId.value, {
        title: form.title,
        content: form.content,
        priority: form.priority,
      })
      toast.success('公告已更新')
    } else {
      await createAnnouncement({
        title: form.title,
        content: form.content,
        priority: form.priority,
      })
      toast.success('公告已创建')
    }
    editVisible.value = false
    loadData()
  } catch {
    // 错误提示由请求拦截器统一处理
  } finally {
    saving.value = false
  }
}

async function handlePublish(row: AnnouncementItem) {
  try {
    await ElMessageBox.confirm(`确认发布公告「${row.title}」？`, '发布确认', {
      type: 'warning',
      confirmButtonText: '确认发布',
      cancelButtonText: '取消',
    })
    await publishAnnouncement(row.id)
    toast.success('公告已发布')
    loadData()
  } catch {
    // cancelled
  }
}

async function handleCancel(row: AnnouncementItem) {
  try {
    await ElMessageBox.confirm(`确认下线公告「${row.title}」？`, '下线确认', {
      type: 'warning',
      confirmButtonText: '确认下线',
      cancelButtonText: '取消',
    })
    await cancelAnnouncement(row.id)
    toast.success('公告已下线')
    loadData()
  } catch {
    // cancelled
  }
}

async function handleDelete(row: AnnouncementItem) {
  try {
    await ElMessageBox.confirm(`确认删除公告「${row.title}」？`, '删除确认', {
      type: 'error',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
    await deleteAnnouncement(row.id)
    toast.success('公告已删除')
    loadData()
  } catch {
    // cancelled
  }
}

function priorityLabel(priority: string) {
  const map: Record<string, string> = { low: '低', normal: '普通', high: '高', urgent: '紧急' }
  return map[priority] || priority
}

function priorityTagType(priority: string) {
  const map: Record<string, string> = { low: 'info', normal: 'primary', high: 'warning', urgent: 'danger' }
  return map[priority] as 'info' | 'primary' | 'warning' | 'danger'
}

function statusLabel(status: string) {
  const map: Record<string, string> = { draft: '草稿', published: '已发布', cancelled: '已下线' }
  return map[status] || status
}

function statusTagType(status: string) {
  const map: Record<string, string> = { draft: 'info', published: 'success', cancelled: 'danger' }
  return map[status] as 'info' | 'success' | 'danger'
}

function formatTime(value?: string) {
  return value ? String(value).slice(0, 19).replace('T', ' ') : '-'
}
</script>

<style scoped>
.announcement-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 16px;
}

.filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
