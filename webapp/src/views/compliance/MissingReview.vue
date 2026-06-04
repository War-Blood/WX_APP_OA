<template>
  <div class="missing-review">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>缺失报告审核</span>
        </div>
      </template>
      
      <el-table :data="missingList" v-loading="loading" stripe>
        <el-table-column prop="user_name" label="员工" />
        <el-table-column prop="report_date" label="日报日期" />
        <el-table-column label="逾期天数">
          <template #default="{ row }">
            <el-tag type="danger">{{ calculateDaysLate(row.report_date) }} 天</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submit_time" label="提交时间" />
        <el-table-column prop="project_name" label="项目" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="handleReview(row, 'approve')">通过</el-button>
            <el-button size="small" type="danger" @click="handleReview(row, 'reject')">驳回</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
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
        <el-form-item label="员工">
          <span>{{ currentRow?.user_name }}</span>
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
import { ElMessage } from 'element-plus'

const missingList = ref<any[]>([])
const loading = ref(false)
const submitting = ref(false)
const showReviewDialog = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const currentRow = ref<any>(null)
const reviewAction = ref<'approve' | 'reject'>('approve')

const reviewForm = ref({
  comment: ''
})

onMounted(() => {
  loadMissingList()
})

async function loadMissingList() {
  loading.value = true
  try {
    const res = await complianceApi.getMissingReports({
      page: currentPage.value,
      pageSize: pageSize.value
    })
    missingList.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (err: any) {
    ElMessage.error(err.message || '加载缺失报告列表失败')
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
    
    ElMessage.success(reviewAction.value === 'approve' ? '审核通过' : '审核驳回')
    showReviewDialog.value = false
    loadMissingList()
  } catch (err: any) {
    ElMessage.error(err.message || '审核失败')
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
