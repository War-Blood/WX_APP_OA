<template>
  <div class="papers-page">
    <el-card>
      <template #header>
        <div class="toolbar">
          <span class="title">试卷管理</span>
          <div class="actions">
            <el-radio-group v-model="filterStatus" @change="loadData">
              <el-radio-button label="">全部</el-radio-button>
              <el-radio-button label="draft">草稿</el-radio-button>
              <el-radio-button label="published">已发布</el-radio-button>
              <el-radio-button label="archived">归档</el-radio-button>
            </el-radio-group>
            <el-button type="primary" @click="openCreate">+ 新建试卷</el-button>
          </div>
        </div>
      </template>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="title" label="试卷名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="duration" label="时长(分)" width="80" align="center" />
        <el-table-column prop="total_score" label="总分" width="70" align="center" />
        <el-table-column prop="pass_score" label="合格分" width="70" align="center" />
        <el-table-column prop="max_attempts" label="次数" width="60" align="center">
          <template #default="{ row }">{{ row.max_attempts === 0 ? '不限' : row.max_attempts }}</template>
        </el-table-column>
        <el-table-column label="范围" width="90" align="center">
          <template #default="{ row }">{{ scopeLabel(row.scope_type) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link @click="openView(row)">查看</el-button>
            <el-button size="small" link :disabled="row.status==='published'" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="row.status==='draft'" size="small" link type="success" @click="handlePublish(row)">发布</el-button>
            <el-button v-if="row.status==='published'" size="small" link type="warning" @click="handleArchive(row)">归档</el-button>
            <el-button v-if="row.status==='published'" size="small" link type="primary" @click="handleClone(row)">克隆</el-button>
            <el-button size="small" link type="danger" :disabled="row.status==='published'" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total,prev,pager,next" background style="margin-top:16px;justify-content:flex-end" @current-change="loadData" />
    </el-card>

    <!-- 新建/编辑试卷 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑试卷' : '新建试卷'" width="780px" destroy-on-close @closed="resetForm">
      <el-form :model="form" label-width="90px">
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="名称"><el-input v-model="form.title" maxlength="100" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="说明"><el-input v-model="form.description" placeholder="可选" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="时长(分)"><el-input-number v-model="form.duration" :min="1" :max="600" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="合格分"><el-input-number v-model="form.passScore" :min="0" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="可考次数"><el-input-number v-model="form.maxAttempts" :min="0" /> <span class="hint">0=不限</span></el-form-item></el-col>
        </el-row>

        <el-form-item label="组卷方式">
          <el-radio-group v-model="drawMode" @change="onDrawModeChange">
            <el-radio-button :value="'manual'">手动选题</el-radio-button>
            <el-radio-button :value="'random'">随机抽题</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- 手动选题 -->
        <el-form-item v-if="drawMode==='manual'" label="选择题目">
          <div class="q-select">
            <div class="q-toolbar">
              <el-select v-model="qCategoryFilter" placeholder="按分类" clearable style="width:160px" @change="onQSearch">
                <el-option v-for="c in categoryOptions" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
              <el-input v-model="qKeyword" placeholder="搜索题干" clearable style="width:180px" @clear="onQSearch" @keyup.enter="onQSearch" />
              <el-button size="small" @click="onQSearch">搜索</el-button>
              <span class="hint">已选 {{ form.questionIds.length }} 题</span>
              <span v-if="form.questionIds.length" class="hint">合计 {{ selectedTotalScore }} 分</span>
            </div>
            <el-table ref="questionTableRef" :data="questionOptions" size="small" max-height="260" row-key="id" @selection-change="onQuestionSelect">
              <el-table-column type="selection" width="40" reserve-selection />
              <el-table-column label="题型" width="70"><template #default="{ row }">{{ typeLabel(row.type) }}</template></el-table-column>
              <el-table-column prop="title" label="题干" show-overflow-tooltip />
              <el-table-column prop="score" label="分值" width="60" align="center" />
            </el-table>
            <el-pagination v-model:current-page="qPage" :page-size="qPageSize" :total="qTotal" layout="total,prev,pager,next" small background style="margin-top:8px;justify-content:flex-end" @current-change="loadQuestions" />
          </div>
        </el-form-item>

        <!-- 随机抽题 -->
        <el-form-item v-if="drawMode==='random'" label="抽题规则">
          <div class="rule-list">
            <div v-for="(rule, i) in form.drawRules || []" :key="i" class="rule-row">
              <el-select v-model="rule.type" style="width:90px"><el-option label="单选" value="single" /><el-option label="多选" value="multiple" /><el-option label="判断" value="judge" /></el-select>
              <el-select v-model="rule.categoryId" style="width:150px">
                <el-option label="全部" :value="0" />
                <el-option v-for="c in categoryOptions" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
              <el-input-number v-model="rule.count" :min="1" :max="200" placeholder="题数" />
              <el-input-number v-model="rule.score" :min="1" :max="20" placeholder="分值" />
              <el-button size="small" link type="danger" @click="removeRule(i)">删除</el-button>
            </div>
            <el-button size="small" type="primary" plain @click="addRule()">+ 添加规则</el-button>
          </div>
        </el-form-item>

        <el-form-item label="发放范围">
          <el-radio-group v-model="form.scopeType">
            <el-radio-button value="all">全员</el-radio-button>
            <el-radio-button value="department">指定部门</el-radio-button>
            <el-radio-button value="user">指定人员</el-radio-button>
            <el-radio-button value="role">指定角色</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.scopeType==='department'" label="选择部门">
          <el-tree ref="deptTreeRef" :data="deptTree" show-checkbox node-key="id" :props="{ label:'name', children:'children' }" default-expand-all style="max-height:200px;overflow:auto" />
        </el-form-item>
        <el-form-item v-if="form.scopeType==='user'" label="指定人员">
          <el-select v-model="form.scopeUsers" multiple filterable remote :remote-method="searchUsers" placeholder="输入姓名搜索" style="width:100%">
            <el-option v-for="u in userOptions" :key="u.id" :label="u.nickname" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.scopeType==='role'" label="指定角色">
          <el-select v-model="form.scopeRoles" multiple placeholder="选择角色" style="width:100%">
            <el-option v-for="r in roleOptions" :key="r.code" :label="r.name" :value="r.code" />
          </el-select>
        </el-form-item>

        <el-form-item label="乱序">
          <el-switch v-model="form.shuffleQuestions" /><span class="hint">题目乱序</span>
          <el-switch v-model="form.shuffleOptions" style="margin-left:24px" /><span class="hint">选项乱序</span>
        </el-form-item>
        <el-form-item label="考试窗口">
          <el-date-picker v-model="form.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="开始(留空=立即)" style="width:220px" />
          <span style="margin:0 8px;color:#909399">至</span>
          <el-date-picker v-model="form.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="结束(留空=长期)" style="width:220px" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 只读预览弹窗 -->
    <el-dialog v-model="viewVisible" title="试卷预览" width="640px" top="6vh">
      <template v-if="viewData">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="名称">{{ viewData.paper.title }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statusLabel(viewData.paper.status) }}</el-descriptions-item>
          <el-descriptions-item label="时长">{{ viewData.paper.duration }}分钟</el-descriptions-item>
          <el-descriptions-item label="合格分/总分">{{ viewData.paper.pass_score }}/{{ viewData.paper.total_score }}</el-descriptions-item>
          <el-descriptions-item label="次数">{{ viewData.paper.max_attempts === 0 ? '不限' : viewData.paper.max_attempts }}</el-descriptions-item>
          <el-descriptions-item label="范围">{{ scopeLabel(viewData.paper.scope_type) }}</el-descriptions-item>
          <el-descriptions-item v-if="viewData.paper.start_time || viewData.paper.end_time" label="考试窗口" :span="2">{{ viewData.paper.start_time || '立即' }} 至 {{ viewData.paper.end_time || '长期' }}</el-descriptions-item>
          <el-descriptions-item v-if="viewData.paper.description" label="说明" :span="2">{{ viewData.paper.description }}</el-descriptions-item>
        </el-descriptions>
        <el-divider />
        <template v-if="viewData.ruleSummary.length">
          <div style="font-weight:600;margin-bottom:8px">随机抽题规则（{{ viewData.ruleSummary.length }} 条）</div>
          <div v-for="(rule, i) in viewData.ruleSummary" :key="i" style="font-size:13px;color:#606266;margin-bottom:4px">
            {{ typeLabel(rule.type) }} · {{ rule.categoryId ? categoryName(rule.categoryId) : '全部' }} · {{ rule.count }}题 × {{ rule.score }}分
          </div>
        </template>
        <template v-else>
          <div style="font-weight:600;margin-bottom:8px">手动选题（{{ viewData.questions.length }} 题，合计 {{ viewData.questions.reduce((s, q) => s + q.score, 0) }} 分）</div>
          <el-table :data="viewData.questions" size="small" max-height="320">
            <el-table-column label="题型" width="70"><template #default="{ row }">{{ typeLabel(row.type) }}</template></el-table-column>
            <el-table-column prop="title" label="题干" show-overflow-tooltip />
            <el-table-column prop="score" label="分值" width="60" align="center" />
          </el-table>
        </template>
      </template>
      <template #footer><el-button @click="viewVisible=false">关闭</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import { toast } from '@/utils/toast'
import type { PaperRow, Paper, DrawRule } from '@/api/exam'
import { getPaperList, createPaper, updatePaper, deletePaper, publishPaper, archivePaper, clonePaper, getPaperDetail, getQuestionList, getCategoryList } from '@/api/exam'
import { getDepartmentTree, type DepartmentItem } from '@/api/org'
import { getUserList } from '@/api/user'
import { getRoleList, type RoleItem } from '@/api/role'

const loading = ref(false)
const tableData = ref<PaperRow[]>([])
const total = ref(0)
const page = ref(1)
const filterStatus = ref('')

const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const drawMode = ref<'manual' | 'random'>('manual')
const form = reactive<Paper>({
  title: '', description: '', duration: 60, passScore: 60, totalScore: 100, maxAttempts: 1,
  scopeType: 'all', scopeDepartments: [], scopeUsers: [], scopeRoles: [],
  drawRules: [], shuffleQuestions: false, shuffleOptions: false, questionIds: [], startTime: '', endTime: '',
})

const categoryOptions = ref<{ id: number; name: string }[]>([])
const questionOptions = ref<any[]>([])
const questionTableRef = ref()
const qCategoryFilter = ref<number>()
const qKeyword = ref('')
const qPage = ref(1)
const qPageSize = 20
const qTotal = ref(0)
const selectedTotalScore = computed(() =>
  questionOptions.value.filter((q) => form.questionIds.includes(q.id)).reduce((s, q) => s + (q.score || 0), 0)
)

const deptTree = ref<DepartmentItem[]>([])
const deptTreeRef = ref()
const userOptions = ref<{ id: number; nickname: string }[]>([])
const roleOptions = ref<RoleItem[]>([])

const viewVisible = ref(false)
const viewData = ref<{ paper: PaperRow; questions: { id: number; type: string; title: string; score: number }[]; ruleSummary: DrawRule[] } | null>(null)

const scopeLabel = (s?: string) => ({ all: '全员', department: '指定部门', user: '指定人员', role: '指定角色' })[s || ''] || s || ''
const statusType = (s: string): '' | 'success' | 'info' | 'warning' => ({ draft: 'info', published: 'success', archived: 'info' } as Record<string, '' | 'success' | 'info' | 'warning'>)[s] || ''
const statusLabel = (s?: string) => ({ draft: '草稿', published: '已发布', archived: '归档' })[s || ''] || s || ''
const typeLabel = (t: string) => ({ single: '单选', multiple: '多选', judge: '判断' })[t] || t

function categoryName(id?: number): string {
  const c = categoryOptions.value.find((x) => x.id === id)
  return c ? c.name : '未分类'
}

async function loadData() {
  loading.value = true
  try {
    const res = await getPaperList({ page: page.value, pageSize: 20, status: filterStatus.value || undefined })
    tableData.value = res.list || []
    total.value = res.total || 0
  } catch { toast.error('加载失败') }
  finally { loading.value = false }
}

async function loadQuestions() {
  try {
    const res = await getQuestionList({
      page: qPage.value, pageSize: qPageSize,
      categoryId: qCategoryFilter.value || undefined,
      keyword: qKeyword.value || undefined,
    })
    questionOptions.value = res.list || []
    qTotal.value = res.total || 0
    // 回显已选(仅当前页存在的数据行)
    nextTick(() => {
      if (questionTableRef.value) {
        questionOptions.value.forEach((row) => {
          const checked = form.questionIds.includes(row.id)
          const current = (questionTableRef.value as any).getSelectionRows?.() || []
          const rowSelected = current.some((r: any) => r.id === row.id)
          if (checked && !rowSelected) (questionTableRef.value as any).toggleRowSelection(row, true)
        })
      }
    })
  } catch { /* */ }
}

function onQuestionSelect(rows: any[]) {
  form.questionIds = rows.map(r => r.id)
}

function onQSearch() { qPage.value = 1; loadQuestions() }

function onDrawModeChange() {
  form.questionIds = []
  if (drawMode.value === 'manual') { qPage.value = 1; loadQuestions() }
}

function addRule() {
  form.drawRules = [...(form.drawRules || []), { type: 'single', categoryId: 0, count: 10, score: 2 }]
}

function removeRule(i: number) {
  form.drawRules = (form.drawRules || []).filter((_, idx) => idx !== i)
}

async function searchUsers(kw: string) {
  try {
    const res = await getUserList({ keyword: kw, page: 1, pageSize: 20 })
    userOptions.value = (res.list || []).map((u: any) => ({ id: u.id, nickname: u.nickname || u.userName }))
  } catch { /* */ }
}

function openCreate() {
  editingId.value = null
  drawMode.value = 'manual'
  resetForm()
  dialogVisible.value = true
}

function resetForm() {
  Object.assign(form, {
    title: '', description: '', duration: 60, passScore: 60, totalScore: 100, maxAttempts: 1,
    scopeType: 'all', scopeDepartments: [], scopeUsers: [], scopeRoles: [],
    drawRules: [], shuffleQuestions: false, shuffleOptions: false, questionIds: [], startTime: '', endTime: '',
  })
  qPage.value = 1
  qKeyword.value = ''
  qCategoryFilter.value = undefined
  if (deptTreeRef.value) deptTreeRef.value.setCheckedKeys([])
}

function parseArr(v: any): number[] {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') { try { return JSON.parse(v) } catch { return [] } }
  return []
}

async function openEdit(row: PaperRow) {
  editingId.value = row.id
  const rules = parseArr(row.draw_rules) as unknown as DrawRule[]
  const qids = parseArr(row.question_ids)
  Object.assign(form, {
    title: row.title, description: row.description || '', duration: row.duration,
    passScore: row.pass_score, totalScore: row.total_score, maxAttempts: row.max_attempts ?? 1,
    scopeType: row.scope_type || 'all',
    scopeDepartments: parseArr(row.scope_departments),
    scopeUsers: parseArr(row.scope_users),
    scopeRoles: parseArr(row.scope_roles),
    drawRules: rules.length ? rules : [],
    shuffleQuestions: !!row.shuffle_questions, shuffleOptions: !!row.shuffle_options,
    questionIds: qids, startTime: row.start_time || '', endTime: row.end_time || '',
  })
  drawMode.value = rules.length ? 'random' : 'manual'
  dialogVisible.value = true
  nextTick(async () => {
    // 部门树回显(独立于组卷方式)
    if (deptTreeRef.value && form.scopeType === 'department') {
      deptTreeRef.value.setCheckedKeys(form.scopeDepartments || [])
    }
    // 指定人员回显姓名
    if (form.scopeType === 'user' && (form.scopeUsers || []).length) {
      const res = await getUserList({ page: 1, pageSize: 50 })
      const all = (res.list || []).map((u: any) => ({ id: u.id, nickname: u.nickname || u.userName }))
      userOptions.value = all.filter((u: any) => (form.scopeUsers || []).includes(u.id))
    }
    if (drawMode.value === 'manual') {
      qPage.value = 1
      await loadQuestions()
    }
  })
}

async function handleSave() {
  if (!form.title.trim()) { toast.warning('名称不能为空'); return }
  if (form.passScore > form.totalScore) { toast.warning('合格分不能大于总分'); return }
  const drawRules = drawMode.value === 'random' ? (form.drawRules || []).filter(r => r.count > 0) : []
  if (drawMode.value === 'manual' && !form.questionIds.length) { toast.warning('请选择题目'); return }
  if (drawMode.value === 'random' && !drawRules.length) { toast.warning('请配置抽题规则'); return }
  if (form.scopeType === 'department' && deptTreeRef.value) {
    form.scopeDepartments = deptTreeRef.value.getCheckedKeys() as number[]
  }
  const totalScore = drawRules.length ? drawRules.reduce((s, r) => s + r.count * r.score, 0) : form.totalScore
  if (form.passScore > totalScore) { toast.warning('合格分不能大于总分(' + totalScore + ')'); return }
  const payload: Paper = {
    title: form.title, description: form.description, duration: form.duration,
    passScore: form.passScore, totalScore, maxAttempts: form.maxAttempts,
    scopeType: form.scopeType, scopeDepartments: form.scopeDepartments, scopeUsers: form.scopeUsers, scopeRoles: form.scopeRoles,
    drawRules: drawRules.length ? drawRules : undefined,
    shuffleQuestions: form.shuffleQuestions, shuffleOptions: form.shuffleOptions,
    questionIds: drawRules.length ? [] : form.questionIds,
    startTime: form.startTime || undefined, endTime: form.endTime || undefined,
  }
  try {
    if (editingId.value) await updatePaper({ id: editingId.value, ...payload })
    else await createPaper(payload)
    dialogVisible.value = false
    toast.success('已保存')
    loadData()
  } catch { toast.error('保存失败') }
}

async function handlePublish(row: PaperRow) {
  try {
    await ElMessageBox.confirm('确定发布试卷「' + row.title + '」？发布后范围内人员即可参加。', '发布确认', { type: 'warning' })
    await publishPaper(row.id)
    toast.success('已发布')
    loadData()
  } catch { /* cancelled */ }
}

async function handleArchive(row: PaperRow) {
  try {
    await ElMessageBox.confirm('确定归档试卷「' + row.title + '」？归档后范围内人员不可再参加。', '归档确认', { type: 'warning' })
    await archivePaper(row.id)
    toast.success('已归档')
    loadData()
  } catch { /* cancelled */ }
}

async function handleClone(row: PaperRow) {
  try {
    const res = await clonePaper(row.id)
    toast.success('已克隆为草稿')
    loadData()
    if (res.id) openEdit({ ...row, id: res.id, title: row.title + '（副本）', status: 'draft' } as any)
  } catch { toast.error('克隆失败') }
}

async function handleDelete(row: PaperRow) {
  try {
    await ElMessageBox.confirm('确定删除试卷「' + row.title + '」？', '删除确认', { type: 'warning' })
    await deletePaper(row.id)
    toast.success('已删除')
    loadData()
  } catch { /* cancelled */ }
}

async function openView(row: PaperRow) {
  viewVisible.value = true
  viewData.value = null
  try {
    viewData.value = await getPaperDetail(row.id)
  } catch { toast.error('详情加载失败') }
}

onMounted(async () => {
  loadData()
  try {
    const cats = await getCategoryList()
    categoryOptions.value = cats.map(c => ({ id: c.id, name: c.name }))
  } catch { /* */ }
  try { deptTree.value = await getDepartmentTree() } catch { /* */ }
  try { roleOptions.value = await getRoleList() } catch { /* */ }
})
</script>

<style lang="scss" scoped>
.papers-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 18px; font-weight: 600; }
.actions { display: flex; gap: 12px; align-items: center; }
.hint { margin-left: 8px; color: #909399; font-size: 12px; }
.q-select { width: 100%; }
.q-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
.rule-list { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.rule-row { display: flex; gap: 8px; align-items: center; }
</style>