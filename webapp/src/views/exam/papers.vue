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
        <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag :type="statusType(row.status || '')" size="small">{{ statusLabel(row.status || '') }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="220"><template #default="{ row }">
          <el-button v-if="row.status==='draft'" size="small" link @click="openEdit(row)">编辑</el-button>
          <el-button v-else size="small" link @click="viewPaper(row)">查看</el-button>
          <el-button v-if="row.status==='draft'" size="small" link type="success" @click="handlePublish(row)">发布</el-button>
          <el-button v-if="row.status==='published'" size="small" link type="warning" @click="handleClone(row)">克隆</el-button>
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
        <el-form-item label="开始时间">
          <el-date-picker v-model="form.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="可留空(永久开放)" style="width:100%" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker v-model="form.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="可留空(永久开放)" style="width:100%" />
        </el-form-item>
        <el-form-item label="组卷选题">
          <div class="paper-select">
            <div class="select-filters">
              <el-select v-model="qFilter.categoryId" placeholder="分类" clearable style="width:140px" @change="onQFilterChange">
                <el-option v-for="c in categoryOptions" :key="c.id" :label="c.path || c.name" :value="c.id" />
              </el-select>
              <el-select v-model="qFilter.type" placeholder="题型" clearable style="width:100px" @change="onQFilterChange">
                <el-option label="单选" value="single" /><el-option label="多选" value="multiple" /><el-option label="判断" value="judge" />
              </el-select>
              <el-input v-model="qFilter.keyword" placeholder="搜索题干" clearable style="width:180px" @keyup.enter="onQFilterChange" @clear="onQFilterChange" />
            </div>
            <el-table ref="questionTableRef" :data="candidateQuestions" row-key="id" max-height="260" border size="small" @selection-change="onSelectionChange">
              <el-table-column type="selection" width="40" reserve-selection />
              <el-table-column label="题型" width="70"><template #default="{ row }">{{ typeLabel(row.type) }}</template></el-table-column>
              <el-table-column prop="title" label="题干" min-width="220" show-overflow-tooltip />
              <el-table-column prop="score" label="分值" width="60" align="center" />
            </el-table>
            <div class="select-summary">已选 <b>{{ form.questionIds.length }}</b> 题 · 总分 <b>{{ selectedTotalScore }}</b></div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="handleSave">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="previewVisible" title="试卷预览" width="640px" destroy-on-close>
      <el-descriptions v-if="previewRow" :column="2" border>
        <el-descriptions-item label="名称" :span="2">{{ previewRow.title }}</el-descriptions-item>
        <el-descriptions-item label="时长">{{ previewRow.duration }}分钟</el-descriptions-item>
        <el-descriptions-item label="合格线">{{ previewRow.pass_score }}</el-descriptions-item>
        <el-descriptions-item label="范围">{{ previewRow.scope_type === 'department' ? '指定部门' : '全员' }}</el-descriptions-item>
        <el-descriptions-item label="版本">v{{ previewRow.version }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusLabel(previewRow.status || '') }}</el-descriptions-item>
      </el-descriptions>
      <template #footer><el-button @click="previewVisible = false">关闭</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { toast } from '@/utils/toast'
import type { PaperRow } from '@/api/exam'
import { getPaperList, createPaper, updatePaper, deletePaper, publishPaper, clonePaper, getCategoryList, getQuestionList } from '@/api/exam'
import { getDepartmentTree } from '@/api/user'
import type { QuestionRow } from '@/api/exam'

interface DeptNode { id: number; name: string; children?: DeptNode[] }

const loading = ref(false)
const tableData = ref<PaperRow[]>([])
const total = ref(0)
const page = ref(1)
const tabStatus = ref('')
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const previewVisible = ref(false)
const previewRow = ref<PaperRow | null>(null)
const deptTree = ref<DeptNode[]>([])
const form = reactive<{
  title: string
  duration: number
  passScore: number
  totalScore: number
  maxAttempts: number
  maxScreenshotWarns: number
  scopeType: 'all' | 'department'
  scopeDepartments: number[]
  startTime: string
  endTime: string
  questionIds: number[]
}>({ title: '', duration: 60, passScore: 60, totalScore: 100, maxAttempts: 1, maxScreenshotWarns: 2, scopeType: 'all', scopeDepartments: [], startTime: '', endTime: '', questionIds: [] })

const statusType = (s: string): '' | 'info' | 'success' | 'warning' | 'danger' =>
  ({ draft: 'info', published: 'success', archived: '' } as Record<string, '' | 'info' | 'success' | 'warning' | 'danger'>)[s] || ''
const statusLabel = (s: string): string => ({ draft: '草稿', published: '已发布', archived: '归档' })[s] || s

async function loadData() {
  loading.value = true
  try {
    const res = await getPaperList({ page: page.value, pageSize: 20, status: tabStatus.value || undefined })
    tableData.value = res.list || []
    total.value = res.total || 0
  } catch { toast.error('加载失败') }
  finally { loading.value = false }
}

function parseDepts(raw: number[] | string | undefined): number[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

function parseQuestionIds(raw: number[] | string | undefined): number[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

// ===== 组卷选题(分类树筛选 + 勾选) =====
const categoryOptions = ref<{ id: number; name: string; path?: string }[]>([])
const qFilter = reactive({ categoryId: undefined as number | undefined, type: '', keyword: '' })
const candidateQuestions = ref<QuestionRow[]>([])
const selectedScoreMap = ref<Record<number, number>>({})
const questionTableRef = ref()
const selectedTotalScore = computed(() => Object.values(selectedScoreMap.value).reduce((s, v) => s + v, 0))
const typeLabel = (t: string) => ({ single: '单选', multiple: '多选', judge: '判断' })[t] || t

function flattenCategoryOptions(nodes: { id: number; name: string; path?: string; children?: unknown[] }[]) {
  nodes.forEach(n => {
    categoryOptions.value.push({ id: n.id, name: n.name, path: n.path })
    if (n.children && n.children.length) flattenCategoryOptions(n.children as { id: number; name: string; path?: string; children?: unknown[] }[])
  })
}

async function loadCategories() {
  try {
    const cats = await getCategoryList()
    categoryOptions.value = []
    flattenCategoryOptions(cats)
  } catch { /* */ }
}

async function loadCandidateQuestions() {
  try {
    const res = await getQuestionList({
      page: 1, pageSize: 100,
      categoryId: qFilter.categoryId,
      type: qFilter.type || undefined,
      keyword: qFilter.keyword || undefined,
    })
    candidateQuestions.value = res.list || []
    nextTick(() => syncTableSelection())
  } catch { candidateQuestions.value = [] }
}

function syncTableSelection() {
  if (!questionTableRef.value) return
  candidateQuestions.value.forEach(q => {
    const sel = selectedScoreMap.value[q.id] !== undefined
    questionTableRef.value.toggleRowSelection(q, sel, true)
  })
}

function onQFilterChange() { loadCandidateQuestions() }

function onSelectionChange(rows: QuestionRow[]) {
  const currentIds = new Set(candidateQuestions.value.map(q => q.id))
  const currentSelected = new Set(rows.map(r => r.id))
  // 移除当前列表中被取消选中的
  candidateQuestions.value.forEach(q => {
    if (currentIds.has(q.id) && !currentSelected.has(q.id)) delete selectedScoreMap.value[q.id]
  })
  // 记录选中的分值
  rows.forEach(r => { selectedScoreMap.value[r.id] = r.score })
  form.questionIds = Object.keys(selectedScoreMap.value).map(Number)
}

function openCreate() {
  Object.assign(form, { title: '', duration: 60, passScore: 60, totalScore: 100, maxAttempts: 1, maxScreenshotWarns: 2, scopeType: 'all' as const, scopeDepartments: [], startTime: '', endTime: '', questionIds: [] })
  selectedScoreMap.value = {}
  editingId.value = null
  dialogVisible.value = true
  loadCategories()
  loadCandidateQuestions()
}

function openEdit(row: PaperRow) {
  Object.assign(form, {
    title: row.title,
    duration: row.duration,
    passScore: row.pass_score,
    maxAttempts: row.max_attempts ?? 1,
    maxScreenshotWarns: row.max_screenshot_warns ?? 2,
    scopeType: (row.scope_type || 'all') as 'all' | 'department',
    scopeDepartments: parseDepts(row.scope_departments),
    startTime: row.start_time || '',
    endTime: row.end_time || '',
  })
  // 回显已选题
  const qids = parseQuestionIds(row.question_ids)
  const scoreMap: Record<number, number> = {}
  qids.forEach(id => { scoreMap[id] = 0 })
  selectedScoreMap.value = scoreMap
  form.questionIds = qids
  editingId.value = row.id
  dialogVisible.value = true
  loadCategories()
  loadCandidateQuestions()
}

function viewPaper(row: PaperRow) {
  previewRow.value = row
  previewVisible.value = true
}

async function handleSave() {
  if (!form.title) { toast.warning('试卷名称不能为空'); return }
  try {
    if (editingId.value) await updatePaper({ id: editingId.value, ...form })
    else await createPaper({ ...form })
    dialogVisible.value = false
    loadData()
  } catch { toast.error('保存失败') }
}

async function handlePublish(row: PaperRow) {
  try { await publishPaper(row.id); toast.success('已发布'); loadData() } catch { toast.error('发布失败') }
}
async function handleDelete(row: PaperRow) {
  try {
    await ElMessageBox.confirm('确定删除该试卷？', '删除确认', { type: 'warning' })
    await deletePaper(row.id)
    toast.success('已删除')
    loadData()
  } catch { /* cancelled */ }
}
async function handleArchive(row: PaperRow) {
  try {
    await ElMessageBox.confirm('确定归档该试卷？归档后员工不可见。', '归档确认', { type: 'warning' })
    await updatePaper({ id: row.id, status: 'archived' })
    toast.success('已归档')
    loadData()
  } catch { /* cancelled */ }
}
async function handleClone(row: PaperRow) {
  try {
    const { value } = await ElMessageBox.prompt('新版本名称', '克隆试卷', {
      confirmButtonText: '确认克隆',
      cancelButtonText: '取消',
      inputValue: `${row.title} (v${(row.version || 1) + 1})`,
    })
    await clonePaper(row.id, value)
    toast.success('已克隆为新版本')
    loadData()
  } catch { /* cancelled */ }
}

onMounted(async () => {
  loadData()
  try {
    const res = await getDepartmentTree()
    deptTree.value = res || []
  } catch { /* */ }
})
</script>

<style lang="scss" scoped>
.papers-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 18px; font-weight: 600; }
.paper-select { width: 100%; }
.select-filters { display: flex; gap: 8px; margin-bottom: 8px; }
.select-summary { margin-top: 8px; font-size: 13px; color: #606266; }
.select-summary b { color: #2B6DE8; }
</style>
