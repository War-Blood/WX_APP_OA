import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import router from '@/router'

// 创建axios实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Token 自动续期（每天一次，防并发）
let isRefreshing = false
let refreshPromise: Promise<void> | null = null
const REFRESH_INTERVAL = 24 * 3600 * 1000

async function ensureFreshToken() {
  const userStore = useUserStore()
  const token = userStore.token
  if (!token) return

  const lastRefresh = localStorage.getItem('token_refreshed_at')
  if (lastRefresh && Date.now() - Number(lastRefresh) < REFRESH_INTERVAL) return

  if (isRefreshing) { await refreshPromise; return }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const res = await axios.post(
        (import.meta.env.VITE_API_BASE_URL || '') + '/api/auth/refresh-token',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.data?.code === 0) {
        userStore.setToken(res.data.data.token)
        localStorage.setItem('token_refreshed_at', String(Date.now()))
      }
    } catch { /* 静默失败，下次再试 */ }
    finally { isRefreshing = false; refreshPromise = null }
  })()
  await refreshPromise
}

// 请求拦截器
request.interceptors.request.use(
  async (config) => {
    const userStore = useUserStore()
    const token = userStore.token

    if (token) {
      // Token 自动续期（非刷新接口本身，避免递归）
      if (!config.url?.includes('/auth/refresh-token')) {
        await ensureFreshToken()
        config.headers.Authorization = `Bearer ${userStore.token}`
      } else {
        config.headers.Authorization = `Bearer ${token}`
      }
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data

    // 成功
    if (code === 0) {
      return data
    }

    // 业务错误
    ElMessage.error(message || '请求失败')
    return Promise.reject(new Error(message))
  },
  (error) => {
    const { response } = error

    if (response) {
      switch (response.status) {
        case 401:
          ElMessage.error('登录已过期，请重新登录')
          useUserStore().logout()
          router.push('/login')
          break
        case 403:
          ElMessage.error('没有权限访问')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器错误')
          break
        default:
          ElMessage.error(response.data?.message || '网络错误')
      }
    } else {
      ElMessage.error('网络连接失败')
    }

    return Promise.reject(error)
  }
)

export default request
