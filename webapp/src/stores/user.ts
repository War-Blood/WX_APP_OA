import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface UserInfo {
  userId: string
  nickName: string
  avatarUrl: string
  role: string
  department: string
  permissions: string[]
}

export const useUserStore = defineStore('user', () => {
  // State — 从 localStorage 恢复，防止刷新后丢失
  const token = ref<string>(localStorage.getItem('token') || '')
  const userInfo = ref<UserInfo | null>(
    (() => { try { const s = localStorage.getItem('userInfo'); return s ? JSON.parse(s) : null } catch { return null } })()
  )

  // Getters
  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value?.role === 'admin' || userInfo.value?.role === 'superadmin')

  // Actions
  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  const setUserInfo = (info: UserInfo) => {
    userInfo.value = info
    localStorage.setItem('userInfo', JSON.stringify(info))
  }

  const logout = () => {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  const refreshProfile = async () => {
    const { getProfile } = await import('@/api/auth')
    const user = await getProfile()
    setUserInfo({
      userId: String(user.id),
      nickName: user.nickname || user.userName,
      avatarUrl: user.avatar_url || '',
      role: user.role || '',
      department: user.department || '',
      permissions: []
    })
  }

  // 检查权限
  const hasPermission = (permission: string) => {
    return userInfo.value?.permissions?.includes(permission) || false
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    isAdmin,
    setToken,
    setUserInfo,
    logout,
    hasPermission,
    refreshProfile
  }
})
