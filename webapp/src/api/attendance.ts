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
}) { return request.post('/api/attendance/schedule/list', params) }

export function upsertSchedule(data: {
  userId: number; scheduleDate: string; status: string; note?: string
}) { return request.post('/api/attendance/schedule/upsert', data) }

export function batchSchedule(data: {
  userIds: number[]; startDate: string; endDate: string; status: string; note?: string; weekdaysOnly?: boolean
}) { return request.post('/api/attendance/schedule/batch', data) }

// 汇总
export function getSummaryList(params: {
  startDate: string; endDate: string; departmentId?: number; userId?: number; page?: number; pageSize?: number
}) { return request.post('/api/attendance/summary/list', params) }

export function exportSummary(params: {
  startDate: string; endDate: string; departmentId?: number; userId?: number
}) { return request.post('/api/attendance/summary/export', params, { responseType: 'blob' }) }
