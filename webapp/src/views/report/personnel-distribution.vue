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
const mapChartRef = ref<HTMLDivElement>()
let mapChart: echarts.ECharts | null = null
let chinaGeoLoaded = false

const mapDialogVisible = ref(false)
const mapDialogProvince = ref('')
const mapDialogWorkers = ref<ProvinceWorkerItem[]>([])
const mapDialogLoading = ref(false)

async function loadMap() {
  mapLoading.value = true
  try {
    // 加载区域分布数据（含省名归一化，后端已处理）
    const res = await getAreaDistribution(mapDate.value)
    mapData.value = res.provinces

    // 加载 GeoJSON（后端同源托管，仅一次）
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

function renderMap() {
  if (!mapChartRef.value) return
  if (!mapChart) {
    mapChart = echarts.init(mapChartRef.value)
    mapChart.on('click', (params: { name: string }) => {
      if (params.name) showProvinceDialog(params.name)
    })
  }

  const maxCount = Math.max(1, ...mapData.value.map(d => d.count))

  mapChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (p: { name: string; value: number }) =>
        `<b>${p.name}</b><br/>人员: ${p.value}人`
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
      roam: false,
      label: { show: true, fontSize: 10, color: '#333' },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' },
        itemStyle: { areaColor: '#FFD54F' }
      },
      // 后端返回省名为 GeoJSON 全称，nameMap 仅用于显示简称
      data: mapData.value.map(d => ({ name: d.name, value: d.count })),
      nameMap: {
        '澳门特别行政区': '澳门', '香港特别行政区': '香港',
        '西藏自治区': '西藏', '内蒙古自治区': '内蒙古',
        '新疆维吾尔自治区': '新疆', '广西壮族自治区': '广西',
        '宁夏回族自治区': '宁夏'
      }
    }]
  }, true)
}

async function showProvinceDialog(province: string) {
  mapDialogProvince.value = province
  mapDialogVisible.value = true
  mapDialogLoading.value = true
  try {
    const res = await getProvinceWorkers(province, mapDate.value)
    mapDialogWorkers.value = res.workers
  } catch {
    mapDialogWorkers.value = []
  } finally {
    mapDialogLoading.value = false
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

    <!-- 省份人员弹窗 -->
    <el-dialog v-model="mapDialogVisible" :title="mapDialogProvince + ' — 人员列表'" width="600px" destroy-on-close>
      <el-table v-loading="mapDialogLoading" :data="mapDialogWorkers" stripe border max-height="400">
        <el-table-column prop="userName" label="姓名" width="100" />
        <el-table-column prop="workerCode" label="工号" width="80" />
        <el-table-column prop="project" label="项目" min-width="140" show-overflow-tooltip />
        <el-table-column label="区域" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.area || '—' }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.distribution-page { padding: 20px; }

.section-card {
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
</style>
