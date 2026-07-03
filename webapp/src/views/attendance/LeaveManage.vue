<template>
  <div class="leave-manage-page">
    <el-card>
      <template #header>
        <div class="toolbar">
          <span class="title">请假出差管理</span>
        </div>
      </template>

      <!-- 筛选栏 -->
      <div class="filters">
        <el-select v-model="filters.requestType" placeholder="类型" clearable style="width:140px" @change="loadData">
          <el-option label="全部" value="" />
          <el-option label="请假" value="leave" />
          <el-option label="出差" value="biz_trip" />
        </el-select>
        <el-select v-model="filters.status" placeholder="状态" clearable style="width:140px;margin-left:12px" @change="loadData">
          <el-option label="全部" value="" />
          <el-option label="生效中" value="active" />
          <el-option label="进行中" value="in_progress" />
          <el-option label="已结束" value="ended" />
          <el-option label="已撤销" value="cancelled" />
        </el-select>
        <el-select v-model="filters.departmentId" placeholder="部门" clearable style="width:160px;margin-left:12px" @change="loadData">
          <el-option v-for="d in deptOptions" :key="d.id" :label="d.name" :value="d.id" />
        </el-select>
      </div>

      <!-- 表格 -->
      <el-table :data="tableData" v-loading="loading" stripe style="margin-top:16px">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.requestType === 'biz_trip' ? 'warning' : 'primary'" size="small">
              {{ row.requestType === 'biz_trip' ? '出差' : '请假' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applicantName" label="申请人" width="100" />
        <el-table-column prop="departmentName" label="部门" width="100" />
        <el-table-column label="详情" min-width="200">
          <template #default="{ row }">
            <template v-if="row.requestType === 'leave'">
              {{ leaveTypeMap[row.leaveSubtype] || row.leaveSubtype }} · {{ row.startDate }} → {{ row.endDate }}（{{ row.days }}天）
            </template>
            <template v-else>
              开始：{{ fmt(row.tripStartedAt) }}
              <template v-if="row.tripEndedAt"> · 结束：{{ fmt(row.tripEndedAt) }}</template>
              <template v-else> · <span style="color:#F59E0B">进行中</span></template>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusMap[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="提交时间" width="160">
          <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'cancelled' || row.status === 'ended'" size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @change="loadData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getLeaveList, deleteLeave } from '@/api/attendance'
import { getDepartmentList } from '@/api/user'

const statusMap: Record<string, string> = {
  active: '生效中', cancelled: '已撤销', in_progress: '进行中', ended: '已结束'
}
const leaveTypeMap: Record<string, string> = {
  annual: '年假', sick: '病假', personal: '事假', marriage: '婚假', funeral: '丧假', other: '其他'
}
const statusType = (s: string) => {
  const m: Record<string, string> = { active: 'success', in_progress: 'warning', ended: 'info', cancelled: 'danger' }
  return (m[s] || 'info') as any
}

const loading = ref(false)
const deptOptions = ref<any[]>([])
const tableData = ref<any[]>([])
const filters = reactive({ requestType: '', status: '', departmentId: null as number | null })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

function fmt(t: string | null) {
  if (!t) return ''
  return t.slice(0, 16).replace('T', ' ')
}

async function loadData() {
  loading.value = true
  try {
    const params: any = { page: pagination.page, pageSize: pagination.pageSize }
    if (filters.requestType) params.requestType = filters.requestType
    if (filters.status) params.status = filters.status
    if (filters.departmentId) params.departmentId = filters.departmentId
    const res: any = await getLeaveList(params)
    tableData.value = res.list || []
    pagination.total = res.total || 0
  } catch { ElMessage.error('加载失败') }
  finally { loading.value = false }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确认永久删除此记录？`, '删除确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
    await deleteLeave(row.id)
    ElMessage.success('已删除')
    loadData()
  } catch { /* 取消或失败 */ }
}

onMounted(() => {
  loadData()
  getDepartmentList().then((res: any) => { deptOptions.value = res.data || res || [] }).catch(() => {})
})
</script>

<style lang="scss" scoped>
.leave-manage-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 18px; font-weight: 600; }
.filters { display: flex; align-items: center; }
</style>
