import request from '@/utils/request'

export interface PermissionItem {
  id: number
  code: string
  name: string
  description?: string
}

export interface PermissionGroup {
  groupCode: string
  groupName: string
  permissions: PermissionItem[]
}

export interface RoleItem {
  id: number
  code: string
  name: string
  description?: string
  isSystem: boolean
  status: string
  groupId?: number | null
  permissions?: PermissionItem[]
}

export interface RoleGroupItem {
  id: number
  code: string
  name: string
  description?: string
  sortOrder: number
  isSystem: boolean
  status: string
}

/** 获取角色列表 */
export function getRoleList(): Promise<RoleItem[]> {
  return request.get('/admin/roles')
}

/** 获取角色详情（含权限） */
export function getRoleDetail(id: number): Promise<RoleItem> {
  return request.get(`/admin/roles/${id}`)
}

/** 创建角色 */
export function createRole(data: { code: string; name: string; description?: string; groupId?: number | null }): Promise<{ id: number }> {
  return request.post('/admin/roles', data)
}

/** 更新角色 */
export function updateRole(id: number, data: { name?: string; description?: string; status?: string; groupId?: number | null }): Promise<void> {
  return request.put(`/admin/roles/${id}`, data)
}

/** 删除角色 */
export function deleteRole(id: number): Promise<void> {
  return request.delete(`/admin/roles/${id}`)
}

/** 获取权限列表（分组） */
export function getPermissionList(): Promise<PermissionGroup[]> {
  return request.get('/admin/permissions')
}

/** 设置角色权限 */
export function setRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
  return request.put(`/admin/roles/${roleId}/permissions`, { permissionIds })
}

// ============================================
// 角色分组 — V2.5
// ============================================

export function getRoleGroupList(): Promise<RoleGroupItem[]> {
  return request.get('/admin/role-groups')
}

export function getRoleGroupDetail(id: number): Promise<RoleGroupItem> {
  return request.get(`/admin/role-groups/${id}`)
}

export function createRoleGroup(data: { code: string; name: string; description?: string; sortOrder?: number }): Promise<{ id: number }> {
  return request.post('/admin/role-groups', data)
}

export function updateRoleGroup(id: number, data: { name?: string; description?: string; sortOrder?: number }): Promise<void> {
  return request.put(`/admin/role-groups/${id}`, data)
}

export function deleteRoleGroup(id: number): Promise<void> {
  return request.delete(`/admin/role-groups/${id}`)
}
