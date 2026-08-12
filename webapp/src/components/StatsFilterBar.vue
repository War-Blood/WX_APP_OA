<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSystemConfig, updateSystemConfig } from '@/api/settings'
import { getDepartmentTree, type DepartmentItem } from '@/api/org'

interface ShowOptions {
  dept: boolean
  fieldOnly: boolean
  workType: boolean
  province: boolean
}

const props = withDefaults(defineProps<{
  /** 视图标识: daily/worktypes/area/calendar/workers */
  view: string
  /** 显示哪些筛选控件 */
  show?: Partial<ShowOptions>
}>(), {
  show: () => ({ dept: true, fieldOnly: true, workType: false, province: false })
})

const emit = defineEmits<{ change: [] }>()

const deptTree = ref<DepartmentItem[]>([])
const filter = ref<{ deptId: number | null; fieldOnly: number; workType: string; province: string }>({
  deptId: null,
  fieldOnly: 1,
  workType: '',
  province: ''
})
const treeProps = { label: 'name', children: 'children' }
const workTypeOptions = ['工作（陆）', '工作（海）', '待工', '在途']

async function load() {
  try {
    const data = await getSystemConfig()
    const cfg = data.find(d => d.key === `stats_filter_${props.view}`)
    if (cfg && cfg.value) {
      try {
        const parsed = JSON.parse(cfg.value)
        filter.value.deptId = parsed.deptId != null && parsed.deptId !== '' ? Number(parsed.deptId) : null
        filter.value.fieldOnly = (parsed.fieldOnly === 0 || parsed.fieldOnly === false || parsed.fieldOnly === '0') ? 0 : 1
        filter.value.workType = parsed.workType || ''
        filter.value.province = parsed.province || ''
      } catch { /* 保持默认 */ }
    }
  } catch { /* 忽略 */ }
}

async function save() {
  try {
    await updateSystemConfig([{
      key: `stats_filter_${props.view}`,
      value: JSON.stringify({
        deptId: filter.value.deptId ?? null,
        fieldOnly: filter.value.fieldOnly ? 1 : 0,
        workType: filter.value.workType || '',
        province: filter.value.province || ''
      }),
      group: 'stats',
      description: `公出统计-${props.view} 筛选(JSON)`
    }])
    emit('change')
  } catch { /* 忽略 */ }
}

function changeDept(v: unknown) {
  filter.value.deptId = v ? Number(v) : null
  save()
}
function changeFieldOnly(v: boolean | string | number) {
  filter.value.fieldOnly = v ? 1 : 0
  save()
}
function changeWorkType(v: string | undefined) {
  filter.value.workType = v || ''
  save()
}
function changeProvince(v: string | undefined) {
  filter.value.province = v || ''
  save()
}

onMounted(() => {
  load()
  getDepartmentTree().then(d => { deptTree.value = d }).catch(() => { deptTree.value = [] })
})
</script>

<template>
  <div class="stats-filter-bar">
    <template v-if="show.dept">
      <el-tree-select
        :model-value="filter.deptId ? String(filter.deptId) : ''"
        :data="deptTree"
        :props="treeProps"
        node-key="id"
        value-key="id"
        clearable
        check-strictly
        :render-after-expand="false"
        placeholder="部门（含子部门）"
        style="width: 190px"
        @update:model-value="changeDept"
      />
    </template>
    <template v-if="show.fieldOnly">
      <span class="ff-label">仅现场</span>
      <el-switch :model-value="!!filter.fieldOnly" @update:model-value="changeFieldOnly" />
    </template>
    <template v-if="show.workType">
      <el-select
        :model-value="filter.workType || ''"
        clearable
        placeholder="工作类型"
        style="width: 130px"
        @update:model-value="changeWorkType"
      >
        <el-option v-for="o in workTypeOptions" :key="o" :label="o" :value="o" />
      </el-select>
    </template>
    <template v-if="show.province">
      <el-input
        :model-value="filter.province"
        placeholder="省份"
        clearable
        style="width: 110px"
        @update:model-value="changeProvince"
      />
    </template>
  </div>
</template>

<style scoped lang="scss">
.stats-filter-bar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;

  .ff-label {
    font-size: 13px;
    color: #606266;
  }
}
</style>
