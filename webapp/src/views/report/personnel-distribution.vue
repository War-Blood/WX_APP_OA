<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import {
  getAreaDistribution, getChinaGeoJson,
  type ProvinceItem, type ProvinceWorkerItem
} from '@/api/report'

// 省份中心点经纬度（GeoJSON 全称 → [经度, 纬度]），用于涟漪散点/标签定位
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
// 省份 -> 人员名单（悬停 tooltip 使用，直接取自 area-distribution，与人数同源）
const provinceWorkersMap = ref<Record<string, ProvinceWorkerItem[]>>({})
const mapChartRef = ref<HTMLDivElement>()
let mapChart: echarts.ECharts | null = null
let chinaGeoLoaded = false
let eventsBound = false

// 右侧面板高亮省份
const activeProvince = ref<string>('')
const provinceGroupRefs: Record<string, HTMLElement | null> = {}
let previousProvince = ''

const provincesWithPeople = computed(() => {
  return mapData.value
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count)
})

async function loadMap() {
  mapLoading.value = true
  try {
    const res = await getAreaDistribution(mapDate.value)
    mapData.value = res.provinces

    // 名单与人数同源：直接用接口返回的 workers，不再逐省二次请求
    const workerMap: Record<string, ProvinceWorkerItem[]> = {}
    res.provinces.forEach(p => {
      workerMap[p.name] = p.workers || []
    })
    provinceWorkersMap.value = workerMap

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

function buildScatterData() {
  return mapData.value
    .filter(d => d.count > 0 && PROVINCE_CENTER[d.name])
    .map(d => ({
      name: d.name,
      value: [...PROVINCE_CENTER[d.name], d.count] as [number, number, number]
    }))
}

function shortArea(area: string) {
  const parts = area.split('-')
  return parts[1] || parts[0] || ''
}

function renderMap() {
  if (!mapChartRef.value) return
  if (!mapChart) {
    mapChart = echarts.init(mapChartRef.value)
  }
  if (!eventsBound) {
    mapChart.on('mouseover', (params: any) => {
      if (params.name && provinceWorkersMap.value[params.name]) {
        activeProvince.value = params.name
      }
    })
    mapChart.on('mouseout', () => {
      activeProvince.value = ''
    })
    eventsBound = true
  }

  const maxCount = Math.max(1, ...mapData.value.map(d => d.count))
  const scatterData = buildScatterData()

  mapChart.setOption({
    backgroundColor: '#060d1a',
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: 'rgba(6,13,26,0.95)',
      borderColor: '#409eff',
      borderWidth: 1,
      textStyle: { color: '#fff' },
      formatter: (p: { name: string; value: number | number[] | undefined }) => {
        const name = p.name
        let count = 0
        if (Array.isArray(p.value)) count = Number(p.value[2]) || 0
        else count = Number.isNaN(Number(p.value)) ? 0 : (Number(p.value) || 0)
        const workers = provinceWorkersMap.value[name] || []
        let html = `<div style="font-weight:bold;margin-bottom:4px">${name}</div>`
        html += `<div style="color:#00e6ff">人员: ${count}人</div>`
        if (workers.length) {
          html += '<div style="margin-top:6px;border-top:1px solid rgba(255,255,255,0.2);padding-top:6px">名单:</div>'
          html += workers.map(w => `<div style="padding:1px 0">· ${w.userName}</div>`).join('')
        }
        return html
      }
    },
    visualMap: {
      min: 0,
      max: maxCount,
      left: 20,
      bottom: 20,
      text: ['高', '低'],
      textStyle: { color: '#fff' },
      inRange: { color: ['#0f2447', '#1c6fb9', '#00e6ff'] },
      calculable: false
    },
    geo: {
      map: 'china',
      roam: true,
      zoom: 3,
      center: [102, 36],
      scaleLimit: { min: 1, max: 8 },
      itemStyle: {
        areaColor: '#0f2447',
        borderColor: '#1c6fb9',
        borderWidth: 1
      },
      emphasis: {
        itemStyle: { areaColor: '#1a4a8a' },
        label: { show: false }
      }
    },
    series: [
      // 底层阴影/发光层：制造立体浮起感
      {
        name: '阴影',
        type: 'map',
        geoIndex: 0,
        zlevel: 1,
        itemStyle: {
          areaColor: '#060d1a',
          borderColor: '#060d1a',
          borderWidth: 1,
          shadowColor: 'rgba(28,111,185,0.4)',
          shadowBlur: 30,
          shadowOffsetY: 15
        },
        data: []
      },
      // 主地图层（按人数着色）
      {
        name: '人员分布',
        type: 'map',
        geoIndex: 0,
        zlevel: 2,
        itemStyle: {
          borderColor: '#2b91e2',
          borderWidth: 1,
          shadowColor: 'rgba(0,0,0,0.5)',
          shadowBlur: 10,
          shadowOffsetY: 6
        },
        emphasis: {
          itemStyle: { areaColor: '#1a4a8a' }
        },
        data: mapData.value.map(d => ({ name: d.name, value: d.count }))
      },
      // 涟漪点
      {
        name: '人员点',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        geoIndex: 0,
        zlevel: 3,
        symbolSize: (val: number[]) => 10 + Math.min(val[2], 30) * 1.5,
        showEffectOn: 'render',
        rippleEffect: { brushType: 'stroke', scale: 3, period: 3 },
        itemStyle: {
          color: '#00e6ff',
          shadowBlur: 10,
          shadowColor: 'rgba(0,230,255,0.5)'
        },
        data: scatterData
      },
      // 漂浮标签：省份：N人
      {
        name: '省份标签',
        type: 'scatter',
        coordinateSystem: 'geo',
        geoIndex: 0,
        zlevel: 4,
        symbol: 'none',
        label: {
          show: true,
          formatter: (p: { name: string; value: number[] }) => `{title|${p.name}}\n{count|${p.value[2]}人}`,
          position: 'top',
          distance: 8,
          backgroundColor: 'rgba(6,13,26,0.9)',
          borderColor: '#409eff',
          borderWidth: 1,
          borderRadius: 4,
          padding: [6, 10],
          color: '#fff',
          shadowBlur: 10,
          shadowColor: 'rgba(64,158,255,0.5)',
          rich: {
            title: { color: '#fff', fontSize: 12, fontWeight: 'bold', align: 'center' },
            count: { color: '#00e6ff', fontSize: 14, fontWeight: 'bold', align: 'center', padding: [2, 0, 0, 0] }
          }
        },
        labelLayout: { hideOverlap: true },
        data: scatterData
      }
    ]
  }, true)
}

// 右侧面板 → 地图高亮
function onWorkerHover(_worker: ProvinceWorkerItem, provinceName: string) {
  if (previousProvince && previousProvince !== provinceName) {
    mapChart?.dispatchAction({ type: 'downplay', seriesName: '人员分布', name: previousProvince })
  }
  activeProvince.value = provinceName
  previousProvince = provinceName
  mapChart?.dispatchAction({ type: 'highlight', seriesName: '人员分布', name: provinceName })
  mapChart?.dispatchAction({ type: 'showTip', seriesName: '人员分布', name: provinceName })
}

function onWorkerLeave() {
  if (previousProvince) {
    mapChart?.dispatchAction({ type: 'downplay', seriesName: '人员分布', name: previousProvince })
  }
  activeProvince.value = ''
  previousProvince = ''
  mapChart?.dispatchAction({ type: 'hideTip' })
}

function setProvinceRef(el: any, name: string) {
  if (el) provinceGroupRefs[name] = el
}

// 地图 → 右侧面板滚动
watch(activeProvince, (name) => {
  if (!name) return
  const el = provinceGroupRefs[name]
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
})

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

    <div class="map-body">
      <!-- 地图直接置于内容区，无嵌套边框 -->
      <div ref="mapChartRef" v-loading="mapLoading" class="map-canvas"></div>

      <!-- 右侧面板：人员名单 -->
      <div class="side-panel">
        <div class="panel-title">人员名单</div>
        <div class="panel-content">
          <div
            v-for="province in provincesWithPeople"
            :key="province.name"
            :ref="(el) => setProvinceRef(el, province.name)"
            class="province-group"
            :class="{ active: activeProvince === province.name }"
          >
            <div class="province-header">
              {{ province.name }}（{{ province.count }}人）
            </div>
            <div class="worker-list">
              <div
                v-for="worker in province.workers"
                :key="worker.userId"
                class="worker-item"
                @mouseenter="onWorkerHover(worker, province.name)"
                @mouseleave="onWorkerLeave"
              >
                <span class="worker-name">{{ worker.userName }}</span>
                <span class="worker-area">{{ shortArea(worker.area) }}</span>
              </div>
            </div>
          </div>
          <div v-if="!provincesWithPeople.length" class="empty-tip">暂无人员分布数据</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.distribution-page {
  width: 100%;
  height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
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

.map-body {
  position: relative;
  flex: 1;
  min-height: 0;
}

.map-canvas {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: #060d1a;
}

.side-panel {
  position: absolute;
  right: 16px;
  top: 16px;
  width: 240px;
  max-height: calc(100% - 32px);
  background: rgba(6, 13, 26, 0.9);
  border: 1px solid rgba(64, 158, 255, 0.3);
  border-radius: 8px;
  overflow-y: auto;
  padding: 12px;
  color: #fff;
  backdrop-filter: blur(4px);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(64, 158, 255, 0.4);
    border-radius: 2px;
  }
}

.panel-title {
  font-size: 15px;
  font-weight: bold;
  color: #00e6ff;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(64, 158, 255, 0.3);
}

.province-group {
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.2s;

  &.active {
    background: rgba(64, 158, 255, 0.15);
    border: 1px solid rgba(64, 158, 255, 0.4);
  }
}

.province-header {
  font-weight: bold;
  color: #79bbff;
  font-size: 13px;
  margin-bottom: 6px;
}

.worker-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.worker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: rgba(64, 158, 255, 0.2);
    color: #00e6ff;
  }
}

.worker-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.worker-area {
  color: #909399;
  font-size: 11px;
  flex-shrink: 0;
  margin-left: 8px;
}

.empty-tip {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding: 20px 0;
}
</style>
