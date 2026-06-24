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
          // Token 过期：后端返回 HTTP200 + code:401，需清除 token 并跳转登录
          if (responseData.code === 401) {
            uni.removeStorageSync('token')
            uni.removeStorageSync('userInfo')
            showToast('登录已过期，请重新登录')
            redirectToLogin()
            reject(new Error('Token 已过期'))
            return
          }
          // v2.0: code 2001(已代填) 属于业务状态码，需 resolve 让业务层处理
          if (responseData.code === 0 || responseData.code === 2001) {
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
    },
    // v2.0 公出日志模块升级 mock
    '/api/report/check-duplicate': {
      code: 0, data: { canSubmit: true }
    },
    '/api/report/stats': {
      code: 0, data: { scope: 'user', totalCount: 156, monthCount: 12, missingDays: 5, missingDates: ['2026-06-08', '2026-06-07'], delayedCount: 3, entryDate: '2026-03-04' }
    },
    '/api/report/daily-status': {
      code: 0, data: { date: '2026-06-13', totalWorkers: 45, summary: { submitted: 30, supplement: 2, office: 3, substituted: 5, leave: 2, rest: 1, missing: 2 }, workers: [] }
    },
    '/api/report/monthly-summary': {
      code: 0, data: { userId: 1, userName: '开发用户', month: '2026-06', totalSubmitted: 13, workDays: 22, breakdown: { '工作（陆）': 8, '工作（海）': 2, '待工': 1, '在途': 0, '请假': 1, '调休': 1 }, ratio: { '工作（陆）': '61.5%', '工作（海）': '15.4%', '待工': '7.7%', '在途': '0%', '请假': '7.7%', '调休': '7.7%' } }
    },
    '/api/report/pending-reviews': {
      code: 0, data: { list: [], total: 0 }
    },
    '/api/report/team-logs': {
      code: 0, data: { teamMembers: [], logs: [] }
    },
    '/api/admin/workers': {
      code: 0, data: { total: 3, list: [{ userId: 1, userName: '张云峰', workerCode: 'BL001', entryDate: '2026-03-04', workerStatus: 'active', totalLogs: 76 }] }
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
