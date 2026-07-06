import { toast } from '@/utils/toast'
<template>
  <div class="missing-review">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>缺失报告审核</span>
        </div>
      </template>
      
      <!-- 日期筛选 -->
      <el-form inline style="margin-bottom: 16px;">
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="loadMissingList"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadMissingList">查询</el-button>
        </el-form-item>
      </el-form>
      
      <el-table :data="missingList" v-loading="loading" stripe>
        <el-table-column prop="project" label="项目" min-width="150" />
        <el-table-column prop="workers" label="作业人员" min-width="200" />
        <el-table-column prop="report_date" label="日报日期" width="120" />
        <el-table-column label="缺失天数" width="100">
          <template #default="{ row }">
            <el-tag type="danger">{{ calculateDaysLate(row.report_date) }} 天</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="handleReview(row, 'approve')">通过</el-button>
            <el-button size="small" type="danger" @click="handleReview(row, 'reject')">驳回</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        @current-change="loadMissingList"
        style="margin-top: 20px; justify-content: flex-end;"
      />
    </el-card>
    
    <!-- 审核对话框 -->
    <el-dialog v-model="showReviewDialog" title="审核缺失报告" width="500px">
      <el-form :model="reviewForm" label-width="100px">
        <el-form-item label="项目">
          <span>{{ currentRow?.project }}</span>
        </el-form-item>
        <el-form-item label="作业人员">
          <span>{{ currentRow?.workers }}</span>
        </el-form-item>
        <el-form-item label="日报日期">
          <span>{{ currentRow?.report_date }}</span>
        </el-form-item>
        <el-form-item label="审核意见">
          <el-input 
            v-model="reviewForm.comment" 
            type="textarea" 
            :rows="4"
            placeholder="请输入审核意见(可选)"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showReviewDialog = false">取消</el-button>
        <el-button type="primary" @click="submitReview" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { complianceApi } from '@/api/compliance'

const missingList = ref<any[]>([])
const loading = ref(false)
const submitting = ref(false)
const showReviewDialog = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const currentRow = ref<any>(null)
const reviewAction = ref<'approve' | 'reject'>('approve')
const dateRange = ref<[string, string] | null>(null)

const reviewForm = ref({
  comment: ''
})

onMounted(() => {
  loadMissingList()
})

async function loadMissingList() {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      pageSize: pageSize.value
    }
    if (dateRange.value) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await complianceApi.getMissingReports(params)
    missingList.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (err: any) {
    toast.error(err.message || '加载缺失报告列表失败')
  } finally {
    loading.value = false
  }
}

function calculateDaysLate(reportDate: string) {
  if (!reportDate) return 0
  const report = new Date(reportDate)
  const now = new Date()
  const diff = Math.floor((now.getTime() - report.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

async function handleReview(row: any, action: 'approve' | 'reject') {
  currentRow.value = row
  reviewAction.value = action
  reviewForm.value.comment = ''
  showReviewDialog.value = true
}

async function submitReview() {
  if (!currentRow.value) return
  
  submitting.value = true
  try {
    await complianceApi.reviewMissingReport(currentRow.value.id, {
      action: reviewAction.value,
      comment: reviewForm.value.comment
    })
    
    toast.success(reviewAction.value === 'approve' ? '审核通过' : '审核驳回')
    showReviewDialog.value = false
    loadMissingList()
  } catch (err: any) {
    toast.error(err.message || '审核失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.missing-review {
  padding: 20px;
}

.card-header {
  font-weight: bold;
  font-size: 16px;
}
</style>
