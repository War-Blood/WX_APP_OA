<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getDailyCounts, type DailyCountItem } from '@/api/report'
import { currentMonthInBeijing, shiftMonth } from '@/utils/date'
import type { StatsViewFilter } from '@/api/statsView'
import { createStatsView } from '@/api/statsView'
import FilterDialog from '@/components/FilterDialog.vue'
import SectionCard from '@/components/SectionCard.vue'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import { useECharts } from '@/composables/useECharts'
import { HEAT_TINTS } from '@/utils/chart'

const userStore = useUserStore()
const calLoading = ref(false)
const calData = ref<DailyCountItem[]>([])
const calMonth = ref(currentMonthInBeijing())
const calChartRef = ref<HTMLElement>()
const { setOption } = useECharts(calChartRef)
const showFilter = ref(false)

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
  const data = calData.value.map(d => [d.date, d.total > 0 ? d.submitted / d.total : 0])

  await setOption({
    tooltip: {
      formatter: (p: any) => {
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
        { min: 1, max: 1, color: HEAT_TINTS.full, label: '全员提交' },
        { min: 0.0001, max: 0.9999, color: HEAT_TINTS.partial, label: '部分提交' },
        { min: 0, max: 0, color: HEAT_TINTS.none, label: '无数据' }
      ]
    },
    calendar: {
      top: 50, left: 20, right: 20, bottom: 40,
      range: calMonth.value,
      orient: 'horizontal',
      cellSize: ['auto', 34],
      splitLine: { show: true, lineStyle: { color: '#EBEEF5', width: 1 } },
      itemStyle: { borderWidth: 3, borderColor: '#fff', borderRadius: 6 },
      yearLabel: { show: true, fontSize: 13, fontWeight: 'bold', color: '#303133' },
      monthLabel: { nameMap: 'ZH', fontSize: 12, color: '#606266', margin: 8 },
      dayLabel: { nameMap: 'ZH', fontSize: 10, color: '#909399', firstDay: 1 }
    },
    series: [{
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data,
      label: {
        show: true,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#303133',
        formatter: (p: any) => {
          const d = calData.value.find(x => x.date === p.data[0])
          return d && d.total > 0 ? `${d.submitted}/${d.total}` : ''
        }
      },
      emphasis: { itemStyle: { color: 'inherit', borderColor: '#303133', borderWidth: 3 } }
    }]
  })
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
      visibility: filter.visibility,
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
      <div ref="calChartRef" v-loading="calLoading" style="height:360px"></div>
    </SectionCard>
    <FilterDialog v-model="showFilter" stat-key="calendar" @apply="onFilterApply" />
  </div>
</template>
