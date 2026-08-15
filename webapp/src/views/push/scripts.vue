<template>
  <div class="push-scripts-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>推送脚本</span>
        </div>
      </template>

      <div class="filters">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索脚本名称 / 描述"
          clearable
          style="width: 220px"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="filters.status" placeholder="状态" clearable style="width: 130px" @change="handleSearch">
          <el-option label="启用" value="enabled" />
          <el-option label="停用" value="disabled" />
        </el-select>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button type="success" @click="openCreate">新建脚本</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe border style="margin-top: 16px">
        <el-table-column prop="name" label="名称" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 'enabled'"
              @change="(v: boolean | string | number) => handleToggle(row, Boolean(v))"
            />
            <el-tag v-if="row.status === 'disabled' && row.consecutiveFailures >= 3" type="danger" size="small" style="margin-left: 6px">已熔断</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="触发时间" width="160">
          <template #default="{ row }">
            <span v-if="row.scheduleType === 'daily'">每天 {{ row.scheduleValue }}</span>
            <code v-else>{{ row.scheduleValue }}</code>
            <div class="sub-text">{{ row.timezone }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="webhookName" label="目标群" min-width="120" show-overflow-tooltip />
        <el-table-column label="最近执行" min-width="170">
          <template #default="{ row }">
            <template v-if="row.lastRunAt">
              <div>{{ row.lastRunAt }}</div>
              <el-tag :type="lastStatusTag(row.lastRunStatus)" size="small">{{ lastStatusLabel(row.lastRunStatus) }}</el-tag>
              <div v-if="row.lastError" class="sub-text">{{ row.lastError }}</div>
            </template>
            <span v-else class="sub-text">从未执行</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openEdit(row.id)">编辑</el-button>
            <el-dropdown style="margin: 0 8px" @command="(cmd: string) => handleTest(row, cmd)">
              <el-button size="small" type="warning">测试<el-icon style="margin-left: 4px"><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="dryRun">dryRun 预览（不发送）</el-dropdown-item>
                  <el-dropdown-item command="send">真实发送</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        background
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="loadData"
        @size-change="handleSizeChange"
      />
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" :title="editingId ? '编辑脚本' : '新建脚本'" width="760px" destroy-on-close top="4vh">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-divider content-position="left">基本信息</el-divider>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="如：昨日日报缺失提醒" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" placeholder="选填" maxlength="255" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.status" active-value="enabled" inactive-value="disabled" />
        </el-form-item>

        <el-divider content-position="left">触发时间</el-divider>
        <el-form-item label="触发类型" prop="scheduleType">
          <el-radio-group v-model="form.scheduleType">
            <el-radio value="daily">每天固定时间</el-radio>
            <el-radio value="cron">cron 表达式</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="时间" prop="scheduleValue">
          <el-time-picker
            v-if="form.scheduleType === 'daily'"
            v-model="dailyTime"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="选择时间"
            style="width: 160px"
          />
          <el-input v-else v-model="form.scheduleValue" placeholder="如：0 8 * * 1-5" style="width: 220px" />
        </el-form-item>
        <el-form-item label="时区">
          <el-select v-model="form.timezone" style="width: 200px">
            <el-option label="Asia/Shanghai（北京）" value="Asia/Shanghai" />
            <el-option label="UTC" value="UTC" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">目标与内容</el-divider>
        <el-form-item label="目标群" prop="webhookId">
          <el-select v-model="form.webhookId" placeholder="选择群机器人" style="width: 100%">
            <el-option
              v-for="w in webhooks"
              :key="w.id"
              :label="w.name + (w.enabled ? '' : '（已停用）')"
              :value="w.id"
              :disabled="!w.enabled"
            />
          </el-select>
          <div v-if="webhooks.length === 0" class="sub-text">请先在「群机器人」页登记并配置 .env 凭证</div>
        </el-form-item>
        <el-form-item label="消息类型">
          <el-radio-group v-model="form.msgtype">
            <el-radio value="text">text（@ 用手机号）</el-radio>
            <el-radio value="markdown">markdown（@ 用企微 userid）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="消息模板" prop="templateContent">
          <el-input v-model="form.templateContent" type="textarea" :rows="5" placeholder="支持 {{变量}} 占位，如：{{date}} 昨日有 {{daily_report.missing_count}} 人未提交：{{mention_names}}" />
          <div class="var-panel">
            <span class="var-panel-title">内置变量：</span>
            <el-tag v-for="v in builtinVars" :key="v" size="small" class="var-tag" @click="insertVar(v)">{{ v }}</el-tag>
            <span v-if="dataSources.length" class="var-panel-title" style="margin-left: 8px">数据源字段：</span>
            <el-tag v-for="v in sourceVars" :key="v" size="small" class="var-tag" type="info" @click="insertVar(v)">{{ v }}</el-tag>
            <div class="sub-text">点击变量插入模板；日期变量 <code v-pre>{{date_1}}</code> 表示 1 天前</div>
          </div>
        </el-form-item>
        <el-form-item label="@ 方式">
          <el-radio-group v-model="form.mentionType">
            <el-radio value="none">不 @</el-radio>
            <el-radio value="all">@ 所有人（在职员工）</el-radio>
            <el-radio value="roles">按角色</el-radio>
            <el-radio value="users">指定人员</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.mentionType === 'roles'" label="@ 角色">
          <el-select v-model="form.mentionTargets" multiple placeholder="选择角色" style="width: 100%">
            <el-option label="普通员工" value="employee" />
            <el-option label="管理员" value="admin" />
            <el-option label="超级管理员" value="superadmin" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.mentionType === 'users'" label="@ 人员">
          <el-select v-model="form.mentionTargets" multiple filterable remote :remote-method="searchUsers" placeholder="输入姓名/工号搜索" style="width: 100%">
            <el-option v-for="u in userOptions" :key="u.userId" :label="`${u.userName || u.nickName || '用户' + u.userId}${u.workerCode ? '（' + u.workerCode + '）' : ''}`" :value="u.userId" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">发送条件（不满足则不发送）</el-divider>
        <el-form-item label="条件逻辑">
          <el-radio-group v-model="form.conditionConfig.logic">
            <el-radio value="AND">全部满足 (AND)</el-radio>
            <el-radio value="OR">任一满足 (OR)</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="规则">
          <div class="rule-list">
            <div v-for="(rule, idx) in form.conditionConfig.rules" :key="idx" class="rule-row">
              <el-select v-model="rule.source" placeholder="数据源" style="width: 150px" @change="onSourceChange(rule)">
                <el-option v-for="s in dataSources" :key="s.id" :label="s.name" :value="s.id" />
              </el-select>
              <el-select v-model="rule.field" placeholder="字段" style="width: 150px">
                <el-option v-for="f in fieldsOf(rule.source)" :key="f.id" :label="f.name" :value="f.id" />
              </el-select>
              <el-select v-model="rule.operator" placeholder="操作符" style="width: 120px">
                <el-option v-for="op in operatorsOf(rule)" :key="op.value" :label="op.label" :value="op.value" />
              </el-select>
              <el-input
                v-if="rule.operator !== 'is_true' && rule.operator !== 'is_false' && rule.operator !== 'is_empty' && rule.operator !== 'not_empty'"
                v-model="rule.value"
                :placeholder="rule.operator === 'in' || rule.operator === 'not_in' ? '多个值用逗号分隔' : '值'"
                style="width: 180px"
              />
              <el-button type="danger" link @click="removeRule(idx)">删除</el-button>
            </div>
            <el-button size="small" type="primary" plain @click="addRule">+ 添加规则</el-button>
          </div>
        </el-form-item>

        <el-divider content-position="left">重试与告警</el-divider>
        <el-form-item label="重试次数">
          <el-input-number v-model="form.retryTimes" :min="0" :max="5" />
          <span class="sub-text" style="margin-left: 8px">次（指数退避）</span>
        </el-form-item>
        <el-form-item label="重试间隔">
          <el-input-number v-model="form.retryInterval" :min="10" :max="3600" :step="10" />
          <span class="sub-text" style="margin-left: 8px">秒</span>
        </el-form-item>
        <el-form-item label="每日发送上限">
          <el-input-number v-model="form.maxDailySends" :min="1" :max="100" />
          <span class="sub-text" style="margin-left: 8px">次/天，超限当日跳过</span>
        </el-form-item>
        <el-form-item label="失败告警">
          <el-switch v-model="form.notifyOnFail" />
          <span class="sub-text" style="margin-left: 8px">失败时站内消息通知超级管理员</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 测试结果预览 -->
    <el-dialog v-model="testVisible" title="测试结果" width="640px" top="6vh">
      <div v-loading="testing">
        <template v-if="testResult">
          <template v-if="testResult.dryRun">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="条件结果">
                <el-tag :type="testResult.conditionResult === 'pass' ? 'success' : 'danger'" size="small">
                  {{ testResult.conditionResult === 'pass' ? '通过（将发送）' : '不满足（不会发送）' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="长度">{{ testResult.truncated ? '超长已截断' : '正常' }}</el-descriptions-item>
            </el-descriptions>
            <div v-if="testResult.unknownVars?.length" style="margin: 8px 0">
              <el-tag type="warning" size="small">未知变量：{{ testResult.unknownVars.join(', ') }}</el-tag>
            </div>
            <h4>渲染后内容</h4>
            <pre class="content-pre">{{ testResult.renderedContent || '（无内容）' }}</pre>
            <div v-if="testResult.mentionDetail" class="sub-text">
              @ 人员：{{ testResult.mentionDetail.names?.join('、') || '无' }}
              <template v-if="testResult.mentionDetail.skipped?.length">；{{ testResult.mentionDetail.skipped.length }} 人因无标识跳过</template>
            </div>
          </template>
          <template v-else>
            <el-result
              :icon="testResult.sendStatus === 'success' ? 'success' : 'error'"
              :title="testResult.sendStatus === 'success' ? '发送成功' : '发送失败'"
              :sub-title="testResult.errorMessage || ''"
            />
          </template>
        </template>
      </div>
      <template #footer>
        <el-button @click="testVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { toast } from '@/utils/toast'
import {
  getPushScriptList,
  getPushScriptDetail,
  createPushScript,
  updatePushScript,
  deletePushScript,
  togglePushScript,
  testPushScript,
  getPushWebhookList,
  getPushDataSources,
  type PushScriptItem,
  type PushScriptPayload,
  type ConditionRule,
  type ConditionConfig,
  type PushWebhookItem,
  type DataSourceMeta,
  type DataSourceFieldMeta,
  type TestResult,
} from '@/api/push'
import { getUserList } from '@/api/user'

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const list = ref<PushScriptItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({ keyword: '', status: '' })

const webhooks = ref<PushWebhookItem[]>([])
const dataSources = ref<DataSourceMeta[]>([])
const userOptions = ref<Array<{ userId: string; userName: string; nickName: string; workerCode?: string }>>([])

const editVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const dailyTime = ref('08:30')

const builtinVars = ['{{date}}', '{{date_1}}', '{{weekday}}', '{{time}}', '{{script_name}}', '{{mention_names}}']

const emptyForm = () => ({
  name: '',
  description: '',
  status: 'enabled' as 'enabled' | 'disabled',
  scheduleType: 'daily' as 'daily' | 'cron',
  scheduleValue: '',
  timezone: 'Asia/Shanghai',
  webhookId: undefined as number | undefined,
  msgtype: 'text' as 'text' | 'markdown',
  templateContent: '',
  mentionType: 'none' as 'none' | 'all' | 'roles' | 'users',
  mentionTargets: [] as Array<string | number>,
  conditionConfig: { logic: 'AND', rules: [] } as ConditionConfig,
  retryTimes: 2,
  retryInterval: 60,
  maxDailySends: 20,
  notifyOnFail: true,
})
const form = reactive(emptyForm())

const rules: FormRules = {
  name: [{ required: true, message: '请输入脚本名称', trigger: 'blur' }],
  scheduleValue: [{ required: true, message: '请输入触发时间', trigger: 'blur' }],
  webhookId: [{ required: true, message: '请选择目标群', trigger: 'change' }],
  templateContent: [{ required: true, message: '请输入消息模板', trigger: 'blur' }],
}

const testVisible = ref(false)
const testResult = ref<TestResult | null>(null)

const sourceVars = computed(() => {
  const vars: string[] = []
  dataSources.value.forEach((s) => s.fields.forEach((f) => vars.push(`{{${s.id}.${f.id}}}`)))
  return vars
})

async function loadData() {
  loading.value = true
  try {
    const res = await getPushScriptList({ page: page.value, pageSize: pageSize.value, keyword: filters.keyword || undefined, status: filters.status || undefined })
    list.value = res.list
    total.value = res.total
  } catch {
    // toast 已统一处理
  } finally {
    loading.value = false
  }
}

async function loadMeta() {
  try {
    const [w, d] = await Promise.all([getPushWebhookList({ page: 1, pageSize: 100 }), getPushDataSources()])
    webhooks.value = w.list
    dataSources.value = d.sources
  } catch {
    // toast 已统一处理
  }
}

function handleSearch() {
  page.value = 1
  loadData()
}

function handleSizeChange() {
  page.value = 1
  loadData()
}

function lastStatusTag(status: string) {
  return { success: 'success', failed: 'danger', condition_fail: 'warning', skipped: 'info' }[status] || 'info'
}
function lastStatusLabel(status: string) {
  return { success: '成功', failed: '失败', condition_fail: '条件不满足', skipped: '跳过' }[status] || status
}

async function openCreate() {
  editingId.value = null
  Object.assign(form, emptyForm())
  dailyTime.value = '08:30'
  editVisible.value = true
}

async function openEdit(id: number) {
  editingId.value = id
  const d = await getPushScriptDetail(id)
  Object.assign(form, {
    name: d.name,
    description: d.description,
    status: d.status,
    scheduleType: d.scheduleType,
    scheduleValue: d.scheduleValue,
    timezone: d.timezone,
    webhookId: d.webhookId,
    msgtype: d.msgtype,
    templateContent: d.templateContent,
    mentionType: d.mentionType,
    mentionTargets: d.mentionTargets || [],
    conditionConfig: d.conditionConfig || { logic: 'AND', rules: [] },
    retryTimes: d.retryTimes,
    retryInterval: d.retryInterval,
    maxDailySends: d.maxDailySends,
    notifyOnFail: d.notifyOnFail,
  })
  dailyTime.value = d.scheduleType === 'daily' ? d.scheduleValue : '08:30'
  if (d.mentionType === 'users' && Array.isArray(d.mentionTargets)) {
    const ids = d.mentionTargets.map(String)
    if (ids.length) {
      try {
        const res = await getUserList({ page: 1, pageSize: 100 })
        userOptions.value = res.list
          .filter((u) => ids.includes(u.userId))
          .map((u) => ({ userId: u.userId, userName: u.userName, nickName: u.nickName, workerCode: u.workerCode }))
      } catch {
        // 兜底：保持空选项
      }
    }
  }
  editVisible.value = true
}

async function handleSave() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (form.conditionConfig.rules.length === 0) {
    toast.error('请至少添加一条发送条件')
    return
  }
  if (form.scheduleType === 'daily' && !dailyTime.value) {
    toast.error('请选择触发时间')
    return
  }
  const payload: PushScriptPayload = {
    name: form.name,
    description: form.description,
    status: form.status,
    scheduleType: form.scheduleType,
    scheduleValue: form.scheduleType === 'daily' ? dailyTime.value : form.scheduleValue,
    timezone: form.timezone,
    webhookId: form.webhookId as number,
    msgtype: form.msgtype,
    templateContent: form.templateContent,
    mentionType: form.mentionType,
    mentionTargets: form.mentionTargets,
    conditionConfig: {
      logic: form.conditionConfig.logic,
      rules: form.conditionConfig.rules.map((r) => ({
        ...r,
        value: normalizeRuleValue(r),
      })),
    },
    retryTimes: form.retryTimes,
    retryInterval: form.retryInterval,
    maxDailySends: form.maxDailySends,
    notifyOnFail: form.notifyOnFail,
  }
  saving.value = true
  try {
    if (editingId.value) {
      await updatePushScript(editingId.value, payload)
      toast.success('已保存')
    } else {
      await createPushScript(payload)
      toast.success('已创建')
    }
    editVisible.value = false
    loadData()
  } catch {
    // toast 已统一处理
  } finally {
    saving.value = false
  }
}

function normalizeRuleValue(rule: ConditionRule): unknown {
  if (rule.operator === 'in' || rule.operator === 'not_in') {
    return String(rule.value || '')
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (rule.operator === 'is_true' || rule.operator === 'is_false' || rule.operator === 'is_empty' || rule.operator === 'not_empty') {
    return null
  }
  return rule.value
}

async function handleToggle(row: PushScriptItem, enabled: boolean) {
  try {
    if (enabled && row.status === 'disabled' && row.consecutiveFailures >= 3) {
      await ElMessageBox.confirm('该脚本因连续失败已被熔断停用，确认手动恢复并重新启用？', '熔断恢复', { type: 'warning' })
    }
    await togglePushScript(row.id, enabled)
    toast.success(enabled ? '已启用' : '已停用')
    loadData()
  } catch {
    loadData()
  }
}

async function handleDelete(row: PushScriptItem) {
  try {
    await ElMessageBox.confirm(`确认删除脚本「${row.name}」？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deletePushScript(row.id)
    toast.success('已删除')
    loadData()
  } catch {
    // toast 已统一处理
  }
}

async function handleTest(row: PushScriptItem, cmd: string) {
  testVisible.value = true
  testResult.value = null
  testing.value = true
  try {
    testResult.value = await testPushScript(row.id, cmd === 'dryRun')
  } catch {
    testVisible.value = false
  } finally {
    testing.value = false
  }
}

function insertVar(v: string) {
  form.templateContent += v
}

function fieldsOf(sourceId: string): DataSourceFieldMeta[] {
  return dataSources.value.find((s) => s.id === sourceId)?.fields || []
}

function onSourceChange(rule: ConditionRule) {
  rule.field = ''
  rule.operator = ''
}

function operatorsOf(rule: ConditionRule) {
  const field = fieldsOf(rule.source).find((f) => f.id === rule.field)
  if (!field) return []
  if (field.type === 'number') {
    return [
      { label: '等于', value: '==' },
      { label: '不等于', value: '!=' },
      { label: '大于', value: '>' },
      { label: '大于等于', value: '>=' },
      { label: '小于', value: '<' },
      { label: '小于等于', value: '<=' },
      { label: '包含于', value: 'in' },
      { label: '不包含于', value: 'not_in' },
      { label: '为空', value: 'is_empty' },
      { label: '不为空', value: 'not_empty' },
    ]
  }
  if (field.type === 'boolean') {
    return [
      { label: '为真', value: 'is_true' },
      { label: '为假', value: 'is_false' },
    ]
  }
  return [
    { label: '等于', value: '==' },
    { label: '不等于', value: '!=' },
    { label: '包含', value: 'contains' },
    { label: '包含于', value: 'in' },
    { label: '不包含于', value: 'not_in' },
    { label: '为空', value: 'is_empty' },
    { label: '不为空', value: 'not_empty' },
  ]
}

function addRule() {
  form.conditionConfig.rules.push({ source: dataSources.value[0]?.id || '', field: '', operator: '', value: '' })
}

function removeRule(idx: number) {
  form.conditionConfig.rules.splice(idx, 1)
}

async function searchUsers(keyword: string) {
  try {
    const res = await getUserList({ page: 1, pageSize: 20, keyword: keyword || undefined })
    userOptions.value = res.list.map((u) => ({ userId: u.userId, userName: u.userName, nickName: u.nickName, workerCode: u.workerCode }))
  } catch {
    // toast 已统一处理
  }
}

onMounted(() => {
  loadData()
  loadMeta()
})
</script>

<style scoped>
.filters {
  display: flex;
  gap: 12px;
  align-items: center;
}
.sub-text {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
.var-panel {
  margin-top: 6px;
  line-height: 2;
}
.var-panel-title {
  font-size: 12px;
  color: #909399;
}
.var-tag {
  cursor: pointer;
  margin-right: 6px;
}
.rule-list {
  width: 100%;
}
.rule-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.content-pre {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow: auto;
  font-size: 13px;
}
h4 {
  margin: 12px 0 8px;
}
</style>
