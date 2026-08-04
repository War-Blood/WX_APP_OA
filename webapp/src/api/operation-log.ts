import request from '@/utils/request'

export interface OperationLogItem {
  id: number
  userId: number | null
  userName: string
  action: string
  module: string
  targetId: number | null
  targetType: string
  detail: string
  ipAddress: string
  userAgent: string
  createdAt: string
}

export function getOperationLogs(params: {
  page?: number
  pageSize?: number
  keyword?: string
  module?: string
  action?: string
  startDate?: string
  endDate?: string
}): Promise<{ list: OperationLogItem[]; total: number }> {
  return request.get('/admin/operation-logs', { params })
}
