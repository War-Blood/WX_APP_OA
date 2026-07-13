<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import {
  getAreaDistribution, getProvinceWorkers, getChinaGeoJson,
  type ProvinceItem, type ProvinceWorkerItem
} from '@/api/report'

// 省份中心点经纬度（GeoJSON 全称 → [经度, 纬度]），用于涟漪散点定位
const PROVINCE_CENTER: Record<string, [number, number]> = {
  北京市: [116.4, 39.9],
  天津市: [117.2, 39.1],
  河北省: [114.5, 38.0],
  山西省: [112.5, 37.6],
  内蒙古自治区: [111.7, 40.8],
  辽宁省: [123.4, 41.8],
  吉林省: [125.3, 43.9],
  黑龙江省: [126.6, 45.7],
  上海市: [121.5, 31.2],
  江苏省: [118.8, 32.9],
  浙江省: [120.2, 30.3],
  安徽省: [117.3, 31.8],
  福建省: [119.3, 26.1],
  江西省: [115.9, 27.6],
  山东省: [118.0, 36.4],
  河南省: [113.6, 34.0],
  湖北省: [114.3, 30.6],
  湖南省: [112.9, 28.2],
  广东省: [113.3, 23.1],
  广西壮族自治区: [108.3, 22.8],
  海南省: [110.3, 20.0],
  重庆市: [106.5, 29.6],
  四川省: [104.1, 30.6],
  贵州省: [106.7, 26.6],
  云南省: [102.7, 25.0],
  西藏自治区: [91.1, 29.6],
  陕西省: [108.9, 34.3],
  甘肃省: [103.8, 36.1],
  青海省: [101.8, 36.6],
  宁夏回族自治区: [106.3, 38.5],
  新疆维吾尔自治区: [87.6, 43.8],
  台湾省: [121.0, 23.6],
  香港特别行政区: [114.2, 22.3],
  澳门特别行政区: [113.5, 22.2]
}

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

function buildScatterData() {
  return mapData.value
    .filter(d => d.count > 0 && PROVINCE_CENTER[d.name])
    .map(d => ({
      name: d.name,
      value: [...PROVINCE_CENTER[d.name], d.count] as [number, number, number]
    }))
}

function renderMap() {
  if (!mapChartRef.value) return
  if (!mapChart) {
    mapChart = echarts.init(mapChartRef.value)
  }

  const maxCount = Math.max(1, ...mapData.value.map(d => d.count))
  const scatterData = buildScatterData()

  mapChart.setOption({
    backgroundColor: '#0b1a2b',
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: 'rgba(11,26,43,0.92)',
      borderColor: '#1c6fb9',
      textStyle: { color: '#cfe8ff' },
      formatter: (p: { name: string; value: number | number[] | undefined }) => {
        const name = p.name
        let count = 0
        if (Array.isArray(p.value)) count = Number(p.value[2]) || 0
        else count = Number.isNaN(Number(p.value)) ? 0 : (Number(p.value) || 0)
        const workers = provinceWorkersMap.value[name] || []
        let html = `<b>${name}</b><br/>人员: ${count}人`
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
      textStyle: { color: '#cfe8ff' },
      pieces: [
        { min: 0, max: 0, color: '#1b2a3d', label: '0' },
        { min: 1, max: 2, color: '#2a5d8f', label: '1-2' },
        { min: 3, max: 5, color: '#3d8de0', label: '3-5' },
        { min: 6, max: 10, color: '#5aa9f0', label: '6-10' },
        { min: 11, max: 999, color: '#00e6ff', label: '10+' }
      ]
    },
    geo: {
      map: 'china',
      roam: true,
      zoom: 3,
      scaleLimit: { min: 1, max: 8 },
      itemStyle: {
        areaColor: '#0b1a2b',
        borderColor: '#1c6fb9',
        borderWidth: 1
      },
      label: {
        show: true,
        color: '#cfe8ff',
        fontSize: 10,
        formatter: (p: { name: string }) => shortName(p.name)
      },
      emphasis: {
        label: { show: true, color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
        itemStyle: { areaColor: '#14304a' }
      }
    },
    series: [
      // 分色底图（绑定 geo，由 visualMap 着色）
      {
        name: '人员分布',
        type: 'map',
        geoIndex: 0,
        data: mapData.value.map(d => ({ name: d.name, value: d.count }))
      },
      // 发光涟漪散点（点大小=人数）
      {
        name: '人员点',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        geoIndex: 0,
        zlevel: 2,
        symbolSize: (val: number[]) => 8 + Math.min(val[2], 30) * 1.2,
        showEffectOn: 'render',
        rippleEffect: { brushType: 'stroke', scale: 3, period: 3 },
        itemStyle: {
          color: '#00e6ff',
          shadowBlur: 12,
          shadowColor: '#00e6ff'
        },
        label: {
          show: true,
          color: '#ffffff',
          fontSize: 11,
          fontWeight: 'bold',
          formatter: (p: { value: number[] }) => `${p.value[2]}人`
        },
        data: scatterData
      }
    ]
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
  border-radius: 8px;
  overflow: hidden;
  background: #0b1a2b;
}
</style>
