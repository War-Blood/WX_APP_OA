<script setup lang="ts">
import { ref } from 'vue'
import { createStatsView, updateStatsView, type StatsView, type StatsViewFilter } from '@/api/statsView'
import { toast } from '@/utils/toast'

const props = withDefaults(defineProps<{
  modelValue: boolean
  statKey: string
  filter: StatsViewFilter
  view?: StatsView | null
}>(), { view: null })
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const name = ref('')
const isLocked = ref(true)
const visibleRoles = ref<string[]>([])
const scopeRules = ref<{ roleCode: string; scopeType: string }[]>([])

const ROLE_OPTIONS = [
  { value: 'employee', label: '普通员工' },
  { value: 'bm', label: '部门领导' },
  { value: 'admin', label: '管理员' },
  { value: 'superadmin', label: '超级管理员' },
]
const SCOPE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'department', label: '本部门' },
  { value: 'department_and_children', label: '本部门及下属' },
  { value: 'self', label: '仅本人' },
]

function updateRoles(roles: string[]) {
  visibleRoles.value = roles
  // 保留已有 scopeType，新角色默认 all
  scopeRules.value = roles.map(rc => {
    const exist = scopeRules.value.find(s => s.roleCode === rc)
    return { roleCode: rc, scopeType: exist ? exist.scopeType : 'all' }
  })
}
function changeScope(rc: string, v: string) {
  const item = scopeRules.value.find(s => s.roleCode === rc)
  if (item) item.scopeType = v
}

function open() {
  // 编辑模式：预填已有视图；创建模式：重置
  if (props.view) {
    name.value = props.view.name || ''
    isLocked.value = !!props.view.isLocked
    visibleRoles.value = props.view.visibleRoles || []
    scopeRules.value = (props.view.scopeRules || []).map(s => ({ roleCode: s.roleCode, scopeType: s.scopeType }))
  } else {
    name.value = ''
    isLocked.value = true
    visibleRoles.value = []
    scopeRules.value = []
  }
}

async function save() {
  if (!name.value.trim()) { toast.warning('请输入视图名称'); return }
  const scopeRulesPayload = scopeRules.value.filter(s => s.roleCode !== 'admin' && s.roleCode !== 'superadmin')
  try {
    if (props.view) {
      await updateStatsView(props.view.id, {
        name: name.value.trim(),
        filter: props.filter,
        isLocked: isLocked.value,
        visibleRoles: visibleRoles.value,
        scopeRules: scopeRulesPayload,
      })
    } else {
      await createStatsView({
        name: name.value.trim(),
        statKey: props.statKey,
        filter: props.filter,
        isLocked: isLocked.value,
        visibleRoles: visibleRoles.value,
        scopeRules: scopeRulesPayload,
      })
    }
    toast.success('视图已保存')
    emit('saved')
    emit('update:modelValue', false)
  } catch {
    toast.error('保存失败')
  }
}
</script>

<template>
  <el-dialog :model-value="modelValue" :title="view ? '编辑视图' : '保存为视图'" width="520px" @open="open" @update:model-value="emit('update:modelValue', $event)">
    <el-form label-width="110px">
      <el-form-item label="视图名称">
        <el-input v-model="name" placeholder="如：全员当日-工程部" />
      </el-form-item>
      <el-form-item label="可见角色">
        <el-checkbox-group :model-value="visibleRoles" @update:model-value="updateRoles">
          <el-checkbox v-for="o in ROLE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</el-checkbox>
        </el-checkbox-group>
      </el-form-item>
      <el-form-item
        v-for="s in scopeRules.filter(s => s.roleCode !== 'admin' && s.roleCode !== 'superadmin')"
        :key="s.roleCode"
        :label="(ROLE_OPTIONS.find(o => o.value === s.roleCode)?.label || s.roleCode) + ' 数据范围'"
      >
        <el-select :model-value="s.scopeType" style="width: 200px" @update:model-value="(v: string) => changeScope(s.roleCode, v)">
          <el-option v-for="o in SCOPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="锁定">
        <el-switch v-model="isLocked" active-text="创建即锁定（筛选不可改）" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>
