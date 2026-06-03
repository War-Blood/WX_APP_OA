import request from '@/utils/request'

export interface StatsHome {
  pendingCount: number
  submitCount?: number
  reviewCount?: number
  processedCount: number
  unreadCount: number
}

export interface ActivityItem {
  id: number
  type: string
  text: string
  time: string
  date: string
  iconBg: string
}

export interface ActivitiesResult {
  list: ActivityItem[]
  total: number
}

export interface ProfileStats {
  reportCount: number
  approvalCount: number
  pendingApprovalCount: number
  continuousDays: number
}

/** 首页统计 */
export function getStatsHome(): Promise<StatsHome> {
  return request.post('/stats/home')
}

/** 最近动态 */
export function getActivities(params?: { page?: number; pageSize?: number }): Promise<ActivitiesResult> {
  return request.post('/stats/activities', params || {})
}

/** 个人中心统计 */
export function getProfileStats(): Promise<ProfileStats> {
  return request.post('/stats/profile')
}

/** 日报统计看板 */
export function getReportStats(): Promise<{ total: number; monthCount: number; pendingCount: number; approvedCount: number; approvalRate: string; trend: Array<{ date: string; count: number }> }> {
  return request.post('/stats/reportStats')
}
