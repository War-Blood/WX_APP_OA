import request from '@/utils/request'

export interface UserItem {
  userId: string
  nickName: string
  userName: string
  avatarUrl: string
  role: string
  department: string
  departmentId?: number | null
  position?: string
  phone?: string
  email?: string
  status: string
  bizTripStatus?: string  // 'field' | 'office'
  lastLoginTime?: string
  createdAt?: string
}

export interface UserListResult {
  total: number
  page: number
  pageSize: number
  list: UserItem[]
}

export interface UserListParams {
  page?: number
  pageSize?: number
  keyword?: string
  role?: string
  department?: string
  status?: string
}

export interface UpdateUserParams {
  userName?: string
  email?: string
  phone?: string
  departmentId?: number | null
  position?: string
  role?: string
}

export interface BatchImportItem {
  openid: string
  userName?: string
  department?: string
  departmentId?: number
  role?: string
}

export interface BatchImportResult {
  total: number
  success: number
  skipped: number
  failed: number
  details: Array<{ openid: string; reason?: string }>
}

export interface DepartmentItem {
  id: number
  name: string
  parentId?: number | null
  sortOrder?: number
  status: string
  children?: DepartmentItem[]
}

export interface RoleItem {
  id: number
  code: string
  name: string
  description?: string
  isSystem: boolean
  status: string
}

// ==============================
// 用户管理
// ==============================

/** 获取用户列表(管理员) */
export function getUserList(params: UserListParams): Promise<UserListResult> {
  return request.post('/admin/users', params)
}

/** 获取用户详情 */
export function getUserDetail(userId: string): Promise<UserItem> {
  return request.get(`/admin/users/${userId}`)
}

/** 更新用户信息 */
export function updateUser(userId: string, data: UpdateUserParams): Promise<{ userId: string }> {
  return request.put(`/admin/users/${userId}`, data)
}

/** 批量导入用户 */
export function batchImportUsers(users: BatchImportItem[]): Promise<BatchImportResult> {
  return request.post('/admin/users/batch', { users })
}

/** 设置/取消管理员角色 */
export function setAdminRole(userId: string, role: string): Promise<{ userId: string; role: string }> {
  return request.post('/admin/setAdmin', { userId, role })
}

/** 禁用/启用用户 */
export function toggleUserStatus(userId: string, status: string): Promise<{ userId: string; status: string }> {
  return request.post('/admin/toggleUser', { userId, status })
}

/** 设置用户出差状态 */
export function setBizTripStatus(userId: string, bizTripStatus: 'field' | 'office'): Promise<{ userId: string; bizTripStatus: string }> {
  return request.post('/admin/set-biz-trip', { userId, bizTripStatus })
}

/** 批量设置用户出差状态 */
export function batchSetBizTripStatus(userIds: (string | number)[], bizTripStatus: 'field' | 'office'): Promise<{ updated: number }> {
  return request.post('/admin/batch-set-biz-trip', { userIds, bizTripStatus })
}

/** 预注册用户（管理员添加 openid） */
export function createUser(data: { openid: string; userName?: string; department?: string; role?: string }): Promise<{ userId: string; openid: string; status: string }> {
  return request.post('/admin/createUser', data)
}

/** 审核通过用户 */
export function approveUser(userId: string): Promise<{ userId: string; status: string }> {
  return request.post('/admin/approveUser', { userId })
}

/** 设置用户密码（管理员） */
export function setUserPassword(userId: string, password: string): Promise<{ userId: string }> {
  return request.post('/admin/setPassword', { userId, password })
}

/** 删除用户（管理员，软删除） */
export function deleteUser(userId: string): Promise<{ userId: string; deleted: boolean }> {
  return request.post('/admin/deleteUser', { userId })
}

// ==============================
// 部门管理
// ==============================

/** 获取部门树 */
export function getDepartmentTree(): Promise<DepartmentItem[]> {
  return request.get('/admin/departments')
}

/** 获取部门列表（扁平） */
export function getDepartmentList(): Promise<DepartmentItem[]> {
  return request.get('/admin/departments', { params: { flat: 'true' } })
}

/** 创建部门 */
export function createDepartment(data: { name: string; parentId?: number; sortOrder?: number; description?: string }): Promise<{ id: number; name: string }> {
  return request.post('/admin/departments', data)
}

/** 更新部门 */
export function updateDepartment(id: number, data: { name?: string; parentId?: number; sortOrder?: number; description?: string }): Promise<void> {
  return request.put(`/admin/departments/${id}`, data)
}

/** 删除部门 */
export function deleteDepartment(id: number): Promise<void> {
  return request.delete(`/admin/departments/${id}`)
}

// ==============================
// 角色管理
// ==============================

/** 获取角色列表 */
export function getRoleList(): Promise<RoleItem[]> {
  return request.get('/admin/roles')
}
