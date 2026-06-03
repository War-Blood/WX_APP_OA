import request from '@/utils/request'

export interface ReportItem {
  id: string
  date: string
  weekday: string
  project: string
  area?: string
  workers: string
  workContent: string
  todayWorkType: string
  summary: string
  status: string
  statusText: string
  progressText: string
  submitter?: string
  submitTime?: string
}

export interface ReportListResult {
  total: number
  list: ReportItem[]
}

export interface ReportDetail extends ReportItem {
  entryDate: string
  initialBizTripDate: string
  relatedParty: string
  machineModel: string
  workerCount: string
  todayWork: string
  requiredQty: number
  completedQty: number
  tomorrowPlan: string
  issues: string
  remark: string
  bizTripDays: number
  personalBizTripDays: number
  images: string[]
  reviewer: string
  reviewOpinion: string
  reviewTime: string
  createTime: string
}

export interface ReviewItem {
  id: string
  user: string
  project: string
  time: string
  status: string
  statusText: string
}

export interface ReviewListResult {
  total: number
  stats: {
    pending: number
    todayReviewed: number
    avgTime: string
  }
  list: ReviewItem[]
}

/** 获取日报列表(管理员可看全部) */
export function getReportList(params: {
  page?: number; pageSize?: number; status?: string;
  startDate?: string; endDate?: string; keyword?: string
}): Promise<ReportListResult> {
  return request.post('/report/list', params)
}

/** 获取日报详情 */
export function getReportDetail(id: string): Promise<ReportDetail> {
  return request.post('/report/detail', { id })
}

/** 获取审核列表 */
export function getReviewList(params: {
  page?: number; pageSize?: number; status?: string; keyword?: string
}): Promise<ReviewListResult> {
  return request.post('/project/reviewList', params)
}

/** 审核日报(通过/驳回) */
export function reviewAction(id: string, action: 'approve' | 'reject', opinion?: string): Promise<{ status: string }> {
  return request.post('/project/reviewAction', { id, action, opinion })
}

/** 删除日报 */
export function deleteReport(id: string): Promise<void> {
  return request.post('/report/delete', { id })
}

export interface WorkerStatItem {
  name: string
  total: number
  monthCount: number
  lastDate: string
}

/** 人员统计看板 */
export function getWorkerStats(params: { page?: number; pageSize?: number; keyword?: string }): Promise<{ total: number; list: WorkerStatItem[] }> {
  return request.post('/report/workerStats', params)
}
