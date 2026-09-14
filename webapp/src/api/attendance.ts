import request from '@/utils/request'

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

export interface BizTripUserStatus {
  userId: number
  userName: string
  workerCode?: string
  departmentName?: string
  position?: string
  tripStatus: 'in_progress' | 'compliance_only' | 'none'
  attendanceRequestId?: number | null
  complianceId?: number | null
  projectName?: string | null
  tripStartedAt?: string | null
  tripDays?: number | null
  reason?: string | null
  source?: string | null
}

export interface BizTripRecord {
  recordId: number
  recordType: 'attendance' | 'compliance'
  userId: number
  userName: string
  workerCode?: string
  departmentName?: string
  startDate: string
  endDate?: string | null
  tripDays?: number
  tripStatus: 'in_progress' | 'ended'
  projectName?: string | null
  source?: string | null
  inconsistent?: boolean
}

export interface BizTripRecordQuery {
  status?: string
  keyword?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

// 请假/出差管理
export function getLeaveList(params: {
  page?: number; pageSize?: number; requestType?: string; status?: string; departmentId?: number; keyword?: string
}) { return request.post('/attendance/leave/all-list', params) }

export function deleteLeave(requestId: number) { return request.post('/attendance/leave/delete', { requestId }) }

// 后台出差管理
export function getAdminBizTripStatusList(params: {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
}): Promise<{ list: BizTripUserStatus[]; total: number; summary?: { inProgress: number; none: number } }> {
  return request.get('/attendance/admin/biz-trip/status-list', { params })
}

export function getAdminBizTripRecords(params: BizTripRecordQuery): Promise<{ list: BizTripRecord[]; total: number }> {
  return request.get('/attendance/admin/biz-trip/records', { params })
}

export function adminUpdateBizTripRecord(data: {
  recordType: 'attendance' | 'compliance'
  recordId: number
  startDate: string
  endDate?: string
  remark?: string
}): Promise<{ recordType: string; recordId: number; startDate: string; endDate: string | null; status: string }> {
  return request.post('/attendance/admin/biz-trip/update', data)
}

export function adminStartBizTrip(data: {
  userId: number
  projectName?: string
  reason?: string
  startDate: string
}): Promise<{ requestId: number; status: string; startDate: string }> {
  return request.post('/attendance/admin/biz-trip/start', data)
}

export function adminEndBizTrip(data: {
  userId: number
  reason?: string
  endDate: string
}): Promise<{ requestId: number | null; status: string; missingDays: number }> {
  return request.post('/attendance/admin/biz-trip/end', data)
}
