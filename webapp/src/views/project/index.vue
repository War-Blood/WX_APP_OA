<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search, Refresh, View } from '@element-plus/icons-vue'
import { getProjectList, getProjectDetail, type ProjectDetail, type ProjectItem } from '@/api/project'

const loading = ref(false)
const list = ref<ProjectItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<ProjectDetail | null>(null)

function getStatusType(status: string) {
  return status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : status === 'pending' ? 'warning' : 'info'
}

async function loadData() {
  loading.value = true
  try {
    const res = await getProjectList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined
    })
    list.value = res.list || []
    total.value = res.total || 0
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadData()
}

function handlePageChange(next: number) {
  page.value = next
  loadData()
}

function handleSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  loadData()
}

async function openDetail(row: ProjectItem) {
  detailVisible.value = true
  detailLoading.value = true
  detailData.value = null
  try {
    detailData.value = await getProjectDetail(row.id)
  } catch {
    detailData.value = null
  } finally {
    detailLoading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="project-page">
    <div class="toolbar">
      <span class="title">项目管理</span>
      <div class="toolbar-actions">
        <el-input
          v-model="keyword"
          placeholder="搜索项目名称"
          clearable
          :prefix-icon="Search"
          style="width: 260px"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <el-button :icon="Refresh" @click="loadData">刷新</el-button>
      </div>
    </div>

    <el-table
      :data="list"
      v-loading="loading"
      stripe
      border
      highlight-current-row
      @row-click="openDetail"
      style="cursor:pointer"
    >
      <el-table-column prop="name" label="项目名称" min-width="220" show-overflow-tooltip />
      <el-table-column prop="area" label="区域" width="120">
        <template #default="{ row }">{{ row.area || '—' }}</template>
      </el-table-column>
      <el-table-column prop="reportCount" label="日报数" width="100" align="center" sortable />
      <el-table-column prop="memberCount" label="参与人数" width="100" align="center" sortable />
      <el-table-column prop="lastReportDate" label="最近日报" width="160" />
      <el-table-column label="操作" width="90" fixed="right" align="center">
        <template #default="{ row }">
          <el-button size="small" link type="primary" :icon="View" @click.stop="openDetail(row)">
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <el-dialog v-model="detailVisible" title="项目详情" width="860px" destroy-on-close>
      <div v-loading="detailLoading">
        <template v-if="detailData">
          <div class="detail-header">
            <h3>{{ detailData.name }}</h3>
            <span class="detail-area">{{ detailData.area || '未指定区域' }}</span>
          </div>

          <el-row :gutter="12" class="detail-stats">
            <el-col :span="8">
              <div class="detail-stat">
                <span class="stat-value">{{ detailData.reportCount }}</span>
                <span class="stat-label">日报数</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="detail-stat">
                <span class="stat-value">{{ detailData.memberCount }}</span>
                <span class="stat-label">参与人数</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="detail-stat">
                <span class="stat-value">{{ detailData.stats.approvalRate }}</span>
                <span class="stat-label">审核通过率</span>
              </div>
            </el-col>
          </el-row>

          <div class="detail-section">
            <h4>参与人员</h4>
            <el-table :data="detailData.members" size="small" stripe border>
              <el-table-column prop="nickName" label="姓名" min-width="120" />
              <el-table-column prop="role" label="角色" width="120" />
            </el-table>
          </div>

          <div class="detail-section">
            <h4>日报记录</h4>
            <el-table :data="detailData.reports" size="small" stripe border max-height="360">
              <el-table-column prop="date" label="日期" width="110" />
              <el-table-column prop="submitter" label="提交人" width="100" />
              <el-table-column prop="workers" label="作业人员" min-width="120" show-overflow-tooltip />
              <el-table-column prop="workContent" label="工作内容" min-width="180" show-overflow-tooltip />
              <el-table-column label="状态" width="90" align="center">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </template>
        <el-empty v-else-if="!detailLoading" description="暂无项目详情" :image-size="80" />
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.project-page {
  padding: 20px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.detail-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 18px;
    color: #303133;
  }

  .detail-area {
    font-size: 13px;
    color: #909399;
  }
}

.detail-stats {
  margin-bottom: 20px;
}

.detail-stat {
  text-align: center;
  padding: 14px 8px;
  background: #F5F7FA;
  border-radius: 8px;

  .stat-value {
    display: block;
    font-size: 24px;
    font-weight: 700;
    color: #2B6DE8;
  }

  .stat-label {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
  }
}

.detail-section {
  margin-top: 20px;

  h4 {
    margin: 0 0 12px;
    font-size: 14px;
    color: #303133;
  }
}
</style>
