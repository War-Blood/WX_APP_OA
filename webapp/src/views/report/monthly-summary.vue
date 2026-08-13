<script setup lang="ts">
import { toast } from '@/utils/toast'
import { ref, onMounted, computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getMonthlySummary, type MonthlySummaryResponse } from '@/api/report'
import { getWorkerList, type WorkerItem } from '@/api/admin'
import StatCard from '@/components/StatCard.vue'
import { CHART_COLORS } from '@/utils/chart'

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
  '工作（陆）': CHART_COLORS.primary,
  '工作（海）': CHART_COLORS.success,
  '待工': CHART_COLORS.warning,
  '在途': CHART_COLORS.info,
  '请假': CHART_COLORS.danger
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
          <StatCard label="应出勤天数" :value="data.workDays" size="md" />
        </el-col>
        <el-col :span="8">
          <StatCard label="已填报天数" :value="data.totalSubmitted" size="md" tone="primary" />
        </el-col>
        <el-col :span="8">
          <StatCard label="缺报天数" :value="data.workDays - data.totalSubmitted" size="md" tone="danger" />
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
                  backgroundColor: barColors[key] || 'var(--border-color)'
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
.selector-bar {
  display: flex;
  align-items: center;
  gap: $spacing-medium;
  margin-bottom: $spacing-large;

  .selector-item {
    display: flex;
    align-items: center;
    gap: $spacing-small;

    .selector-label {
      font-size: $font-size-base;
      color: $text-regular;
      white-space: nowrap;
    }
  }
}

.attendance-row {
  margin-bottom: $spacing-large;
}

.chart-card {
  .card-header {
    font-weight: 500;
  }
}

.bar-chart {
  padding: $spacing-small 0;
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
  font-size: $font-size-small;
  color: $text-regular;
  flex-shrink: 0;
  text-align: right;
  padding-right: $spacing-base;
}

.bar-track {
  flex: 1;
  height: 24px;
  background: $bg-color;
  border-radius: $border-radius-base;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: $border-radius-base;
  background-color: $border-color;
  transition: width 0.6s ease;
  min-width: 2px;
}

.bar-value {
  width: 100px;
  display: flex;
  align-items: center;
  gap: $spacing-small;
  padding-left: $spacing-base;
  flex-shrink: 0;

  .bar-percent {
    font-size: $font-size-small;
    font-weight: 600;
    color: $text-primary;
  }

  .bar-days {
    font-size: $font-size-extra-small;
    color: $text-secondary;
  }
}
</style>
