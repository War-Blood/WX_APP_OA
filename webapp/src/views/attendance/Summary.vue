<template>
  <div class="summary-page">
    <el-card>
      <template #header>
        <div class="toolbar">
          <span class="title">考勤汇总</span>
          <div class="actions">
            <el-date-picker v-model="dateRange" type="daterange" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:260px" />
            <el-select v-model="filters.departmentId" placeholder="部门" clearable style="width:140px">
              <el-option v-for="d in deptOptions" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
            <el-button type="primary" @click="loadData">查询</el-button>
            <el-button type="success" @click="handleExport">导出 Excel</el-button>
          </div>
        </div>
      </template>
      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="userName" label="姓名" width="90" fixed />
        <el-table-column prop="workerCode" label="工号" width="80" />
        <el-table-column prop="departmentName" label="部门" width="120" />
        <el-table-column prop="workDays" label="现场" width="70" align="center">
          <template #default="{ row }"><el-tag type="primary" size="small">{{ row.workDays }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="bizTripDays" label="在途" width="70" align="center">
          <template #default="{ row }"><el-tag type="warning" size="small">{{ row.bizTripDays }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="restDays" label="休息" width="70" align="center">
          <template #default="{ row }"><el-tag type="info" size="small">{{ row.restDays }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="leaveDays" label="请假" width="70" align="center">
          <template #default="{ row }"><el-tag type="danger" size="small">{{ row.leaveDays }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="missingDays" label="未提交" width="80" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.missingDays > 0 ? '#EF4444' : '#999', fontWeight: row.missingDays > 0 ? '700' : '400' }">
              {{ row.missingDays }}{{ row.missingDays > 0 ? ' ★' : '' }}
            </span>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="pagination.page"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, prev, pager, next"
        @current-change="loadData"
        style="margin-top:16px; justify-content: flex-end;"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getSummaryList, exportSummary } from '@/api/attendance'
import { getDepartmentList } from '@/api/user'

const loading = ref(false)
const dateRange = ref<string[]>([])
const filters = reactive({ departmentId: null as number | null })
const deptOptions = ref<any[]>([])
const tableData = ref<any[]>([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

onMounted(() => {
  const now = new Date()
  const first = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
  const last = now.toISOString().slice(0,10)
  dateRange.value = [first, last]
  loadData()
  // 加载部门列表
  getDepartmentList().then((res: any) => { deptOptions.value = res.data || res || [] }).catch(() => {})
})

async function loadData() {
  if (!dateRange.value?.length) return
  loading.value = true
  try {
    const res = await getSummaryList({
      startDate: dateRange.value[0], endDate: dateRange.value[1],
      departmentId: filters.departmentId || undefined,
      page: pagination.page, pageSize: pagination.pageSize
    })
    tableData.value = res.data?.list || []
    pagination.total = res.data?.total || 0
  } catch { ElMessage.error('加载失败') }
  finally { loading.value = false }
}

async function handleExport() {
  if (!dateRange.value?.length) return
  try {
    const res = await exportSummary({
      startDate: dateRange.value[0], endDate: dateRange.value[1],
      departmentId: filters.departmentId || undefined
    })
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a'); a.href = url
    const m = dateRange.value[0].split('-')
    a.download = `${m[0]}年${parseInt(m[1])}月技术工程中心公出加班统计表.xlsx`
    a.click(); URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch { ElMessage.error('导出失败') }
}
</script>

<style lang="scss" scoped>
.summary-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.title { font-size: 18px; font-weight: 600; }
.actions { display: flex; gap: 12px; flex-wrap: wrap; }
</style>
