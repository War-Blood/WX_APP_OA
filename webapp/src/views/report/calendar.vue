<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getDailyCounts, type DailyCountItem } from '@/api/report'
import { currentMonthInBeijing, shiftMonth } from '@/utils/date'
import type { StatsViewFilter } from '@/api/statsView'
import ViewSelector from '@/components/ViewSelector.vue'
import FilterDialog from '@/components/FilterDialog.vue'
import SaveViewDialog from '@/components/SaveViewDialog.vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const calLoading = ref(false)
const calData = ref<DailyCountItem[]>([])
const calMonth = ref(currentMonthInBeijing())
const calChartRef = ref<HTMLDivElement>()
let calChart: echarts.ECharts | null = null
const currentViewId = ref<number | null>(null)
const showFilter = ref(false)
const showSave = ref(false)
const saveFilter = ref<StatsViewFilter>({})
const tempFilter = ref<StatsViewFilter>({})

async function loadCalendar() {
  calLoading.value = true
  try {
    const res = await getDailyCounts(calMonth.value, currentViewId.value ?? undefined)
    calData.value = res.data
    await nextTick()
    renderCalendar()
  } catch {
    calData.value = []
  } finally {
    calLoading.value = false
  }
}

function renderCalendar() {
  if (!calChartRef.value) return
  if (!calChart) {
    calChart = echarts.init(calChartRef.value)
  }

  // 数据: [date, 完成率]。完成率 = 已提交/总人数(1=全员提交, 0=无提交)
  const data = calData.value.map(d => [d.date, d.total > 0 ? d.submitted / d.total : 0])

  calChart.setOption({
    tooltip: {
      formatter: (p: { data: [string, number] }) => {
        const d = calData.value.find(x => x.date === p.data[0])
        if (!d) return p.data[0]
        return `${p.data[0]}<br/>已提交: <b>${d.submitted}</b> / ${d.total}人`
      }
    },
    visualMap: {
      min: 0, max: 1,
      orient: 'horizontal', left: 'center', bottom: 0,
      calculable: false,
      pieces: [
        { min: 1, max: 1, color: '#E8F5E9', label: '全员提交' },
        { min: 0.0001, max: 0.9999, color: '#FFFFFF', label: '部分提交' },
        { min: 0, max: 0, color: '#F0F0F0', label: '无数据' }
      ]
    },
    calendar: {
      top: 50, left: 20, right: 20, bottom: 40,
      range: calMonth.value,
      orient: 'horizontal',
      cellSize: ['auto', 34],
      splitLine: { show: true, lineStyle: { color: '#eee', width: 1 } },
      itemStyle: { borderWidth: 3, borderColor: '#fff', borderRadius: 6 },
      yearLabel: { show: true, fontSize: 13, fontWeight: 'bold', color: '#333' },
      monthLabel: { nameMap: 'ZH', fontSize: 12, color: '#666', margin: 8 },
      dayLabel: { nameMap: 'ZH', fontSize: 10, color: '#999', firstDay: 1 }
    },
    series: [{
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data,
      label: {
        show: true,
        fontSize: 12,
        fontWeight: 'bold',
        formatter: (p: { data: [string, number] }) => {
          const d = calData.value.find(x => x.date === p.data[0])
          return d && d.total > 0 ? `${d.submitted}/${d.total}` : ''
        }
      },
      emphasis: { itemStyle: { color: 'inherit', borderColor: '#333', borderWidth: 3 } }
    }]
  }, true)
}

function prevCalendarMonth() {
  calMonth.value = shiftMonth(calMonth.value, -1)
  loadCalendar()
}

function nextCalendarMonth() {
  calMonth.value = shiftMonth(calMonth.value, 1)
  loadCalendar()
}

function onViewChange(viewId: number | null) {
  currentViewId.value = viewId
  loadCalendar()
}
function onFilterApply(filter: StatsViewFilter) {
  tempFilter.value = filter
  currentViewId.value = null
  loadCalendar()
}
function onFilterSave(filter: StatsViewFilter) {
  saveFilter.value = filter
  showSave.value = true
}

let resizeTimer: ReturnType<typeof setTimeout>
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => calChart?.resize(), 200)
}

onMounted(() => {
  loadCalendar()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  calChart?.dispose()
})
</script>

<template>
  <div class="calendar-page">
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>提交日历</span>
          <div class="card-header-right">
            <ViewSelector stat-key="calendar" @change="onViewChange" />
            <el-button v-if="userStore.isAdmin" size="small" @click="showFilter = true">筛选</el-button>
            <el-button size="small" @click="prevCalendarMonth">‹</el-button>
            <span class="month-label">{{ calMonth }}</span>
            <el-button size="small" @click="nextCalendarMonth">›</el-button>
            <el-button :icon="Refresh" size="small" text @click="loadCalendar">刷新</el-button>
          </div>
        </div>
      </template>
      <div ref="calChartRef" v-loading="calLoading" style="height:360px"></div>
    </el-card>
    <FilterDialog v-model="showFilter" stat-key="calendar" :filter="tempFilter" @apply="onFilterApply" @save="onFilterSave" />
    <SaveViewDialog v-model="showSave" stat-key="calendar" :filter="saveFilter" @saved="loadCalendar" />
  </div>
</template>

<style scoped lang="scss">
.calendar-page { padding: 20px; }

.section-card {
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
</style>
