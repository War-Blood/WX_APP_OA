import request from '@/utils/request'

export interface DepartmentItem {
  id: number
  name: string
  parentId: number | null
  managerId?: number | null
  sortOrder: number
  description?: string
  status: string
  children?: DepartmentItem[]
}

export interface DepartmentUser {
  id: number
  userId: string
  userName: string
  nickname: string
  department?: string
  departmentId?: number | null
  position?: string
  role: string
  avatarUrl?: string
  phone?: string
  email?: string
  workerCode?: string
}

export function getDepartmentTree(): Promise<DepartmentItem[]> {
  return request.get('/admin/departments')
}

export function createDepartment(data: {
  name: string
  parentId?: number | null
  sortOrder?: number
  description?: string
}): Promise<{ id: number }> {
  return request.post('/admin/departments', data)
}

export function updateDepartment(id: number, data: {
  name?: string
  parentId?: number | null
  sortOrder?: number
  description?: string
}): Promise<void> {
  return request.put(`/admin/departments/${id}`, data)
}

export function deleteDepartment(id: number): Promise<{ deletedDeptCount: number }> {
  return request.delete(`/admin/departments/${id}`)
}

export function getDepartmentUsers(departmentId: number | null, params?: {
  page?: number
  pageSize?: number
}): Promise<{ list: DepartmentUser[]; total: number }> {
  return request.post('/admin/users', {
    departmentId,
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 100,
  })
}

export function getUnassignedUsers(params?: { page?: number; pageSize?: number }): Promise<{ list: DepartmentUser[]; total: number }> {
  return request.post('/admin/users', {
    departmentId: null,
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 100,
  })
}
