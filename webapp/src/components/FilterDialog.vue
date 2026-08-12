<script setup lang="ts">
import { ref } from 'vue'
import { getDepartmentTree, type DepartmentItem } from '@/api/org'
import { getFilterFields, type FilterCondition, type FilterField, type StatsViewFilter } from '@/api/statsView'

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

const fields = ref<FilterField[]>([])
const deptTree = ref<DepartmentItem[]>([])
const treeProps = { label: 'name', children: 'children' }
const conditions = ref<FilterCondition[]>([])

const OP_OPTIONS = [
  { value: 'eq', label: '等于' },
  { value: 'ne', label: '不等于' },
  { value: 'in', label: '属于' },
  { value: 'not_in', label: '不属于' },
  { value: 'like', label: '包含' },
  { value: 'gte', label: '≥' },
  { value: 'lte', label: '≤' },
  { value: 'between', label: '区间' },
  { value: 'is_null', label: '为空' },
]

function fieldDef(field: string) { return fields.value.find(f => f.field === field) }

function open() {
  // 从后端动态获取字段注册表（WPS 式，基于数据库列）
  getFilterFields().then(list => {
    fields.value = list
    conditions.value = (props.filter?.conditions || []).map(c => ({ ...c }))
  }).catch(() => { conditions.value = [] })
  getDepartmentTree().then(d => { deptTree.value = d }).catch(() => { deptTree.value = [] })
}

function addCondition() {
  const f = fields.value[0]
  if (!f) return
  conditions.value.push({ field: f.field, op: 'eq', value: f.input === 'switch' ? 1 : '' })
}
function removeCondition(i: number) { conditions.value.splice(i, 1) }
function changeField(i: number, field: string) {
  const f = fieldDef(field)
  conditions.value[i].field = field
  conditions.value[i].op = 'eq'
  conditions.value[i].value = f?.input === 'switch' ? 1 : (f?.input === 'dept_tree' ? null : '')
}

function apply() {
  emit('apply', { conditions: conditions.value.filter(c => c.field) })
  emit('update:modelValue', false)
}
function save() {
  emit('save', { conditions: conditions.value.filter(c => c.field) })
}
</script>

<template>
  <el-dialog :model-value="modelValue" title="筛选（构建条件）" width="640px" @open="open" @update:model-value="emit('update:modelValue', $event)">
    <div class="cond-rows">
      <div v-for="(c, i) in conditions" :key="i" class="cond-row">
        <el-select :model-value="c.field" style="width: 150px" @update:model-value="(v: string) => changeField(i, v)">
          <el-option v-for="f in fields" :key="f.field" :label="f.label" :value="f.field" />
        </el-select>
        <el-select :model-value="c.op" style="width: 100px" @update:model-value="c.op = $event">
          <el-option v-for="o in OP_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
        <!-- 值控件按字段类型动态渲染 -->
        <el-tree-select
          v-if="fieldDef(c.field)?.input === 'dept_tree'"
          :model-value="c.value ? String(c.value) : ''"
          :data="deptTree"
          :props="treeProps"
          node-key="id" value-key="id" clearable check-strictly :render-after-expand="false"
          placeholder="选择部门"
          style="width: 200px"
          @update:model-value="c.value = $event ? Number($event) : null"
        />
        <el-switch
          v-else-if="fieldDef(c.field)?.input === 'switch'"
          :model-value="!!c.value"
          @update:model-value="c.value = $event ? 1 : 0"
        />
        <el-select
          v-else-if="fieldDef(c.field)?.input === 'select' && c.op !== 'in' && c.op !== 'not_in'"
          :model-value="c.value || ''"
          clearable placeholder="选择"
          style="width: 200px"
          @update:model-value="c.value = $event || ''"
        >
          <el-option v-for="o in (fieldDef(c.field)?.options || [])" :key="o" :label="o" :value="o" />
        </el-select>
        <el-select
          v-else-if="fieldDef(c.field)?.input === 'select' && (c.op === 'in' || c.op === 'not_in')"
          :model-value="(c.value as string[]) || []"
          multiple clearable placeholder="多选"
          style="width: 200px"
          @update:model-value="c.value = $event"
        >
          <el-option v-for="o in (fieldDef(c.field)?.options || [])" :key="o" :label="o" :value="o" />
        </el-select>
        <template v-else-if="c.op === 'between'">
          <el-input v-if="fieldDef(c.field)?.type === 'date'" :model-value="((c.value as string[]) || [])[0] || ''" type="date" placeholder="起始" style="width: 130px" @update:model-value="c.value = [$event, ((c.value as string[]) || [])[1] || '']" />
          <el-input :model-value="((c.value as string[]) || [])[1] || ''" type="date" placeholder="结束" style="width: 130px" @update:model-value="c.value = [((c.value as string[]) || [])[0] || '', $event]" />
        </template>
        <el-date-picker
          v-else-if="fieldDef(c.field)?.type === 'date'"
          :model-value="c.value || ''"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          style="width: 200px"
          @update:model-value="c.value = $event || ''"
        />
        <el-input-number
          v-else-if="fieldDef(c.field)?.type === 'int'"
          :model-value="Number(c.value) || 0"
          style="width: 200px"
          @update:model-value="c.value = $event"
        />
        <el-input
          v-else
          :model-value="String(c.value ?? '')"
          clearable placeholder="输入值"
          style="width: 200px"
          @update:model-value="c.value = $event"
        />
        <el-button type="danger" text @click="removeCondition(i)">×</el-button>
      </div>
      <el-button v-if="fields.length" size="small" @click="addCondition">+ 添加条件</el-button>
    </div>
    <template #footer>
      <el-button @click="save">保存为视图…</el-button>
      <el-button type="primary" @click="apply">应用</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.cond-rows { display: flex; flex-direction: column; gap: 8px; }
.cond-row { display: flex; align-items: center; gap: 8px; }
</style>
