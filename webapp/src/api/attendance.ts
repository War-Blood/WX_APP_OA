import request from '@/utils/request'

export interface ScheduleItem {
  id: number
  userId: number
  userName: string
  departmentName: string
  scheduleDate: string
  status: 'work' | 'rest' | 'biz_trip' | 'leave'
  note?: string
  createdBy: number
  createdAt: string
}

export interface LeaveRequest {
  id: number
  applicantId: number
  applicantName?: string
  departmentName?: string
  requestType: 'biz_trip' | 'leave'
  leaveSubtype?: string
  startDate?: string
  endDate?: string
  days?: number
  tripStartedAt?: string
  tripEndedAt?: string
  reason?: string
  status: 'active' | 'cancelled' | 'in_progress' | 'ended'
  source?: string
  createdAt?: string
  missingDates?: string[]
}

export interface SummaryItem {
  userId: number
  userName: string
  workerCode: string
  departmentName: string
  workDays: number
  restDays: number
  bizTripDays: number
  leaveDays: number
  missingDays: number
}

// 排班
export function getScheduleList(params: {
  startDate: string; endDate: string; departmentId?: number; userId?: number; page?: number; pageSize?: number
}) { return request.post('/attendance/schedule/list', params) }

export function upsertSchedule(data: {
  userId: number; scheduleDate: string; status: string; note?: string
}) { return request.post('/attendance/schedule/upsert', data) }

export function batchSchedule(data: {
  userIds: number[]; startDate: string; endDate: string; status: string; note?: string; weekdaysOnly?: boolean
}) { return request.post('/attendance/schedule/batch', data) }

// 汇总
export function getSummaryList(params: {
  startDate: string; endDate: string; departmentId?: number; userId?: number; page?: number; pageSize?: number
}) { return request.post('/attendance/summary/list', params) }

export function exportSummary(params: {
  startDate: string; endDate: string; departmentId?: number; userId?: number
}) { return request.post('/attendance/summary/export', params, { responseType: 'blob' }) }

// 请假/出差管理（管理员）
export function getLeaveList(params: {
  page?: number; pageSize?: number; requestType?: string; status?: string; departmentId?: number; keyword?: string
}) { return request.post('/attendance/leave/all-list', params) }

// 删除排班
export function deleteSchedule(id: number) { return request.post('/attendance/schedule/delete', { id }) }

// 删除请假/出差记录
export function deleteLeave(requestId: number) { return request.post('/attendance/leave/delete', { requestId }) }

// 排班规则
export interface ScheduleRule { id?: number; name: string; weekConfig: Record<string, string>; altWeekConfig?: Record<string, string> | null; alternating?: boolean; isDefault: boolean; createdAt?: string }
export function getScheduleRules() { return request.post('/attendance/schedule/rules') }
export function saveScheduleRule(data: ScheduleRule) { return request.post('/attendance/schedule/rules/save', data) }
export function applyScheduleRule(data: { ruleId: number; startDate: string; endDate: string }) { return request.post('/attendance/schedule/rules/apply', data) }
export function clearSchedule(data: { startDate: string; endDate: string }) { return request.post('/attendance/schedule/clear', data) }
