<script setup lang="ts">
import { ref, computed } from 'vue'
import { getDepartmentTree, type DepartmentItem } from '@/api/org'
import { getFilterFields, getStatsView, type FilterCondition, type FilterField, type StatsViewFilter } from '@/api/statsView'

const props = defineProps<{
  modelValue: boolean
  statKey: string
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  apply: [StatsViewFilter]
}>()

const fields = ref<FilterField[]>([])
const deptTree = ref<DepartmentItem[]>([])
const treeProps = { label: 'name', children: 'children' }

// 唯一角色顺序：同时驱动「视图可见性」行与「条件」导航 Tab（修复原有顺序不一致 + 补齐 superadmin）
const ROLE_ORDER = ['employee', 'bm', 'leader', 'admin', 'superadmin'] as const
type RoleKey = (typeof ROLE_ORDER)[number]
const ROLE_LABELS: Record<RoleKey, string> = {
  employee: '普通员工',
  bm: '部门领导',
  leader: '组长',
  admin: '管理员',
  superadmin: '超级管理员',
}
const ROLE_TABS = ROLE_ORDER.map(r => ({ value: r, label: ROLE_LABELS[r] }))
const VISIBILITY_ROLES = ROLE_ORDER.map(r => ({ value: r, label: ROLE_LABELS[r] }))

// 上层：视图可见性默认值（角色 → 数据范围）
const DEFAULT_VISIBILITY: Record<string, string> = {
  employee: 'department',
  bm: 'department_and_children',
  admin: 'all',
  leader: 'group',
  superadmin: 'all',
}

const emptyRoleConditions = (): Record<string, FilterCondition[]> => {
  const out: Record<string, FilterCondition[]> = {}
  for (const r of ROLE_ORDER) out[r] = []
  return out
}

const activeRole = ref('employee')
const roleConditions = ref<Record<string, FilterCondition[]>>(emptyRoleConditions())
const conditions = computed(() => roleConditions.value[activeRole.value] || [])
const visibility = ref<Record<string, string>>({ ...DEFAULT_VISIBILITY })

const SCOPE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'department', label: '本部门' },
  { value: 'department_and_children', label: '本部门及下属' },
  { value: 'self', label: '仅本人' },
  { value: 'group', label: '对应组员' },
]

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
  // 从后端动态获取字段注册表 + 该页当前视图（WPS 式，基于数据库列）
  getFilterFields().then(list => { fields.value = list }).catch(() => { fields.value = [] })
  getDepartmentTree().then(d => { deptTree.value = d }).catch(() => { deptTree.value = [] })
  getStatsView(props.statKey).then(res => {
    const filter = (res && res.filter) || {}
    // 角色条件：新格式 roleConditions；旧格式回退用共享 conditions 初始化各角色
    const rc = (filter.roleConditions && typeof filter.roleConditions === 'object') ? filter.roleConditions : {}
    const fallback = (filter.conditions || []).map(c => ({ ...c }))
    for (const r of ROLE_ORDER) {
      roleConditions.value[r] = Array.isArray(rc[r]) ? rc[r].map(c => ({ ...c })) : fallback.map(c => ({ ...c }))
    }
    if (filter.visibility && typeof filter.visibility === 'object') {
      visibility.value = { ...DEFAULT_VISIBILITY }
      for (const r of ROLE_ORDER) {
        if (filter.visibility[r]) visibility.value[r] = filter.visibility[r]
      }
    } else {
      visibility.value = { ...DEFAULT_VISIBILITY }
    }
  }).catch(() => {
    for (const r of ROLE_ORDER) roleConditions.value[r] = []
  })
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

function reset() {
  // 清空条件并恢复默认可见性
  roleConditions.value = emptyRoleConditions()
  visibility.value = { ...DEFAULT_VISIBILITY }
}

function apply() {
  const clean = (list: FilterCondition[]) => (list || []).filter(c => c.field)
  const cleaned: Record<string, FilterCondition[]> = {}
  for (const r of ROLE_ORDER) cleaned[r] = clean(roleConditions.value[r] || [])
  emit('apply', {
    conditions: cleaned[activeRole.value],
    roleConditions: cleaned,
    visibility: { ...visibility.value },
  })
}
</script>

<template>
  <el-dialog :model-value="modelValue" title="筛选（视图可见性 + 条件）" width="680px" @open="open" @update:model-value="emit('update:modelValue', $event)">
    <!-- 上层：视图可见性（各角色数据范围） -->
    <div class="vis-section">
      <div class="sec-title">视图可见性（各角色数据范围）</div>
      <div class="vis-rows">
        <div v-for="r in VISIBILITY_ROLES" :key="r.value" class="vis-row">
          <span class="vis-role">{{ r.label }}</span>
          <el-select :model-value="visibility[r.value]" class="field-w-180" @update:model-value="visibility[r.value] = $event">
            <el-option v-for="o in SCOPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 下层：按角色切换的条件 -->
    <div class="sec-title">条件（按角色切换）</div>
    <el-radio-group v-model="activeRole" size="small" class="role-nav">
      <el-radio-button v-for="r in ROLE_TABS" :key="r.value" :value="r.value">{{ r.label }}</el-radio-button>
    </el-radio-group>
    <div class="cond-rows">
      <div v-for="(c, i) in conditions" :key="i" class="cond-row">
        <el-select :model-value="c.field" class="field-w-sm" @update:model-value="(v: string) => changeField(i, v)">
          <el-option v-for="f in fields" :key="f.field" :label="f.label" :value="f.field" />
        </el-select>
        <el-select :model-value="c.op" class="field-w-xs" @update:model-value="c.op = $event">
          <el-option v-for="o in OP_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
        <!-- 值控件按字段类型动态渲染 -->
        <el-tree-select
          v-if="fieldDef(c.field)?.input === 'dept_tree'"
          :model-value="(c.value as number | undefined)"
          :data="deptTree"
          :props="treeProps"
          node-key="id" value-key="id" clearable check-strictly :render-after-expand="false"
          placeholder="选择部门"
          class="field-w"
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
          class="field-w"
          @update:model-value="c.value = $event || ''"
        >
          <el-option v-for="o in (fieldDef(c.field)?.options || [])" :key="o" :label="o" :value="o" />
        </el-select>
        <el-select
          v-else-if="fieldDef(c.field)?.input === 'select' && (c.op === 'in' || c.op === 'not_in')"
          :model-value="(c.value as string[]) || []"
          multiple clearable placeholder="多选"
          class="field-w"
          @update:model-value="c.value = $event"
        >
          <el-option v-for="o in (fieldDef(c.field)?.options || [])" :key="o" :label="o" :value="o" />
        </el-select>
        <template v-else-if="c.op === 'between'">
          <el-input v-if="fieldDef(c.field)?.type === 'date'" :model-value="((c.value as string[]) || [])[0] || ''" type="date" placeholder="起始" class="field-w-date" @update:model-value="c.value = [$event, ((c.value as string[]) || [])[1] || '']" />
          <el-input :model-value="((c.value as string[]) || [])[1] || ''" type="date" placeholder="结束" class="field-w-date" @update:model-value="c.value = [((c.value as string[]) || [])[0] || '', $event]" />
        </template>
        <el-date-picker
          v-else-if="fieldDef(c.field)?.type === 'date'"
          :model-value="c.value || ''"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          class="field-w"
          @update:model-value="c.value = $event || ''"
        />
        <el-input-number
          v-else-if="fieldDef(c.field)?.type === 'int'"
          :model-value="Number(c.value) || 0"
          class="field-w"
          @update:model-value="c.value = $event"
        />
        <el-input
          v-else
          :model-value="String(c.value ?? '')"
          clearable placeholder="输入值"
          class="field-w"
          @update:model-value="c.value = $event"
        />
        <el-button type="danger" text @click="removeCondition(i)">×</el-button>
      </div>
      <el-button v-if="fields.length" size="small" @click="addCondition">+ 添加条件</el-button>
    </div>
    <template #footer>
      <el-button @click="reset">重置</el-button>
      <el-button type="primary" @click="apply">应用并保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.sec-title { font-size: 13px; font-weight: 600; color: #303133; margin: 8px 0; }
.vis-section { margin-bottom: 12px; }
.vis-rows { display: flex; flex-direction: column; gap: 8px; }
.vis-row { display: flex; align-items: center; gap: 12px; }
.vis-role { width: 90px; font-size: 13px; color: #606266; }
.cond-rows { display: flex; flex-direction: column; gap: 8px; }
.cond-row { display: flex; align-items: center; gap: 8px; }
/* 字段宽度工具类（替代内联 style="width: ...px"，保持视觉宽度一致） */
.field-w { width: 200px; }
.field-w-180 { width: 180px; }
.field-w-sm { width: 150px; }
.field-w-xs { width: 100px; }
.field-w-date { width: 130px; }
</style>
