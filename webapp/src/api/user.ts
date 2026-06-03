import request from '@/utils/request'

export interface UserItem {
  userId: string
  nickName: string
  avatarUrl: string
  role: string
  department: string
  phone?: string
  email?: string
  status: string
  lastLoginTime?: string
}

export interface UserListResult {
  total: number
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

/** 获取用户列表(管理员) */
export function getUserList(params: UserListParams): Promise<UserListResult> {
  return request.post('/admin/users', params)
}

/** 设置/取消管理员角色 */
export function setAdminRole(userId: string, role: string): Promise<{ userId: string; role: string }> {
  return request.post('/admin/setAdmin', { userId, role })
}

/** 禁用/启用用户 */
export function toggleUserStatus(userId: string, status: string): Promise<{ userId: string; status: string }> {
  return request.post('/admin/toggleUser', { userId, status })
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
