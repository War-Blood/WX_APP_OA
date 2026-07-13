<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import {
  getAreaDistribution, getChinaGeoJson,
  type ProvinceItem, type ProvinceWorkerItem
} from '@/api/report'

// 省份中心点经纬度（GeoJSON 全称 → [经度, 纬度]），用于 3D 立柱定位
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

// 构造 3D 立柱数据：每个有人的省份一根柱 [经度, 纬度, 人数]
function buildBarData() {
  return mapData.value
    .filter(d => d.count > 0 && PROVINCE_CENTER[d.name])
    .map(d => ({
      name: d.name,
      value: [...PROVINCE_CENTER[d.name], d.count] as [number, number, number]
    }))
}

function shortArea(area?: string | null) {
  if (!area || typeof area !== 'string') return ''
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

  const barData = buildBarData()

  mapChart.setOption({
    backgroundColor: '#040a18',
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: 'rgba(6,13,26,0.95)',
      borderColor: '#409eff',
      borderWidth: 1,
      textStyle: { color: '#fff' },
      formatter: (p: any) => {
        const name = p.name || (p.value && p.value[3]) || ''
        let count = 0
        if (Array.isArray(p.value)) count = Number(p.value[2]) || 0
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
    // 3D 底图：固定展示完整中国，关闭所有交互
    geo3D: {
      map: 'china',
      roam: false,
      boxWidth: 100,
      boxDepth: 75,
      regionHeight: 2,
      shading: 'lambert',
      itemStyle: {
        color: '#0a1a3a',
        borderWidth: 1,
        borderColor: '#1c6fb9',
        opacity: 1
      },
      emphasis: {
        itemStyle: { color: '#14304a' },
        label: { show: false }
      },
      viewControl: {
        autoRotate: false,
        distance: 180,
        alpha: 45,
        beta: 0,
        minDistance: 120,
        maxDistance: 300,
        rotateSensitivity: 0,
        zoomSensitivity: 0,
        panSensitivity: 0
      },
      light: {
        main: { intensity: 1.2, shadow: true, alpha: 40, beta: 30 },
        ambient: { intensity: 0.35 }
      },
      label: { show: false }
    },
    // 3D 立柱：每省一根真实立体柱，柱高 = 人数，柱顶显示「省份：N人」
    series: [{
      type: 'bar3D',
      name: '人员分布',
      coordinateSystem: 'geo3D',
      barSize: 1.4,
      minHeight: 0.6,
      bevelSize: 0.2,
      shading: 'lambert',
      data: barData,
      itemStyle: {
        color: '#00e6ff'
      },
      emphasis: {
        itemStyle: { color: '#ffd24a' }
      },
      label: {
        show: true,
        distance: 2,
        formatter: (params: any) => `${params.name}\n${params.value[2]}人`,
        textStyle: {
          color: '#fff',
          fontSize: 12,
          backgroundColor: 'rgba(6,13,26,0.85)',
          borderColor: '#409eff',
          borderWidth: 1,
          padding: [4, 6],
          borderRadius: 3
        }
      }
    }]
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
      <!-- 3D 地图直接置于内容区，无嵌套边框 -->
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
  background: #040a18;
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
