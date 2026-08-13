<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Search, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import {
  getDailyStatus,
  getTomorrowStatus,
  type DailyStatusWorker, type DailyStatusSummary, type DailyStatusResponse,
  type TomorrowStatusWorker, type TomorrowStatusResponse
} from '@/api/report'
import { currentDateInBeijing, shiftDate } from '@/utils/date'
import { CHART_COLORS } from '@/utils/chart'

const router = useRouter()

// 查看该人员的日报列表(跳转到日报管理页并搜索其姓名)
function goDailyDetail(row: { userName: string }) {
  router.push({ path: '/report', query: { keyword: row.userName } })
}

// 日期（默认昨天）
function yesterday() {
  return shiftDate(currentDateInBeijing(), -1)
}
const date = ref(yesterday())
const mode = ref<'today' | 'tomorrow'>('today')

// 数据
const loading = ref(false)
const response = ref<DailyStatusResponse | null>(null)
const tomorrowLoading = ref(false)
const tomorrowResponse = ref<TomorrowStatusResponse | null>(null)

// 筛选
const keyword = ref('')
const statusFilter = ref('')

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '已提交', value: 'submitted' },
  { label: '已代填', value: 'substituted' },
  { label: '补公出', value: 'supplement' },
  { label: '请假', value: 'leave' },
  { label: '未提交', value: 'missing' }
]

const statusLabelMap: Record<string, string> = {
  submitted: '已提交',
  supplement: '补公出',
  substituted: '已代填',
  leave: '请假',
  missing: '未提交'
}

const statusTagTypeMap: Record<string, string> = {
  submitted: 'success',
  supplement: 'warning',
  substituted: '',
  leave: 'info',
  missing: 'danger'
}

// 异常优先排序
const sortOrder: Record<string, number> = {
  missing: 0,
  supplement: 1,
  substituted: 2,
  submitted: 3,
  leave: 5
}

// 过滤后的数据
const filteredWorkers = computed<DailyStatusWorker[]>(() => {
  if (!response.value) return []
  let workers = response.value.workers

  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    workers = workers.filter(
      w => w.userName.toLowerCase().includes(kw) || w.workerCode.toLowerCase().includes(kw)
    )
  }

  if (statusFilter.value) {
    workers = workers.filter(w => w.status === statusFilter.value)
  }

  // 异常优先排序
  return [...workers].sort((a, b) => {
    const orderDiff = (sortOrder[a.status] ?? 99) - (sortOrder[b.status] ?? 99)
    if (orderDiff !== 0) return orderDiff
    // 同状态下按提交时间排序
    if (a.submittedAt && b.submittedAt) return a.submittedAt.localeCompare(b.submittedAt)
    return 0
  })
})

const summaryItems = computed<{ key: string; label: string; count: number; color: string }[]>(() => {
  if (!response.value) return []
  const s: DailyStatusSummary = response.value.summary
  return [
    { key: 'submitted', label: '已提交', count: s.submitted, color: CHART_COLORS.success },
    { key: 'substituted', label: '已代填', count: s.substituted, color: CHART_COLORS.info },
    { key: 'supplement', label: '补公出', count: s.supplement, color: CHART_COLORS.warning },
    { key: 'office', label: '工作日报', count: s.office, color: CHART_COLORS.primary },
    { key: 'leave', label: '请假', count: s.leave, color: CHART_COLORS.info },
    { key: 'missing', label: '缺失', count: s.missing, color: CHART_COLORS.danger }
  ]
})

// 已提交总人数 = 已提交+已代填+补公出+公司日报+请假
const submittedTotal = computed(() => {
  if (!response.value) return 0
  const s = response.value.summary
  return (s.submitted || 0) + (s.substituted || 0) + (s.supplement || 0) + (s.office || 0) + (s.leave || 0)
})

// 总人数 = 已提交 + 缺失
const totalWorkers = computed(() => submittedTotal.value + (response.value?.summary?.missing || 0))

async function loadData() {
  loading.value = true
  try {
    const params: { date?: string } = {}
    if (date.value) params.date = date.value
    response.value = await getDailyStatus(params)
  } catch {
    response.value = null
  } finally {
    loading.value = false
  }
}

async function loadTomorrow(dateStr?: string) {
  tomorrowLoading.value = true
  try {
    const params: { date?: string } = {}
    if (dateStr) params.date = dateStr
    tomorrowResponse.value = await getTomorrowStatus(params)
  } catch {
    tomorrowResponse.value = null
  } finally {
    tomorrowLoading.value = false
  }
}

function switchMode(m: 'today' | 'tomorrow') {
  if (mode.value === m) return
  mode.value = m
  if (m === 'tomorrow') {
    // 明日视图默认看"今天日报里的明日计划"
    date.value = todayStr()
    loadTomorrow(date.value)
  } else {
    date.value = yesterday()
    loadData()
  }
}

// 明日分组：按明日工作类型划分
const tomorrowGroups = computed<{ label: string; workers: TomorrowStatusWorker[] }[]>(() => {
  if (!tomorrowResponse.value) return []
  const workers = tomorrowResponse.value.workers || []
  const order = ['工作（陆）', '工作（海）', '待工', '在途', '请假']
  const groups: { label: string; workers: TomorrowStatusWorker[] }[] = []
  order.forEach(wt => {
    const list = workers.filter(w => w.tomorrowWorkType === wt)
    if (list.length) groups.push({ label: wt, workers: list })
  })
  const noPlan = workers.filter(w => !w.tomorrowWorkType)
  if (noPlan.length) groups.push({ label: '未填写', workers: noPlan })
  return groups
})

function todayStr() {
  return currentDateInBeijing()
}

function handleDateChange() {
  if (mode.value === 'tomorrow') loadTomorrow(date.value)
  else loadData()
}

function prevDay() {
  date.value = shiftDate(date.value, -1)
  if (mode.value === 'tomorrow') loadTomorrow(date.value)
  else loadData()
}

function nextDay() {
  date.value = shiftDate(date.value, 1)
  if (mode.value === 'tomorrow') loadTomorrow(date.value)
  else loadData()
}

function handleSearch() {
  // computed 属性自动响应
}

function getStatusTagType(status: string): 'success' | 'warning' | 'danger' | 'info' | '' {
  return (statusTagTypeMap[status] as 'success' | 'warning' | 'danger' | 'info' | '') || 'info'
}

function rowClassName({ row }: { row: DailyStatusWorker }) {
  return row.status === 'missing' ? 'row-missing' : ''
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="daily-status-page">
    <!-- 日期选择 + 今日/明日切换 -->
    <div class="top-bar">
      <el-button :icon="ArrowLeft" size="small" @click="prevDay" />
      <el-date-picker
        v-model="date"
        type="date"
        placeholder="选择日期"
        value-format="YYYY-MM-DD"
        @change="handleDateChange"
      />
      <el-button :icon="ArrowRight" size="small" @click="nextDay" />
      <el-radio-group v-model="mode" class="mode-seg" @change="(v: string | number | boolean) => switchMode(v as 'today' | 'tomorrow')">
        <el-radio-button :value="'today'">今日</el-radio-button>
        <el-radio-button :value="'tomorrow'">明日</el-radio-button>
      </el-radio-group>
      <span class="date-hint" v-if="mode === 'today' && response">共 {{ totalWorkers }} 人</span>
      <span class="date-hint" v-if="mode === 'tomorrow' && tomorrowResponse">共 {{ tomorrowResponse.totalWorkers }} 人</span>
    </div>

    <!-- 今日模式:汇总统计 -->
    <el-row :gutter="12" class="summary-row" v-if="mode === 'today' && response">
      <el-col v-for="item in summaryItems" :key="item.key" :span="3" style="max-width:14.28%">
        <div class="summary-item" :style="{ borderTopColor: item.color }">
          <div class="summary-count" :style="{ color: item.color }">{{ item.count }}</div>
          <div class="summary-label">{{ item.label }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- 今日模式:搜索筛选 -->
    <div class="filter-bar" v-if="mode === 'today'">
      <el-input
        v-model="keyword"
        placeholder="搜索姓名"
        clearable
        :prefix-icon="Search"
        style="width: 240px"
        @input="handleSearch"
      />
      <el-select v-model="statusFilter" placeholder="全部状态" style="width: 130px" @change="handleSearch">
        <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
      </el-select>
    </div>

    <!-- 今日模式:表格 -->
    <el-table v-if="mode === 'today'" :data="filteredWorkers" v-loading="loading" stripe border :row-class-name="rowClassName">
      <el-table-column prop="userName" label="姓名" width="100" />
      <el-table-column prop="project" label="项目" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.project || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="区域" width="80">
        <template #default="{ row }">
          {{ row.area || '—' }}
        </template>
      </el-table-column>
      <el-table-column prop="workType" label="工作类型" width="110">
        <template #default="{ row }">
          {{ row.workType || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)" size="small">
            {{ statusLabelMap[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="submittedAt" label="提交时间" width="160">
        <template #default="{ row }">
          {{ row.submittedAt || '—' }}
        </template>
      </el-table-column>
      <el-table-column prop="substituteBy" label="代填人" width="100">
        <template #default="{ row }">
          <span v-if="row.substituteBy" class="substitute-name">{{ row.substituteBy }}</span>
          <span v-else>—</span>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && !filteredWorkers.length" description="暂无今日日报数据" />

    <!-- 明日模式:分组列表 -->
    <div v-if="mode === 'tomorrow'" v-loading="tomorrowLoading" class="tomorrow-panel">
      <template v-if="tomorrowResponse">
        <div v-for="g in tomorrowGroups" :key="g.label" class="tomorrow-group">
          <div class="tomorrow-group-header">
            <span class="tomorrow-group-name">{{ g.label }}</span>
            <el-tag size="small" type="primary">{{ g.workers.length }}人</el-tag>
          </div>
          <el-table :data="g.workers" size="small" stripe border>
            <el-table-column prop="userName" label="姓名" width="120" />
            <el-table-column prop="project" label="项目" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.project || '—' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template #default="{ row }">
                <el-button v-if="row.reportId" size="small" link type="primary" @click="goDailyDetail(row)">查看日志</el-button>
                <span v-else>—</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </template>
      <el-empty v-else-if="!tomorrowLoading" description="暂无明日计划数据" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: $spacing-medium;

  .date-hint {
    color: $text-secondary;
    font-size: $font-size-base;
  }
}

.summary-row {
  margin-bottom: $spacing-medium;

  .summary-item {
    text-align: center;
    padding: $spacing-base $spacing-small;
    background: $bg-white;
    border-radius: $border-radius-large;
    border: 1px solid $border-lighter;
    border-top: 3px solid $border-color;

    .summary-count {
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
    }

    .summary-label {
      font-size: $font-size-small;
      color: $text-secondary;
      margin-top: $spacing-extra-small;
    }
  }
}

.filter-bar {
  display: flex;
  gap: $spacing-base;
  align-items: center;
  margin-bottom: $spacing-medium;
}

.substitute-name {
  color: $text-secondary;
  font-size: $font-size-small;
}

.mode-seg {
  margin-left: $spacing-small;
}

.tomorrow-panel {
  min-height: 200px;
}

.tomorrow-group {
  margin-bottom: $spacing-medium;

  .tomorrow-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-small;

    .tomorrow-group-name {
      font-size: $font-size-base;
      font-weight: 600;
      color: $primary-color;
    }
  }
}

.tomorrow-empty {
  color: $text-placeholder;
}

:deep(.row-missing) {
  background-color: #FFF5F5 !important;

  td {
    background-color: #FFF5F5 !important;
  }
}
</style>
