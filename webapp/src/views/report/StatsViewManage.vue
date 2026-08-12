<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Refresh, Plus } from '@element-plus/icons-vue'
import { listStatsViews, setViewLocked, deleteStatsView, type StatsView, type StatsViewFilter } from '@/api/statsView'
import { toast } from '@/utils/toast'
import { ElMessageBox } from 'element-plus'
import FilterDialog from '@/components/FilterDialog.vue'
import SaveViewDialog from '@/components/SaveViewDialog.vue'

const STAT_KEYS = [
  { value: '', label: '全部' },
  { value: 'daily', label: '全员当日' },
  { value: 'worktypes', label: '人员分布' },
  { value: 'area', label: '区域分布' },
  { value: 'calendar', label: '提交日历' },
  { value: 'workers', label: '人员明细' },
]
const views = ref<StatsView[]>([])
const loading = ref(false)
const statKeyFilter = ref('')
const showFilter = ref(false)
const showSave = ref(false)
const editing = ref<StatsView | null>(null)
const saveFilter = ref<StatsViewFilter>({})

async function load() {
  loading.value = true
  try {
    views.value = await listStatsViews(statKeyFilter.value || undefined)
  } catch { views.value = [] }
  finally { loading.value = false }
}
function statKeyLabel(k: string) { return STAT_KEYS.find(s => s.value === k)?.label || k }
function openCreate() {
  editing.value = null
  saveFilter.value = {}
  showFilter.value = true
}
function openEdit(v: StatsView) {
  editing.value = v
  saveFilter.value = { ...(v.filter || {}) }
  showFilter.value = true
}
function onFilterApply() { /* 管理页不直接应用 */ }
function onFilterSave(filter: StatsViewFilter) {
  saveFilter.value = filter
  showSave.value = true
}
async function onSaved() {
  showSave.value = false
  showFilter.value = false
  editing.value = null
  await load()
}
async function toggleLock(v: StatsView) {
  try {
    await setViewLocked(v.id, !v.isLocked)
    toast.success(v.isLocked ? '已解锁' : '已锁定')
    load()
  } catch { toast.error('操作失败') }
}
async function remove(v: StatsView) {
  try {
    await ElMessageBox.confirm(`确认删除视图「${v.name}」？`, '删除确认', { type: 'warning' })
    await deleteStatsView(v.id)
    toast.success('已删除')
    load()
  } catch { /* cancelled */ }
}

onMounted(load)
</script>

<template>
  <div class="view-manage-page">
    <div class="toolbar">
      <span class="title">统计视图管理</span>
      <div class="toolbar-right">
        <el-select v-model="statKeyFilter" style="width: 140px" @change="load">
          <el-option v-for="s in STAT_KEYS" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>
        <el-button :icon="Refresh" @click="load">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新建视图</el-button>
      </div>
    </div>
    <el-table :data="views" v-loading="loading" stripe border>
      <el-table-column prop="name" label="名称" min-width="160" />
      <el-table-column label="统计页" width="110">
        <template #default="{ row }">{{ statKeyLabel(row.statKey) }}</template>
      </el-table-column>
      <el-table-column label="锁定" width="70" align="center">
        <template #default="{ row }">{{ row.isLocked ? '🔒' : '—' }}</template>
      </el-table-column>
      <el-table-column label="可见角色" min-width="150">
        <template #default="{ row }">{{ (row.visibleRoles || []).join(' / ') || '仅创建者' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="210" align="center">
        <template #default="{ row }">
          <el-button size="small" @click="toggleLock(row)">{{ row.isLocked ? '解锁' : '锁定' }}</el-button>
          <el-button size="small" type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <FilterDialog v-model="showFilter" :stat-key="editing?.statKey || 'worktypes'" :filter="saveFilter" @apply="onFilterApply" @save="onFilterSave" />
    <SaveViewDialog v-model="showSave" :stat-key="editing?.statKey || 'worktypes'" :filter="saveFilter" :view="editing" @saved="onSaved" />
  </div>
</template>

<style scoped>
.view-manage-page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
  .title { font-size: 18px; font-weight: 600; }
  .toolbar-right { display: flex; align-items: center; gap: 8px; }
}
</style>
