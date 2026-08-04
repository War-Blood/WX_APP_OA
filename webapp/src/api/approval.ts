import request from '@/utils/request'

export interface ApprovalItem {
  id: string
  title: string
  type: string
  applicantId?: string
  applicant: string
  applicantDept: string
  date: string
  status: string
  statusText: string
  urgent?: boolean
  currentApproverId?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface ApprovalTimelineItem {
  nodeId: number
  nodeOrder: number
  approverId: string | null
  approverName: string
  status: string
  remark: string
  time: string
  action: string | null
}

export interface ApprovalDetail extends ApprovalItem {
  formData: Record<string, unknown>
  attachments: unknown[]
  timeline: ApprovalTimelineItem[]
}

export function getApprovalList(params: {
  tab?: string
  page?: number
  pageSize?: number
}): Promise<{ list: ApprovalItem[]; total: number }> {
  return request.post('/approval/list', params)
}

export function getApprovalDetail(id: string | number): Promise<ApprovalDetail> {
  return request.post('/approval/detail', { id })
}

export function approveApproval(
  id: string | number,
  action: 'approve' | 'reject',
  comment?: string
): Promise<ApprovalItem> {
  return request.post('/approval/approve', { id, action, comment })
}
