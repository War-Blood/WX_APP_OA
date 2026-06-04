<template>
  <div class="compliance-dashboard">
    <el-row :gutter="20">
      <!-- 整体及时率 -->
      <el-col :span="6">
        <el-card>
          <div class="stat-card">
            <div class="stat-value">{{ dashboard.overallRate }}%</div>
            <div class="stat-label">本月整体及时率</div>
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
            <div class="stat-value">{{ dashboard.delayedCount || 0 }}</div>
            <div class="stat-label">延迟提交</div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 缺失报告数 -->
      <el-col :span="6">
        <el-card>
          <div class="stat-card danger">
            <div class="stat-value">{{ dashboard.missingCount || 0 }}</div>
            <div class="stat-label">缺失报告</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px;">
      <!-- 部门及时率排名 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>部门及时率排名</span>
            </div>
          </template>
          <el-table :data="departmentRanking" stripe>
            <el-table-column prop="department" label="部门" />
            <el-table-column prop="rate" label="及时率">
              <template #default="{ row }">
                <el-progress :percentage="parseFloat(row.rate)" :color="getProgressColor(row.rate)" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      
      <!-- 缺失报告TOP10 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>缺失报告TOP10</span>
            </div>
          </template>
          <el-table :data="missingTop10" stripe>
            <el-table-column prop="user_name" label="员工" />
            <el-table-column prop="department" label="部门" />
            <el-table-column prop="missing_count" label="缺失次数" sortable />
          </el-table>
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
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import { complianceApi } from '@/api/compliance'
import { ElMessage } from 'element-plus'

const dashboard = ref({
  overallRate: 0,
  totalReports: 0,
  onTimeCount: 0,
  delayedCount: 0,
  missingCount: 0
})

const departmentRanking = ref<any[]>([])
const missingTop10 = ref<any[]>([])
const trendData = ref<any[]>([])
const trendChart = ref<HTMLDivElement>()

onMounted(() => {
  loadDashboard()
})

async function loadDashboard() {
  try {
    const res = await complianceApi.getDashboard()
    dashboard.value = res.data
    
    // 计算延迟和缺失数量
    dashboard.value.delayedCount = res.data.totalReports - res.data.onTimeCount - (res.data.missingCount || 0)
    dashboard.value.missingCount = res.data.missingCount || 0
    
    departmentRanking.value = res.data.departmentRanking || []
    missingTop10.value = res.data.missingTop10 || []
    trendData.value = res.data.trendData || []
    
    renderTrendChart()
  } catch (err: any) {
    ElMessage.error(err.message || '加载合规统计失败')
  }
}

function getProgressColor(rate: string) {
  const num = parseFloat(rate)
  if (num >= 90) return '#67c23a'
  if (num >= 70) return '#e6a23c'
  return '#f56c6c'
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
  
  // 响应式调整
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
