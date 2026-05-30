<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, View } from '@element-plus/icons-vue'
import { getReviewList, reviewAction, getReportDetail, type ReviewItem, type ReportDetail } from '@/api/report'

const activeTab = ref('pending')
const keyword = ref('')
const loading = ref(false)
const list = ref<ReviewItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// Stats
const stats = ref({ pending: 0, todayReviewed: 0, avgTime: '--' })

// Detail dialog
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<ReportDetail | null>(null)

const tabs = [
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' }
]

async function loadList() {
  loading.value = true
  try {
    const res = await getReviewList({
      status: activeTab.value,
      keyword: keyword.value || undefined,
      page: page.value,
      pageSize: pageSize.value
    })
    list.value = res.list
    total.value = res.total
    if (res.stats) stats.value = res.stats
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function switchTab(key: string) {
  activeTab.value = key
  page.value = 1
  loadList()
}

function handleSearch() {
  page.value = 1
  loadList()
}

function handlePageChange(p: number) {
  page.value = p
  loadList()
}

async function viewDetail(id: string) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    detail.value = await getReportDetail(id)
  } catch {
    detail.value = null
  } finally {
    detailLoading.value = false
  }
}

async function handleApprove(row: ReviewItem) {
  try {
    await ElMessageBox.confirm(`确定通过「${row.user} - ${row.project}」的日报吗？`, '审核通过', {
      confirmButtonText: '确定通过', cancelButtonText: '取消', type: 'success'
    })
    await reviewAction(row.id, 'approve')
    ElMessage.success('审核通过')
    loadList()
  } catch { /* cancel */ }
}

async function handleReject(row: ReviewItem) {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回日报', {
      confirmButtonText: '确认驳回', cancelButtonText: '取消',
      inputType: 'textarea', inputPlaceholder: '请填写驳回原因...',
      inputValidator: (v: string) => v?.trim() ? true : '驳回原因不能为空'
    })
    await reviewAction(row.id, 'reject', value)
    ElMessage.success('已驳回')
    loadList()
  } catch { /* cancel */ }
}

function getStatusType(status: string) {
  return status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning'
}

onMounted(() => { loadList() })
</script>

<template>
  <div class="report-page">
    <!-- Header Stats -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value" style="color:#F59E0B">{{ stats.pending }}</span>
        <span class="stat-label">待审核</span>
      </div>
      <div class="stat-item">
        <span class="stat-value" style="color:#22C55E">{{ stats.todayReviewed }}</span>
        <span class="stat-label">今日已审</span>
      </div>
      <div class="stat-item">
        <span class="stat-value" style="color:#6366F1">{{ stats.avgTime }}</span>
        <span class="stat-label">平均耗时</span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-bar">
      <span
        v-for="tab in tabs" :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >{{ tab.label }}</span>
    </div>

    <!-- Search -->
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索用户名/项目" clearable :prefix-icon="Search" style="width:260px" @keyup.enter="handleSearch" @clear="handleSearch" />
      <el-button type="primary" @click="handleSearch">搜索</el-button>
      <el-button :icon="Refresh" @click="loadList">刷新</el-button>
    </div>

    <!-- Table -->
    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="user" label="提交人" width="100" />
      <el-table-column prop="project" label="项目名称" min-width="180" show-overflow-tooltip />
      <el-table-column prop="time" label="提交时间" width="140" />
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" :icon="View" link type="primary" @click="viewDetail(row.id)">详情</el-button>
          <template v-if="row.status === 'pending'">
            <el-button size="small" type="success" link @click="handleApprove(row)">通过</el-button>
            <el-button size="small" type="danger" link @click="handleReject(row)">驳回</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <!-- Pagination -->
    <div class="pagination-wrap">
      <span class="total-text">共 {{ total }} 条</span>
      <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" background @current-change="handlePageChange" />
    </div>

    <!-- Detail Dialog -->
    <el-dialog v-model="detailVisible" title="日报详情" width="640px" destroy-on-close>
      <div v-loading="detailLoading">
        <template v-if="detail">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="日期">{{ detail.date }}</el-descriptions-item>
            <el-descriptions-item label="提交人">{{ detail.submitter || detail.workers }}</el-descriptions-item>
            <el-descriptions-item label="项目">{{ detail.project }}</el-descriptions-item>
            <el-descriptions-item label="区域">{{ detail.area || '--' }}</el-descriptions-item>
            <el-descriptions-item label="作业人员">{{ detail.workers }}</el-descriptions-item>
            <el-descriptions-item label="机型">{{ detail.machineModel || '--' }}</el-descriptions-item>
            <el-descriptions-item label="工作类型">{{ detail.todayWorkType }}</el-descriptions-item>
            <el-descriptions-item label="人数">{{ detail.workerCount || '1' }} 人</el-descriptions-item>
            <el-descriptions-item label="工作内容" :span="2">{{ detail.workContent || '--' }}</el-descriptions-item>
            <el-descriptions-item label="当日小结" :span="2">{{ detail.todayWork || detail.summary || '--' }}</el-descriptions-item>
            <el-descriptions-item label="明日计划" :span="2">{{ detail.tomorrowPlan || '--' }}</el-descriptions-item>
            <el-descriptions-item label="审核信息" :span="2">
              {{ detail.reviewer ? `${detail.reviewer} · ${detail.reviewTime}` : '待审核' }}
              <template v-if="detail.reviewOpinion"><br/>意见：{{ detail.reviewOpinion }}</template>
            </el-descriptions-item>
          </el-descriptions>
        </template>
        <el-empty v-else description="暂无数据" />
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.report-page { padding: 20px; }

.stats-bar {
  display: flex; gap: 16px; margin-bottom: 20px;
  .stat-item {
    flex: 1; background: #fff; border-radius: 8px; padding: 16px 20px;
    display: flex; flex-direction: column; gap: 4px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    .stat-value { font-size: 28px; font-weight: 700; }
    .stat-label { font-size: 13px; color: #999; }
  }
}

.tabs-bar {
  display: flex; gap: 4px; margin-bottom: 16px;
  background: #fff; border-radius: 8px; padding: 4px;
  .tab-item {
    flex: 1; text-align: center; padding: 8px 0; font-size: 14px;
    color: #666; cursor: pointer; border-radius: 6px; transition: all .2s;
    &.active { background: #2B6DE8; color: #fff; font-weight: 500; }
    &:hover:not(.active) { background: #f5f5f5; }
  }
}

.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }

.pagination-wrap { display: flex; align-items: center; justify-content: space-between; margin-top: 16px;
  .total-text { font-size: 14px; color: #999; }
}
</style>
