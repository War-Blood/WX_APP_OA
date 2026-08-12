<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { toast } from '@/utils/toast'
import { getDeletedReports, restoreReport, purgeReport } from '@/api/report'

interface TrashItem {
  id: string
  report_date?: string
  userName?: string
  project?: string
  today_work_type?: string
  work_content?: string
  deleted_at?: string
}

const trashList = ref<TrashItem[]>([])
const trashLoading = ref(false)
const trashPage = ref(1)
const trashTotal = ref(0)
const emit = defineEmits<{ restored: [] }>()

async function loadTrash() {
  trashLoading.value = true
  try {
    const res = await getDeletedReports({ page: trashPage.value, pageSize: 20 }) as {
      list?: TrashItem[]
      total?: number
    }
    trashList.value = res.list || []
    trashTotal.value = res.total || 0
  } catch {
    toast.error('加载回收站失败')
  } finally {
    trashLoading.value = false
  }
}

async function handleRestore(id: string) {
  try {
    await restoreReport(id)
    toast.success('已恢复')
    emit('restored')
    loadTrash()
  } catch {
    toast.error('恢复失败')
  }
}

async function handlePurge(id: string) {
  try {
    await ElMessageBox.confirm('彻底删除后不可恢复，确定永久删除该条日志？', '危险操作', {
      type: 'warning',
      confirmButtonText: '彻底删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    })
  } catch {
    return // 用户取消
  }
  try {
    await purgeReport(id)
    toast.success('已彻底删除')
    emit('restored')
    loadTrash()
  } catch {
    toast.error('删除失败')
  }
}

function handlePageChange(page: number) {
  trashPage.value = page
  loadTrash()
}

onMounted(loadTrash)
</script>

<template>
  <div class="toolbar">
    <el-button :icon="Refresh" @click="loadTrash">刷新</el-button>
  </div>
  <el-table :data="trashList" v-loading="trashLoading" stripe border>
    <el-table-column prop="report_date" label="日期" width="110" />
    <el-table-column prop="userName" label="填写人" width="100" />
    <el-table-column prop="project" label="项目" min-width="160" show-overflow-tooltip />
    <el-table-column prop="today_work_type" label="工作类型" width="100" />
    <el-table-column prop="work_content" label="工作内容" min-width="140" show-overflow-tooltip />
    <el-table-column prop="deleted_at" label="删除时间" width="160">
      <template #default="{ row }">{{ row.deleted_at?.slice(0, 16).replace('T', ' ') }}</template>
    </el-table-column>
    <el-table-column label="操作" width="170" align="center">
      <template #default="{ row }">
        <el-button size="small" type="primary" @click="handleRestore(row.id)">恢复</el-button>
        <el-button size="small" type="danger" @click="handlePurge(row.id)">彻底删除</el-button>
      </template>
    </el-table-column>
  </el-table>
  <div class="pagination-wrap" v-if="trashTotal > 20">
    <span class="total-text">共 {{ trashTotal }} 条</span>
    <el-pagination
      v-model:current-page="trashPage"
      :page-size="20"
      :total="trashTotal"
      layout="prev, pager, next"
      background
      @current-change="handlePageChange"
    />
  </div>
</template>

<style scoped lang="scss">
.toolbar {
  margin-bottom: 16px;
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
</style>
