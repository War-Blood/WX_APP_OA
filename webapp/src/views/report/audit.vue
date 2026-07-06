import { toast } from '@/utils/toast'
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getPendingReviews, reviewSupplement, type PendingReviewItem } from '@/api/report'

// Tab 状态筛选
const auditTab = ref<'all' | 'pending' | 'reviewed'>('all')

// 表格
const loading = ref(false)
const list = ref<PendingReviewItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 审核弹窗
const reviewVisible = ref(false)
const reviewItem = ref<PendingReviewItem | null>(null)
const reviewDecision = ref<'special' | 'forget'>('special')
const reviewComment = ref('')

async function loadData() {
  loading.value = true
  try {
    const statusParam = auditTab.value === 'all' ? undefined : auditTab.value
    const res = await getPendingReviews({
      status: statusParam,
      page: page.value,
      pageSize: pageSize.value
    })
    list.value = res.list
    total.value = res.total
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function handleTabChange() {
  page.value = 1
  loadData()
}

function handlePageChange(p: number) {
  page.value = p
  loadData()
}

function openReviewDialog(row: PendingReviewItem) {
  reviewItem.value = row
  reviewDecision.value = 'special'
  reviewComment.value = ''
  reviewVisible.value = true
}

async function handleSubmitReview() {
  if (!reviewItem.value) return
  try {
    await reviewSupplement({
      reportId: reviewItem.value.reportId,
      decision: reviewDecision.value,
      comment: reviewComment.value || undefined
    })
    toast.success('审核完成')
    reviewVisible.value = false
    loadData()
  } catch {
    // 错误由拦截器处理
  }
}

function getStatusTagType(status: string): 'warning' | 'success' | 'info' {
  if (status === 'pending_review') return 'warning'
  if (status === 'reviewed') return 'success'
  return 'info'
}

function getStatusLabel(status: string): string {
  if (status === 'pending_review') return '待审核'
  if (status === 'reviewed') return '已审核'
  return status
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="audit-page">
    <!-- Tab 切换 -->
    <el-tabs v-model="auditTab" @tab-change="handleTabChange">
      <el-tab-pane label="全部" name="all" />
      <el-tab-pane label="待审核" name="pending" />
      <el-tab-pane label="已审核" name="reviewed" />
    </el-tabs>

    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button :icon="Refresh" @click="loadData">刷新</el-button>
    </div>

    <!-- 表格 -->
    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="reportDate" label="提交日期" width="110" />
      <el-table-column prop="supplementDate" label="补录日期" width="110" />
      <el-table-column prop="submitterName" label="提交人" width="100" />
      <el-table-column prop="project" label="项目" min-width="180" show-overflow-tooltip />
      <el-table-column prop="supplementReason" label="补录原因" width="140" show-overflow-tooltip />
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)" size="small">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="申请时间" width="160" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'pending_review'"
            size="small"
            type="primary"
            @click="openReviewDialog(row)"
          >
            审核
          </el-button>
          <span v-else class="reviewed-text">—</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrap">
      <span class="total-text">共 {{ total }} 条</span>
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        background
        @current-change="handlePageChange"
      />
    </div>

    <!-- 审核弹窗 -->
    <el-dialog v-model="reviewVisible" title="补公出日志审核" width="550px" destroy-on-close>
      <template v-if="reviewItem">
        <el-descriptions :column="1" border size="small" class="review-detail">
          <el-descriptions-item label="提交人">{{ reviewItem.submitterName }}</el-descriptions-item>
          <el-descriptions-item label="补录日期">{{ reviewItem.supplementDate }}</el-descriptions-item>
          <el-descriptions-item label="项目">{{ reviewItem.project }}</el-descriptions-item>
          <el-descriptions-item label="补录原因">{{ reviewItem.supplementReason }}</el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <div class="review-section">
          <p class="section-title">审核判定</p>
          <el-radio-group v-model="reviewDecision">
            <el-radio value="special">特殊情况 — 日志标记为正常</el-radio>
            <el-radio value="forget">非特殊/忘记 — 日志标记为延迟</el-radio>
          </el-radio-group>
        </div>

        <div class="review-section">
          <p class="section-title">审核意见</p>
          <el-input
            v-model="reviewComment"
            type="textarea"
            :rows="3"
            placeholder="请输入审核意见（可选）"
          />
        </div>
      </template>

      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitReview">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.audit-page { padding: 20px; }

.toolbar {
  margin-bottom: 16px;
}

.review-detail {
  margin-bottom: 8px;
}

.review-section {
  margin-bottom: 16px;

  .section-title {
    font-weight: 600;
    margin-bottom: 8px;
    color: #303133;
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

.reviewed-text {
  color: #c0c4cc;
}
</style>
