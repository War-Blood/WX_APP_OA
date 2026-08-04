import request from '@/utils/request'

export interface AdminLoginParams {
  account: string
  password: string
  totp?: string
  captchaToken: string
}

export interface AdminLoginResult {
  token: string
  user: {
    id: number
    nickname: string
    userName: string
    email: string
    phone?: string
    avatar_url: string
    role: string
    department: string
    position: string
  }
}

export interface CaptchaData {
  captchaId: string
  goalX: number
}

export interface CaptchaVerifyResult {
  token: string
}

/** 管理员账号密码登录 */
export function adminLogin(data: AdminLoginParams): Promise<AdminLoginResult> {
  return request.post('/auth/admin/login', data)
}

/** 获取当前用户资料 */
export function getProfile(): Promise<AdminLoginResult['user']> {
  return request.get('/user/profile')
}

/** 更新当前用户资料 */
export function updateProfile(data: {
  nickname?: string
  phone?: string
  email?: string
  position?: string
}): Promise<AdminLoginResult['user']> {
  return request.put('/user/profile', data)
}

/** 修改当前用户密码 */
export function changePassword(data: {
  currentPassword: string
  newPassword: string
}): Promise<{ success: boolean }> {
  return request.post('/user/change-password', data)
}

/** 获取滑动验证 */
export function getCaptcha(): Promise<CaptchaData> {
  return request.get('/auth/captcha')
}

/** 验证滑动轨迹 */
export function verifyCaptcha(captchaId: string, track: Array<{ x: number; t: number }>): Promise<CaptchaVerifyResult> {
  return request.post('/auth/captcha/verify', { captchaId, track })
}

/** 退出登录并注销当前 Token */
export function logout(): Promise<{ success: boolean }> {
  return request.post('/auth/logout')
}
