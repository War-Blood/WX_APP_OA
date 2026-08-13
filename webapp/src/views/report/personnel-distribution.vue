<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import {
  getAreaDistribution, getChinaGeoJson,
  type ProvinceItem, type ProvinceWorkerItem
} from '@/api/report'
import type { StatsViewFilter } from '@/api/statsView'
import { createStatsView } from '@/api/statsView'
import FilterDialog from '@/components/FilterDialog.vue'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'

// 省份中心点经纬度（GeoJSON 全称 → [经度, 纬度]），用于气泡定位
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

// 省名归一化为短名（用于标签显示，避免"内蒙古自治区"过长遮挡）
function shortProvince(name: string): string {
  return name
    .replace(/(省|市|特别行政区)$/, '')
    .replace(/(壮族|回族|维吾尔)?自治区$/, '')
}

// 日期（默认北京时间昨日，可切换查看任意日）
function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const mapDate = ref(yesterdayStr())
const userStore = useUserStore()
const showFilter = ref(false)

// 中国地图
const mapLoading = ref(false)
const mapData = ref<ProvinceItem[]>([])
// 省份 -> 人员名单（tooltip 使用，直接取自 area-distribution，与人数同源）
const provinceWorkersMap = ref<Record<string, ProvinceWorkerItem[]>>({})
const mapChartRef = ref<HTMLDivElement>()
let mapChart: echarts.ECharts | null = null
let chinaGeoLoaded = false
let eventsBound = false

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

async function onFilterApply(filter: StatsViewFilter) {
  try {
    await createStatsView({
      statKey: 'area',
      conditions: filter.conditions || [],
      roleConditions: filter.roleConditions || {},
      visibility: filter.visibility,
    })
    toast.success('视图已保存')
  } catch {
    toast.error('保存失败')
  }
  showFilter.value = false
  loadMap()
}

// 构造气泡数据：每个有人的省份一个点 [经度, 纬度, 人数]
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
    // 点击省份：高亮并触发一次 tooltip（可选交互，不改变核心展示）
    mapChart.on('click', (params: any) => {
      const name = params?.name
      if (!name) return
      mapChart?.dispatchAction({
        type: 'highlight',
        seriesName: '人员分布',
        name
      })
      mapChart?.dispatchAction({
        type: 'showTip',
        seriesName: '人员分布',
        name
      })
    })
    eventsBound = true
  }

  const barData = buildBarData()
  const maxCount = Math.max(1, ...mapData.value.map(d => d.count))

  mapChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: 'rgba(8, 22, 40, 0.92)',
      borderColor: '#3a7bd5',
      borderWidth: 1,
      textStyle: { color: '#e8f4ff' },
      extraCssText: 'box-shadow:0 8px 24px rgba(0,0,0,0.35);border-radius:8px;padding:10px 12px;',
      formatter: (p: any) => {
        const name = p.name
        let count = 0
        if (Array.isArray(p.value)) count = Number(p.value[2]) || 0
        else count = Number.isNaN(Number(p.value)) ? 0 : (Number(p.value) || 0)
        const workers = provinceWorkersMap.value[name] || []
        let html = `<div style="font-weight:600;font-size:13px;margin-bottom:6px;color:#7dd3fc">${name}</div>`
        html += `<div style="color:#ff6b8a;font-weight:600">人员: ${count}人</div>`
        if (workers.length) {
          html += '<div style="margin-top:6px;border-top:1px solid rgba(255,255,255,0.12);padding-top:6px;max-height:160px;overflow:auto">'
          html += workers.map(w => `<div style="padding:2px 0;color:#cbe4ff">· ${w.userName} <span style="color:#8fb8df;margin-left:4px">${shortArea(w.area)}</span></div>`).join('')
          html += '</div>'
        } else {
          html += '<div style="margin-top:5px;color:#7d9bb8;font-size:11px">暂无人员数据</div>'
        }
        return html
      }
    },
    // 左侧 visualMap：蓝绿渐变，与深色地图形成对比
    visualMap: {
      min: 0,
      max: maxCount,
      left: 16,
      bottom: 16,
      itemWidth: 12,
      itemHeight: 120,
      text: ['高', '低'],
      textStyle: { color: '#ffffff' },
      inRange: { color: ['#00467F', '#36A3A0', '#A5CC82'] },
      calculable: false,
      seriesIndex: 0
    },
    // 深色科技风底图
    geo: {
      map: 'china',
      roam: false,
      zoom: 1.8,
      center: [102, 36],
      scaleLimit: { min: 1, max: 6 },
      label: {
        show: true,
        color: '#ffffff',
        fontSize: 11,
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowBlur: 4
      },
      itemStyle: {
        areaColor: {
          type: 'radial',
          x: 0.5,
          y: 0.5,
          r: 0.8,
          colorStops: [
            { offset: 0, color: 'rgba(11, 52, 90, 0.85)' },
            { offset: 1, color: 'rgba(4, 30, 56, 0.95)' }
          ]
        },
        borderColor: '#3a7bd5',
        borderWidth: 1,
        shadowColor: 'rgba(58, 123, 213, 0.45)',
        shadowBlur: 12,
        shadowOffsetY: 6
      },
      emphasis: {
        itemStyle: {
          areaColor: '#2B91B7',
          borderColor: '#00eeff',
          borderWidth: 1
        },
        label: { color: '#ffffff' }
      }
    },
    series: [
      // 分色层：按人数给省份着色（深蓝 → 青 → 绿）
      {
        name: '人员分布',
        type: 'map',
        geoIndex: 0,
        cursor: 'pointer',
        label: {
          show: true,
          position: 'bottom',
          formatter: (p: any) => shortProvince(p.name),
          color: '#ffffff',
          fontSize: 11,
          textShadowColor: 'rgba(0,0,0,0.6)',
          textShadowBlur: 4
        },
        labelLayout: { hideOverlap: true },
        itemStyle: {
          borderColor: '#5089EC',
          borderWidth: 1
        },
        emphasis: {
          label: { show: true },
          itemStyle: { areaColor: '#2B91B7' }
        },
        data: mapData.value.map(d => ({ name: d.name, value: d.count }))
      },
      // 红色人数气泡（pin 图钉，内显人数）
      {
        name: '人数气泡',
        type: 'scatter',
        coordinateSystem: 'geo',
        geoIndex: 0,
        symbol: 'pin',
        cursor: 'pointer',
        symbolSize: (val: number[]) => Math.max(28, Math.min(52, 22 + val[2] * 1.4)),
        itemStyle: {
          color: '#F62157',
          shadowBlur: 12,
          shadowColor: 'rgba(246, 33, 87, 0.55)'
        },
        label: {
          show: true,
          formatter: (p: any) => `${p.value[2]}`,
          position: 'inside',
          offset: [0, -4],
          color: '#fff',
          fontSize: 10,
          fontWeight: 'bold'
        },
        emphasis: { scale: 1.15 },
        zlevel: 6,
        data: barData
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
      <span class="toolbar-title">人员分布图<small>按区域统计每日在外人员</small></span>
      <div class="toolbar-actions">
        <el-button v-if="userStore.isAdmin" size="small" @click="showFilter = true">筛选</el-button>
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

    <FilterDialog v-model="showFilter" stat-key="area" @apply="onFilterApply" />

    <div class="map-body">
      <!-- 地图直接置于内容区，无嵌套边框；内部深色科技风 -->
      <div ref="mapChartRef" v-loading="mapLoading" class="map-canvas"></div>
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
    font-size: 17px;
    font-weight: 600;
    color: #1f2d3d;
    display: flex;
    align-items: baseline;
    gap: 8px;

    small {
      font-size: 12px;
      font-weight: 400;
      color: #8a96a3;
    }
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
  border-radius: 12px;
  overflow: hidden;
  background:
    radial-gradient(120% 120% at 50% 0%, #0c2a4a 0%, #07182a 60%, #030d18 100%);
  border: 1px solid #1a4a6e;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25), inset 0 0 40px rgba(58, 123, 213, 0.08);
}
</style>
