import request from '@/utils/request'

export interface ApprovalTypeItem {
  id: number
  typeKey: string
  name: string
  icon?: string
  sortOrder: number
  needAttachment: boolean
  needRemark: boolean
  formTemplate?: object
  status: string
}

/** 获取审批类型列表 */
export function getApprovalTypes(): Promise<ApprovalTypeItem[]> {
  return request.get('/admin/approval-types')
}

/** 更新审批类型配置 */
export function updateApprovalType(id: number, data: Partial<ApprovalTypeItem>): Promise<void> {
  return request.put(`/admin/approval-types/${id}`, data)
}
