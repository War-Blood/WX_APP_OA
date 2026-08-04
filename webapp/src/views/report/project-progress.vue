<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getProjectProgress, getReportList, type ProjectProgressItem } from '@/api/report'
import { currentMonthInBeijing, shiftMonth } from '@/utils/date'

const progLoading = ref(false)
const progList = ref<ProjectProgressItem[]>([])
const progMonth = ref(currentMonthInBeijing())

const projLogVisible = ref(false)
const projLogTitle = ref('')
const projLogList = ref<any[]>([])
const projLogLoading = ref(false)

async function openProjLogs(row: ProjectProgressItem) {
  projLogTitle.value = row.project
  projLogVisible.value = true
  projLogLoading.value = true
  try {
    const res = await getReportList({ keyword: row.project, pageSize: 200 })
    projLogList.value = res.list || []
  } catch {
    projLogList.value = []
  } finally {
    projLogLoading.value = false
  }
}

async function loadProjects() {
  progLoading.value = true
  try {
    const res = await getProjectProgress(progMonth.value)
    progList.value = res.projects
  } catch {
    progList.value = []
  } finally {
    progLoading.value = false
  }
}

function prevProgMonth() {
  progMonth.value = shiftMonth(progMonth.value, -1)
  loadProjects()
}

function nextProgMonth() {
  progMonth.value = shiftMonth(progMonth.value, 1)
  loadProjects()
}

function progressStatus(pct: number | null): '' | 'exception' | 'success' {
  if (pct === null) return ''
  if (pct < 50) return 'exception'
  if (pct >= 80) return 'success'
  return ''
}

onMounted(loadProjects)
</script>

<template>
  <div class="project-page">
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>项目进展看板（MAX 取值）</span>
          <div class="card-header-right">
            <el-button size="small" @click="prevProgMonth">‹</el-button>
            <span class="month-label">{{ progMonth }}</span>
            <el-button size="small" @click="nextProgMonth">›</el-button>
            <el-button :icon="Refresh" size="small" text @click="loadProjects">刷新</el-button>
          </div>
        </div>
      </template>
      <el-table :data="progList" v-loading="progLoading" stripe border @row-click="openProjLogs" highlight-current-row style="cursor:pointer">
        <el-table-column prop="project" label="项目名称" min-width="140" show-overflow-tooltip />
        <el-table-column label="区域" width="80">
          <template #default="{ row }">{{ row.area || '—' }}</template>
        </el-table-column>
        <el-table-column prop="completedQty" label="完成量" width="90" align="center" />
        <el-table-column prop="requiredQty" label="需求量" width="90" align="center" />
        <el-table-column label="进度" width="180">
          <template #default="{ row }">
            <el-progress
              :percentage="row.progress ?? 0"
              :status="progressStatus(row.progress)"
              :stroke-width="18"
              :text-inside="true"
            />
          </template>
        </el-table-column>
        <el-table-column prop="logCount" label="日志条数" width="90" align="center" />
        <el-table-column prop="dayCount" label="天数" width="70" align="center" />
      </el-table>

      <el-dialog v-model="projLogVisible" :title="'项目日志：' + projLogTitle" width="800px" destroy-on-close>
        <el-table :data="projLogList" v-loading="projLogLoading" stripe border max-height="500">
          <el-table-column prop="reportDate" label="日期" width="110" />
          <el-table-column label="填写人" width="100">
            <template #default="{ row }">{{ row.submitter || (row as any).userName || '-' }}</template>
          </el-table-column>
          <el-table-column prop="workers" label="作业人员" min-width="120" show-overflow-tooltip />
          <el-table-column prop="todayWorkType" label="工作类型" width="100" />
          <el-table-column prop="completedQty" label="完成量" width="80" align="center" />
          <el-table-column prop="requiredQty" label="需求量" width="80" align="center" />
          <el-table-column label="进度" width="90" align="center">
            <template #default="{ row }">{{ row.requiredQty > 0 ? Math.round(row.completedQty / row.requiredQty * 100) + '%' : '-' }}</template>
          </el-table-column>
        </el-table>
      </el-dialog>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.project-page { padding: 20px; }

.section-card {
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 500;

    .card-header-right {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .month-label {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      min-width: 80px;
      text-align: center;
    }
  }
}
</style>
