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

// 请假/出差管理
export function getLeaveList(params: {
  page?: number; pageSize?: number; requestType?: string; status?: string; departmentId?: number; keyword?: string
}) { return request.post('/attendance/leave/all-list', params) }

export function deleteLeave(requestId: number) { return request.post('/attendance/leave/delete', { requestId }) }
