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
      pieces: [
        { min: 1, max: 1, color: '#E8F5E9', label: '全员提交' },
        { min: 0.0001, max: 0.9999, color: '#FFFFFF', label: '部分提交' },
        { min: 0, max: 0, color: '#F0F0F0', label: '无数据' }
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
          <span>提交日历</span>
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
