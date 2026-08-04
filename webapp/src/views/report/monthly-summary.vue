<script setup lang="ts">
import { toast } from '@/utils/toast'
import { ref, onMounted, computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getMonthlySummary, type MonthlySummaryResponse } from '@/api/report'
import { getWorkerList, type WorkerItem } from '@/api/admin'

// 人员列表
const workers = ref<WorkerItem[]>([])
const workerLoading = ref(false)
const selectedUserId = ref<number | null>(null)

// 月份
const selectedMonth = ref('')

// 数据
const loading = ref(false)
const data = ref<MonthlySummaryResponse | null>(null)

const workTypeKeys = ['工作（陆）', '工作（海）', '待工', '在途', '请假']

const barColors: Record<string, string> = {
  '工作（陆）': '#409EFF',
  '工作（海）': '#67C23A',
  '待工': '#E6A23C',
  '在途': '#909399',
  '请假': '#F56C6C'
}

const selectedUserName = computed(() => {
  if (!selectedUserId.value) return ''
  const w = workers.value.find(u => u.userId === selectedUserId.value)
  return w?.userName ?? ''
})

async function loadWorkers(keyword?: string) {
  workerLoading.value = true
  try {
    const res = await getWorkerList({ page: 1, pageSize: 200, keyword })
    workers.value = res.list
  } catch {
    workers.value = []
  } finally {
    workerLoading.value = false
  }
}

async function loadSummary() {
  if (!selectedUserId.value || !selectedMonth.value) return

  loading.value = true
  try {
    data.value = await getMonthlySummary({
      userId: selectedUserId.value,
      month: selectedMonth.value
    })
  } catch {
    data.value = null
    toast.warning('数据加载失败')
  } finally {
    loading.value = false
  }
}

function handleUserChange() {
  loadSummary()
}

function handleMonthChange() {
  loadSummary()
}

onMounted(() => {
  // 默认当前月份
  const now = new Date()
  selectedMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  loadWorkers()
  // 不自动加载，等用户选择人员
})
</script>

<template>
  <div class="monthly-summary-page">
    <!-- 选择区 -->
    <div class="selector-bar">
      <div class="selector-item">
        <span class="selector-label">选择人员</span>
        <el-select
          v-model="selectedUserId"
          placeholder="请选择人员"
          filterable
          remote
          reserve-keyword
          :remote-method="loadWorkers"
          :loading="workerLoading"
          style="width: 220px"
          @change="handleUserChange"
        >
          <el-option
            v-for="w in workers"
            :key="w.userId"
            :label="`${w.userName} (${w.workerCode})`"
            :value="w.userId"
          />
        </el-select>
      </div>
      <div class="selector-item">
        <span class="selector-label">月份</span>
        <el-date-picker
          v-model="selectedMonth"
          type="month"
          placeholder="选择月份"
          value-format="YYYY-MM"
          style="width: 180px"
          @change="handleMonthChange"
        />
      </div>
      <el-button :icon="Refresh" @click="loadSummary" :disabled="!selectedUserId">刷新</el-button>
    </div>

    <!-- 数据区域 -->
    <template v-if="data">
      <!-- 出勤概览 -->
      <el-row :gutter="16" class="attendance-row">
        <el-col :span="8">
          <div class="attendance-item">
            <div class="attendance-val">{{ data.workDays }}</div>
            <div class="attendance-lbl">应出勤天数</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="attendance-item">
            <div class="attendance-val" style="color:#409EFF">{{ data.totalSubmitted }}</div>
            <div class="attendance-lbl">已填报天数</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="attendance-item">
            <div class="attendance-val" style="color:#F56C6C">{{ data.workDays - data.totalSubmitted }}</div>
            <div class="attendance-lbl">缺报天数</div>
          </div>
        </el-col>
      </el-row>

      <!-- 占比图 -->
      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>{{ selectedUserName }} — 工作类型占比</span>
          </div>
        </template>

        <div class="bar-chart" v-loading="loading">
          <div
            v-for="key in workTypeKeys"
            :key="key"
            class="bar-row"
          >
            <div class="bar-label">{{ key }}</div>
            <div class="bar-track">
              <div
                class="bar-fill"
                :style="{
                  width: data.ratio[key] || '0%',
                  backgroundColor: barColors[key] || '#dcdfe6'
                }"
              />
            </div>
            <div class="bar-value">
              <span class="bar-percent">{{ data.ratio[key] || '0%' }}</span>
              <span class="bar-days">{{ data.breakdown[key] || 0 }}天</span>
            </div>
          </div>
        </div>
      </el-card>
    </template>

    <!-- 空状态 -->
    <el-empty v-if="!loading && !data" description="请选择人员后查看月度占比" />
  </div>
</template>

<style scoped lang="scss">
.monthly-summary-page { padding: 20px; }

.selector-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;

  .selector-item {
    display: flex;
    align-items: center;
    gap: 8px;

    .selector-label {
      font-size: 14px;
      color: #606266;
      white-space: nowrap;
    }
  }
}

.attendance-row {
  margin-bottom: 20px;

  .attendance-item {
    text-align: center;
    padding: 16px;
    background: #fff;
    border-radius: 8px;
    border: 1px solid #ebeef5;

    .attendance-val {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;
    }

    .attendance-lbl {
      font-size: 13px;
      color: #909399;
      margin-top: 4px;
    }
  }
}

.chart-card {
  .card-header {
    font-weight: 500;
  }
}

.bar-chart {
  padding: 8px 0;
}

.bar-row {
  display: flex;
  align-items: center;
  margin-bottom: 14px;

  &:last-child {
    margin-bottom: 0;
  }
}

.bar-label {
  width: 80px;
  font-size: 13px;
  color: #606266;
  flex-shrink: 0;
  text-align: right;
  padding-right: 12px;
}

.bar-track {
  flex: 1;
  height: 24px;
  background: #f5f7fa;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s ease;
  min-width: 2px;
}

.bar-value {
  width: 100px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 12px;
  flex-shrink: 0;

  .bar-percent {
    font-size: 13px;
    font-weight: 600;
    color: #303133;
  }

  .bar-days {
    font-size: 12px;
    color: #909399;
  }
}
</style>
