<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import {
  getDailyCounts,
  type DailyCountItem,
  getDailyStatus,
  type DailyStatusWorker,
  type DailyStatusSummary
} from '@/api/report'
import { currentMonthInBeijing, shiftMonth } from '@/utils/date'
import type { StatsViewFilter } from '@/api/statsView'
import { createStatsView } from '@/api/statsView'
import FilterDialog from '@/components/FilterDialog.vue'
import SectionCard from '@/components/SectionCard.vue'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import { useECharts } from '@/composables/useECharts'
import { HEAT_TINTS, CHART_COLORS } from '@/utils/chart'

const userStore = useUserStore()
const calLoading = ref(false)
const calData = ref<DailyCountItem[]>([])
const calMonth = ref(currentMonthInBeijing())
const calChartRef = ref<HTMLElement>()
const { setOption, instance } = useECharts(calChartRef)
const showFilter = ref(false)

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 按 UTC 取星期，避免浏览器时区造成跨天 */
function weekdayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return ''
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

/** 当月全部日期（YYYY-MM-DD）：补齐接口未返回的日期，保证每个格子都能点 */
function monthDays(month: string): string[] {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return []
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  return Array.from({ length: total }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`)
}

function countOf(date: string): DailyCountItem | undefined {
  return calData.value.find((d) => d.date === date)
}

async function loadCalendar() {
  calLoading.value = true
  try {
    const res = await getDailyCounts(calMonth.value)
    calData.value = res.data
    await renderCalendar()
  } catch {
    calData.value = []
  } finally {
    calLoading.value = false
  }
}

async function renderCalendar() {
  // 数据: [date, 完成率]。完成率 = 已提交/总人数(1=全员提交, 0=无提交)
  const data = monthDays(calMonth.value).map((date) => {
    const d = countOf(date)
    return [date, d && d.total > 0 ? d.submitted / d.total : 0]
  })

  await setOption({
    tooltip: {
      formatter: (p: any) => {
        const date = p.data[0]
        const d = countOf(date)
        return (
          `${date}（${weekdayOf(date)}）<br/>已提交: <b>${d?.submitted ?? 0}</b> / ${d?.total ?? 0} 人` +
          '<br/><span style="color:#909399">点击查看当日人员情况</span>'
        )
      }
    },
    visualMap: {
      min: 0,
      max: 1,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      calculable: false,
      pieces: [
        { min: 1, max: 1, color: HEAT_TINTS.full, label: '全员提交' },
        { min: 0.0001, max: 0.9999, color: HEAT_TINTS.partial, label: '部分提交' },
        { min: 0, max: 0, color: HEAT_TINTS.none, label: '无数据' }
      ]
    },
    calendar: {
      top: 50,
      left: 20,
      right: 20,
      bottom: 40,
      range: calMonth.value,
      orient: 'horizontal',
      cellSize: ['auto', 40],
      splitLine: { show: true, lineStyle: { color: '#EBEEF5', width: 1 } },
      itemStyle: { borderWidth: 3, borderColor: '#fff', borderRadius: 6 },
      yearLabel: { show: true, fontSize: 13, fontWeight: 'bold', color: '#303133' },
      monthLabel: { nameMap: 'ZH', fontSize: 12, color: '#606266', margin: 8 },
      dayLabel: { nameMap: 'ZH', fontSize: 10, color: '#909399', firstDay: 1 }
    },
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data,
        label: {
          show: true,
          // 第一行日期、第二行提交情况，解决「单元格看不出是哪天」
          formatter: (p: any) => {
            const date = p.data[0]
            const d = countOf(date)
            const day = String(date).slice(8).replace(/^0/, '')
            return `{day|${day}}\n{rate|${d && d.total > 0 ? `${d.submitted}/${d.total}` : '—'}}`
          },
          rich: {
            day: { fontSize: 12, fontWeight: 'bold', color: '#303133', lineHeight: 15 },
            rate: { fontSize: 11, color: '#606266', lineHeight: 14 }
          }
        },
        emphasis: { itemStyle: { color: 'inherit', borderColor: '#303133', borderWidth: 3 } }
      }
    ]
  })

  bindChartClick()
}

/** 点击日历格子 → 打开当日人员情况弹窗 */
function bindChartClick() {
  const chart = instance.value
  if (!chart) return
  chart.off('click')
  chart.on('click', (params: any) => {
    const date = Array.isArray(params?.data) ? params.data[0] : params?.value?.[0]
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) openDay(date)
  })
}

// ===== 当日人员情况弹窗 =====
const dayVisible = ref(false)
const dayDate = ref('')
const dayLoading = ref(false)
const dayTotal = ref(0)
const daySummary = ref<DailyStatusSummary | null>(null)
const dayWorkers = ref<DailyStatusWorker[]>([])
const dayStatusFilter = ref('')

const statusLabelMap: Record<string, string> = {
  missing: '未提交',
  submitted: '已提交',
  supplement: '补公出',
  office: '工作日报',
  substituted: '已代填',
  leave: '请假'
}
const statusTagTypeMap: Record<string, string> = {
  missing: 'danger',
  submitted: 'success',
  supplement: 'warning',
  office: 'primary',
  substituted: '',
  leave: 'info'
}
// 异常优先排序
const sortOrder: Record<string, number> = {
  missing: 0,
  supplement: 1,
  substituted: 2,
  office: 3,
  submitted: 4,
  leave: 5
}

const dayStatusOptions = [
  { label: '全部状态', value: '' },
  { label: '未提交', value: 'missing' },
  { label: '已提交', value: 'submitted' },
  { label: '请假', value: 'leave' }
]

const dayTitle = computed(() =>
  dayDate.value ? `${dayDate.value}（${weekdayOf(dayDate.value)}）` : '当日人员情况'
)

const dayFilteredWorkers = computed<DailyStatusWorker[]>(() => {
  const list = dayStatusFilter.value
    ? dayWorkers.value.filter((w) => w.status === dayStatusFilter.value)
    : dayWorkers.value
  return [...list].sort((a, b) => (sortOrder[a.status] ?? 99) - (sortOrder[b.status] ?? 99))
})

const daySummaryItems = computed(() => {
  const s = daySummary.value
  if (!s) return []
  return [
    { key: 'missing', label: '未提交', count: s.missing, color: CHART_COLORS.danger },
    { key: 'submitted', label: '已提交', count: s.submitted, color: CHART_COLORS.success },
    { key: 'office', label: '工作日报', count: s.office, color: CHART_COLORS.primary },
    { key: 'substituted', label: '已代填', count: s.substituted, color: CHART_COLORS.info },
    { key: 'supplement', label: '补公出', count: s.supplement, color: CHART_COLORS.warning },
    { key: 'leave', label: '请假', count: s.leave, color: CHART_COLORS.info }
  ]
})

async function openDay(date: string) {
  dayDate.value = date
  dayStatusFilter.value = ''
  dayVisible.value = true
  dayLoading.value = true
  daySummary.value = null
  dayWorkers.value = []
  try {
    const res = await getDailyStatus({ date })
    dayTotal.value = res.totalWorkers
    daySummary.value = res.summary
    dayWorkers.value = res.workers || []
  } catch {
    toast.error('加载当日人员情况失败')
  } finally {
    dayLoading.value = false
  }
}

function getStatusLabel(status: string): string {
  return statusLabelMap[status] || status
}

function getStatusTagType(
  status: string
): 'success' | 'warning' | 'danger' | 'info' | 'primary' | '' {
  return (
    (statusTagTypeMap[status] as 'success' | 'warning' | 'danger' | 'info' | 'primary' | '') ||
    'info'
  )
}

function dayRowClass({ row }: { row: DailyStatusWorker }) {
  return row.status === 'missing' ? 'row-missing' : ''
}

function prevCalendarMonth() {
  calMonth.value = shiftMonth(calMonth.value, -1)
  loadCalendar()
}

function nextCalendarMonth() {
  calMonth.value = shiftMonth(calMonth.value, 1)
  loadCalendar()
}

async function onFilterApply(filter: StatsViewFilter) {
  try {
    await createStatsView({
      statKey: 'calendar',
      conditions: filter.conditions || [],
      roleConditions: filter.roleConditions || {},
      visibility: filter.visibility
    })
    toast.success('视图已保存')
  } catch {
    toast.error('保存失败')
  }
  showFilter.value = false
  loadCalendar()
}

onMounted(() => {
  loadCalendar()
})
</script>

<template>
  <div class="calendar-page">
    <SectionCard title="提交日历">
      <template #actions>
        <el-button v-if="userStore.isAdmin" size="small" @click="showFilter = true">筛选</el-button>
        <el-button size="small" @click="prevCalendarMonth">‹</el-button>
        <span class="month-label">{{ calMonth }}</span>
        <el-button size="small" @click="nextCalendarMonth">›</el-button>
        <el-button :icon="Refresh" size="small" text @click="loadCalendar">刷新</el-button>
      </template>
      <div class="calendar-hint">点击任意日期，查看当天人员提交情况（未提交人员置顶）</div>
      <div ref="calChartRef" v-loading="calLoading" style="height: 360px"></div>
    </SectionCard>

    <el-dialog v-model="dayVisible" :title="dayTitle" width="860px" destroy-on-close>
      <div v-loading="dayLoading" class="day-panel">
        <div class="day-bar">
          <span class="day-total">共 {{ dayTotal }} 人</span>
          <el-radio-group v-model="dayStatusFilter" size="small">
            <el-radio-button v-for="o in dayStatusOptions" :key="o.value" :value="o.value">{{
              o.label
            }}</el-radio-button>
          </el-radio-group>
        </div>

        <div v-if="daySummary" class="day-summary">
          <div
            v-for="item in daySummaryItems"
            :key="item.key"
            class="day-summary-item"
            :style="{ borderTopColor: item.color }"
          >
            <div class="day-summary-count" :style="{ color: item.color }">{{ item.count }}</div>
            <div class="day-summary-label">{{ item.label }}</div>
          </div>
        </div>

        <el-table
          :data="dayFilteredWorkers"
          size="small"
          stripe
          border
          max-height="420"
          :row-class-name="dayRowClass"
        >
          <el-table-column prop="userName" label="姓名" width="100" />
          <el-table-column prop="workerCode" label="工号" width="100" />
          <el-table-column prop="project" label="项目" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">{{ row.project || '—' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)" size="small">{{
                getStatusLabel(row.status)
              }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="submittedAt" label="提交时间" width="170">
            <template #default="{ row }">{{ row.submittedAt || '—' }}</template>
          </el-table-column>
          <el-table-column prop="substituteBy" label="代填人" width="100">
            <template #default="{ row }">{{ row.substituteBy || '—' }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!dayLoading && !dayFilteredWorkers.length" description="当日暂无人员数据" />
      </div>
    </el-dialog>

    <FilterDialog v-model="showFilter" stat-key="calendar" @apply="onFilterApply" />
  </div>
</template>

<style scoped lang="scss">
.calendar-hint {
  margin-bottom: 4px;
  color: $text-secondary;
  font-size: $font-size-base;
}

.day-panel {
  min-height: 200px;
}

.day-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  .day-total {
    color: $text-secondary;
    font-size: $font-size-base;
  }
}

.day-summary {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.day-summary-item {
  flex: 1;
  padding: 8px 0;
  text-align: center;
  background: $bg-color;
  border-top: 2px solid $border-color;
  border-radius: $border-radius-base;

  .day-summary-count {
    font-size: 18px;
    font-weight: 700;
    line-height: 1.2;
  }

  .day-summary-label {
    color: $text-secondary;
    font-size: $font-size-small;
  }
}

:deep(.row-missing) {
  --el-table-tr-bg-color: #fef0f0;
}
</style>
