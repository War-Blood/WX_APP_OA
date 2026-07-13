<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
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
// 省份 -> 人员名单（悬停 tooltip 使用）
const provinceWorkersMap = ref<Record<string, ProvinceWorkerItem[]>>({})
const mapChartRef = ref<HTMLDivElement>()
let mapChart: echarts.ECharts | null = null
let chinaGeoLoaded = false

async function loadMap() {
  mapLoading.value = true
  try {
    const res = await getAreaDistribution(mapDate.value)
    mapData.value = res.provinces

    // 预拉取有人员的省份名单，供 tooltip 悬停展示
    const provincesWithPeople = res.provinces.filter(p => p.count > 0)
    await Promise.all(
      provincesWithPeople.map(async (p) => {
        try {
          const w = await getProvinceWorkers(p.name, mapDate.value)
          provinceWorkersMap.value[p.name] = w.workers
        } catch {
          provinceWorkersMap.value[p.name] = []
        }
      })
    )

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
  }

  const maxCount = Math.max(1, ...mapData.value.map(d => d.count))

  mapChart.setOption({
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (p: { name: string; value: number | undefined }) => {
        const count = Number.isNaN(Number(p.value)) ? 0 : (p.value ?? 0)
        const workers = provinceWorkersMap.value[p.name] || []
        let html = `<b>${p.name}</b><br/>人员: ${count}人`
        if (workers.length) {
          html += '<br/>名单:<br/>' + workers.map(w => `· ${w.userName}`).join('<br/>')
        }
        return html
      }
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
    <!-- 设置信息置顶 -->
    <div class="map-toolbar">
      <span class="toolbar-title">人员分布图（按区域统计每日在外人员）</span>
      <div class="toolbar-actions">
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

    <!-- 地图直接置于内容区，无嵌套边框 -->
    <div ref="mapChartRef" v-loading="mapLoading" class="map-canvas"></div>
  </div>
</template>

<style scoped lang="scss">
.distribution-page {
  width: 100%;
}

.map-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  .toolbar-title {
    font-size: 16px;
    font-weight: 600;
    color: #1f2d3d;
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.map-canvas {
  width: 100%;
  height: calc(100vh - 160px);
  min-height: 520px;
}
</style>
