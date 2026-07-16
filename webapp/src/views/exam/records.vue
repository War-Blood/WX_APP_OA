<template>
  <div class="records-page">
    <el-card>
      <template #header>
        <div class="toolbar">
          <span class="title">考试记录</span>
          <div class="actions">
            <el-input v-model="keyword" placeholder="搜索考生" clearable style="width:200px" @clear="loadData" @keyup.enter="loadData" />
            <el-select v-model="filterPaper" placeholder="按试卷" clearable style="width:180px" @change="loadData">
              <el-option v-for="p in paperOptions" :key="p.id" :label="p.title" :value="p.id" />
            </el-select>
            <el-button @click="loadData">搜索</el-button>
          </div>
        </div>
      </template>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="userName" label="考生" width="100" />
        <el-table-column prop="paperTitle" label="试卷" min-width="160" />
        <el-table-column label="模式" width="70"><template #default="{ row }"><el-tag size="small" :type="row.mode==='exam'?'primary':'info'">{{ row.mode==='exam'?'考试':'练习' }}</el-tag></template></el-table-column>
        <el-table-column prop="score" label="分数" width="70" align="center" />
        <el-table-column label="合格" width="70" align="center"><template #default="{ row }">{{ row.isPass ? '✅' : row.isPass===0 ? '❌' : '-' }}</template></el-table-column>
        <el-table-column prop="warnCount" label="截屏" width="60" align="center" />
        <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="时间" width="160"><template #default="{ row }">{{ row.startTime?.slice(0,16)?.replace('T',' ') }}</template></el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total,prev,pager,next" background style="margin-top:16px;justify-content:flex-end" @current-change="loadData" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { toast } from '@/utils/toast'
import { getRecordList } from '@/api/exam'
import { getPaperList } from '@/api/exam'

const loading = ref(false); const tableData = ref<any[]>([]); const total = ref(0); const page = ref(1)
const keyword = ref(''); const filterPaper = ref<number | null>(null); const paperOptions = ref<any[]>([])

const statusType = (s: string) => ({ submitted: 'success', doing: 'primary', timeout: 'warning', cheated: 'danger' } as any)[s] || ''
const statusLabel = (s: string) => ({ submitted: '已提交', doing: '进行中', timeout: '已超时', cheated: '作弊' } as any)[s] || s

async function loadData() {
  loading.value = true
  try {
    const res: any = await getRecordList({ page: page.value, pageSize: 20, keyword: keyword.value || undefined, paperId: filterPaper.value || undefined })
    tableData.value = res.list || []; total.value = res.total || 0
  } catch { toast.error('加载失败') }
  finally { loading.value = false }
}

onMounted(async () => {
  loadData()
  try { const res: any = await getPaperList({ pageSize: 99 }); paperOptions.value = res.list || [] } catch { /* */ }
})
</script>

<style lang="scss" scoped>
.records-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 18px; font-weight: 600; }
.actions { display: flex; gap: 12px; }
</style>
