<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import {
  getStats, getWorkerStats, getDailyCounts, getProjectProgress, getWorkerWorkTypes,
  type AllStatsResponse,
  type DailyCountItem, type ProjectProgressItem, type WorkerWorkTypeItem
} from '@/api/report'

// 统计汇总
const statsLoading = ref(true)
const summary = ref<AllStatsResponse | null>(null)

// 日历热力图
const calLoading = ref(false)
const calData = ref<DailyCountItem[]>([])
const calMonth = ref(new Date().toISOString().slice(0, 7))
const calChartRef = ref<HTMLDivElement>()
let calChart: echarts.ECharts | null = null

// 项目进展
const progLoading = ref(false)
const progList = ref<ProjectProgressItem[]>([])
const progMonth = ref(new Date().toISOString().slice(0, 7))

// 人员工作类型分布
const workTypeLoading = ref(false)
const workTypeList = ref<WorkerWorkTypeItem[]>([])
const workTypeMonth = ref(new Date().toISOString().slice(0, 7))

// 按人员维度（全量）
const workerLoading = ref(true)
const workerList = ref<{ name: string; total: number; monthCount: number; lastDate: string }[]>([])
const workerTotal = ref(0)

async function loadSummary() {
  statsLoading.value = true
  try {
    summary.value = await getStats('all')
  } catch {
    ElMessage.warning('汇总统计加载失败')
  } finally {
    statsLoading.value = false
  }
}

async function loadCalendar() {
  calLoading.value = true
  try {
    const res = await getDailyCounts(calMonth.value)
    calData.value = res.data
    await nextTick()
    renderCalendar()
  } catch {
    calData.value = []
  } finally {
    calLoading.value = false
  }
}

async function loadProjects() {
  progLoading.value = true
  try {
    const res = await getProjectProgress(progMonth.value)
    progList.value = res.projects
  } catch {
    progList.value = []
  } finally {
    progLoading.value = false
  }
}

async function loadWorkers() {
  workerLoading.value = true
  try {
    const res = await getWorkerStats({})
    workerList.value = res.list
    workerTotal.value = res.total
  } catch {
    workerList.value = []
  } finally {
    workerLoading.value = false
  }
}

function renderCalendar() {
  if (!calChartRef.value) return
  if (!calChart) {
    calChart = echarts.init(calChartRef.value)
  }

  const data = calData.value.map(d => [d.date, d.count])
  const maxCount = Math.max(1, ...calData.value.map(d => d.count))

  calChart.setOption({
    tooltip: {
      formatter: (p: { data: [string, number] }) =>
        `${p.data[0]}<br/>提交人次: <b>${p.data[1]}</b>`
    },
    visualMap: {
      min: 0, max: maxCount,
      orient: 'horizontal', left: 'center', bottom: 0,
      pieces: [
        { min: 0, max: 0, color: '#F0F0F0', label: '0' },
        { min: 1, max: 3, color: '#C5DFFF', label: '1-3' },
        { min: 4, max: 6, color: '#7BB5F0', label: '4-6' },
        { min: 7, max: 10, color: '#3D8DE0', label: '7-10' },
        { min: 11, max: 999, color: '#1A5FB4', label: '10+' }
      ]
    },
    calendar: {
      top: 40, left: 30, right: 30,
      range: calMonth.value,
      cellSize: ['auto', 36],
      yearLabel: { show: false },
      monthLabel: { fontSize: 13 },
      dayLabel: { fontSize: 11, nameMap: 'ZH' },
      itemStyle: { borderWidth: 2, borderColor: '#fff', borderRadius: 4 }
    },
    series: [{
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data,
      label: {
        show: true,
        fontSize: 11,
        fontWeight: 'bold',
        formatter: (p: { data: [string, number] }) =>
          p.data[1] > 0 ? String(p.data[1]) : ''
      },
      emphasis: { itemStyle: { color: 'inherit', borderColor: '#333', borderWidth: 3 } }
    }]
  }, true)
}

function prevCalendarMonth() {
  const d = new Date(calMonth.value + '-01')
  d.setMonth(d.getMonth() - 1)
  calMonth.value = d.toISOString().slice(0, 7)
  loadCalendar()
}

function nextCalendarMonth() {
  const d = new Date(calMonth.value + '-01')
  d.setMonth(d.getMonth() + 1)
  calMonth.value = d.toISOString().slice(0, 7)
  loadCalendar()
}

function prevProgMonth() {
  const d = new Date(progMonth.value + '-01')
  d.setMonth(d.getMonth() - 1)
  progMonth.value = d.toISOString().slice(0, 7)
  loadProjects()
}

function nextProgMonth() {
  const d = new Date(progMonth.value + '-01')
  d.setMonth(d.getMonth() + 1)
  progMonth.value = d.toISOString().slice(0, 7)
  loadProjects()
}

async function loadWorkTypes() {
  workTypeLoading.value = true
  try {
    const res = await getWorkerWorkTypes(workTypeMonth.value)
    workTypeList.value = res.workers
  } catch { workTypeList.value = [] }
  finally { workTypeLoading.value = false }
}

function prevWorkTypeMonth() {
  const d = new Date(workTypeMonth.value + '-01')
  d.setMonth(d.getMonth() - 1)
  workTypeMonth.value = d.toISOString().slice(0, 7)
  loadWorkTypes()
}

function nextWorkTypeMonth() {
  const d = new Date(workTypeMonth.value + '-01')
  d.setMonth(d.getMonth() + 1)
  workTypeMonth.value = d.toISOString().slice(0, 7)
  loadWorkTypes()
}

function cellBg(val: number, maxVal: number) {
  if (!val || maxVal === 0) return 'transparent'
  const pct = val / maxVal
  if (pct <= 0.25) return '#E8F5E9'
  if (pct <= 0.5) return '#A5D6A7'
  if (pct <= 0.75) return '#66BB6A'
  return '#388E3C'
}

function cellColor(val: number, maxVal: number) {
  if (!val || maxVal === 0) return '#333'
  return val / maxVal > 0.5 ? '#fff' : '#333'
}

function maxInColumn(key: string) {
  return Math.max(1, ...workTypeList.value.map(w => w.workTypes[key] || 0))
}

function progressStatus(pct: number | null): '' | 'exception' | 'success' {
  if (pct === null) return ''
  if (pct < 50) return 'exception'
  if (pct >= 80) return 'success'
  return ''
}

let resizeTimer: ReturnType<typeof setTimeout>
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => calChart?.resize(), 200)
}

onMounted(() => {
  loadSummary()
  loadCalendar()
  loadProjects()
  loadWorkers()
  loadWorkTypes()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  calChart?.dispose()
})
</script>

<template>
  <div class="stats-page">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row" v-loading="statsLoading">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-val">{{ summary?.totalLogs ?? '-' }}</div>
          <div class="stat-lbl">总日志数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-val" style="color:#409EFF">{{ summary?.monthNew ?? '-' }}</div>
          <div class="stat-lbl">本月新增</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-val" style="color:#E6A23C">{{ summary?.delayedTotal ?? '-' }}</div>
          <div class="stat-lbl">延迟条数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-val" style="color:#F56C6C">{{ summary?.missingPersonCount ?? '-' }}</div>
          <div class="stat-lbl">缺失人次</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 日历热力图 -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>提交日历热力图</span>
          <div class="card-header-right">
            <el-button size="small" @click="prevCalendarMonth">‹</el-button>
            <span class="month-label">{{ calMonth }}</span>
            <el-button size="small" @click="nextCalendarMonth">›</el-button>
            <el-button :icon="Refresh" size="small" text @click="loadCalendar">刷新</el-button>
          </div>
        </div>
      </template>
      <div ref="calChartRef" v-loading="calLoading" style="height:250px"></div>
    </el-card>

    <!-- 项目进展 -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>项目进展看板（MAX 取值）</span>
          <div class="card-header-right">
            <el-button size="small" @click="prevProgMonth">‹</el-button>
            <span class="month-label">{{ progMonth }}</span>
            <el-button size="small" @click="nextProgMonth">›</el-button>
            <el-button :icon="Refresh" size="small" text @click="loadProjects">刷新</el-button>
          </div>
        </div>
      </template>
      <el-table :data="progList" v-loading="progLoading" stripe border>
        <el-table-column prop="project" label="项目名称" min-width="140" show-overflow-tooltip />
        <el-table-column label="区域" width="80">
          <template #default="{ row }">{{ row.area || '—' }}</template>
        </el-table-column>
        <el-table-column prop="completedQty" label="完成量" width="90" align="center" />
        <el-table-column prop="requiredQty" label="需求量" width="90" align="center" />
        <el-table-column label="进度" width="180">
          <template #default="{ row }">
            <el-progress
              :percentage="row.progress ?? 0"
              :status="progressStatus(row.progress)"
              :stroke-width="18"
              :text-inside="true"
            />
          </template>
        </el-table-column>
        <el-table-column prop="logCount" label="日志条数" width="90" align="center" />
        <el-table-column prop="dayCount" label="天数" width="70" align="center" />
      </el-table>
    </el-card>

    <!-- 人员工作类型分布 -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>人员工作类型分布</span>
          <div class="card-header-right">
            <el-button size="small" @click="prevWorkTypeMonth">‹</el-button>
            <span class="month-label">{{ workTypeMonth }}</span>
            <el-button size="small" @click="nextWorkTypeMonth">›</el-button>
            <el-button :icon="Refresh" size="small" text @click="loadWorkTypes">刷新</el-button>
          </div>
        </div>
      </template>
      <el-table :data="workTypeList" v-loading="workTypeLoading" stripe border>
        <el-table-column prop="userName" label="姓名" width="90" />
        <el-table-column prop="workerCode" label="工号" width="80" />
        <el-table-column v-for="wt in ['工作（陆）','工作（海）','待工','在途','请假','调休']" :key="wt" :label="wt.replace('工作（','').replace('）','')" width="76" align="center">
          <template #default="{ row }">
            <span
              :style="{
                background: cellBg(row.workTypes[wt], maxInColumn(wt)),
                color: cellColor(row.workTypes[wt], maxInColumn(wt)),
                padding: '2px 8px', borderRadius: '4px', fontWeight: '600'
              }"
            >{{ row.workTypes[wt] || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="total" label="总计" width="70" align="center">
          <template #default="{ row }">
            <b>{{ row.total }}</b>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 按人员维度 -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>按人员维度</span>
          <el-button :icon="Refresh" size="small" text @click="loadWorkers">刷新</el-button>
        </div>
      </template>
      <el-table :data="workerList" v-loading="workerLoading" stripe border>
        <el-table-column prop="name" label="人员" width="120" />
        <el-table-column prop="total" label="总条数" width="100" align="center" sortable />
        <el-table-column prop="monthCount" label="本月" width="80" align="center" sortable />
        <el-table-column prop="lastDate" label="最近提交" width="120" align="center" sortable />
      </el-table>
      <div class="pagination-wrap">
        <span class="total-text">共 {{ workerTotal }} 人</span>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.stats-page { padding: 20px; }

.stats-row {
  margin-bottom: 16px;

  .stat-card {
    text-align: center;

    .stat-val {
      font-size: 28px;
      font-weight: 700;
    }

    .stat-lbl {
      font-size: 13px;
      color: #909399;
      margin-top: 4px;
    }
  }
}

.section-card {
  margin-bottom: 16px;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 500;

    .card-header-right {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .month-label {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      min-width: 80px;
      text-align: center;
    }
  }
}

.pagination-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;

  .total-text {
    font-size: 14px;
    color: #909399;
  }
}
</style>
