<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  getStats, getWorkerStats,
  type AllStatsResponse, type ProjectStatsItem
} from '@/api/report'

// 统计汇总
const statsLoading = ref(true)
const summary = ref<AllStatsResponse | null>(null)

// 按项目维度
const projectLoading = ref(true)
const projectList = ref<ProjectStatsItem[]>([])

// 按人员维度
const workerLoading = ref(true)
const workerList = ref<{ name: string; total: number; monthCount: number; lastDate: string }[]>([])
const workerTotal = ref(0)
const workerPage = ref(1)
const workerPageSize = ref(20)

async function loadSummary() {
  statsLoading.value = true
  try {
    summary.value = await getStats('all')
  } catch {
    ElMessage.warning('汇总统计加载失败')
  } finally {
    statsLoading.value = false
  }
}

async function loadProjects() {
  projectLoading.value = true
  try {
    const res = await getStats('project')
    projectList.value = res.projects
  } catch {
    projectList.value = []
    ElMessage.warning('项目统计加载失败')
  } finally {
    projectLoading.value = false
  }
}

async function loadWorkers() {
  workerLoading.value = true
  try {
    const res = await getWorkerStats({
      page: workerPage.value,
      pageSize: workerPageSize.value
    })
    workerList.value = res.list
    workerTotal.value = res.total
  } catch {
    workerList.value = []
  } finally {
    workerLoading.value = false
  }
}

function handleWorkerPageChange(p: number) {
  workerPage.value = p
  loadWorkers()
}

onMounted(() => {
  loadSummary()
  loadProjects()
  loadWorkers()
})
</script>

<template>
  <div class="stats-page">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row" v-loading="statsLoading">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-val">{{ summary?.totalLogs ?? '-' }}</div>
          <div class="stat-lbl">总日志数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-val" style="color:#409EFF">{{ summary?.monthNew ?? '-' }}</div>
          <div class="stat-lbl">本月新增</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-val" style="color:#E6A23C">{{ summary?.delayedTotal ?? '-' }}</div>
          <div class="stat-lbl">延迟条数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-val" style="color:#F56C6C">{{ summary?.missingPersonCount ?? '-' }}</div>
          <div class="stat-lbl">缺失人次</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 按项目维度 -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>按项目维度</span>
          <el-button :icon="Refresh" size="small" text @click="loadProjects">刷新</el-button>
        </div>
      </template>
      <el-table :data="projectList" v-loading="projectLoading" stripe border>
        <el-table-column prop="project" label="项目" min-width="180" show-overflow-tooltip />
        <el-table-column prop="total" label="总条数" width="100" align="center" sortable />
        <el-table-column prop="month" label="本月" width="80" align="center" sortable />
        <el-table-column prop="missing" label="缺失" width="80" align="center" sortable />
      </el-table>
    </el-card>

    <!-- 按人员维度 -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>按人员维度</span>
          <el-button :icon="Refresh" size="small" text @click="loadWorkers">刷新</el-button>
        </div>
      </template>
      <el-table :data="workerList" v-loading="workerLoading" stripe border>
        <el-table-column prop="name" label="人员" width="120" />
        <el-table-column prop="total" label="总条数" width="100" align="center" sortable />
        <el-table-column prop="monthCount" label="本月" width="80" align="center" sortable />
        <el-table-column prop="lastDate" label="最近提交" width="120" align="center" sortable />
      </el-table>
      <div class="pagination-wrap">
        <span class="total-text">共 {{ workerTotal }} 人</span>
        <el-pagination
          v-model:current-page="workerPage"
          :page-size="workerPageSize"
          :total="workerTotal"
          layout="prev, pager, next"
          background
          @current-change="handleWorkerPageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.stats-page { padding: 20px; }

.stats-row {
  margin-bottom: 16px;

  .stat-card {
    text-align: center;

    .stat-val {
      font-size: 28px;
      font-weight: 700;
    }

    .stat-lbl {
      font-size: 13px;
      color: #909399;
      margin-top: 4px;
    }
  }
}

.section-card {
  margin-bottom: 16px;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 500;
  }
}

.pagination-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;

  .total-text {
    font-size: 14px;
    color: #909399;
  }
}
</style>
