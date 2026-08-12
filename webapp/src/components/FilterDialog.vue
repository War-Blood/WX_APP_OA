<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getDepartmentTree, type DepartmentItem } from '@/api/org'
import type { StatsViewFilter } from '@/api/statsView'

const props = withDefaults(defineProps<{
  modelValue: boolean
  statKey: string
  filter?: StatsViewFilter
}>(), { filter: () => ({}) })

const emit = defineEmits<{
  'update:modelValue': [boolean]
  apply: [StatsViewFilter]
  save: [StatsViewFilter]
}>()

const deptTree = ref<DepartmentItem[]>([])
const treeProps = { label: 'name', children: 'children' }
const workTypeOptions = ['工作（陆）', '工作（海）', '待工', '在途']
const local = ref<StatsViewFilter>({})

function open() {
  local.value = { ...(props.filter || {}) }
}
function changeDept(v: unknown) { local.value.deptId = v ? Number(v) : null }
function changeFieldOnly(v: boolean | string | number) { local.value.fieldOnly = v ? 1 : 0 }
function changeWorkType(v: string | undefined) { local.value.workType = v || '' }
function changeProvince(v: string | undefined) { local.value.province = v || '' }
function apply() {
  emit('apply', { ...local.value })
  emit('update:modelValue', false)
}
function save() {
  emit('save', { ...local.value })
}

onMounted(() => {
  getDepartmentTree().then(d => { deptTree.value = d }).catch(() => { deptTree.value = [] })
})
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="筛选"
    width="480px"
    @open="open"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-width="90px">
      <el-form-item label="部门范围">
        <el-tree-select
          :model-value="local.deptId ? String(local.deptId) : ''"
          :data="deptTree"
          :props="treeProps"
          node-key="id"
          value-key="id"
          clearable
          check-strictly
          :render-after-expand="false"
          placeholder="选择部门（含子部门）"
          style="width: 100%"
          @update:model-value="changeDept"
        />
      </el-form-item>
      <el-form-item label="仅现场">
        <el-switch :model-value="!!local.fieldOnly" @update:model-value="changeFieldOnly" />
      </el-form-item>
      <el-form-item label="工作类型">
        <el-select :model-value="local.workType || ''" clearable placeholder="全部" style="width: 100%" @update:model-value="changeWorkType">
          <el-option v-for="o in workTypeOptions" :key="o" :label="o" :value="o" />
        </el-select>
      </el-form-item>
      <el-form-item label="省份">
        <el-input :model-value="local.province" placeholder="如：广东" clearable @update:model-value="changeProvince" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="save">保存为视图…</el-button>
      <el-button type="primary" @click="apply">应用</el-button>
    </template>
  </el-dialog>
</template>
