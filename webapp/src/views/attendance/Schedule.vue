<template>
  <div class="schedule-page">
    <el-card>
      <template #header>
        <div class="toolbar">
          <span class="title">排班日历</span>
          <div class="actions">
            <el-select v-model="filters.departmentId" placeholder="部门筛选" clearable style="width:160px" @change="loadData">
              <el-option v-for="d in deptOptions" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
            <el-button @click="openRuleDialog">排班规则</el-button>
            <el-button type="primary" @click="openBatchDialog">批量排班</el-button>
          </div>
        </div>
      </template>
      <el-calendar v-model="calendarDate">
        <template #date-cell="{ data }">
          <el-popover placement="bottom" :width="280" trigger="click" :visible="paintDate === data.day" @hide="paintDate = ''">
            <template #reference>
              <div class="cell" :style="cellStyle(data.day)" @click="paintDate = data.day">
                <div class="cell-date">{{ data.day.split('-').pop() }}</div>
                <div v-if="daySummary[data.day]" class="cell-summary">
                  <span v-if="daySummary[data.day].work" class="tag tag-work">{{ daySummary[data.day].work }}</span>
                  <span v-if="daySummary[data.day].biz_trip" class="tag tag-trip">{{ daySummary[data.day].biz_trip }}</span>
                  <span v-if="daySummary[data.day].rest" class="tag tag-rest">{{ daySummary[data.day].rest }}</span>
                  <span v-if="daySummary[data.day].leave" class="tag tag-leave">{{ daySummary[data.day].leave }}</span>
                </div>
              </div>
            </template>
            <div style="text-align:center">
              <div style="font-weight:600;margin-bottom:12px">{{ data.day }}</div>
              <div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px">
                <el-button v-for="o in statusOptions" :key="o.value" :type="o.value === paintStatus ? 'primary' : 'default'" size="small" @click="paintStatus = o.value">{{ o.label }}</el-button>
              </div>
              <el-button type="primary" size="small" @click="doPaint(data.day)">应用到全员</el-button>
              <el-button size="small" style="margin-left:8px" @click="paintDate='';openDayDetail(data.day)">查看详情</el-button>
            </div>
          </el-popover>
        </template>
      </el-calendar>
    </el-card>

    <!-- 单日详情 -->
    <el-dialog v-model="dayVisible" :title="selectedDay + ' 人员排班'" width="600px">
      <el-table :data="dayWorkers" stripe>
        <el-table-column prop="userName" label="姓名" width="100" />
        <el-table-column prop="departmentName" label="部门" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button size="small" @click="editDay(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteDay(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" title="编辑排班" width="400px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="状态"><el-select v-model="editForm.status"><el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" /></el-select></el-form-item>
        <el-form-item label="备注"><el-input v-model="editForm.note" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="editVisible=false">取消</el-button><el-button type="primary" @click="saveEdit">保存</el-button></template>
    </el-dialog>

    <!-- 批量排班 -->
    <el-dialog v-model="batchVisible" title="批量排班" width="500px">
      <el-form :model="batchForm" label-width="80px">
        <el-form-item label="人员"><el-select v-model="batchForm.userIds" multiple filterable placeholder="选择人员"><el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" /></el-select></el-form-item>
        <el-form-item label="日期范围"><el-date-picker v-model="batchForm.dateRange" type="daterange" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="状态"><el-select v-model="batchForm.status"><el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" /></el-select></el-form-item>
        <el-form-item label="仅工作日"><el-switch v-model="batchForm.weekdaysOnly" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="batchForm.note" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="batchVisible=false">取消</el-button><el-button type="primary" @click="doBatch">确定</el-button></template>
    </el-dialog>

    <!-- 排班规则管理 -->
    <el-dialog v-model="ruleVisible" title="排班规则" width="750px">
      <el-table :data="rules" stripe>
        <el-table-column prop="name" label="规则名称" min-width="160" />
        <el-table-column label="周一~周日" min-width="280">
          <template #default="{ row }">
            <span v-for="(v, k) in row.weekConfig" :key="k" style="margin-right:6px">
              <el-tag :type="statusType(v)" size="small">{{ statusLabel(v) }}</el-tag>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="默认" width="70">
          <template #default="{ row }"><el-tag v-if="row.isDefault" type="success" size="small">默认</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button size="small" @click="editRule(row)">编辑</el-button>
            <el-button size="small" type="primary" @click="openApplyDialog(row)">应用</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="openNewRule">新建规则</el-button>
        <el-button @click="ruleVisible=false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 规则编辑 -->
    <el-dialog v-model="ruleEditVisible" :title="editingRule.id ? '编辑规则' : '新建规则'" width="700px">
      <el-form :model="editingRule" label-width="80px">
        <el-form-item label="名称"><el-input v-model="editingRule.name" placeholder="例如：标准排班" /></el-form-item>
        <el-form-item label="大小周"><el-switch v-model="editingRule.alternating" /></el-form-item>
        <template v-if="!editingRule.alternating">
          <el-form-item :label="'周' + w" v-for="w in [1,2,3,4,5,6,7]" :key="w">
            <el-select v-model="editingRule.weekConfig[String(w)]">
              <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </template>
        <template v-else>
          <el-divider>单周（奇数周）</el-divider>
          <el-form-item :label="'周' + w" v-for="w in [1,2,3,4,5,6,7]" :key="'a'+w">
            <el-select v-model="editingRule.weekConfig[String(w)]">
              <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-divider>双周（偶数周）</el-divider>
          <el-form-item :label="'周' + w" v-for="w in [1,2,3,4,5,6,7]" :key="'b'+w">
            <el-select v-model="editingRule.altWeekConfig![String(w)]">
              <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </template>
        <el-form-item label="设为默认"><el-switch v-model="editingRule.isDefault" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="ruleEditVisible=false">取消</el-button><el-button type="primary" @click="saveRule">保存</el-button></template>
    </el-dialog>

    <!-- 应用规则 -->
    <el-dialog v-model="applyVisible" title="应用排班规则" width="450px">
      <el-form label-width="80px">
        <el-form-item label="规则"><el-input :model-value="applyingRule?.name" disabled /></el-form-item>
        <el-form-item label="日期范围"><el-date-picker v-model="applyDateRange" type="daterange" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" /></el-form-item>
      </el-form>
      <div v-if="applyResult" style="margin:12px 0;padding:12px;background:#f0f9eb;border-radius:6px">
        ✅ 生成 {{ applyResult.inserted }} 条，跳过 {{ applyResult.skipped }} 条（已有手动排班）
      </div>
      <template #footer><el-button @click="applyVisible=false">关闭</el-button><el-button type="primary" @click="doApply">生成排班</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getScheduleList, upsertSchedule, batchSchedule, deleteSchedule, getScheduleRules, saveScheduleRule, applyScheduleRule, type ScheduleRule } from '@/api/attendance'
import { getDepartmentList, getUserList } from '@/api/user'

const statusOptions = [
  { label: '上班', value: 'work' }, { label: '休息', value: 'rest' },
  { label: '出差', value: 'biz_trip' }, { label: '请假', value: 'leave' }
]
const statusLabels: Record<string, string> = { work: '上班', rest: '休息', biz_trip: '出差', leave: '请假' }
const statusType = (s: string) => ({ work: '', rest: 'info', biz_trip: 'warning', leave: 'danger' } as any)[s] || ''
const statusLabel = (s: string) => statusLabels[s] || s

const calendarDate = ref(new Date())
const filters = reactive({ departmentId: null as number | null })
const deptOptions = ref<any[]>([])
const userOptions = ref<any[]>([])
const daySummary = ref<Record<string, any>>({})
const dayVisible = ref(false)
const selectedDay = ref('')
const dayWorkers = ref<any[]>([])
const editVisible = ref(false)
const editForm = reactive({ userId: 0, scheduleDate: '', status: 'work', note: '' })
const batchVisible = ref(false)
const batchForm = reactive({ userIds: [] as number[], dateRange: [] as string[], status: 'work', weekdaysOnly: true, note: '' })

// 排班规则
const ruleVisible = ref(false)
const ruleEditVisible = ref(false)
const applyVisible = ref(false)
const rules = ref<ScheduleRule[]>([])
const editingRule = reactive<ScheduleRule>({ name: '', weekConfig: { '1': 'work', '2': 'work', '3': 'work', '4': 'work', '5': 'work', '6': 'rest', '7': 'rest' }, altWeekConfig: { '1': 'work', '2': 'work', '3': 'work', '4': 'work', '5': 'work', '6': 'work', '7': 'rest' }, alternating: false, isDefault: false })
const applyingRule = ref<ScheduleRule | null>(null)
const applyDateRange = ref<string[]>([])
const applyResult = ref<{ inserted: number; skipped: number } | null>(null)

// 粉刷
const paintDate = ref('')
const paintStatus = ref('work')

// 单元格背景色规则
function cellStyle(day: string) {
  const s = daySummary.value[day]
  if (!s) return {}
  const bg: Record<string, string> = {}
  if (s.leave) bg.backgroundColor = '#F5F3FF'
  else if (s.biz_trip) bg.backgroundColor = '#FFF8E1'
  else if (s.work && !s.rest) bg.backgroundColor = '#EDF2FF'
  else if (s.rest && !s.work) bg.backgroundColor = '#F5F5F5'
  return bg
}

async function doPaint(date: string) {
  if (!userOptions.value.length) { ElMessage.warning('未加载人员列表'); return }
  try {
    await batchSchedule({ userIds: userOptions.value.map((u: any) => u.id), startDate: date, endDate: date, status: paintStatus.value, weekdaysOnly: false })
    ElMessage.success(`已为 ${date} 全员设置「${statusOptions.find(o=>o.value===paintStatus.value)?.label}」`)
    paintDate.value = ''
    loadData()
  } catch { ElMessage.error('操作失败') }
}

async function loadData() {
  const month = calendarDate.value
  const y = month.getFullYear(); const m = month.getMonth()
  const first = `${y}-${String(m+1).padStart(2,'0')}-01`
  const last = new Date(y, m+1, 0).toISOString().slice(0,10)
  try {
    const res = await getScheduleList({ startDate: first, endDate: last, departmentId: filters.departmentId || undefined, pageSize: 500 })
    const map: Record<string, any> = {}
    ;(res.data?.list || []).forEach((s: any) => {
      if (!map[s.scheduleDate]) map[s.scheduleDate] = { work: 0, biz_trip: 0, rest: 0, leave: 0 }
      map[s.scheduleDate][s.status]++
    })
    daySummary.value = map
  } catch { /* */ }
}

async function openDayDetail(day: string) {
  selectedDay.value = day; dayVisible.value = true
  try {
    const res = await getScheduleList({ startDate: day, endDate: day, pageSize: 200 })
    dayWorkers.value = res.data?.list || []
  } catch { dayWorkers.value = [] }
}

function editDay(row: any) {
  editForm.userId = row.userId; editForm.scheduleDate = row.scheduleDate
  editForm.status = row.status; editForm.note = row.note || ''
  editVisible.value = true
}

async function saveEdit() {
  try {
    await upsertSchedule(editForm)
    ElMessage.success('保存成功'); editVisible.value = false; loadData()
  } catch { ElMessage.error('保存失败') }
}

function openBatchDialog() { batchVisible.value = true }
async function doBatch() {
  if (!batchForm.userIds.length || !batchForm.dateRange.length) { ElMessage.warning('请完善参数'); return }
  try {
    const res = await batchSchedule({
      userIds: batchForm.userIds,
      startDate: batchForm.dateRange[0], endDate: batchForm.dateRange[1],
      status: batchForm.status, note: batchForm.note, weekdaysOnly: batchForm.weekdaysOnly
    })
    ElMessage.success(`完成：新增${res.data.inserted}，更新${res.data.updated}`)
    batchVisible.value = false; loadData()
  } catch { ElMessage.error('操作失败') }
}

async function deleteDay(row: any) {
  try {
    await ElMessageBox.confirm(`确认删除 ${row.userName} 的排班记录？`, '删除确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
    await deleteSchedule(row.id)
    ElMessage.success('已删除')
    // 刷新当日人员列表
    dayWorkers.value = dayWorkers.value.filter((w: any) => w.id !== row.id)
    loadData()
  } catch { /* 取消或失败 */ }
}

// ===== 排班规则 =====
async function loadRules() {
  try { const res: any = await getScheduleRules(); rules.value = res.data || res || [] } catch { /* */ }
}
function openRuleDialog() { loadRules(); ruleVisible.value = true }
function openNewRule() {
  Object.assign(editingRule, { id: undefined, name: '', weekConfig: { '1': 'work', '2': 'work', '3': 'work', '4': 'work', '5': 'work', '6': 'rest', '7': 'rest' }, altWeekConfig: { '1': 'work', '2': 'work', '3': 'work', '4': 'work', '5': 'work', '6': 'work', '7': 'rest' }, alternating: false, isDefault: false })
  ruleEditVisible.value = true
}
function editRule(row: ScheduleRule) {
  const copy = JSON.parse(JSON.stringify(row))
  if (!copy.altWeekConfig) copy.altWeekConfig = { '1': 'work', '2': 'work', '3': 'work', '4': 'work', '5': 'work', '6': 'work', '7': 'rest' }
  copy.alternating = !!copy.alternating
  Object.assign(editingRule, copy)
  ruleEditVisible.value = true
}
async function saveRule() {
  try {
    await saveScheduleRule({
      id: editingRule.id,
      name: editingRule.name,
      weekConfig: { ...editingRule.weekConfig },
      altWeekConfig: editingRule.alternating ? { ...editingRule.altWeekConfig } : null,
      alternating: editingRule.alternating,
      isDefault: editingRule.isDefault
    })
    ElMessage.success('保存成功'); ruleEditVisible.value = false; loadRules()
  } catch { ElMessage.error('保存失败') }
}
function openApplyDialog(row: ScheduleRule) {
  applyingRule.value = row
  applyResult.value = null
  const now = new Date()
  applyDateRange.value = [`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, now.toISOString().slice(0,10)]
  applyVisible.value = true
}
async function doApply() {
  if (!applyingRule.value?.id || !applyDateRange.value?.length) { ElMessage.warning('请完善参数'); return }
  try {
    const res: any = await applyScheduleRule({ ruleId: applyingRule.value.id, startDate: applyDateRange.value[0], endDate: applyDateRange.value[1] })
    applyResult.value = res.data || res
    ElMessage.success(`排班已生成！新增 ${applyResult.value?.inserted}，跳过 ${applyResult.value?.skipped}`)
    loadData()
  } catch { ElMessage.error('生成失败') }
}

onMounted(async () => {
  await loadData()
  // 加载部门列表
  try { const res = await getDepartmentList(); deptOptions.value = (res as any).data || res || [] } catch { /* */ }
  // 加载人员列表
  try { const res = await getUserList({ pageSize: 500 }); userOptions.value = ((res as any).list || (res as any).data?.list || []).map((u: any) => ({ id: u.id, name: u.nickName || u.nickname || u.userName || u.username })) } catch { /* */ }
})
</script>

<style lang="scss" scoped>
.schedule-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 18px; font-weight: 600; }
.actions { display: flex; gap: 12px; }
.cell { cursor: pointer; min-height: 40px; padding: 4px; }
.cell-date { font-size: 14px; color: #666; }
.cell-summary { display: flex; gap: 2px; flex-wrap: wrap; }
.tag { font-size: 10px; padding: 1px 4px; border-radius: 4px; }
.tag-work { background: #EDF2FF; color: #2B6DE8; }
.tag-trip { background: #FFF8E1; color: #F59E0B; }
</style>
