<template>
  <div class="biz-trip-manage">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>出差管理</span>
          <el-button type="primary" @click="showSetDialog = true">设置出差</el-button>
        </div>
      </template>
      
      <el-table :data="tripList" v-loading="loading" stripe>
        <el-table-column prop="user_name" label="员工" />
        <el-table-column prop="project_name" label="项目" />
        <el-table-column prop="start_date" label="开始日期" />
        <el-table-column label="出差天数">
          <template #default="{ row }">
            {{ calculateDays(row.start_date, row.end_date) }} 天
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '进行中' : '已结束' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button 
              v-if="row.status === 'active'" 
              size="small" 
              type="warning"
              @click="handleEndTrip(row)"
            >
              结束出差
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        @current-change="loadTripList"
        style="margin-top: 20px; justify-content: flex-end;"
      />
    </el-card>
    
    <!-- 设置出差对话框 -->
    <el-dialog v-model="showSetDialog" title="设置出差" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="员工" required>
          <el-select v-model="form.userId" placeholder="请选择员工" style="width: 100%">
            <el-option v-for="user in users" :key="user.id" :label="user.user_name" :value="user.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目名称">
          <el-input v-model="form.projectName" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="开始日期" required>
          <el-date-picker 
            v-model="form.startDate" 
            type="date" 
            placeholder="选择开始日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSetDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { complianceApi } from '@/api/compliance'
import { ElMessage, ElMessageBox } from 'element-plus'

const tripList = ref<any[]>([])
const users = ref<any[]>([])
const loading = ref(false)
const submitting = ref(false)
const showSetDialog = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const form = ref({
  userId: null as number | null,
  projectName: '',
  startDate: ''
})

onMounted(() => {
  loadTripList()
  loadUsers()
})

async function loadTripList() {
  loading.value = true
  try {
    const res = await complianceApi.getBizTripList({
      status: 'active',
      page: currentPage.value,
      pageSize: pageSize.value
    })
    tripList.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (err: any) {
    ElMessage.error(err.message || '加载出差列表失败')
  } finally {
    loading.value = false
  }
}

async function loadUsers() {
  try {
    // TODO: 调用用户列表API,这里简化处理
    // const res = await userApi.getList()
    // users.value = res.data.list
  } catch (err) {
    console.error('加载用户列表失败:', err)
  }
}

function calculateDays(startDate: string, endDate: string) {
  if (!startDate) return 0
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return diff + 1
}

async function handleEndTrip(row: any) {
  try {
    await ElMessageBox.confirm(`确认结束 ${row.user_name} 的出差吗?`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const endDate = new Date().toISOString().split('T')[0]
    await complianceApi.endBizTrip(row.id, endDate)
    
    ElMessage.success('出差已结束')
    loadTripList()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '结束出差失败')
    }
  }
}

async function handleSubmit() {
  if (!form.value.userId || !form.value.startDate) {
    ElMessage.warning('请填写必填项')
    return
  }
  
  submitting.value = true
  try {
    await complianceApi.setBizTripStatus({
      userId: form.value.userId,
      projectName: form.value.projectName,
      startDate: form.value.startDate
    })
    
    ElMessage.success('出差状态设置成功')
    showSetDialog.value = false
    loadTripList()
    
    // 重置表单
    form.value = { userId: null, projectName: '', startDate: '' }
  } catch (err: any) {
    ElMessage.error(err.message || '设置出差状态失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.biz-trip-manage {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 16px;
}
</style>
