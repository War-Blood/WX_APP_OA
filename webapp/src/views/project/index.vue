<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getReviewList, getReportDetail, type ReportDetail } from '@/api/report'

const allData = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')
const detailVisible = ref(false)
const detail = ref<ReportDetail | null>(null)
const detailLoading = ref(false)

// Group reports by project
const projectList = computed(() => {
  const map = new Map<string, any>()
  for (const item of allData.value) {
    const key = item.project || '未命名项目'
    if (!map.has(key)) {
      map.set(key, { name: key, users: new Set(), count: 0, lastDate: '' })
    }
    const p = map.get(key)!
    p.users.add(item.user)
    p.count++
    if (!p.lastDate || item.time > p.lastDate) p.lastDate = item.time
  }
  const list = Array.from(map.values()).map(p => ({
    ...p,
    userCount: p.users.size,
    users: undefined
  }))
  // Filter
  if (keyword.value) {
    return list.filter(p => p.name.includes(keyword.value))
  }
  return list
})

// Stats
const pendingCount = computed(() => allData.value.filter((i: any) => i.status === 'pending').length)
const totalCount = computed(() => allData.value.length)

async function loadData() {
  loading.value = true
  try {
    const res = await getReviewList({ page: 1, pageSize: 1000, status: 'pending' })
    const res2 = await getReviewList({ page: 1, pageSize: 1000, status: 'approved' })
    allData.value = [...(res.list || []), ...(res2.list || [])]
  } catch {
    allData.value = []
    ElMessage.error('加载项目数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })
</script>

<template>
  <div class="project-page">
    <!-- Stats -->
    <div class="stats-bar">
      <div class="stat-card">
        <span class="stat-value" style="color:#2B6DE8">{{ projectList.length }}</span>
        <span class="stat-label">活跃项目</span>
      </div>
      <div class="stat-card">
        <span class="stat-value" style="color:#F59E0B">{{ pendingCount }}</span>
        <span class="stat-label">待审核日报</span>
      </div>
      <div class="stat-card">
        <span class="stat-value" style="color:#22C55E">{{ totalCount }}</span>
        <span class="stat-label">总日报数</span>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索项目名称" clearable :prefix-icon="Search" style="width:280px" />
      <el-button :icon="Refresh" @click="loadData">刷新</el-button>
    </div>

    <!-- Project Table -->
    <el-table :data="projectList" v-loading="loading" stripe border>
      <el-table-column prop="name" label="项目名称" min-width="240" show-overflow-tooltip />
      <el-table-column prop="count" label="日报数" width="100" align="center" sortable />
      <el-table-column prop="userCount" label="参与人数" width="100" align="center" sortable />
      <el-table-column prop="lastDate" label="最近日报" width="160">
        <template #default="{ row }">{{ row.lastDate || '--' }}</template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrap">
      <span class="total-text">共 {{ projectList.length }} 个项目</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.project-page { padding: 20px; }

.stats-bar {
  display: flex; gap: 16px; margin-bottom: 20px;
  .stat-card {
    flex: 1; background: #fff; border-radius: 8px; padding: 20px;
    display: flex; flex-direction: column; gap: 4px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    .stat-value { font-size: 32px; font-weight: 700; }
    .stat-label { font-size: 13px; color: #999; }
  }
}

.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.pagination-wrap { margin-top: 16px; .total-text { font-size: 14px; color: #999; } }
</style>
