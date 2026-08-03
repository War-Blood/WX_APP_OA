<template>
  <div class="papers-page">
    <el-card>
      <template #header>
        <div class="toolbar">
          <span class="title">试卷管理</span>
          <el-button type="primary" @click="openCreate">新建试卷</el-button>
        </div>
      </template>
      <el-tabs v-model="tabStatus" @tab-change="loadData">
        <el-tab-pane label="全部" name="" />
        <el-tab-pane label="草稿" name="draft" />
        <el-tab-pane label="已发布" name="published" />
        <el-tab-pane label="归档" name="archived" />
      </el-tabs>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="title" label="名称" min-width="180" />
        <el-table-column prop="duration" label="时长" width="80"><template #default="{ row }">{{ row.duration }}分钟</template></el-table-column>
        <el-table-column prop="pass_score" label="合格线" width="80" />
        <el-table-column label="范围" width="100"><template #default="{ row }">{{ row.scope_type === 'department' ? '指定部门' : '全员' }}</template></el-table-column>
        <el-table-column prop="version" label="版本" width="60"><template #default="{ row }">v{{ row.version }}</template></el-table-column>
        <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="220"><template #default="{ row }">
          <el-button v-if="row.status==='draft'" size="small" link @click="openEdit(row)">编辑</el-button>
          <el-button v-else size="small" link @click="viewPaper(row)">查看</el-button>
          <el-button v-if="row.status==='draft'" size="small" link type="success" @click="handlePublish(row)">发布</el-button>
          <el-button v-if="row.status==='draft'" size="small" link type="danger" @click="handleDelete(row)">删除</el-button>
          <el-button v-if="row.status==='published'" size="small" link type="warning" @click="handleArchive(row)">归档</el-button>
        </template></el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total,prev,pager,next" background style="margin-top:16px;justify-content:flex-end" @current-change="loadData" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑试卷' : '新建试卷'" width="700px" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-form-item label="名称"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="时长(分钟)"><el-input-number v-model="form.duration" :min="5" :max="180" /></el-form-item>
        <el-form-item label="合格分数"><el-input-number v-model="form.passScore" :min="1" :max="200" /></el-form-item>
        <el-form-item label="最大次数"><el-input-number v-model="form.maxAttempts" :min="0" :max="10" /><span style="margin-left:8px;color:#999">0=不限</span></el-form-item>
        <el-form-item label="截屏上限"><el-input-number v-model="form.maxScreenshotWarns" :min="1" :max="10" /></el-form-item>
        <el-form-item label="参加范围">
          <el-radio-group v-model="form.scopeType">
            <el-radio value="all">全员</el-radio>
            <el-radio value="department">指定部门</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.scopeType==='department'" label="选择部门">
          <el-tree-select v-model="form.scopeDepartments" :data="deptTree" multiple check-strictly :props="{ value: 'id', label: 'name', children: 'children' }" style="width:100%" placeholder="请选择" />
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="handleSave">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { toast } from '@/utils/toast'
import { getPaperList, createPaper, updatePaper, deletePaper, publishPaper } from '@/api/exam'
import { getDepartmentList } from '@/api/user'

const loading = ref(false); const tableData = ref<any[]>([]); const total = ref(0); const page = ref(1); const tabStatus = ref('')
const dialogVisible = ref(false); const editingId = ref<number | null>(null)
const deptTree = ref<any[]>([])
const form = reactive({ title: '', duration: 60, passScore: 60, totalScore: 100, maxAttempts: 1, maxScreenshotWarns: 2, scopeType: 'all', scopeDepartments: [] as number[], questionIds: [] as number[] })

const statusType = (s: string) => ({ draft: 'info', published: 'success', archived: '' } as any)[s] || ''
const statusLabel = (s: string) => ({ draft: '草稿', published: '已发布', archived: '归档' } as any)[s] || s

async function loadData() {
  loading.value = true
  try {
    const res: any = await getPaperList({ page: page.value, pageSize: 20, status: tabStatus.value || undefined })
    tableData.value = res.list || []; total.value = res.total || 0
  } catch { toast.error('加载失败') }
  finally { loading.value = false }
}

function openCreate() { Object.assign(form, { title: '', id: undefined, duration: 60, passScore: 60, totalScore: 100, maxAttempts: 1, maxScreenshotWarns: 2, scopeType: 'all', scopeDepartments: [], questionIds: [] }); editingId.value = null; dialogVisible.value = true }
function openEdit(row: any) {
  Object.assign(form, { id: row.id, title: row.title, duration: row.duration, passScore: row.pass_score, maxAttempts: row.max_attempts, maxScreenshotWarns: row.max_screenshot_warns, scopeType: row.scope_type, scopeDepartments: row.scope_departments || [] })
  editingId.value = row.id; dialogVisible.value = true
}
function viewPaper(_row: any) { /* TODO: 打开只读查看弹窗 */ }

async function handleSave() {
  if (!form.title) { toast.warning('试卷名称不能为空'); return }
  try {
    if (editingId.value) await updatePaper({ id: editingId.value, ...form } as any)
    else await createPaper(form as any)
    dialogVisible.value = false; loadData()
  } catch { toast.error('保存失败') }
}

async function handlePublish(row: any) { try { await publishPaper(row.id); toast.success('已发布'); loadData() } catch { toast.error('发布失败') } }
async function handleDelete(row: any) {
  try { await ElMessageBox.confirm('确定删除该试卷？', '删除确认', { type: 'warning' }); await deletePaper(row.id); toast.success('已删除'); loadData() } catch { /* cancelled */ }
}
async function handleArchive(row: any) {
  try { await ElMessageBox.confirm('确定归档该试卷？归档后员工不可见。', '归档确认', { type: 'warning' }); await updatePaper({ id: row.id, status: 'archived' } as any); toast.success('已归档'); loadData() } catch { /* cancelled */ }
}

onMounted(async () => {
  loadData()
  try { const res: any = await getDepartmentList(); deptTree.value = res.data || res || [] } catch { /* */ }
})
</script>

<style lang="scss" scoped>
.papers-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 18px; font-weight: 600; }
</style>
