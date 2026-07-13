<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import {
  getAreaDistribution, getChinaGeoJson,
  type ProvinceItem, type ProvinceWorkerItem
} from '@/api/report'

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

// 中国地图
const mapLoading = ref(false)
const mapData = ref<ProvinceItem[]>([])
// 省份 -> 人员名单（tooltip 使用，直接取自 area-distribution，与人数同源）
const provinceWorkersMap = ref<Record<string, ProvinceWorkerItem[]>>({})
const mapChartRef = ref<HTMLDivElement>()
let mapChart: echarts.ECharts | null = null
let chinaGeoLoaded = false
let eventsBound = false

// 右侧抽屉
const drawerVisible = ref(false)
const drawerProvince = ref<ProvinceItem | null>(null)
const drawerWorkers = computed<ProvinceWorkerItem[]>(() => drawerProvince.value?.workers ?? [])

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

// 点击省份 → 打开右侧抽屉展示该省人员名单
function openDrawer(name: string) {
  const item = mapData.value.find(d => d.name === name)
  drawerProvince.value = item
    ? item
    : { name, count: 0, projects: [], workers: [] }
  drawerVisible.value = true
}

function renderMap() {
  if (!mapChartRef.value) return
  if (!mapChart) {
    mapChart = echarts.init(mapChartRef.value)
  }
  if (!eventsBound) {
    mapChart.on('click', (params: any) => {
      const name = params?.name
      if (name) openDrawer(name)
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
      backgroundColor: '#ffffff',
      borderColor: '#d0d7de',
      borderWidth: 1,
      textStyle: { color: '#1f2d3d' },
      extraCssText: 'box-shadow:0 6px 20px rgba(31,45,61,0.12);border-radius:8px;padding:10px 12px;',
      formatter: (p: any) => {
        const name = p.name
        let count = 0
        if (Array.isArray(p.value)) count = Number(p.value[2]) || 0
        else count = Number.isNaN(Number(p.value)) ? 0 : (Number(p.value) || 0)
        const workers = provinceWorkersMap.value[name] || []
        let html = `<div style="font-weight:600;font-size:13px;margin-bottom:4px;color:#1f2d3d">${name}</div>`
        html += `<div style="color:#2f80ed;font-weight:600">人员: ${count}人</div>`
        if (workers.length) {
          html += '<div style="margin-top:6px;border-top:1px solid #eef0f2;padding-top:6px;max-height:160px;overflow:auto">'
          html += workers.map(w => `<div style="padding:2px 0;color:#475569">· ${w.userName}</div>`).join('')
          html += '</div><div style="margin-top:5px;color:#9aa5b1;font-size:11px">点击省份查看完整名单</div>'
        } else {
          html += '<div style="margin-top:5px;color:#9aa5b1;font-size:11px">点击省份查看详情</div>'
        }
        return html
      }
    },
    visualMap: {
      min: 0,
      max: maxCount,
      left: 16,
      bottom: 16,
      itemWidth: 12,
      itemHeight: 90,
      text: ['多', '少'],
      textStyle: { color: '#5a6b7b' },
      inRange: { color: ['#e3f0fb', '#a9d4ec', '#4cb3a8', '#2e9e6b'] },
      calculable: false,
      seriesIndex: 0
    },
    // 2D 底图：固定展示完整中国，zoom 控制比例
    geo: {
      map: 'china',
      roam: false,
      zoom: 1.15,
      center: [102, 36],
      scaleLimit: { min: 1, max: 6 },
      itemStyle: {
        areaColor: '#eef3f8',
        borderColor: '#cdd9e5',
        borderWidth: 1
      },
      emphasis: {
        itemStyle: { areaColor: '#d6e6f5' },
        label: { show: false }
      }
    },
    series: [
      // 分色层：按人数给省份着色（浅蓝→蓝→青→绿）
      {
        name: '人员分布',
        type: 'map',
        geoIndex: 0,
        cursor: 'pointer',
        label: {
          show: false,
          formatter: (p: any) => shortProvince(p.name),
          color: '#334155',
          fontSize: 11,
          fontWeight: 'bold'
        },
        labelLayout: { hideOverlap: true },
        itemStyle: {
          borderColor: '#b7c7d6',
          borderWidth: 1
        },
        emphasis: {
          label: { show: true },
          itemStyle: { areaColor: '#9ec9ec' }
        },
        data: mapData.value.map(d => ({ name: d.name, value: d.count }))
      },
      // 涟漪气泡（柔和青色，提供动效生命感）
      {
        name: '涟漪',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        geoIndex: 0,
        symbolSize: (val: number[]) => 10 + Math.min(val[2], 30),
        showEffectOn: 'render',
        rippleEffect: { brushType: 'stroke', scale: 3, period: 4 },
        itemStyle: {
          color: '#36a3a0',
          shadowBlur: 6,
          shadowColor: 'rgba(54,163,160,0.45)'
        },
        zlevel: 1,
        data: barData
      },
      // 人数气泡（珊瑚色 pin，气泡内显示人数）
      {
        name: '人数气泡',
        type: 'scatter',
        coordinateSystem: 'geo',
        geoIndex: 0,
        symbol: 'pin',
        cursor: 'pointer',
        symbolSize: (val: number[]) => Math.max(26, Math.min(52, 16 + val[2] * 1.6)),
        itemStyle: {
          color: '#ff7a45',
          shadowBlur: 8,
          shadowColor: 'rgba(255,122,69,0.4)'
        },
        label: {
          show: true,
          formatter: (p: any) => `${p.value[2]}`,
          position: 'inside',
          offset: [0, -4],
          color: '#fff',
          fontSize: 11,
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

      <!-- 点击省份后右侧抽屉展示该省人员 -->
      <el-drawer
        v-model="drawerVisible"
        :title="drawerProvince ? `${drawerProvince.name} · ${drawerProvince.count} 人` : ''"
        direction="rtl"
        size="320px"
        class="worker-drawer"
      >
        <div v-if="drawerProvince" class="drawer-body">
          <div class="drawer-summary">
            <span class="summary-num">{{ drawerProvince.count }}</span>
            <span class="summary-label">人在外</span>
          </div>
          <div class="drawer-list">
            <div
              v-for="worker in drawerWorkers"
              :key="worker.userId"
              class="worker-row"
            >
              <span class="w-avatar">{{ worker.userName.charAt(0) }}</span>
              <span class="w-name">{{ worker.userName }}</span>
              <span class="w-area">{{ shortArea(worker.area) }}</span>
            </div>
          </div>
          <el-empty
            v-if="!drawerWorkers.length"
            description="该省暂无人员数据"
            :image-size="80"
          />
        </div>
      </el-drawer>
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
    radial-gradient(120% 120% at 50% 0%, #f7fbff 0%, #eef3f8 60%, #e7eef5 100%);
  border: 1px solid #e3e9f0;
  box-shadow: 0 4px 18px rgba(31, 45, 61, 0.06);
}

// 抽屉内容（浅色清爽风）
.worker-drawer {
  :deep(.el-drawer__header) {
    margin-bottom: 0;
    padding: 18px 20px;
    border-bottom: 1px solid #eef0f2;
    color: #1f2d3d;
    font-weight: 600;
  }

  :deep(.el-drawer__body) {
    padding: 0;
  }
}

.drawer-body {
  padding: 16px 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.drawer-summary {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #eaf4ff, #e8faf4);
  border: 1px solid #d8e8f5;
  border-radius: 10px;
  margin-bottom: 14px;

  .summary-num {
    font-size: 28px;
    font-weight: 700;
    color: #2f80ed;
    line-height: 1;
  }

  .summary-label {
    font-size: 13px;
    color: #5a6b7b;
  }
}

.drawer-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.worker-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f7f9fc;
  border: 1px solid #eef1f5;
  transition: background 0.2s, border-color 0.2s;

  &:hover {
    background: #eef5ff;
    border-color: #cfe0f5;
  }

  .w-avatar {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: 50%;
    background: #2f80ed;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .w-name {
    flex: 1;
    font-size: 14px;
    color: #1f2d3d;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .w-area {
    font-size: 12px;
    color: #8a96a3;
    flex-shrink: 0;
  }
}
</style>
