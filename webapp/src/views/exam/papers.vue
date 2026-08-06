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
        <el-table-column prop="title" label="名称" min-width="170" />
        <el-table-column prop="duration" label="时长" width="70"><template #default="{ row }">{{ row.duration }}分钟</template></el-table-column>
        <el-table-column prop="pass_score" label="合格线" width="70" />
        <el-table-column label="范围" width="90"><template #default="{ row }">{{ scopeLabel(row.scope_type) }}</template></el-table-column>
        <el-table-column label="成绩" width="70"><template #default="{ row }"><el-tag size="small" :type="row.result_visibility==='manual' ? 'warning' : 'success'">{{ row.result_visibility==='manual' ? '公布后' : '即时' }}</el-tag></template></el-table-column>
        <el-table-column prop="version" label="版本" width="60"><template #default="{ row }">v{{ row.version }}</template></el-table-column>
        <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag :type="statusType(row.status || '')" size="small">{{ statusLabel(row.status || '') }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="300"><template #default="{ row }">
          <el-button v-if="row.status==='draft'" size="small" link @click="openEdit(row)">编辑</el-button>
          <el-button v-else size="small" link @click="viewPaper(row)">查看</el-button>
          <el-button v-if="row.status==='draft'" size="small" link type="success" @click="handlePublish(row)">发布</el-button>
          <el-button v-if="row.status==='published' && row.result_visibility==='manual' && !row.result_released" size="small" link type="success" @click="handleRelease(row)">公布成绩</el-button>
          <el-button v-if="row.status==='published'" size="small" link type="warning" @click="handleRemind(row)">催考</el-button>
          <el-button v-if="row.status==='published'" size="small" link type="warning" @click="handleClone(row)">克隆</el-button>
          <el-button v-if="row.status==='draft'" size="small" link type="danger" @click="handleDelete(row)">删除</el-button>
          <el-button v-if="row.status==='published'" size="small" link type="warning" @click="handleArchive(row)">归档</el-button>
        </template></el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total,prev,pager,next" background style="margin-top:16px;justify-content:flex-end" @current-change="loadData" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑试卷' : '新建试卷'" width="760px" destroy-on-close>
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
            <el-radio value="user">指定用户</el-radio>
            <el-radio value="role">指定角色</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.scopeType==='department'" label="选择部门">
          <el-tree-select v-model="form.scopeDepartments" :data="deptTree" multiple check-strictly :props="{ value: 'id', label: 'name', children: 'children' }" style="width:100%" placeholder="请选择" />
        </el-form-item>
        <el-form-item v-if="form.scopeType==='user'" label="选择用户">
          <el-select v-model="form.scopeUsers" multiple filterable remote :remote-method="searchUsers" :loading="userLoading" style="width:100%" placeholder="搜索用户昵称/姓名">
            <el-option v-for="u in userOptions" :key="u.userId" :label="`${u.nickName || u.userName}${u.department ? '(' + u.department + ')' : ''}`" :value="Number(u.userId)" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.scopeType==='role'" label="选择角色">
          <el-select v-model="form.scopeRoles" multiple style="width:100%" placeholder="请选择角色">
            <el-option v-for="r in roleOptions" :key="r.code" :label="r.name" :value="r.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker v-model="form.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="可留空(永久开放)" style="width:100%" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker v-model="form.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="可留空(永久开放)" style="width:100%" />
        </el-form-item>
        <el-form-item label="组卷方式">
          <el-radio-group v-model="drawMode">
            <el-radio value="manual">手动选题</el-radio>
            <el-radio value="draw">随机抽题</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="drawMode==='draw'" label="抽题规则">
          <div class="draw-editor">
            <div v-for="(rule, i) in form.drawRules" :key="i" class="draw-row">
              <el-select v-model="rule.type" style="width:76px">
                <el-option label="单选" value="single" /><el-option label="多选" value="multiple" /><el-option label="判断" value="judge" />
              </el-select>
              <el-select v-model="rule.categoryId" style="width:130px" placeholder="分类">
                <el-option label="全部分类" :value="0" />
                <el-option v-for="c in categoryOptions" :key="c.id" :label="c.path || c.name" :value="c.id" />
              </el-select>
              <span>抽</span>
              <el-input-number v-model="rule.count" :min="1" :max="100" size="small" style="width:90px" />
              <span>题·每题</span>
              <el-input-number v-model="rule.score" :min="1" :max="20" size="small" style="width:80px" />
              <span>分</span>
              <el-button size="small" link type="danger" @click="form.drawRules.splice(i, 1)">删除</el-button>
            </div>
            <div class="draw-tools">
              <el-button size="small" type="primary" plain @click="addDrawRule">+ 添加规则</el-button>
              <span v-if="form.drawRules.length" class="draw-summary">预计总分 <b>{{ drawTotalScore }}</b> · 每考生随机抽题</span>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="乱序">
          <el-switch v-model="form.shuffleQuestions" /><span style="margin-left:8px">题目乱序</span>
          <el-switch v-model="form.shuffleOptions" style="margin-left:24px" /><span style="margin-left:8px;color:#999">选项乱序(防背题)</span>
        </el-form-item>
        <el-form-item label="成绩展示">
          <el-radio-group v-model="form.resultVisibility">
            <el-radio value="immediate">交卷立即显示</el-radio>
            <el-radio value="manual">公布后显示</el-radio>
          </el-radio-group>
          <span v-if="form.resultVisibility==='manual'" style="margin-left:8px;color:#999">发布后在列表点「公布成绩」员工方可查看</span>
        </el-form-item>
        <el-form-item v-if="drawMode==='manual'" label="组卷选题">
          <div class="paper-select">
            <div class="group-bar">
              <el-radio-group v-model="activeGroup" size="small">
                <el-radio-button v-for="g in groups" :key="g" :value="g">{{ g }}</el-radio-button>
              </el-radio-group>
              <el-button size="small" @click="addGroup">+ 新建分组</el-button>
              <el-button size="small" type="danger" :disabled="activeGroup==='默认'" @click="removeGroup">删除当前</el-button>
            </div>
            <div class="select-filters">
              <el-select v-model="qFilter.categoryId" placeholder="分类" clearable style="width:140px" @change="onQFilterChange">
                <el-option v-for="c in categoryOptions" :key="c.id" :label="c.path || c.name" :value="c.id" />
              </el-select>
              <el-select v-model="qFilter.type" placeholder="题型" clearable style="width:100px" @change="onQFilterChange">
                <el-option label="单选" value="single" /><el-option label="多选" value="multiple" /><el-option label="判断" value="judge" />
              </el-select>
              <el-input v-model="qFilter.keyword" placeholder="搜索题干" clearable style="width:180px" @keyup.enter="onQFilterChange" @clear="onQFilterChange" />
            </div>
            <el-table ref="questionTableRef" :data="candidateQuestions" row-key="id" max-height="240" border size="small" @selection-change="onSelectionChange">
              <el-table-column type="selection" width="40" reserve-selection />
              <el-table-column label="题型" width="60"><template #default="{ row }">{{ typeLabel(row.type) }}</template></el-table-column>
              <el-table-column prop="title" label="题干" min-width="220" show-overflow-tooltip />
              <el-table-column prop="score" label="分值" width="55" align="center" />
            </el-table>
            <div class="select-summary">
              已选 <b>{{ form.questionIds.length }}</b> 题 · 总分 <b>{{ selectedTotalScore }}</b>
              <template v-if="groupSummary.length">
                <span v-for="g in groupSummary" :key="g.name" class="group-chip">{{ g.name }}({{ g.count }})</span>
              </template>
            </div>
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
        <el-descriptions-item label="范围">{{ scopeLabel(previewRow.scope_type) }}</el-descriptions-item>
        <el-descriptions-item label="成绩">{{ previewRow.result_visibility === 'manual' ? '公布后显示' : '交卷立即显示' }}</el-descriptions-item>
        <el-descriptions-item label="版本">v{{ previewRow.version }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusLabel(previewRow.status || '') }}</el-descriptions-item>
        <el-descriptions-item v-if="previewRow.result_visibility==='manual'" label="公布状态" :span="2">{{ previewRow.result_released ? '已公布' : '未公布' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer><el-button @click="previewVisible = false">关闭</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { toast } from '@/utils/toast'
import type { PaperRow, DrawRule, PaperSection, ScopeType } from '@/api/exam'
import { getPaperList, createPaper, updatePaper, deletePaper, publishPaper, clonePaper, getCategoryList, getQuestionList, releasePaperResult, remindPaper } from '@/api/exam'
import { getDepartmentTree, getUserList, getRoleList } from '@/api/user'
import type { UserItem } from '@/api/user'
import type { QuestionRow } from '@/api/exam'

interface DeptNode { id: number; name: string; children?: DeptNode[] }
interface RoleItem { code: string; name: string }

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
const userOptions = ref<UserItem[]>([])
const userLoading = ref(false)
const roleOptions = ref<RoleItem[]>([])
const form = reactive<{
  title: string
  duration: number
  passScore: number
  totalScore: number
  maxAttempts: number
  maxScreenshotWarns: number
  scopeType: ScopeType
  scopeDepartments: number[]
  scopeUsers: number[]
  scopeRoles: string[]
  drawRules: DrawRule[]
  shuffleQuestions: boolean
  shuffleOptions: boolean
  resultVisibility: 'immediate' | 'manual'
  sections: PaperSection[]
  startTime: string
  endTime: string
  questionIds: number[]
}>({
  title: '', duration: 60, passScore: 60, totalScore: 100, maxAttempts: 1, maxScreenshotWarns: 2,
  scopeType: 'all', scopeDepartments: [], scopeUsers: [], scopeRoles: [],
  drawRules: [], shuffleQuestions: false, shuffleOptions: false, resultVisibility: 'immediate',
  sections: [], startTime: '', endTime: '', questionIds: [],
})

// 组卷方式 + 分组状态
const drawMode = ref<'manual' | 'draw'>('manual')
const groups = ref<string[]>(['默认'])
const activeGroup = ref('默认')
const questionGroupMap = ref<Record<number, string>>({})

const statusType = (s: string): '' | 'info' | 'success' | 'warning' | 'danger' =>
  ({ draft: 'info', published: 'success', archived: '' } as Record<string, '' | 'info' | 'success' | 'warning' | 'danger'>)[s] || ''
const statusLabel = (s: string): string => ({ draft: '草稿', published: '已发布', archived: '归档' })[s] || s
const scopeLabel = (s?: string): string => ({ all: '全员', department: '指定部门', user: '指定用户', role: '指定角色' })[s || 'all'] || s || '全员'

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

function parseArr<T>(raw: T[] | string | undefined): T[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw as string) } catch { return [] }
}

// ===== 组卷选题(分类树筛选 + 勾选 + 分组) =====
const categoryOptions = ref<{ id: number; name: string; path?: string }[]>([])
const qFilter = reactive({ categoryId: undefined as number | undefined, type: '', keyword: '' })
const candidateQuestions = ref<QuestionRow[]>([])
const selectedScoreMap = ref<Record<number, number>>({})
const questionTableRef = ref()
const selectedTotalScore = computed(() => Object.values(selectedScoreMap.value).reduce((s, v) => s + v, 0))
const drawTotalScore = computed(() => form.drawRules.reduce((s, r) => s + (Number(r.count) || 0) * (Number(r.score) || 0), 0))
const groupSummary = computed(() =>
  groups.value.filter(g => g !== '默认').map(g => ({
    name: g,
    count: Object.values(questionGroupMap.value).filter(x => x === g).length,
  })).filter(x => x.count > 0)
)
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
    // 已选题目刷新真实分值(修正编辑回显总分)
    candidateQuestions.value.forEach(q => {
      if (selectedScoreMap.value[q.id] !== undefined) selectedScoreMap.value[q.id] = q.score
    })
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

function buildSections() {
  const set = new Set<string>()
  Object.values(questionGroupMap.value).forEach(g => set.add(g))
  form.sections = [...set].filter(g => g !== '默认').map(g => ({
    name: g,
    questionIds: Object.keys(questionGroupMap.value).filter(k => questionGroupMap.value[+k] === g).map(Number),
  }))
}

function onSelectionChange(rows: QuestionRow[]) {
  const currentIds = new Set(candidateQuestions.value.map(q => q.id))
  const currentSelected = new Set(rows.map(r => r.id))
  // 移除当前列表中被取消选中的
  candidateQuestions.value.forEach(q => {
    if (currentIds.has(q.id) && !currentSelected.has(q.id)) {
      delete selectedScoreMap.value[q.id]
      delete questionGroupMap.value[q.id]
    }
  })
  // 新选中:记分值 + 归入当前分组
  rows.forEach(r => {
    selectedScoreMap.value[r.id] = r.score
    if (questionGroupMap.value[r.id] === undefined) questionGroupMap.value[r.id] = activeGroup.value
  })
  form.questionIds = Object.keys(selectedScoreMap.value).map(Number)
  buildSections()
}

function addGroup() {
  ElMessageBox.prompt('分组名称', '新建分组', {
    confirmButtonText: '创建',
    cancelButtonText: '取消',
    inputValidator: (v: string) => (!v || groups.value.includes(v)) ? '名称不能为空且不能重复' : true,
  }).then(({ value }) => {
    groups.value.push(value)
    activeGroup.value = value
  }).catch(() => { /* cancelled */ })
}

function removeGroup() {
  if (activeGroup.value === '默认') return
  const g = activeGroup.value
  Object.keys(questionGroupMap.value).forEach(k => {
    if (questionGroupMap.value[+k] === g) questionGroupMap.value[+k] = '默认'
  })
  groups.value = groups.value.filter(x => x !== g)
  activeGroup.value = '默认'
  buildSections()
}

function addDrawRule() {
  form.drawRules.push({ type: 'single', categoryId: 0, count: 10, score: 2 })
}

function resetDialog() {
  Object.assign(form, {
    title: '', duration: 60, passScore: 60, totalScore: 100, maxAttempts: 1, maxScreenshotWarns: 2,
    scopeType: 'all' as ScopeType, scopeDepartments: [], scopeUsers: [], scopeRoles: [],
    drawRules: [], shuffleQuestions: false, shuffleOptions: false, resultVisibility: 'immediate',
    sections: [], startTime: '', endTime: '', questionIds: [],
  })
  drawMode.value = 'manual'
  groups.value = ['默认']
  activeGroup.value = '默认'
  questionGroupMap.value = {}
  selectedScoreMap.value = {}
  editingId.value = null
  dialogVisible.value = true
  loadCategories()
  loadCandidateQuestions()
}

function openCreate() {
  resetDialog()
}

function openEdit(row: PaperRow) {
  Object.assign(form, {
    title: row.title,
    duration: row.duration,
    passScore: row.pass_score,
    maxAttempts: row.max_attempts ?? 1,
    maxScreenshotWarns: row.max_screenshot_warns ?? 2,
    scopeType: (row.scope_type || 'all') as ScopeType,
    scopeDepartments: parseDepts(row.scope_departments),
    scopeUsers: parseArr<number>(row.scope_users),
    scopeRoles: parseArr<string>(row.scope_roles),
    drawRules: parseArr<DrawRule>(row.draw_rules),
    shuffleQuestions: !!row.shuffle_questions,
    shuffleOptions: !!row.shuffle_options,
    resultVisibility: row.result_visibility || 'immediate',
    startTime: row.start_time || '',
    endTime: row.end_time || '',
  })
  drawMode.value = form.drawRules.length ? 'draw' : 'manual'
  editingId.value = row.id
  dialogVisible.value = true

  // 回显已选题 + 分组
  const qids = parseQuestionIds(row.question_ids)
  const scoreMap: Record<number, number> = {}
  qids.forEach(id => { scoreMap[id] = 0 })
  selectedScoreMap.value = scoreMap
  form.questionIds = qids

  // 分组重建
  const sections = parseArr<PaperSection>(row.sections)
  const gs = ['默认']
  const qg: Record<number, string> = {}
  sections.forEach(sec => { gs.push(sec.name); sec.questionIds.forEach(qid => { qg[qid] = sec.name }) })
  qids.forEach(qid => { if (qg[qid] === undefined) qg[qid] = '默认' })
  groups.value = gs
  questionGroupMap.value = qg
  activeGroup.value = '默认'
  buildSections()

  // 范围回显用户/角色选项
  if (form.scopeType === 'user') loadScopeUsers()
  loadCategories()
  loadCandidateQuestions()
}

async function loadScopeUsers() {
  userLoading.value = true
  try {
    const res = await getUserList({ page: 1, pageSize: 200 })
    const list = res.list || []
    userOptions.value = list.filter(u => form.scopeUsers.includes(Number(u.userId)))
  } catch { userOptions.value = [] }
  finally { userLoading.value = false }
}

async function searchUsers(kw: string) {
  userLoading.value = true
  try {
    const res = await getUserList({ page: 1, pageSize: 50, keyword: kw || undefined })
    userOptions.value = res.list || []
  } catch { userOptions.value = [] }
  finally { userLoading.value = false }
}

function viewPaper(row: PaperRow) {
  previewRow.value = row
  previewVisible.value = true
}

async function handleSave() {
  if (!form.title) { toast.warning('试卷名称不能为空'); return }
  if (drawMode.value === 'draw' && !form.drawRules.length) { toast.warning('请至少配置一条抽题规则'); return }
  const payload = {
    ...form,
    questionIds: drawMode.value === 'draw' ? [] : form.questionIds,
    drawRules: drawMode.value === 'draw' ? form.drawRules : undefined,
    sections: drawMode.value === 'draw' ? undefined : form.sections,
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
    const res = await publishPaper(row.id)
    toast.success(`已发布${res.notified ? `,已通知 ${res.notified} 人` : ''}`)
    loadData()
  } catch { toast.error('发布失败') }
}

async function handleRelease(row: PaperRow) {
  try {
    await ElMessageBox.confirm('确定公布该试卷成绩?公布后员工方可查看分数与逐题详情。', '公布成绩', { type: 'warning' })
    await releasePaperResult(row.id)
    toast.success('成绩已公布')
    loadData()
  } catch { /* cancelled */ }
}

async function handleRemind(row: PaperRow) {
  try {
    await ElMessageBox.confirm('向该试卷范围内未完成考试的员工发送催考提醒?', '一键催考', { type: 'warning' })
    const res = await remindPaper(row.id)
    toast.success(`已提醒 ${res.remindedCount ?? 0} 人`)
  } catch { /* cancelled */ }
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
  try {
    roleOptions.value = await getRoleList()
  } catch { /* */ }
})
</script>

<style lang="scss" scoped>
.papers-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 18px; font-weight: 600; }
.paper-select { width: 100%; }
.group-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.select-filters { display: flex; gap: 8px; margin-bottom: 8px; }
.select-summary { margin-top: 8px; font-size: 13px; color: #606266; }
.select-summary b { color: #2B6DE8; }
.group-chip { display: inline-block; margin-left: 12px; padding: 0 8px; background: #EDF2FF; color: #2B6DE8; border-radius: 8px; font-size: 12px; }
.draw-editor { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.draw-row { display: flex; align-items: center; gap: 6px; }
.draw-tools { display: flex; align-items: center; gap: 12px; }
.draw-summary { font-size: 13px; color: #909399; }
.draw-summary b { color: #2B6DE8; }
</style>
