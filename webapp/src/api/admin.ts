import request from '@/utils/request'

export interface WorkerItem {
  userId: number
  userName: string
  workerCode: string
  workerStatus: 'active' | 'inactive'
  isFieldWorker: boolean
  totalLogs: number
}

export interface WorkerListResult {
  total: number
  list: WorkerItem[]
}

/** 分页查询花名册 */
export function getWorkerList(params: {
  page?: number
  pageSize?: number
  keyword?: string
}): Promise<WorkerListResult> {
  return request.post('/admin/workers', { action: 'list', ...params })
}

/** 新增外场人员 */
export function createWorker(data: {
  userName: string
  workerCode: string
}): Promise<{ userId: number }> {
  return request.post('/admin/workers', { action: 'create', ...data })
}

/** 编辑人员信息 */
export function updateWorker(data: {
  userId: number
  userName?: string
  isFieldWorker?: boolean
}): Promise<void> {
  return request.post('/admin/workers', { action: 'update', ...data })
}

/** 切换在职/离职状态 */
export function toggleWorker(userId: number, status: 'active' | 'inactive'): Promise<void> {
  return request.post('/admin/workers', { action: 'toggle', userId, status })
}

/** 删除人员（软删除） */
export function deleteWorker(userId: number): Promise<void> {
  return request.post('/admin/workers', { action: 'delete', userId })
}

/** 生成 CDK 邀请码 */
export function generateInviteCode(count: number = 1): Promise<{ codes: string[] }> {
  return request.post('/admin/invite/generate', { count })
}
