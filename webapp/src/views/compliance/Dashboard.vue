<template>
  <div class="compliance-dashboard">
    <el-row :gutter="20">
      <!-- 整体及时率 -->
      <el-col :span="6">
        <el-card>
          <div class="stat-card">
            <div class="stat-value">{{ dashboard.overallRate }}%</div>
            <div class="stat-label">整体及时率</div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 准时提交数 -->
      <el-col :span="6">
        <el-card>
          <div class="stat-card success">
            <div class="stat-value">{{ dashboard.onTimeCount }}</div>
            <div class="stat-label">准时提交</div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 延迟提交数 -->
      <el-col :span="6">
        <el-card>
          <div class="stat-card warning">
            <div class="stat-value">{{ dashboard.delayedCount }}</div>
            <div class="stat-label">延迟提交</div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 缺失报告数 -->
      <el-col :span="6">
        <el-card>
          <div class="stat-card danger">
            <div class="stat-value">{{ dashboard.missingCount }}</div>
            <div class="stat-label">缺失报告</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px;">
      <!-- 项目缺失排名 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>项目缺失排名</span>
            </div>
          </template>
          <el-table :data="projectMissing" stripe>
            <el-table-column prop="project" label="项目" min-width="180" />
            <el-table-column prop="missing_count" label="缺失次数" sortable width="120">
              <template #default="{ row }">
                <el-tag type="danger">{{ row.missing_count }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!projectMissing.length" description="暂无缺失数据" />
        </el-card>
      </el-col>
      
      <!-- 人员缺失TOP10 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>人员缺失TOP10</span>
            </div>
          </template>
          <el-table :data="missingTop10" stripe>
            <el-table-column prop="worker_name" label="人员" />
            <el-table-column prop="missing_count" label="缺失次数" sortable width="120">
              <template #default="{ row }">
                <el-tag type="danger">{{ row.missing_count }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!missingTop10.length" description="暂无缺失数据" />
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 及时率趋势图 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>近6个月及时率趋势</span>
        </div>
      </template>
      <div ref="trendChart" style="height: 400px;"></div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@/utils/toast'
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import { complianceApi } from '@/api/compliance'

const dashboard = ref({
  overallRate: 0,
  totalReports: 0,
  onTimeCount: 0,
  delayedCount: 0,
  missingCount: 0
})

const missingTop10 = ref<any[]>([])
const projectMissing = ref<any[]>([])
const trendData = ref<any[]>([])
const trendChart = ref<HTMLDivElement>()

onMounted(() => {
  loadDashboard()
})

async function loadDashboard() {
  try {
    const res = await complianceApi.getDashboard()
    const data = res.data
    
    dashboard.value = {
      overallRate: data.overallRate || 0,
      totalReports: data.totalReports || 0,
      onTimeCount: data.onTimeCount || 0,
      delayedCount: data.delayedCount || 0,
      missingCount: data.missingCount || 0
    }
    
    missingTop10.value = data.missingTop10 || []
    trendData.value = data.trendData || []
    
    // 项目维度缺失统计(从 report_compliance 聚合)
    loadProjectMissing()
    
    renderTrendChart()
  } catch (err: any) {
    toast.error(err.message || '加载合规统计失败')
  }
}

async function loadProjectMissing() {
  try {
    const res = await complianceApi.getMissingReports({ page: 1, pageSize: 1000 })
    const allRecords = res.data.list || []
    // 按项目聚合缺失次数
    const projectMap = new Map<string, number>()
    for (const item of allRecords) {
      const proj = item.project || '(未指定)'
      projectMap.set(proj, (projectMap.get(proj) || 0) + 1)
    }
    projectMissing.value = Array.from(projectMap.entries())
      .map(([project, missing_count]) => ({ project, missing_count }))
      .sort((a, b) => b.missing_count - a.missing_count)
  } catch {
    // fallback: use missing reports list to compute
  }
}

function renderTrendChart() {
  if (!trendChart.value) return
  
  const chart = echarts.init(trendChart.value)
  
  const months = trendData.value.map((item: any) => item.month)
  const rates = trendData.value.map((item: any) => 
    item.total > 0 ? ((item.on_time_count / item.total) * 100).toFixed(2) : 0
  )
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: months
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [
      {
        name: '及时率',
        type: 'line',
        data: rates,
        smooth: true,
        itemStyle: {
          color: '#409eff'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
          ])
        }
      }
    ]
  }
  
  chart.setOption(option)
  
  window.addEventListener('resize', () => {
    chart.resize()
  })
}
</script>

<style scoped>
.compliance-dashboard {
  padding: 20px;
}

.stat-card {
  text-align: center;
  padding: 20px 0;
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 10px;
}

.stat-card.success .stat-value {
  color: #67c23a;
}

.stat-card.warning .stat-value {
  color: #e6a23c;
}

.stat-card.danger .stat-value {
  color: #f56c6c;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.card-header {
  font-weight: bold;
  font-size: 16px;
}
</style>
