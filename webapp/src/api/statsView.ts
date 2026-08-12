import request from '@/utils/request'

export interface FilterCondition {
  field: string
  op: string
  value: string | number | boolean | (string | number)[] | null
}

export interface FilterField {
  field: string
  table: string
  column: string
  type: string
  input: string
  label: string
  options?: string[]
}

export interface StatsViewFilter {
  /** 下层：动态筛选条件 */
  conditions?: FilterCondition[]
  /** 上层：视图可见性（角色 → 数据范围 all/department/department_and_children/self） */
  visibility?: Record<string, string>
}

export interface ScopeRule {
  roleCode: string
  scopeType: string
}

export interface StatsView {
  id: number
  name: string
  statKey: string
  filter: StatsViewFilter
  isLocked: boolean
  visibleRoles?: string[]
  scopeRules?: ScopeRule[]
}

/** 动态获取可筛选字段 */
export function getFilterFields(): Promise<FilterField[]> {
  return request.get('/stats/views/fields')
}

/** 保存某统计页的唯一视图（UPSERT，admin+） */
export function createStatsView(data: {
  statKey: string
  conditions: FilterCondition[]
  visibility?: Record<string, string>
}): Promise<void> {
  return request.post('/stats/views', data)
}

/** 获取某统计页的唯一视图 */
export function getStatsView(statKey: string): Promise<{
  id: number
  statKey: string
  filter: StatsViewFilter
  createdBy: number
} | null> {
  return request.get('/stats/views', { params: { statKey } })
}
