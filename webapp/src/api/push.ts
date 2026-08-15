import request from '@/utils/request'

// ===== 类型定义 =====

export interface PushWebhookItem {
  id: number
  name: string
  envName: string
  enabled: boolean
  configured: boolean
  remark: string
  createdAt: string
}

export interface ConditionRule {
  source: string
  field: string
  operator: string
  value: unknown
}

export interface ConditionConfig {
  logic: 'AND' | 'OR'
  rules: ConditionRule[]
}

export interface PushScriptItem {
  id: number
  name: string
  description: string
  status: 'enabled' | 'disabled'
  scheduleType: 'daily' | 'cron'
  scheduleValue: string
  timezone: string
  webhookId: number
  webhookName: string
  webhookEnabled: boolean
  msgtype: 'text' | 'markdown'
  mentionType: 'none' | 'all' | 'roles' | 'users'
  retryTimes: number
  retryInterval: number
  maxDailySends: number
  consecutiveFailures: number
  notifyOnFail: boolean
  lastRunAt: string | null
  lastRunStatus: string | null
  lastError: string
  createdAt: string
}

export interface PushScriptDetail {
  id: number
  name: string
  description: string
  status: 'enabled' | 'disabled'
  scheduleType: 'daily' | 'cron'
  scheduleValue: string
  timezone: string
  webhookId: number
  msgtype: 'text' | 'markdown'
  templateContent: string
  mentionType: 'none' | 'all' | 'roles' | 'users'
  mentionTargets: string[] | number[]
  conditionConfig: ConditionConfig
  retryTimes: number
  retryInterval: number
  maxDailySends: number
  consecutiveFailures: number
  notifyOnFail: boolean
}

export interface PushLogItem {
  id: number
  scriptId: number
  scriptName: string
  scheduleKey: string
  conditionResult: 'pass' | 'fail' | 'error' | null
  sendStatus: 'success' | 'failed' | 'skipped' | 'condition_fail'
  errorMessage: string | null
  durationMs: number | null
  createdAt: string
}

export interface DataSourceFieldMeta {
  id: string
  name: string
  type: 'number' | 'string' | 'boolean'
}

export interface DataSourceMeta {
  id: string
  name: string
  fields: DataSourceFieldMeta[]
}

export interface TestResult {
  dryRun: boolean
  conditionResult?: string
  conditionDetail?: Array<Record<string, unknown>>
  renderedContent?: string
  truncated?: boolean
  unknownVars?: string[]
  mentionDetail?: { names: string[]; skipped: Array<Record<string, unknown>> }
  dataSourceErrors?: Record<string, string>
  sendStatus?: string
  logId?: number
  errorMessage?: string | null
}

// ===== 群机器人 =====

export function getPushWebhookList(params: {
  page?: number
  pageSize?: number
  keyword?: string
}): Promise<{ list: PushWebhookItem[]; total: number }> {
  return request.post('/push/webhooks/list', params)
}

export function createPushWebhook(data: {
  name: string
  envName: string
  enabled?: boolean
  remark?: string
}): Promise<{ id: number }> {
  return request.post('/push/webhooks/create', data)
}

export function updatePushWebhook(data: {
  id: number
  name: string
  envName: string
  enabled?: boolean
  remark?: string
}): Promise<{ id: number }> {
  return request.post('/push/webhooks/update', data)
}

export function deletePushWebhook(id: number): Promise<{ deleted: boolean }> {
  return request.post('/push/webhooks/delete', { id })
}

export function togglePushWebhook(id: number, enabled: boolean): Promise<{ id: number; enabled: boolean }> {
  return request.post('/push/webhooks/toggle', { id, enabled })
}

// ===== 推送脚本 =====

export function getPushScriptList(params: {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
}): Promise<{ list: PushScriptItem[]; total: number }> {
  return request.post('/push/scripts/list', params)
}

export function getPushScriptDetail(id: number): Promise<PushScriptDetail> {
  return request.post('/push/scripts/detail', { id })
}

export interface PushScriptPayload {
  name: string
  description?: string
  status?: 'enabled' | 'disabled'
  scheduleType: 'daily' | 'cron'
  scheduleValue: string
  timezone?: string
  webhookId: number
  msgtype: 'text' | 'markdown'
  templateContent: string
  mentionType: 'none' | 'all' | 'roles' | 'users'
  mentionTargets?: Array<string | number>
  conditionConfig: ConditionConfig
  retryTimes?: number
  retryInterval?: number
  maxDailySends?: number
  notifyOnFail?: boolean
}

export function createPushScript(data: PushScriptPayload): Promise<{ id: number }> {
  return request.post('/push/scripts/create', data)
}

export function updatePushScript(id: number, data: PushScriptPayload): Promise<{ id: number }> {
  return request.post('/push/scripts/update', { id, ...data })
}

export function deletePushScript(id: number): Promise<{ deleted: boolean }> {
  return request.post('/push/scripts/delete', { id })
}

export function togglePushScript(id: number, enabled: boolean): Promise<{ id: number; enabled: boolean }> {
  return request.post('/push/scripts/toggle', { id, enabled })
}

export function testPushScript(id: number, dryRun: boolean): Promise<TestResult> {
  return request.post('/push/scripts/test', { id, dryRun })
}

// ===== 执行日志 =====

export function getPushLogList(params: {
  page?: number
  pageSize?: number
  scriptId?: number
  status?: string
  startDate?: string
  endDate?: string
}): Promise<{ list: PushLogItem[]; total: number }> {
  return request.post('/push/logs/list', params)
}

export interface PushLogDetail extends PushLogItem {
  conditionDetail: Array<Record<string, unknown>> | null
  renderedContent: string | null
  mentionDetail: {
    names: string[]
    mobileCount: number
    useridCount: number
    skipped: Array<Record<string, unknown>>
  } | null
  attempts: Array<Record<string, unknown>> | null
}

export function getPushLogDetail(id: number): Promise<PushLogDetail> {
  return request.post('/push/logs/detail', { id })
}

// ===== 数据源元信息 =====

export function getPushDataSources(): Promise<{ sources: DataSourceMeta[] }> {
  return request.post('/push/data-sources/list', {})
}
