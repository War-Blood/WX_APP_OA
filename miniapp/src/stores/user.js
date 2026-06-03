import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/modules/auth'

const PERMISSIONS_MAP = {
  admin: ['approval:review', 'report:review', 'user:manage', 'announcement:publish', 'approval:create', 'report:submit', 'message:read'],
  superadmin: ['approval:review', 'report:review', 'user:manage', 'announcement:publish', 'system:config', 'approval:create', 'report:submit', 'message:read'],
  employee: ['approval:create', 'report:submit', 'message:read']
}

export const useUserStore = defineStore('user', () => {
  const token = ref(uni.getStorageSync('token') || '')
  const userInfo = ref(uni.getStorageSync('userInfo') || null)

  const isLoggedIn = computed(() => !!token.value)
  const userName = computed(() => userInfo.value?.nickName || '用户')
  const userAvatar = computed(() => userInfo.value?.avatarUrl || '')
  const role = computed(() => userInfo.value?.role || 'employee')
  const isAdmin = computed(() => role.value === 'admin' || role.value === 'superadmin')
  const department = computed(() => userInfo.value?.department || '')
  const permissions = computed(() => PERMISSIONS_MAP[role.value] || PERMISSIONS_MAP.employee)

  function hasPermission(permission) {
    return permissions.value.includes(permission)
  }

  function setUserInfo(info) {
    userInfo.value = info
    uni.setStorageSync('userInfo', info)
  }

  function setToken(t) {
    token.value = t
    uni.setStorageSync('token', t)
  }

  // 启动时从后端同步最新角色
  async function refreshProfile() {
    if (!token.value) return
    try {
      const res = await authApi.getProfile()
      if (res.data) {
        setUserInfo({
          ...userInfo.value,
          nickName: res.data.nickname || userInfo.value?.nickName,
          role: res.data.role,
          department: res.data.department,
        })
      }
    } catch { /* network error, keep cached */ }
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    uni.removeStorageSync('token')
    uni.removeStorageSync('userInfo')
    uni.reLaunch({ url: '/pages/login/index' })
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    userName,
    userAvatar,
    role,
    isAdmin,
    department,
    permissions,
    hasPermission,
    setUserInfo,
    setToken,
    refreshProfile,
    logout
  }
})
