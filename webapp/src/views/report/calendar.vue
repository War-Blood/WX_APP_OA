<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getDailyCounts, type DailyCountItem } from '@/api/report'

const calLoading = ref(false)
const calData = ref<DailyCountItem[]>([])
const calMonth = ref(new Date().toISOString().slice(0, 7))
const calChartRef = ref<HTMLDivElement>()
let calChart: echarts.ECharts | null = null

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
