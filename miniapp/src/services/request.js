import { useUserStore } from '@/stores/user'

const BASE_URL = 'https://warblood.online'

function showToast(title) {
  uni.showToast({ title, icon: 'none', duration: 2000 })
}

function redirectToLogin() {
  uni.reLaunch({ url: '/pages/login/index' })
}

function getToken() {
  return uni.getStorageSync('token')
}

async function realRequest(config) {
  const { url, method, data, params } = config
  const token = getToken()

  // dev-mode-token: 仅开发环境可用，生产构建中不生效
  if (process.env.NODE_ENV === 'development' && token === 'dev-mode-token') {
    return handleDevMock(url)
  }

  const header = {
    'Content-Type': 'application/json'
  }
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${url}`,
      method: method || 'GET',
      data,
      header,
      success: (res) => {
        const { statusCode, data: responseData } = res
        if (statusCode === 401) {
          showToast('登录已过期，请重新登录')
          redirectToLogin()
          reject(new Error('Unauthorized'))
          return
        }
        if (statusCode >= 200 && statusCode < 300) {
          if (responseData.code === 0) {
            resolve(responseData)
          } else {
            showToast(responseData.message || '请求失败')
            reject(new Error(responseData.message || '请求失败'))
          }
        } else {
          showToast(`服务器错误: ${statusCode}`)
          reject(new Error(`HTTP ${statusCode}`))
        }
      },
      fail: (err) => {
        showToast('网络异常，请检查网络连接')
        reject(err)
      }
    })
  })
}

function handleDevMock(url) {
  const mockMap = {
    '/api/stats/home': {
      code: 0, data: { pendingCount: 3, submitCount: 1, reviewCount: 5, processedCount: 28, unreadCount: 5 }
    },
    '/api/stats/activities': {
      code: 0, data: { list: [{ id: 1, type: 'approval', text: '开发模式-示例动态', time: '现在', date: '今天', iconBg: '#F0FDF4' }], total: 1, page: 1, pageSize: 20 }
    },
    '/api/stats/profile': {
      code: 0, data: { reportCount: 0, approvalCount: 0, pendingApprovalCount: 0, continuousDays: 0 }
    },
    '/api/approval/list': {
      code: 0, data: { list: [], total: 0 }
    },
    '/api/report/list': {
      code: 0, data: { list: [], total: 0 }
    },
    '/api/message/list': {
      code: 0, data: { list: [], total: 0, unreadCount: 0 }
    },
    '/api/message/unread': {
      code: 0, data: { count: 0 }
    },
    '/api/project/reviewList': {
      code: 0, data: { list: [], total: 0, stats: { pending: 0, todayReviewed: 0, avgTime: '-' } }
    },
    '/api/project/reviewStats': {
      code: 0, data: { pendingCount: 0, todayReviewedCount: 0, avgProcessTime: '-', approveRate: '0%' }
    },
    '/api/user/profile': {
      code: 0, data: { userId: 'dev', nickName: '开发用户', avatarUrl: '', role: 'admin', department: '技术部', permissions: [] }
    }
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockMap[url] || { code: 0, data: null, message: 'success' })
    }, 200)
  })
}

function request(config) {
  return realRequest(config)
}

export function get(url, data) {
  return request({ url, method: 'GET', data })
}

export function post(url, data) {
  return request({ url, method: 'POST', data })
}

export function put(url, data) {
  return request({ url, method: 'PUT', data })
}

export function del(url, data) {
  return request({ url, method: 'DELETE', data })
}
