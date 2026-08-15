<template>
  <div class="push-logs-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>执行日志</span>
        </div>
      </template>

      <div class="filters">
        <el-select v-model="filters.scriptId" placeholder="脚本" clearable filterable style="width: 200px" @change="handleSearch">
          <el-option v-for="s in scripts" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-select v-model="filters.status" placeholder="发送状态" clearable style="width: 140px" @change="handleSearch">
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
          <el-option label="跳过" value="skipped" />
          <el-option label="条件不满足" value="condition_fail" />
        </el-select>
        <el-date-picker
          v-model="filters.range"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 260px"
        />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe border style="margin-top: 16px">
        <el-table-column prop="scriptName" label="脚本" min-width="160" show-overflow-tooltip />
        <el-table-column label="计划时间" width="150">
          <template #default="{ row }">{{ formatScheduleKey(row.scheduleKey) }}</template>
        </el-table-column>
        <el-table-column label="条件结果" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.conditionResult === 'pass'" type="success" size="small">通过</el-tag>
            <el-tag v-else-if="row.conditionResult === 'fail'" type="warning" size="small">不满足</el-tag>
            <el-tag v-else-if="row.conditionResult === 'error'" type="danger" size="small">异常</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="发送状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.sendStatus)" size="small">{{ statusLabel(row.sendStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100" align="center">
          <template #default="{ row }">{{ row.durationMs != null ? row.durationMs + ' ms' : '-' }}</template>
        </el-table-column>
        <el-table-column prop="errorMessage" label="错误摘要" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openDetail(row.id)">详情</el-button>
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

    <el-drawer v-model="detailVisible" title="执行日志详情" size="640px">
      <div v-loading="detailLoading">
        <template v-if="detail">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="脚本">{{ detail.scriptName }}</el-descriptions-item>
            <el-descriptions-item label="计划时间">{{ formatScheduleKey(detail.scheduleKey) }}</el-descriptions-item>
            <el-descriptions-item label="执行时间">{{ detail.createdAt }}</el-descriptions-item>
            <el-descriptions-item label="条件结果">
              <el-tag :type="detail.conditionResult === 'pass' ? 'success' : detail.conditionResult === 'fail' ? 'warning' : 'danger'" size="small">
                {{ detail.conditionResult === 'pass' ? '通过' : detail.conditionResult === 'fail' ? '不满足' : detail.conditionResult === 'error' ? '异常' : '-' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="发送状态">
              <el-tag :type="statusTag(detail.sendStatus)" size="small">{{ statusLabel(detail.sendStatus) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="耗时">{{ detail.durationMs != null ? detail.durationMs + ' ms' : '-' }}</el-descriptions-item>
            <el-descriptions-item label="错误">{{ detail.errorMessage || '-' }}</el-descriptions-item>
          </el-descriptions>

          <h4>条件判定明细</h4>
          <el-table v-if="detail.conditionDetail?.length" :data="detail.conditionDetail" size="small" border>
            <el-table-column prop="source" label="数据源" width="110" />
            <el-table-column prop="field" label="字段" width="130" />
            <el-table-column prop="operator" label="操作符" width="80" />
            <el-table-column label="期望值" min-width="90">
              <template #default="{ row }">{{ formatValue(row.expected) }}</template>
            </el-table-column>
            <el-table-column label="实际值" min-width="90">
              <template #default="{ row }">{{ formatValue(row.actual) }}</template>
            </el-table-column>
            <el-table-column label="结果" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="row.result ? 'success' : 'danger'" size="small">{{ row.result ? '通过' : '不满足' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="无条件明细" :image-size="60" />

          <h4>渲染后内容</h4>
          <el-alert
            v-if="detail.mentionDetail"
            :closable="false"
            type="info"
            :title="`@ 目标：${detail.mentionDetail.names?.join('、') || '无'}${detail.mentionDetail.skipped?.length ? `（${detail.mentionDetail.skipped.length} 人因无标识跳过）` : ''}`"
            style="margin-bottom: 8px"
          />
          <pre v-if="detail.renderedContent" class="content-pre">{{ detail.renderedContent }}</pre>
          <el-empty v-else description="无渲染内容" :image-size="60" />

          <h4>发送尝试</h4>
          <template v-if="detail.attempts?.length">
            <el-table :data="detail.attempts" size="small" border>
              <el-table-column prop="attempt" label="次数" width="60" align="center" />
              <el-table-column prop="httpStatus" label="HTTP" width="70" />
              <el-table-column prop="errcode" label="errcode" width="80" />
              <el-table-column prop="errmsg" label="响应/错误" min-width="200" show-overflow-tooltip />
            </el-table>
          </template>
          <el-empty v-else description="无发送尝试" :image-size="60" />
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getPushLogList, getPushLogDetail, getPushScriptList, type PushLogItem, type PushLogDetail } from '@/api/push'

const loading = ref(false)
const detailLoading = ref(false)
const list = ref<PushLogItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const scripts = ref<Array<{ id: number; name: string }>>([])
const filters = reactive({
  scriptId: undefined as number | undefined,
  status: '',
  range: null as [string, string] | null,
})

const detailVisible = ref(false)
const detail = ref<PushLogDetail | null>(null)

function statusTag(status: string) {
  return { success: 'success', failed: 'danger', skipped: 'info', condition_fail: 'warning' }[status] || 'info'
}
function statusLabel(status: string) {
  return { success: '成功', failed: '失败', skipped: '跳过', condition_fail: '条件不满足' }[status] || status
}
function formatScheduleKey(key: string) {
  if (!key) return '-'
  if (key.startsWith('T')) return '手动测试'
  return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)} ${key.slice(8, 10)}:${key.slice(10, 12)}`
}
function formatValue(v: unknown) {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'boolean') return v ? '是' : '否'
  return String(v)
}

async function loadScripts() {
  try {
    const res = await getPushScriptList({ page: 1, pageSize: 100 })
    scripts.value = res.list.map((s) => ({ id: s.id, name: s.name }))
  } catch {
    // toast 已统一处理
  }
}

async function loadData() {
  loading.value = true
  try {
    const res = await getPushLogList({
      page: page.value,
      pageSize: pageSize.value,
      scriptId: filters.scriptId,
      status: filters.status || undefined,
      startDate: filters.range?.[0],
      endDate: filters.range?.[1],
    })
    list.value = res.list
    total.value = res.total
  } catch {
    // toast 已统一处理
  } finally {
    loading.value = false
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

async function openDetail(id: number) {
  detailVisible.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await getPushLogDetail(id)
  } catch {
    // toast 已统一处理
  } finally {
    detailLoading.value = false
  }
}

onMounted(() => {
  loadScripts()
  loadData()
})
</script>

<style scoped>
.filters {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.content-pre {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 260px;
  overflow: auto;
  font-size: 13px;
}
h4 {
  margin: 16px 0 8px;
}
</style>
