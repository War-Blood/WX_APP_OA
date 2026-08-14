<template>
  <div class="records-page">
    <el-card>
      <template #header>
        <div class="toolbar">
          <span class="title">成绩记录</span>
          <div class="actions">
            <el-input v-model="keyword" placeholder="搜索考生" clearable style="width:200px" @clear="loadData" @keyup.enter="loadData" />
            <el-select v-model="filterCategory" placeholder="按分类" clearable style="width:180px" @change="loadData">
              <el-option v-for="c in categoryOptions" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-select v-model="filterPaper" placeholder="按试卷" clearable filterable style="width:180px" @change="loadData">
              <el-option v-for="p in paperOptions" :key="p.id" :label="p.title" :value="p.id" />
            </el-select>
            <el-select v-model="filterMode" placeholder="模式" clearable style="width:130px" @change="loadData">
              <el-option label="正式考试" value="exam" /><el-option label="模拟考试" value="mock" />
            </el-select>
            <el-select v-model="filterStatus" placeholder="状态" clearable style="width:110px" @change="loadData">
              <el-option label="已提交" value="submitted" /><el-option label="进行中" value="doing" /><el-option label="已超时" value="timeout" />
            </el-select>
            <el-button @click="loadData">搜索</el-button>
            <el-button type="primary" @click="handleExport" :loading="exporting">导出</el-button>
          </div>
        </div>
      </template>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="userName" label="考生" width="100" />
        <el-table-column prop="departmentName" label="部门" width="110" />
        <el-table-column prop="categoryName" label="分类" min-width="140" show-overflow-tooltip />
        <el-table-column label="模式" width="90"><template #default="{ row }"><el-tag size="small" :type="row.mode==='exam'?'primary':'warning'">{{ modeLabel(row.mode) }}</el-tag></template></el-table-column>
        <el-table-column label="分数" width="90" align="center"><template #default="{ row }">{{ row.score ?? '-' }}/{{ row.totalScore }}</template></el-table-column>
        <el-table-column prop="useTime" label="用时(秒)" width="90" align="center" />
        <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="交卷时间" width="160"><template #default="{ row }">{{ row.endTime?.slice(0,16)?.replace('T',' ') }}</template></el-table-column>
        <el-table-column label="操作" width="80" fixed="right"><template #default="{ row }">
          <el-button size="small" link @click="openDetail(row)">详情</el-button>
        </template></el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total,prev,pager,next" background style="margin-top:16px;justify-content:flex-end" @current-change="loadData" />
    </el-card>

    <!-- 记录详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="`答题详情：${current?.userName || ''} — ${current?.categoryName || ''}`" width="640px" top="6vh">
      <template v-if="currentDetail">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="得分">{{ currentDetail.score ?? '-' }}/{{ currentDetail.totalScore }}</el-descriptions-item>
          <el-descriptions-item label="用时">{{ currentDetail.useTime }}秒</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statusLabel(currentDetail.status) }}</el-descriptions-item>
        </el-descriptions>
        <el-divider />
        <el-collapse>
          <el-collapse-item v-for="d in currentDetail.details" :key="d.questionId" :name="d.questionId">
            <template #title>
              <span :style="{ color: d.correct ? '#16a34a' : '#dc2626' }">{{ d.correct ? '✅' : '❌' }}</span>
              <span style="margin-left:8px">{{ d.title }}</span>
              <span style="margin-left:auto;color:#909399;font-size:12px">{{ d.earnedPoints }}/{{ d.totalPoints }}分</span>
            </template>
            <div>你的答案：<b>{{ formatAnswer(d) }}</b></div>
            <div>正确答案：<b>{{ formatKeys(d, d.rightAnswer) }}</b></div>
            <div v-if="d.analysis">解析：{{ d.analysis }}</div>
          </el-collapse-item>
        </el-collapse>
      </template>
      <template #footer><el-button @click="detailVisible=false">关闭</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { toast } from '@/utils/toast'
import type { RecordRow, RecordDetail } from '@/api/exam'
import { getRecordList, getRecordDetail, exportRecords, getCategoryList } from '@/api/exam'

const loading = ref(false)
const exporting = ref(false)
const tableData = ref<RecordRow[]>([])
const total = ref(0)
const page = ref(1)
const keyword = ref('')
const filterCategory = ref<number | null>(null)
const filterMode = ref<string | null>(null)
const filterStatus = ref<string | null>(null)
const filterPaper = ref<number | null>(null)
const categoryOptions = ref<{ id: number; name: string }[]>([])
const paperOptions = ref<{ id: number; title: string }[]>([])

const detailVisible = ref(false)
const current = ref<RecordRow | null>(null)
const currentDetail = ref<RecordDetail | null>(null)

const modeLabel = (s: string): string => ({ practice: '练习', exam: '正式考试', mock: '模拟考试' })[s] || s
const statusType = (s: string): '' | 'success' | 'warning' | 'primary' =>
  ({ submitted: 'success', doing: 'primary', timeout: 'warning' } as Record<string, '' | 'success' | 'warning' | 'primary'>)[s] || ''
const statusLabel = (s: string): string => ({ submitted: '已提交', doing: '进行中', timeout: '已超时' })[s] || s

async function loadData() {
  loading.value = true
  try {
    const res = await getRecordList({
      page: page.value, pageSize: 20,
      keyword: keyword.value || undefined,
      categoryId: filterCategory.value || undefined,
      mode: filterMode.value || undefined,
      status: filterStatus.value || undefined,
      paperId: filterPaper.value || undefined,
    })
    tableData.value = res.list || []
    total.value = res.total || 0
  } catch { toast.error('加载失败') }
  finally { loading.value = false }
}

async function openDetail(row: RecordRow) {
  current.value = row
  detailVisible.value = true
  try {
    currentDetail.value = await getRecordDetail(row.id)
  } catch { toast.error('详情加载失败') }
}

async function handleExport() {
  exporting.value = true
  try {
    const res = await exportRecords({
      categoryId: filterCategory.value || undefined,
      keyword: keyword.value || undefined,
    })
    const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = res.filename || 'answer-records.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('导出成功')
  } catch { toast.error('导出失败') }
  finally { exporting.value = false }
}

// 答案字母 → 选项文本(取快照 options)
function formatKeys(d: any, answer: string): string {
  if (!answer) return '未作答'
  const options = Array.isArray(d.options) ? d.options : []
  return answer.split(',').map((k: string) => {
    const opt = options.find((o: any) => o.key === k)
    return opt ? k + '. ' + opt.text : k
  }).join('；')
}
function formatAnswer(d: any): string {
  return d.userAnswer ? formatKeys(d, d.userAnswer) : '未作答'
}

onMounted(async () => {
  loadData()
  try {
    const cats = await getCategoryList()
    categoryOptions.value = cats.map(c => ({ id: c.id, name: c.name }))
  } catch { /* */ }
  // 试卷选项(已发布 + 草稿, 供筛选)
  try {
    const { getPaperList } = await import('@/api/exam')
    const res = await getPaperList({ page: 1, pageSize: 200 })
    paperOptions.value = (res.list || []).map((p: any) => ({ id: p.id, title: p.title }))
  } catch { /* */ }
})
</script>

<style lang="scss" scoped>
.records-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 18px; font-weight: 600; }
.actions { display: flex; gap: 12px; }
</style>