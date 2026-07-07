<template>
  <div class="page">
    <!-- 日历排班 -->
    <el-card>
      <template #header><span class="title">出勤日历</span></template>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <el-date-picker v-model="month" type="month" value-format="YYYY-MM" @change="loadPreview" />
        <span v-if="days.length" style="font-size:13px;color:#666">
          工作日 <b style="color:#409EFF">{{ workSet.size }}</b> ·
          休息日 <b style="color:#999">{{ days.length - workSet.size }}</b>
          <span v-if="dirty" style="color:#E6A23C;margin-left:4px">● 已修改</span>
        </span>
        <el-button type="primary" :disabled="!dirty" :loading="saving" @click="handleSave">保存排班</el-button>
      </div>

      <div v-if="days.length" class="cal">
        <div class="cal-row cal-head">
          <span v-for="h in ['一','二','三','四','五','六','日']" :key="h" class="cal-hd">{{ h }}</span>
        </div>
        <div v-for="(w, wi) in weeks" :key="wi" class="cal-row">
          <span v-for="(d, di) in w" :key="di"
            :class="['cal-cell', d ? (workSet.has(d) ? 'work' : 'rest') : 'cal-empty', d && isSunday(d) ? 'sun' : '']"
            @click="d && toggle(d)">{{ d ? d.slice(-2) : '' }}</span>
        </div>
        <div class="cal-legend">🟢 工作日 · ⬜ 休息日 · <span style="color:#C00000">红</span> 周日 · <span style="color:#999">点击日期切换</span></div>
      </div>
      <div v-else style="text-align:center;padding:40px;color:#999">选择月份加载排班</div>
    </el-card>

    <!-- 规则模板 -->
    <el-card style="margin-top:16px">
      <template #header><span class="title">规则模板</span></template>
      <div style="font-size:13px;color:#666;margin-bottom:12px">
        设置大小周规则后点击「应用到当月」自动生成排班。单周指第 1/3/5 周，双周指第 2/4/6 周。
        <span v-if="currentRuleId" style="color:#409EFF">当前规则 ID: {{ currentRuleId }}</span>
      </div>
      <div style="display:flex;gap:24px;align-items:flex-start">
        <div style="flex:1">
          <div style="font-weight:600;margin-bottom:8px">单周（第 1 / 3 / 5 周）</div>
          <div class="week-row">
            <span v-for="k in 7" :key="'a'+k"
              :class="['day-box', weekConfig[k] === 'work' ? 'd-work' : 'd-rest']"
              @click="weekConfig[k] = weekConfig[k] === 'work' ? 'rest' : 'work'">
              {{ ['','一','二','三','四','五','六','日'][k] }}<br>{{ weekConfig[k] === 'work' ? '班' : '休' }}
            </span>
          </div>
        </div>
        <div style="flex:1">
          <div style="font-weight:600;margin-bottom:8px">双周（第 2 / 4 / 6 周）</div>
          <div class="week-row">
            <span v-for="k in 7" :key="'b'+k"
              :class="['day-box', altWeekConfig[k] === 'work' ? 'd-work' : 'd-rest']"
              @click="altWeekConfig[k] = altWeekConfig[k] === 'work' ? 'rest' : 'work'">
              {{ ['','一','二','三','四','五','六','日'][k] }}<br>{{ altWeekConfig[k] === 'work' ? '班' : '休' }}
            </span>
          </div>
        </div>
      </div>
      <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
        <el-button type="primary" :loading="applying" @click="applyConfig">应用到当月</el-button>
        <el-button @click="loadRules">加载已保存规则</el-button>
        <el-button :loading="ruleSaving" @click="saveRule">保存为规则模板</el-button>
        <el-popconfirm title="将清空当月排班数据，确认？" @confirm="clearMonth">
          <template #reference><el-button type="danger" plain>清除当月</el-button></template>
        </el-popconfirm>
      </div>
      <div v-if="applyResult" style="margin-top:12px;padding:8px;background:#f0f9eb;border-radius:4px;font-size:13px">
        {{ applyResult }}
      </div>
    </el-card>

    <!-- 节假日 -->
    <el-card style="margin-top:16px">
      <template #header><span class="title">节假日</span></template>
      <div style="font-size:13px;color:#666;margin-bottom:8px">
        非周末的休息日自动识别为节假日，在日历中点击日期即可切换。
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <el-tag v-for="h in holidays" :key="h" closable type="danger" @close="removeHoliday(h)">{{ h }}</el-tag>
      </div>
      <div v-if="!holidays.length" style="color:#999;font-size:13px">当月无非周末休息日</div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const month = ref(new Date().toISOString().slice(0, 7))
const days = ref<string[]>([])
const dayDowMap = ref<Record<string, number>>({})  // date → dayOfWeek (避免浏览器 Date 解析差异)
const workSet = ref(new Set<string>())
const origSet = ref(new Set<string>())
const saving = ref(false)
const applying = ref(false)
const ruleSaving = ref(false)
const applyResult = ref<string | null>(null)
const currentRuleId = ref<number | null>(null)

const dirty = computed(() => {
  if (workSet.value.size !== origSet.value.size) return true
  return [...workSet.value].some(d => !origSet.value.has(d))
})

function isSunday(d: string) { return (dayDowMap.value[d] ?? -1) === 0 }

const weeks = computed(() => {
  if (!days.value.length) return []
  const firstDow = dayDowMap.value[days.value[0]] ?? 3
  const startDow = (firstDow + 6) % 7  // 周一为第一列
  const rows: (string | null)[][] = [[]]
  for (let i = 0; i < startDow; i++) rows[0].push(null)
  days.value.forEach(d => {
    if (rows[rows.length - 1].length === 7) rows.push([])
    rows[rows.length - 1].push(d)
  })
  while (rows[rows.length - 1].length < 7) rows[rows.length - 1].push(null)
  return rows
})

const holidays = computed(() =>
  days.value.filter(d => !workSet.value.has(d) && !isSunday(d) && dayDowMap.value[d] !== 6)
)

function toggle(date: string) {
  const s = new Set(workSet.value)
  if (s.has(date)) s.delete(date); else s.add(date)
  workSet.value = s
}
function removeHoliday(date: string) {
  const s = new Set(workSet.value); s.add(date); workSet.value = s
}

// ---- 日历加载 / 保存 ----

async function loadPreview() {
  try {
    const res = await request.post('/attendance/schedule/preview', { month: month.value }) as any
    const list = res.data?.days || res.days || []
    days.value = list.map((d: any) => d.date)
    // 用服务端 dayOfWeek 避免浏览器 Date 解析差异
    const dow: Record<string, number> = {}
    list.forEach((d: any) => { dow[d.date] = d.dayOfWeek })
    dayDowMap.value = dow
    workSet.value = new Set(list.filter((d: any) => d.status === 'work').map((d: any) => d.date))
    origSet.value = new Set(workSet.value)
    applyResult.value = null
  } catch { ElMessage.error('加载排班失败') }
}

async function handleSave() {
  saving.value = true
  try {
    await request.post('/attendance/schedule/save-month', { month: month.value, workDays: Array.from(workSet.value) })
    ElMessage.success('排班已保存')
    await loadPreview()  // 重新加载确保一致性
  } catch { ElMessage.error('保存失败') }
  finally { saving.value = false }
}

// ---- 规则模板 ----

const defaultWeek = { '1': 'work', '2': 'work', '3': 'work', '4': 'work', '5': 'work', '6': 'rest', '7': 'rest' }
const defaultAltWeek = { '1': 'work', '2': 'work', '3': 'work', '4': 'work', '5': 'work', '6': 'rest', '7': 'rest' }
const weekConfig = ref<Record<string, string>>({ ...defaultWeek })
const altWeekConfig = ref<Record<string, string>>({ ...defaultAltWeek })

async function loadRules() {
  try {
    const res = await request.post('/attendance/schedule/rules', {}) as any
    const list = res.data || res || []
    if (list.length) {
      // 优先取默认规则，否则取第一个
      const r = list.find((x: any) => x.isDefault) || list[0]
      currentRuleId.value = r.id
      weekConfig.value = typeof r.weekConfig === 'string' ? JSON.parse(r.weekConfig) : r.weekConfig
      altWeekConfig.value = r.altWeekConfig
        ? (typeof r.altWeekConfig === 'string' ? JSON.parse(r.altWeekConfig) : r.altWeekConfig)
        : { ...defaultAltWeek }
      ElMessage.success('已加载规则: ' + r.name)
    } else {
      currentRuleId.value = null
      weekConfig.value = { ...defaultWeek }
      altWeekConfig.value = { ...defaultAltWeek }
      ElMessage.warning('暂无已保存的规则')
    }
  } catch { ElMessage.error('加载规则失败') }
}

async function saveRule() {
  ruleSaving.value = true
  try {
    // 先确保有最新规则列表
    const res = await request.post('/attendance/schedule/rules', {}) as any
    const list = res.data || res || []
    const existing = list.find((x: any) => x.name === '默认排班' && x.isDefault)

    const payload = {
      id: existing?.id || currentRuleId.value || null,
      name: '默认排班',
      weekConfig: { ...weekConfig.value },
      altWeekConfig: { ...altWeekConfig.value },
      alternating: true,
      isDefault: true
    }
    const saveRes = await request.post('/attendance/schedule/rules/save', payload) as any
    currentRuleId.value = saveRes.data?.id || existing?.id || currentRuleId.value
    ElMessage.success('规则已保存')
  } catch { ElMessage.error('保存规则失败') }
  finally { ruleSaving.value = false }
}

async function applyConfig() {
  applying.value = true
  applyResult.value = null
  try {
    // Step 1: 先保存规则（确保规则存在且是最新配置）
    const res1 = await request.post('/attendance/schedule/rules', {}) as any
    const list = res1.data || res1 || []
    const existing = list.find((x: any) => x.name === '默认排班' && x.isDefault)

    const saveRes = await request.post('/attendance/schedule/rules/save', {
      id: existing?.id || currentRuleId.value || null,
      name: '默认排班',
      weekConfig: { ...weekConfig.value },
      altWeekConfig: { ...altWeekConfig.value },
      alternating: true,
      isDefault: true
    }) as any
    const ruleId = saveRes.data?.id || existing?.id || currentRuleId.value
    if (!ruleId) throw new Error('无法获取规则ID')
    currentRuleId.value = ruleId

    // Step 2: 应用规则到当月
    const first = month.value + '-01'
    const last = month.value + '-' + String(new Date(Number(month.value.split('-')[0]), Number(month.value.split('-')[1]), 0).getDate()).padStart(2, '0')
    const r2 = await request.post('/attendance/schedule/rules/apply', { ruleId, startDate: first, endDate: last }) as any
    const result = r2.data || r2
    applyResult.value = `已应用规则，生成 ${result.inserted || result.total || 0} 条排班记录`

    ElMessage.success('规则已应用')
    await loadPreview()
  } catch (e: any) { ElMessage.error('应用规则失败: ' + (e?.message || '')) }
  finally { applying.value = false }
}

async function clearMonth() {
  try {
    const first = month.value + '-01'
    const last = month.value + '-' + String(new Date(Number(month.value.split('-')[0]), Number(month.value.split('-')[1]), 0).getDate()).padStart(2, '0')
    await request.post('/attendance/schedule/clear', { startDate: first, endDate: last })
    ElMessage.success('当月排班已清除')
    await loadPreview()
  } catch { ElMessage.error('清除失败') }
}

onMounted(() => {
  loadPreview()
  loadRules()
})
</script>

<style lang="scss" scoped>
.page { padding: 20px; max-width: 960px; }
.title { font-size: 18px; font-weight: 600; }
.cal { background: #fff; border-radius: 8px; overflow: hidden; }
.cal-row { display: flex; }
.cal-head { background: #2B579A; color: #fff; }
.cal-hd { flex: 1; text-align: center; padding: 6px 0; font-weight: 600; font-size: 13px; }
.cal-cell { flex: 1; text-align: center; padding: 8px 0; cursor: pointer; font-size: 13px; user-select: none; border: 1px solid #eee; }
.cal-empty { background: #fafafa; cursor: default; }
.work { background: #C6EFCE; &:hover { background: #A8DAB5; } }
.rest { background: #F0F0F0; &:hover { background: #E0E0E0; } }
.sun { color: #C00000; font-weight: 700; }
.cal-legend { padding: 8px; font-size: 12px; color: #666; text-align: center; }

.week-row { display: flex; gap: 4px; }
.day-box { flex: 1; text-align: center; padding: 6px 2px; border-radius: 6px; cursor: pointer; font-size: 12px; border: 1px solid #e0e0e0; user-select: none; }
.d-work { background: #409EFF; color: #fff; }
.d-rest { background: #E0E0E0; color: #666; }
</style>
