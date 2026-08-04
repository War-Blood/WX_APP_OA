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

/** 删除日报 */
export function deleteReport(id: string): Promise<void> {
  return request.post('/report/delete', { id })
}

/** 恢复已删除的日报 */
export function restoreReport(id: string): Promise<void> {
  return request.post('/report/restore', { id })
}

/** 回收站列表 */
export function getDeletedReports(params: {
  page?: number; pageSize?: number
}): Promise<{ total: number; list: any[] }> {
  return request.post('/report/deleted-list', params)
}

/** 编辑报告参数 */
export interface ReportUpdateParams {
  reportId: number
  project?: string
  area?: string
  reportDate?: string
  todayWorkType?: string
  workContent?: string
  machineModel?: string
  workers?: string
  relatedParty?: string
  remark?: string
  todayWork?: string
  tomorrowPlan?: string
  entryDate?: string
  initialBizTripDate?: string
  requiredQty?: number
  completedQty?: number
  supplementDate?: string
  supplementReason?: string
  personalBizTripDays?: number
  bizTripDays?: number
  issues?: string
  content?: string
  reportType?: string
}

/** 编辑报告响应 */
export interface ReportUpdateResult {
  reportId: number
  changes: string[]
}

/** 管理员编辑公出日志 */
export function updateReport(params: ReportUpdateParams): Promise<ReportUpdateResult> {
  return request.post('/report/update', params)
}

export interface WorkerStatItem {
  name: string
  total: number
  monthCount: number
  lastDate: string
}

/** 人员统计看板（全量返回，不分页） */
export function getWorkerStats(params: { keyword?: string }): Promise<{ total: number; list: WorkerStatItem[] }> {
  return request.post('/report/workerStats', params)
}

// ==============================
// v2.0 新增 — 公出日志模块升级
// ==============================

/** 提交参数 */
export interface ReportSubmitParams {
  reportType: 'biz_trip' | 'biz_trip_supplement'
  reportDate: string
  project?: string
  area?: string
  relatedParty?: string
  workerIds?: number[]
  machineModel?: string
  workContent?: string
  requiredQty?: number
  completedQty?: number
  remark?: string
  todayWork?: string
  tomorrowPlan?: string
  todayWorkType?: string
  tomorrowWorkType?: string
  entryDate?: string
  initialBizTripDate?: string
  /** 补公出 — 补录目标日期 */
  supplementDate?: string
  /** 补公出 — 补录原因 */
  supplementReason?: string
  /** 公司日报 — 问题反馈 */
  issues?: string
  /** 公司日报 — 协调事项 */
  coordination?: string
}

/** 补公出审核判定参数 */
export interface ReviewSupplementParams {
  reportId: number
  decision: 'special' | 'forget'
  comment?: string
}

/** 统计看板 — 单人统计 (scope=user) */
export interface ReportStats {
  scope: 'user'
  totalCount: number
  monthCount: number
  missingDays: number
  missingDates: string[]
  delayedCount: number
  entryDate: string
}

/** 统计看板 — 全员汇总 (scope=all) */
export interface AllStatsResponse {
  scope: 'all'
  totalLogs: number
  monthNew: number
  delayedTotal: number
  missingPersonCount: number
}

/** 统计看板 — 按项目维度条目 */
export interface ProjectStatsItem {
  project: string
  total: number
  month: number
  missing: number
}

/** 统计看板 — 按项目 (scope=project) */
export interface ProjectStatsResponse {
  scope: 'project'
  projects: ProjectStatsItem[]
}

/** 补公出待审核条目 */
export interface PendingReviewItem {
  reportId: number
  reportDate: string
  supplementDate: string
  submitterName: string
  project: string
  supplementReason: string
  status: 'pending_review' | 'reviewed'
  createdAt: string
}

/** 补公出待审核列表响应 */
export interface PendingReviewsResult {
  list: PendingReviewItem[]
  total: number
}

/** 员工当日状态条目 */
export interface DailyStatusWorker {
  userId: number
  userName: string
  workerCode: string
  reportId: number | null
  project: string | null
  area: string | null
  workType: string | null
  status: 'submitted' | 'supplement' | 'office' | 'substituted' | 'leave' | 'missing'
  submittedAt: string | null
  substituteBy: string | null
}

/** 当日状态汇总 */
export interface DailyStatusSummary {
  submitted: number
  supplement: number
  office: number
  substituted: number
  leave: number
  missing: number
}

/** 员工当日状态响应 */
export interface DailyStatusResponse {
  date: string
  totalWorkers: number
  summary: DailyStatusSummary
  workers: DailyStatusWorker[]
}

/** 明日计划条目 */
export interface TomorrowStatusWorker {
  userId: number
  userName: string
  workerCode: string
  reportId: number | null
  tomorrowWorkType: string
  project: string | null
  area: string | null
}

/** 明日计划响应（workers 平铺,前端按明日工作类型分组） */
export interface TomorrowStatusResponse {
  date: string
  prevDate: string
  totalWorkers: number
  summary: Record<string, number>
  workers: TomorrowStatusWorker[]
}

/** 月度工作占比响应 */
export interface MonthlySummaryResponse {
  userId: number
  userName: string
  month: string
  totalSubmitted: number
  workDays: number
  breakdown: Record<string, number>
  ratio: Record<string, string>
}

/** 同组日志条目 */
export interface TeamLog {
  userId: number
  userName: string
  reportDate: string
  todayWorkType: string
  workContent: string
  reportId: number
}

/** 同组日志响应 */
export interface TeamLogsResult {
  teamMembers: { userId: number; userName: string }[]
  logs: TeamLog[]
}

// ==============================
// v2.0 新增函数
// ==============================

/** 检查当日是否已被代填 */
export function checkDuplicate(params: {
  userId: number
  reportDate: string
}): Promise<{ canSubmit: boolean }> {
  return request.post('/report/check-duplicate', params)
}

/** 公出统计看板 — 重载签名 */
export function getStats(scope: 'user', userId: number): Promise<ReportStats>
export function getStats(scope: 'all'): Promise<AllStatsResponse>
export function getStats(scope: 'project'): Promise<ProjectStatsResponse>
export function getStats(scope: 'user' | 'all' | 'project', userId?: number): Promise<ReportStats | AllStatsResponse | ProjectStatsResponse> {
  return request.post('/report/stats', { scope, ...(userId ? { userId } : {}) })
}

/** 获取补公出待审核列表 */
export function getPendingReviews(params: {
  status?: 'pending' | 'reviewed' | 'all'
  page?: number
  pageSize?: number
}): Promise<PendingReviewsResult> {
  return request.post('/report/pending-reviews', params)
}

/** 补公出审核判定 */
export function reviewSupplement(params: ReviewSupplementParams): Promise<void> {
  return request.post('/report/supplement-review', params)
}

/** 管理层看板 — 员工当日状态 */
export function getDailyStatus(params: {
  date?: string
  status?: string
  keyword?: string
}): Promise<DailyStatusResponse> {
  return request.post('/report/daily-status', params)
}

/** 明日计划状态 */
export function getTomorrowStatus(params: {
  date?: string
}): Promise<TomorrowStatusResponse> {
  return request.post('/report/tomorrow-status', params)
}

/** 管理层看板 — 月度工作占比 */
export function getMonthlySummary(params: {
  userId: number
  month: string
}): Promise<MonthlySummaryResponse> {
  return request.post('/report/monthly-summary', params)
}

/** 获取同组日志 */
export function getTeamLogs(userId: number, days?: number): Promise<TeamLogsResult> {
  return request.post('/report/team-logs', { userId, ...(days ? { days } : {}) })
}

// ===== M2: 日历热力图 + 项目进展 =====

/** 每日提交统计（已提交人数 / 在职总人数） */
export interface DailyCountItem {
  date: string
  submitted: number
  total: number
}

export interface DailyCountsResponse {
  month: string
  data: DailyCountItem[]
}

/** 月度每日提交人次 */
export function getDailyCounts(month: string): Promise<DailyCountsResponse> {
  return request.post('/stats/daily-counts', { month })
}

/** 项目进展项 */
export interface ProjectProgressItem {
  project: string
  area: string | null
  completedQty: number
  requiredQty: number
  progress: number | null
  logCount: number
  dayCount: number
}

export interface ProjectProgressResponse {
  month: string
  projects: ProjectProgressItem[]
}

/** 项目进展看板 */
export function getProjectProgress(month: string): Promise<ProjectProgressResponse> {
  return request.post('/stats/project-progress', { month })
}

// ===== M3: 人员工作类型分布 =====

export interface WorkerWorkTypeItem {
  userName: string
  workerCode: string
  workTypes: Record<string, number>
  total: number
  supplementCount?: number
}

export interface WorkerWorkTypesResponse {
  month: string
  workers: WorkerWorkTypeItem[]
}

/** 人员工作类型分布 */
export function getWorkerWorkTypes(month: string): Promise<WorkerWorkTypesResponse> {
  return request.post('/stats/worker-work-types', { month })
}

// ===== M4: 中国地图区域分布 =====

export interface ProvinceItem {
  name: string
  count: number
  projects: string[]
  workers?: ProvinceWorkerItem[]
}

export interface AreaDistributionResponse {
  month: string
  provinces: ProvinceItem[]
}

/** 省份人员分布 */
export function getAreaDistribution(date?: string): Promise<AreaDistributionResponse> {
  return request.post('/stats/area-distribution', { date })
}

export interface ProvinceWorkerItem {
  userId: number
  userName: string
  workerCode: string
  area: string
  project: string
}

export interface ProvinceWorkersResponse {
  province: string
  workers: ProvinceWorkerItem[]
}

/** 省份下钻人员列表 */
export function getProvinceWorkers(province: string, date?: string): Promise<ProvinceWorkersResponse> {
  return request.post('/stats/province-workers', { province, date })
}

/** 中国地图 GeoJSON（后端同源托管，替代外网 DataV CDN） */
export function getChinaGeoJson(): Promise<any> {
  return request.get('/geo/china')
}

// ===== 企业微信智能表格导出 =====

/** 企业微信智能表格导出响应 */
export interface WecomSheetExportResult {
  success: boolean
  totalRecords: number
  batches: number
}

/** 导出到企业微信智能表格 */
export function exportToWecomSheet(params: { startDate: string; endDate: string }): Promise<WecomSheetExportResult> {
  return request.post('/report/export-wecom-sheet', params)
}
