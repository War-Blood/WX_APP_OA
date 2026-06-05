import request from '@/utils/request'

export interface AdminLoginParams {
  account: string
  password: string
  totp?: string
}

export interface AdminLoginResult {
  token: string
  user: {
    id: number
    nickname: string
    userName: string
    email: string
    avatar_url: string
    role: string
    department: string
    position: string
  }
}

/** 管理员账号密码登录 */
export function adminLogin(data: AdminLoginParams): Promise<AdminLoginResult> {
  return request.post('/auth/admin/login', data)
}

/** 获取当前用户资料 */
export function getProfile(): Promise<AdminLoginResult['user']> {
  return request.get('/user/profile')
}
