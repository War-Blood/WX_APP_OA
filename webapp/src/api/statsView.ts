import request from '@/utils/request'

export interface StatsViewFilter {
  deptId?: number | null
  fieldOnly?: number
  workType?: string
  province?: string
  date?: string
  month?: string
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

/** 创建视图（admin+） */
export function createStatsView(data: {
  name: string
  statKey: string
  filter: StatsViewFilter
  isLocked?: boolean
  visibleRoles?: string[]
  scopeRules?: ScopeRule[]
}): Promise<{ id: number }> {
  return request.post('/stats/views', data)
}

/** 当前角色可见视图列表 */
export function listStatsViews(statKey?: string): Promise<StatsView[]> {
  return request.get('/stats/views', { params: { statKey } })
}

/** 视图详情 */
export function getStatsView(id: number): Promise<StatsView> {
  return request.get(`/stats/views/${id}`)
}

/** 更新视图（admin+，锁定需先解锁） */
export function updateStatsView(id: number, data: Partial<{
  name: string
  filter: StatsViewFilter
  isLocked: boolean
  visibleRoles: string[]
  scopeRules: ScopeRule[]
}>): Promise<void> {
  return request.put(`/stats/views/${id}`, data)
}

/** 锁定/解锁（admin+） */
export function setViewLocked(id: number, locked: boolean): Promise<void> {
  return locked ? request.post(`/stats/views/${id}/lock`) : request.post(`/stats/views/${id}/unlock`)
}

/** 删除视图（admin+） */
export function deleteStatsView(id: number): Promise<void> {
  return request.delete(`/stats/views/${id}`)
}
