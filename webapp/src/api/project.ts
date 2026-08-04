import request from '@/utils/request'

export interface ProjectItem {
  id: string
  name: string
  area: string
  memberCount: number
  reportCount: number
  lastReportDate: string
}

export interface ProjectListResult {
  total: number
  list: ProjectItem[]
}

export interface ProjectDetail extends ProjectItem {
  members: Array<{ userId: string; nickName: string; role: string }>
  reports: Array<{
    id: string
    date: string
    workers: string
    workContent: string
    todayWork?: string
    submitter?: string
    status: string
    statusText: string
  }>
  stats: {
    totalReports: number
    approvalRate: string
    avgWorkDays: number
  }
}

export interface ProjectStats {
  totalReports: number
  approvedCount: number
  pendingCount: number
  rejectedCount: number
  approvalRate: string
  trendList: Array<{ date: string; count: number }>
}

/** 获取项目列表 */
export function getProjectList(params: { page?: number; pageSize?: number; keyword?: string }): Promise<ProjectListResult> {
  return request.post('/project/list', params)
}

/** 获取项目详情 */
export function getProjectDetail(id: string): Promise<ProjectDetail> {
  return request.post('/project/detail', { id })
}

/** 获取项目统计 */
export function getProjectStats(params?: { projectId?: string; period?: string }): Promise<ProjectStats> {
  return request.post('/project/stats', params || {})
}
