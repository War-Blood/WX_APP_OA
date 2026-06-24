import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

export function useAuth() {
  const userStore = useUserStore()

  const isLoggedIn = computed(() => userStore.isLoggedIn)
  const userInfo = computed(() => userStore.userInfo)
  const token = computed(() => userStore.token)

  function checkAuth() {
    if (!userStore.isLoggedIn) {
      uni.reLaunch({ url: '/pages/login/index' })
      return false
    }
    return true
  }

  return {
    isLoggedIn,
    userInfo,
    token,
    checkAuth
  }
}
