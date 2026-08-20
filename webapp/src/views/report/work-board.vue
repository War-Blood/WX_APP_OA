<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getReportList } from '@/api/report'
import { useTableColumnResize } from '@/composables/useTableColumnResize'
import SectionCard from '@/components/SectionCard.vue'

interface BoardRow {
  reportDate: string
  submitter: string
  project: string
  workContent: string
  todayWork: string
}

// 列宽持久化（工作内容看板）
const { bindRef, onHeaderDragEnd } = useTableColumnResize('work-board')

const loading = ref(false)
const rows = ref<BoardRow[]>([])
const total = ref(0)
const keyword = ref('')
const startDate = ref('')
const endDate = ref('')
// 排序：默认最新在前
const desc = ref(true)

async function load() {
  loading.value = true
  try {
    const params: Record<string, unknown> = { page: 1, pageSize: 5000 }
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    const res = await getReportList(params as Parameters<typeof getReportList>[0])
    const list = (res.list || []) as unknown as Record<string, unknown>[]
    total.value = res.total || 0
    const kw = keyword.value.trim().toLowerCase()
    rows.value = list
      .filter((r) => !kw || String(r.submitter || '').toLowerCase().includes(kw))
      .sort((a, b) => {
        const cmp = String(b.reportDate).localeCompare(String(a.reportDate))
        return desc.value ? cmp : -cmp
      })
      .map((r) => ({
        reportDate: String(r.reportDate || ''),
        submitter: String(r.submitter || ''),
        project: String(r.project || ''),
        workContent: String(r.workContent || ''),
        todayWork: String(r.todayWork || '')
      }))
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  load()
}

function toggleSort() {
  desc.value = !desc.value
  load()
}

onMounted(load)
</script>

<template>
  <div class="work-board-page">
    <SectionCard title="工作内容看板" subtitle="人员每日工作详情">
      <template #actions>
        <el-input
          v-model="keyword"
          placeholder="按作业人员姓名搜索"
          clearable
          :prefix-icon="Search"
          style="width: 220px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-date-picker
          v-model="startDate"
          type="date"
          placeholder="开始日期"
          style="width: 140px"
          value-format="YYYY-MM-DD"
          @change="handleSearch"
        />
        <el-date-picker
          v-model="endDate"
          type="date"
          placeholder="结束日期"
          style="width: 140px"
          value-format="YYYY-MM-DD"
          @change="handleSearch"
        />
        <el-button :icon="Refresh" @click="handleSearch">刷新</el-button>
        <el-button @click="toggleSort">{{ desc ? '↓ 最新在前' : '↑ 最早在前' }}</el-button>
      </template>

      <div class="board-meta">
        <span>共 {{ total }} 条，当前展示 {{ rows.length }} 条</span>
      </div>

      <el-table
        :data="rows"
        v-loading="loading"
        stripe
        border
        :ref="bindRef"
        allow-drag-last-column
        @header-dragend="onHeaderDragEnd"
        class="board-table"
      >
        <el-table-column prop="reportDate" label="日报时间" width="120" />
        <el-table-column prop="submitter" label="作业人员" width="110" />
        <el-table-column prop="project" label="项目名称" min-width="180" />
        <el-table-column prop="workContent" label="工作内容" min-width="220" />
        <el-table-column prop="todayWork" label="今日工作" min-width="260" />
      </el-table>
      <el-empty v-if="!loading && !rows.length" description="暂无符合条件的日报" />
    </SectionCard>
  </div>
</template>

<style scoped lang="scss">
.work-board-page {
  .board-meta {
    font-size: 13px;
    color: $text-secondary;
    margin-bottom: 10px;
  }

  // 看板表格：文字自动换行、行高随内容自适应，不截断
  :deep(.board-table) {
    .el-table__cell .cell {
      white-space: normal !important;
      word-break: break-word;
      line-height: 1.7;
      vertical-align: top;
    }
    .el-table__body td {
      padding-top: 10px;
      padding-bottom: 10px;
    }
  }
}
</style>
