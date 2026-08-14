<template>
  <div class="questions-page">
    <el-card>
      <template #header>
        <div class="toolbar">
          <span class="title">题库管理</span>
          <div class="actions">
            <el-select v-model="filterCategory" placeholder="按分类" clearable style="width:160px" @change="onCategoryFilter">
              <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
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
        <el-table-column prop="title" label="题干" min-width="280" show-overflow-tooltip />
        <el-table-column label="分类" width="120"><template #default="{ row }">{{ categoryName(row.category_id) }}</template></el-table-column>
        <el-table-column prop="score" label="分值" width="70" align="center" />
        <el-table-column prop="answer" label="答案" width="80" align="center" />
        <el-table-column label="状态" width="80" align="center"><template #default="{ row }">
          <el-switch :model-value="row.status !== 'disabled'" size="small" @change="(v: boolean) => handleToggleStatus(row, v)" />
        </template></el-table-column>
        <el-table-column label="操作" width="120"><template #default="{ row }">
          <el-button size="small" link @click="openEdit(row)">编辑</el-button>
          <el-button size="small" link type="danger" @click="handleDelete(row)">删除</el-button>
        </template></el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total,prev,pager,next" background style="margin-top:16px;justify-content:flex-end" @current-change="loadData" />
    </el-card>

    <!-- 题目新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑题目' : '新增题目'" width="640px" destroy-on-close @closed="resetForm">
      <el-form :model="form" label-width="80px">
        <el-form-item label="分类">
          <el-select v-model="form.categoryId" placeholder="选择主分类" style="width:240px">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="题型"><el-select v-model="form.type" @change="onTypeChange"><el-option label="单选" value="single" /><el-option label="多选" value="multiple" /><el-option label="判断" value="judge" /></el-select></el-form-item>
        <el-form-item label="题干"><el-input v-model="form.title" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="题干图片">
          <div class="img-row">
            <el-image v-if="form.titleImage" :src="form.titleImage" fit="cover" class="img-preview" :preview-src-list="[form.titleImage]" />
            <el-upload :show-file-list="false" :http-request="(o: any) => handleImageUpload(o, 'titleImage')" accept=".jpg,.jpeg,.png,.webp,.gif">
              <el-button size="small">{{ form.titleImage ? '更换' : '上传图片' }}</el-button>
            </el-upload>
            <el-button v-if="form.titleImage" size="small" type="danger" link @click="form.titleImage = undefined">移除</el-button>
          </div>
        </el-form-item>
        <el-form-item label="分值"><el-input-number v-model="form.score" :min="1" :max="20" /></el-form-item>
        <el-form-item v-if="form.type==='multiple'" label="评分"><el-select v-model="form.scoreMode"><el-option label="全对得分" value="exact" /><el-option label="漏选给分" value="partial" /></el-select></el-form-item>
        <el-form-item label="选项乱序"><el-switch v-model="form.shuffleOptions" /><span style="margin-left:8px;color:#999">答题时该题选项随机排列</span></el-form-item>
        <el-form-item label="选项">
          <div class="option-editor">
            <div v-for="(option, index) in form.options" :key="option.key" class="option-row">
              <el-input v-model="option.key" placeholder="标识" style="width: 70px" maxlength="4" :disabled="form.type==='judge'" />
              <el-input v-model="option.text" placeholder="选项内容" :disabled="form.type==='judge'" />
              <el-upload :show-file-list="false" :http-request="(o: any) => handleOptionImageUpload(o, index)" accept=".jpg,.jpeg,.png,.webp,.gif">
                <el-button size="small" text :disabled="form.type==='judge'">图</el-button>
              </el-upload>
              <el-image v-if="option.image" :src="option.image" fit="cover" class="opt-img" :preview-src-list="[option.image]" />
              <el-button v-if="option.image && form.type!=='judge'" size="small" type="danger" link @click="option.image = undefined">×</el-button>
              <el-button size="small" type="danger" link :disabled="form.options.length <= 2 || form.type==='judge'" @click="removeOption(index)">删除</el-button>
            </div>
            <el-button v-if="form.type!=='judge'" size="small" type="primary" plain @click="addOption">添加选项</el-button>
            <span v-else class="judge-hint">判断题选项固定为 正确/错误</span>
          </div>
        </el-form-item>
        <el-form-item label="答案"><el-input v-model="form.answer" :placeholder="form.type==='multiple' ? '多选用逗号分隔如 A,B' : form.type==='judge' ? '正确 或 错误' : '如 A'" /></el-form-item>
        <el-form-item label="解析"><el-input v-model="form.analysis" type="textarea" :rows="2" placeholder="可选" /></el-form-item>
        <el-form-item label="解析图片">
          <div class="img-row">
            <el-image v-if="form.analysisImage" :src="form.analysisImage" fit="cover" class="img-preview" :preview-src-list="[form.analysisImage]" />
            <el-upload :show-file-list="false" :http-request="(o: any) => handleImageUpload(o, 'analysisImage')" accept=".jpg,.jpeg,.png,.webp,.gif">
              <el-button size="small">{{ form.analysisImage ? '更换' : '上传图片' }}</el-button>
            </el-upload>
            <el-button v-if="form.analysisImage" size="small" type="danger" link @click="form.analysisImage = undefined">移除</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="handleSave">保存</el-button></template>
    </el-dialog>

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="batchVisible" title="批量导入" width="680px">
      <div class="import-actions">
        <el-button type="primary" plain :icon="Download" @click="handleDownloadTemplate">下载模板</el-button>
        <el-select v-model="importCategoryId" placeholder="目标分类(行内分类列可覆盖)" clearable style="width:260px">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </div>
      <el-upload drag :auto-upload="false" :on-change="handleFileChange" :limit="1" :on-exceed="() => toast.warning('每次只能选择一个文件')" accept=".xlsx,.xls" style="margin-top:8px">
        <div class="el-upload__text">拖拽 Excel 文件到此处或<em>点击上传</em></div>
      </el-upload>
      <p class="import-hint">模板列：分类 / 题型 / 题干 / 选项A~H / 答案 / 解析 / 分值 / 判分模式 / 题干图片。模板含单选/多选/判断三行【示例】数据，导入时自动跳过；判断题仅填题干+答案(正确/错误)；多选答案用逗号分隔如 A,C；「分类」填主分类名称(可空=用右侧目标分类)；「题干图片」填图片URL(可选)。</p>

      <!-- 本地解析预览/错误 -->
      <div v-if="parsePreview" class="preview">
        <div v-if="parsePreview.parseErrors.length" class="preview-block error">
          <p class="preview-title">⚠ 以下行无法导入（共 {{ parsePreview.parseErrors.length }} 行）：</p>
          <ul><li v-for="e in parsePreview.parseErrors" :key="e.row">第{{ e.row }}行：{{ e.reason }}</li></ul>
        </div>
        <p v-if="parsePreview.validCount">✅ 可导入 {{ parsePreview.validCount }} 题</p>
        <p v-if="parsePreview.skippedSamples" class="sample-tip">ℹ 已自动跳过 {{ parsePreview.skippedSamples }} 行模板示例数据</p>
      </div>

      <div v-if="batchResult" style="margin-top:16px">
        <p>✅ 成功 {{ batchResult.success }} 题</p>
        <p v-if="batchResult.failed">⚠ 失败 {{ batchResult.failed }} 题</p>
        <ul v-if="batchResult.errors && batchResult.errors.length" class="err-list">
          <li v-for="e in batchResult.errors" :key="e.row">第{{ e.row }}行: {{ e.reason }}</li>
        </ul>
        <el-button v-if="batchResult.errors && batchResult.errors.length" size="small" type="primary" plain @click="downloadErrors(batchResult.errors)">下载错误明细.csv</el-button>
      </div>
      <template #footer><el-button @click="batchVisible=false">关闭</el-button><el-button type="primary" :disabled="!parsedRows.length" @click="doBatchImport">开始导入</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { toast } from '@/utils/toast'
import type { Question, QuestionRow, ExamCategory } from '@/api/exam'
import { getQuestionList, createQuestion, updateQuestion, deleteQuestion, batchImportQuestions, getCategoryList, uploadQuestionImage } from '@/api/exam'
import { downloadQuestionTemplate, parseQuestionWorkbook, downloadImportErrors } from '@/utils/excel'

const loading = ref(false)
const tableData = ref<QuestionRow[]>([])
const total = ref(0)
const page = ref(1)
const keyword = ref('')
const filterType = ref('')
const filterCategory = ref<number | null>(null)

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
  titleImage?: string
  analysisImage?: string
  options: { key: string; text: string; image?: string }[]
}>({
  type: 'single',
  categoryId: undefined,
  title: '',
  score: 2,
  scoreMode: 'exact',
  shuffleOptions: false,
  answer: '',
  analysis: '',
  titleImage: undefined,
  analysisImage: undefined,
  options: [
    { key: 'A', text: '' },
    { key: 'B', text: '' },
  ]
})

const batchVisible = ref(false)
const importCategoryId = ref<number | null>(null)
const parsePreview = ref<{ validCount: number; parseErrors: { row: number; reason: string }[]; skippedSamples: number } | null>(null)
const parsedRows = ref<Question[]>([])
const batchResult = ref<{ success: number; failed: number; errors: { row: number; reason: string }[] } | null>(null)

// 主分类列表(扁平)
const categories = ref<ExamCategory[]>([])

function categoryName(id?: number): string {
  const c = categories.value.find((x) => x.id === id)
  return c ? c.name : '未分类'
}

async function loadCategories() {
  try {
    categories.value = await getCategoryList()
    // 默认选中第一个主分类(若尚未选择)
    if (filterCategory.value == null && categories.value.length) filterCategory.value = categories.value[0].id
  } catch { toast.error('分类加载失败') }
}

function typeLabel(t: string) { return { single: '单选', multiple: '多选', judge: '判断' }[t] || t }
function defaultOptions(type: string) {
  if (type === 'judge') {
    return [
      { key: '正确', text: '正确' },
      { key: '错误', text: '错误' },
    ]
  }
  return [
    { key: 'A', text: '' },
    { key: 'B', text: '' },
  ]
}
function resetForm() {
  Object.assign(form, {
    type: 'single' as const,
    categoryId: filterCategory.value ?? categories.value[0]?.id,
    title: '',
    score: 2,
    scoreMode: 'exact' as const,
    shuffleOptions: false,
    answer: '',
    analysis: '',
    titleImage: undefined,
    analysisImage: undefined,
    options: defaultOptions('single'),
  })
  editingId.value = null
}

async function loadData() {
  loading.value = true
  try {
    const res = await getQuestionList({
      page: page.value,
      pageSize: 20,
      categoryId: filterCategory.value || undefined,
      type: filterType.value || undefined,
      keyword: keyword.value || undefined,
    })
    tableData.value = res.list || []
    total.value = res.total || 0
  } catch { toast.error('加载失败') }
  finally { loading.value = false }
}

function onCategoryFilter() { page.value = 1; loadData() }

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
    categoryId: row.category_id || filterCategory.value || categories.value[0]?.id,
    title: row.title,
    score: row.score,
    scoreMode: row.score_mode || 'exact',
    shuffleOptions: !!row.shuffle_options,
    answer: row.answer,
    analysis: row.analysis || '',
    titleImage: row.title_image || undefined,
    analysisImage: row.analysis_image || undefined,
    options: options.length >= 2 ? options : defaultOptions(row.type),
  })
  dialogVisible.value = true
}

function onTypeChange() {
  const t = form.type
  if (t === 'judge') {
    form.options = defaultOptions('judge')
    form.answer = form.answer || '正确'
  } else if (form.options.some((o) => o.key === '正确' || o.key === '错误')) {
    form.options = defaultOptions('single')
  }
}

function addOption() {
  const nextKey = String.fromCharCode(65 + form.options.length)
  form.options.push({ key: nextKey, text: '' })
}

function removeOption(index: number) {
  if (form.options.length <= 2) return
  form.options.splice(index, 1)
}

async function handleImageUpload(opt: any, field: 'titleImage' | 'analysisImage') {
  try {
    const res = await uploadQuestionImage(opt.file)
    form[field] = res.url
    toast.success('图片上传成功')
  } catch { toast.error('图片上传失败') }
}

async function handleOptionImageUpload(opt: any, index: number) {
  try {
    const res = await uploadQuestionImage(opt.file)
    form.options[index].image = res.url
    toast.success('图片上传成功')
  } catch { toast.error('图片上传失败') }
}

function validateForm(): boolean {
  if (!form.title.trim()) { toast.warning('题干不能为空'); return false }
  if (form.categoryId == null) { toast.warning('请选择分类'); return false }
  if (!form.answer.trim()) { toast.warning('答案不能为空'); return false }
  if (form.options.length < 2 || form.options.some((o) => !o.text.trim())) {
    toast.warning('至少需要2个有效选项')
    return false
  }
  // 答案合法性: 字母必须在选项 key 内
  const keys = new Set(form.options.map((o) => o.key.trim()).filter(Boolean))
  const answerKeys = form.answer.replace(/\s+/g, '').toUpperCase().split(',')
  if (answerKeys.some((k) => !keys.has(k))) { toast.warning('答案 ' + form.answer + ' 不在选项范围内'); return false }
  if (form.type === 'multiple' && answerKeys.length < 2) { toast.warning('多选题答案至少2个选项'); return false }
  if (form.type !== 'multiple' && answerKeys.length !== 1) { toast.warning('单选/判断题答案只能有1个选项'); return false }
  return true
}

async function handleSave() {
  if (!validateForm()) return
  try {
    if (editingId.value) await updateQuestion({ id: editingId.value, ...form })
    else await createQuestion({ ...form })
    dialogVisible.value = false
    loadData()
  } catch { toast.error('保存失败') }
}

async function handleToggleStatus(row: QuestionRow, enabled: boolean) {
  try {
    await updateQuestion({ id: row.id, status: enabled ? 'active' : 'disabled' } as Question & { id: number })
    row.status = enabled ? 'active' : 'disabled'
    toast.success(enabled ? '已启用' : '已禁用')
  } catch { toast.error('操作失败') }
}

async function handleDelete(row: QuestionRow) {
  try {
    await ElMessageBox.confirm('确定删除？', '删除确认', { type: 'warning' })
    await deleteQuestion(row.id)
    toast.success('已删除')
    loadData()
  } catch { /* cancelled */ }
}

function openBatchDialog() {
  batchVisible.value = true
  importCategoryId.value = filterCategory.value ?? categories.value[0]?.id ?? null
  parsePreview.value = null
  parsedRows.value = []
  batchResult.value = null
}

function handleDownloadTemplate() {
  downloadQuestionTemplate()
}

async function handleFileChange(file: { raw: File }) {
  batchResult.value = null
  try {
    const preview = await parseQuestionWorkbook(file.raw, categories.value)
    parsedRows.value = preview.rows
    parsePreview.value = { validCount: preview.rows.length, parseErrors: preview.errors, skippedSamples: preview.skippedSamples || 0 }
  } catch {
    toast.error('文件解析失败，请使用模板格式的 .xlsx 文件')
  }
}

function downloadErrors(errors: { row: number; reason: string }[]) {
  downloadImportErrors(errors)
}

async function doBatchImport() {
  if (!parsedRows.value.length) return
  // 行内未填分类的题目用弹窗目标分类兜底
  const rows = parsedRows.value.map((q) => (q.categoryId == null && importCategoryId.value ? { ...q, categoryId: importCategoryId.value } : q))
  try {
    const res = await batchImportQuestions(rows, 2)
    batchResult.value = res
    toast.success('导入完成：成功 ' + res.success + ' 条，失败 ' + res.failed + ' 条')
    loadData()
  } catch { toast.error('导入失败') }
}

onMounted(async () => {
  await loadCategories()
  loadData()
})
</script>

<style lang="scss" scoped>
.questions-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.title { font-size: 18px; font-weight: 600; }
.actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }

.option-editor { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.option-row { display: flex; align-items: center; gap: 8px; width: 100%; }
.judge-hint { color: #909399; font-size: 12px; }
.img-row { display: flex; align-items: center; gap: 8px; }
.img-hint { color: #909399; font-size: 12px; }
.img-preview { width: 48px; height: 48px; border-radius: 6px; border: 1px solid #e5e7eb; }
.opt-img { width: 32px; height: 32px; border-radius: 4px; border: 1px solid #e5e7eb; flex-shrink: 0; }

.import-actions { display: flex; align-items: center; gap: 8px; }
.import-hint { margin: 10px 0 0; color: #909399; font-size: 12px; line-height: 1.6; }
.preview { margin-top: 12px; }
.preview-block.error { background: #fef0f0; border-radius: 6px; padding: 8px 12px; }
.preview-title { font-weight: 600; color: #c45656; margin: 0 0 4px; }
.sample-tip { margin-top: 6px; color: #909399; font-size: 12px; }
.preview-block.error ul { margin: 0; padding-left: 18px; color: #c45656; max-height: 160px; overflow: auto; }
.preview-block.error li { margin-bottom: 2px; }
.err-list { max-height: 160px; overflow: auto; padding-left: 18px; color: #c45656; }
</style>