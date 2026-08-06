<template>
  <div class="questions-page">
    <el-card>
      <template #header>
        <div class="toolbar">
          <span class="title">题库管理</span>
          <div class="actions">
            <el-button size="small" @click="catDialogVisible = true">分类管理</el-button>
            <el-select v-model="categoryFilter" placeholder="分类" clearable style="width:180px" @change="loadData">
              <el-option v-for="c in categoryOptions" :key="c.id" :label="c.path || c.name" :value="c.id" />
            </el-select>
            <el-input v-model="keyword" placeholder="搜索题干" clearable style="width:200px" @clear="loadData" @keyup.enter="loadData" />
            <el-select v-model="filterType" placeholder="题型" clearable style="width:120px" @change="loadData">
              <el-option label="单选" value="single" /><el-option label="多选" value="multiple" /><el-option label="判断" value="judge" />
            </el-select>
            <el-button @click="openBatchDialog">批量导入</el-button>
            <el-button type="primary" @click="openCreate">新增题目</el-button>
          </div>
        </div>
      </template>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column label="题型" width="80"><template #default="{ row }"><el-tag size="small" :type="row.type==='single'?'primary':row.type==='multiple'?'success':'info'">{{ typeLabel(row.type) }}</el-tag></template></el-table-column>
        <el-table-column prop="title" label="题干" min-width="300" show-overflow-tooltip />
        <el-table-column prop="score" label="分值" width="70" align="center" />
        <el-table-column prop="answer" label="答案" width="80" align="center" />
        <el-table-column label="操作" width="120"><template #default="{ row }">
          <el-button size="small" link @click="openEdit(row)">编辑</el-button>
          <el-button size="small" link type="danger" @click="handleDelete(row)">删除</el-button>
        </template></el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total,prev,pager,next" background style="margin-top:16px;justify-content:flex-end" @current-change="loadData" />
    </el-card>

    <!-- 题目新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑题目' : '新增题目'" width="520px" destroy-on-close @closed="resetForm">
      <el-form :model="form" label-width="80px">
        <el-form-item label="分类"><el-select v-model="form.categoryId" clearable placeholder="全部分类" style="width:100%"><el-option v-for="c in categoryOptions" :key="c.id" :label="c.path || c.name" :value="c.id" /></el-select></el-form-item>
        <el-form-item label="题型"><el-select v-model="form.type"><el-option label="单选" value="single" /><el-option label="多选" value="multiple" /><el-option label="判断" value="judge" /></el-select></el-form-item>
        <el-form-item label="题干"><el-input v-model="form.title" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="分值"><el-input-number v-model="form.score" :min="1" :max="20" /></el-form-item>
        <el-form-item v-if="form.type==='multiple'" label="评分"><el-select v-model="form.scoreMode"><el-option label="全对得分" value="exact" /><el-option label="漏选给分" value="partial" /></el-select></el-form-item>
        <el-form-item label="选项乱序"><el-switch v-model="form.shuffleOptions" /><span style="margin-left:8px;color:#999">答题时该题选项随机排列</span></el-form-item>
        <el-form-item label="选项">
          <div class="option-editor">
            <div v-for="(option, index) in form.options" :key="option.key" class="option-row">
              <el-input v-model="option.key" placeholder="选项标识" style="width: 80px" maxlength="4" />
              <el-input v-model="option.text" placeholder="选项内容" />
              <el-button size="small" type="danger" link :disabled="form.options.length <= 2" @click="removeOption(index)">删除</el-button>
            </div>
            <el-button size="small" type="primary" plain @click="addOption">添加选项</el-button>
          </div>
        </el-form-item>
        <el-form-item label="答案"><el-input v-model="form.answer" placeholder="多选用逗号分隔如 A,B" /></el-form-item>
        <el-form-item label="解析"><el-input v-model="form.analysis" type="textarea" :rows="2" placeholder="可选" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="handleSave">保存</el-button></template>
    </el-dialog>

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="batchVisible" title="批量导入" width="600px">
      <el-upload drag :auto-upload="false" :on-change="handleFileChange" accept=".json">
        <div>拖拽 JSON 文件到此处或点击上传</div>
      </el-upload>
      <div v-if="batchResult" style="margin-top:16px">
        <p>✅ 成功 {{ batchResult.success }} 题</p>
        <p v-if="batchResult.failed">⚠ 失败 {{ batchResult.failed }} 题</p>
        <ul v-if="batchResult.errors && batchResult.errors.length">{{ batchResult.errors.map(e => `第${e.row}行: ${e.reason}`).join(', ') }}</ul>
      </div>
      <template #footer><el-button @click="batchVisible=false">关闭</el-button><el-button type="primary" @click="doBatchImport">开始导入</el-button></template>
    </el-dialog>

    <!-- 分类管理弹窗 -->
    <el-dialog v-model="catDialogVisible" title="分类管理" width="480px">
      <div class="cat-actions">
        <el-button type="primary" size="small" @click="openCatDialog()">+ 新增分类</el-button>
      </div>
      <el-tree :data="categories" :props="{ label: 'name', children: 'children' }" node-key="id" default-expand-all>
        <template #default="{ data }">
          <span class="cat-node">
            <span>{{ data.path || data.name }}</span>
            <span>
              <el-button size="small" link @click.stop="openCatDialog(data)">编辑</el-button>
              <el-button size="small" link type="danger" @click.stop="handleCatDelete(data)">删除</el-button>
            </span>
          </span>
        </template>
      </el-tree>
      <template #footer><el-button @click="catDialogVisible=false">关闭</el-button></template>
    </el-dialog>

    <!-- 新增/编辑分类弹窗 -->
    <el-dialog v-model="catEditVisible" :title="catEditingId ? '编辑分类' : '新增分类'" width="380px">
      <el-form :model="catForm" label-width="80px">
        <el-form-item label="父分类">
          <el-select v-model="catForm.parentId" :disabled="catEditingId !== null" clearable style="width:100%">
            <el-option v-for="c in categoryOptions" :key="c.id" :label="c.path || c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称"><el-input v-model="catForm.name" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="catForm.sortOrder" :min="0" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="catEditVisible=false">取消</el-button><el-button type="primary" @click="handleCatSave">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { toast } from '@/utils/toast'
import type { Question, QuestionRow, ExamCategory } from '@/api/exam'
import { getQuestionList, createQuestion, updateQuestion, deleteQuestion, batchImportQuestions, getCategoryList, createCategory, updateCategory, deleteCategory } from '@/api/exam'

const loading = ref(false)
const tableData = ref<QuestionRow[]>([])
const total = ref(0)
const page = ref(1)
const keyword = ref('')
const filterType = ref('')
const categoryFilter = ref<number>()

const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive<{
  type: 'single' | 'multiple' | 'judge'
  categoryId?: number
  title: string
  score: number
  scoreMode: 'exact' | 'partial'
  shuffleOptions: boolean
  answer: string
  analysis: string
  options: { key: string; text: string }[]
}>({
  type: 'single',
  categoryId: undefined,
  title: '',
  score: 2,
  scoreMode: 'exact',
  shuffleOptions: false,
  answer: '',
  analysis: '',
  options: [
    { key: 'A', text: '' },
    { key: 'B', text: '' }
  ]
})

const batchVisible = ref(false)
const batchFile = ref<{ raw: File } | null>(null)
const batchResult = ref<{ success: number; failed: number; errors: { row: number; reason: string }[] } | null>(null)

// 分类
const categories = ref<ExamCategory[]>([])
const categoryOptions = ref<{ id: number; name: string; path?: string }[]>([])
const catDialogVisible = ref(false)
const catEditVisible = ref(false)
const catEditingId = ref<number | null>(null)
const catForm = reactive({ parentId: 0, name: '', sortOrder: 0 })

function flattenCategoryOptions(nodes: ExamCategory[]) {
  nodes.forEach(n => {
    categoryOptions.value.push({ id: n.id, name: n.name, path: n.path })
    if (n.children && n.children.length) flattenCategoryOptions(n.children)
  })
}

async function loadCategories() {
  try {
    categories.value = await getCategoryList()
    categoryOptions.value = []
    flattenCategoryOptions(categories.value)
  } catch { toast.error('分类加载失败') }
}

function typeLabel(t: string) { return { single: '单选', multiple: '多选', judge: '判断' }[t] || t }
function defaultOptions(type: string) {
  if (type === 'judge') {
    return [
      { key: '正确', text: '正确' },
      { key: '错误', text: '错误' }
    ]
  }
  return [
    { key: 'A', text: '' },
    { key: 'B', text: '' }
  ]
}
function resetForm() {
  Object.assign(form, {
    type: 'single' as const,
    categoryId: undefined,
    title: '',
    score: 2,
    scoreMode: 'exact' as const,
    shuffleOptions: false,
    answer: '',
    analysis: '',
    options: defaultOptions('single')
  })
  editingId.value = null
}

async function loadData() {
  loading.value = true
  try {
    const res = await getQuestionList({
      page: page.value,
      pageSize: 20,
      categoryId: categoryFilter.value || undefined,
      type: filterType.value || undefined,
      keyword: keyword.value || undefined
    })
    tableData.value = res.list || []
    total.value = res.total || 0
  } catch { toast.error('加载失败') }
  finally { loading.value = false }
}

function openCreate() { resetForm(); dialogVisible.value = true }
function openEdit(row: QuestionRow) {
  editingId.value = row.id
  const rawOptions = row.options
  let options = Array.isArray(rawOptions) ? rawOptions : []
  if (typeof rawOptions === 'string') {
    try { options = JSON.parse(rawOptions) } catch { options = [] }
  }
  Object.assign(form, {
    type: row.type,
    categoryId: row.category_id,
    title: row.title,
    score: row.score,
    scoreMode: row.score_mode || 'exact',
    shuffleOptions: !!row.shuffle_options,
    answer: row.answer,
    analysis: row.analysis || '',
    options: options.length >= 2 ? options : defaultOptions(row.type)
  })
  dialogVisible.value = true
}

function addOption() {
  const nextKey = String.fromCharCode(65 + form.options.length)
  form.options.push({ key: nextKey, text: '' })
}

function removeOption(index: number) {
  if (form.options.length <= 2) return
  form.options.splice(index, 1)
}

async function handleSave() {
  if (!form.title) { toast.warning('题干不能为空'); return }
  if (!form.answer) { toast.warning('答案不能为空'); return }
  if (form.options.length < 2 || form.options.some(o => !o.text.trim())) {
    toast.warning('至少需要2个有效选项')
    return
  }
  try {
    if (editingId.value) await updateQuestion({ id: editingId.value, ...form })
    else await createQuestion({ ...form })
    dialogVisible.value = false
    loadData()
  } catch { toast.error('保存失败') }
}

async function handleDelete(row: QuestionRow) {
  try {
    await ElMessageBox.confirm('确定删除？', '删除确认', { type: 'warning' })
    await deleteQuestion(row.id)
    toast.success('已删除')
    loadData()
  } catch { /* cancelled */ }
}

function openBatchDialog() { batchVisible.value = true; batchResult.value = null }
function handleFileChange(file: { raw: File }) { batchFile.value = file }
async function doBatchImport() {
  if (!batchFile.value) return
  try {
    const text = await batchFile.value.raw.text()
    const questions = JSON.parse(text) as Question[]
    const res = await batchImportQuestions(questions)
    batchResult.value = res
  } catch { toast.error('导入失败') }
}

// 分类管理
function openCatDialog(node?: ExamCategory) {
  if (node) {
    catEditingId.value = node.id
    catForm.parentId = node.parentId
    catForm.name = node.name
    catForm.sortOrder = node.sortOrder || 0
  } else {
    catEditingId.value = null
    catForm.parentId = 0
    catForm.name = ''
    catForm.sortOrder = 0
  }
  catEditVisible.value = true
}

async function handleCatSave() {
  if (!catForm.name) { toast.warning('名称不能为空'); return }
  try {
    if (catEditingId.value) {
      await updateCategory({ id: catEditingId.value, name: catForm.name, sortOrder: catForm.sortOrder })
    } else {
      await createCategory({ parentId: catForm.parentId, name: catForm.name, sortOrder: catForm.sortOrder })
    }
    catEditVisible.value = false
    await loadCategories()
    toast.success('已保存')
  } catch { toast.error('保存失败') }
}

async function handleCatDelete(node: ExamCategory) {
  try {
    await ElMessageBox.confirm(`确定删除分类"${node.name}"？`, '删除确认', { type: 'warning' })
    await deleteCategory(node.id)
    await loadCategories()
    toast.success('已删除')
  } catch { /* cancelled */ }
}

onMounted(() => {
  loadCategories()
  loadData()
})
</script>

<style lang="scss" scoped>
.questions-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 18px; font-weight: 600; }
.actions { display: flex; gap: 12px; }

.cat-actions { margin-bottom: 12px; }
.cat-node { display: flex; justify-content: space-between; align-items: center; flex: 1; padding-right: 8px; }

.option-editor { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.option-row { display: flex; align-items: center; gap: 8px; width: 100%; }
</style>
