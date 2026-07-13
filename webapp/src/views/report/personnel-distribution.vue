<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import {
  getAreaDistribution, getProvinceWorkers, getChinaGeoJson,
  type ProvinceItem, type ProvinceWorkerItem
} from '@/api/report'

// 日期（默认北京时间昨日，可切换查看任意日）
function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const mapDate = ref(yesterdayStr())

// 中国地图
const mapLoading = ref(false)
const mapData = ref<ProvinceItem[]>([])
const mapChartRef = ref<HTMLDivElement>()
let mapChart: echarts.ECharts | null = null
let chinaGeoLoaded = false

async function loadMap() {
  mapLoading.value = true
  try {
    const res = await getAreaDistribution(mapDate.value)
    mapData.value = res.provinces

    if (!chinaGeoLoaded) {
      const geoJson = await getChinaGeoJson()
      echarts.registerMap('china', geoJson)
      chinaGeoLoaded = true
    }

    await nextTick()
    renderMap()
  } catch {
    // ignore
  } finally {
    mapLoading.value = false
  }
}

function shortName(fullName: string) {
  return fullName
    .replace('维吾尔自治区', '')
    .replace('回族自治区', '')
    .replace('壮族自治区', '')
    .replace('自治区', '')
    .replace('特别行政区', '')
    .replace('省', '')
    .replace('市', '')
}

function renderMap() {
  if (!mapChartRef.value) return
  if (!mapChart) {
    mapChart = echarts.init(mapChartRef.value)
    mapChart.on('click', (params: { name: string }) => {
      if (params.name) expandProvince(params.name)
    })
  }

  const maxCount = Math.max(1, ...mapData.value.map(d => d.count))

  mapChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (p: { name: string; value: number | undefined }) =>
        `<b>${p.name}</b><br/>人员: ${p.value ?? 0}人`
    },
    visualMap: {
      min: 0, max: maxCount,
      left: 'left', bottom: 10,
      text: ['高', '低'], calculable: false,
      pieces: [
        { min: 0, max: 0, color: '#F5F5F5', label: '0' },
        { min: 1, max: 2, color: '#C5DFFF', label: '1-2' },
        { min: 3, max: 5, color: '#7BB5F0', label: '3-5' },
        { min: 6, max: 10, color: '#3D8DE0', label: '6-10' },
        { min: 11, max: 999, color: '#1A5FB4', label: '10+' }
      ]
    },
    series: [{
      type: 'map', map: 'china',
      zoom: 3,
      roam: true,
      scaleLimit: { min: 1, max: 8 },
      label: {
        show: true,
        fontSize: 10,
        color: '#333',
        formatter: (p: { name: string }) => shortName(p.name)
      },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' },
        itemStyle: { areaColor: '#FFD54F' }
      },
      data: mapData.value.map(d => ({ name: d.name, value: d.count }))
    }]
  }, true)
}

// 省份人员明细（展开名单）
const expandedProvinces = ref<Set<string>>(new Set())
const provinceWorkers = ref<Record<string, ProvinceWorkerItem[]>>({})
const provinceWorkersLoading = ref<Set<string>>(new Set())

const sortedMapData = computed(() => {
  return [...mapData.value].sort((a, b) => b.count - a.count)
})

function peopleCountText(n: number | undefined) {
  const c = Number(n)
  return `${Number.isNaN(c) ? 0 : c}人`
}

function isExpanded(province: string) {
  return expandedProvinces.value.has(province)
}

async function toggleProvince(province: string) {
  if (expandedProvinces.value.has(province)) {
    expandedProvinces.value.delete(province)
  } else {
    expandedProvinces.value.add(province)
    if (!provinceWorkers.value[province]) {
      await loadProvinceWorkers(province)
    }
  }
}

async function expandProvince(province: string) {
  expandedProvinces.value.add(province)
  if (!provinceWorkers.value[province]) {
    await loadProvinceWorkers(province)
  }
}

async function loadProvinceWorkers(province: string) {
  provinceWorkersLoading.value.add(province)
  try {
    const res = await getProvinceWorkers(province, mapDate.value)
    provinceWorkers.value[province] = res.workers
  } catch {
    provinceWorkers.value[province] = []
  } finally {
    provinceWorkersLoading.value.delete(province)
  }
}

let resizeTimer: ReturnType<typeof setTimeout>
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => mapChart?.resize(), 200)
}

onMounted(() => {
  loadMap()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  mapChart?.dispose()
})
</script>

<template>
  <div class="distribution-page">
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>人员分布图（按区域统计每日在外人员）</span>
          <div class="card-header-right">
            <el-date-picker
              v-model="mapDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              size="small"
              style="width: 150px"
              @change="loadMap"
            />
            <el-button :icon="Refresh" size="small" text @click="loadMap">刷新</el-button>
          </div>
        </div>
      </template>
      <div ref="mapChartRef" v-loading="mapLoading" style="height:520px"></div>
    </el-card>

    <el-card class="section-card" shadow="never">
      <template #header>
        <span>省份人员明细</span>
      </template>
      <el-table :data="sortedMapData" stripe border style="width: 100%">
        <el-table-column type="expand" width="60">
          <template #default="{ row }">
            <div class="expand-content">
              <el-table
                v-loading="provinceWorkersLoading.has(row.name)"
                :data="provinceWorkers[row.name] || []"
                stripe
                border
                size="small"
                style="width: 100%"
              >
                <el-table-column prop="userName" label="姓名" width="100" />
                <el-table-column prop="workerCode" label="工号" width="100" />
                <el-table-column prop="project" label="项目" min-width="160" show-overflow-tooltip />
                <el-table-column prop="area" label="区域" min-width="180" show-overflow-tooltip />
              </el-table>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="省份" min-width="160" />
        <el-table-column label="人员数" width="100">
          <template #default="{ row }">
            {{ peopleCountText(row.count) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              @click="toggleProvince(row.name)"
            >
              {{ isExpanded(row.name) ? '收起名单' : '展开名单' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.distribution-page { padding: 20px; }

.section-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 500;

    .card-header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
}

.expand-content {
  padding: 12px 24px;
  background: #f9fafb;
}
</style>
