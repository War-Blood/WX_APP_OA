import { post } from '../request'

export const attendanceApi = {
  // 排班
  getScheduleList: (params) => post('/api/attendance/schedule/list', params),

  // 请假
  applyLeave: (data) => post('/api/attendance/leave/apply', data),
  getMyLeaveList: (params) => post('/api/attendance/leave/my-list', params),
  getLeaveDetail: (requestId) => post('/api/attendance/leave/detail', { requestId }),
  cancelLeave: (requestId) => post('/api/attendance/leave/cancel', { requestId }),

  // 出差打卡
  startTrip: (data) => post('/api/attendance/biz-trip/start', data || {}),
  endTrip: (data) => post('/api/attendance/biz-trip/end', data || {}),

  // 汇总（管理员）
  getSummary: (params) => post('/api/attendance/summary/list', params),
}
