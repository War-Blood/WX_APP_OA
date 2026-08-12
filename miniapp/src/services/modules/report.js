import { post, get } from '../request'

export const reportApi = {
  getList(params) {
    return post('/api/report/list', params)
  },

  getDetail(id) {
    return post('/api/report/detail', { id })
  },

  submit(data) {
    return post('/api/report/submit', data)
  },

  saveDraft(data) {
    return post('/api/report/draft', data)
  },

  getDraft(reportDate) {
    return get('/api/report/draft', { reportDate })
  },

  deleteReport(id) {
    return post('/api/report/delete', { id })
  },

  getWorkerList() {
    return get('/api/report/workerList')
  },

  // v2.0 新增：公出日志模块升级
  checkDuplicate(params) {
    return post('/api/report/check-duplicate', params)
  },

  getTodayStatus(params) {
    return post('/api/report/today-status', params)
  },

  getStats(params) {
    return post('/api/report/stats', { scope: 'user', ...params })
  },

  getTeamLogs(params) {
    return post('/api/report/team-logs', params)
  },

  getPendingReviews(params) {
    return post('/api/report/pending-reviews', params)
  },

  reviewSupplement(params) {
    return post('/api/report/supplement-review', params)
  },

  getDailyStatus(params) {
    return post('/api/report/daily-status', params)
  },

  getTomorrowStatus(params) {
    return post('/api/report/tomorrow-status', params)
  },

  getMonthlySummary(params) {
    return post('/api/report/monthly-summary', params)
  },

  // M2: 日历热力图 + 项目进展
  getDailyCounts(month, viewId) {
    return post('/api/stats/daily-counts', { month, viewId })
  },

  getProjectProgress(month) {
    return post('/api/stats/project-progress', { month })
  },

  // M3: 人员工作类型分布
  getWorkerWorkTypes(month, viewId) {
    return post('/api/stats/worker-work-types', { month, viewId })
  },

  // M4: 区域分布
  getAreaDistribution(month, viewId) {
    return post('/api/stats/area-distribution', { month, viewId })
  },

  // 用户月度公出日志明细
  getUserMonthlyLogs(userId, month) {
    return post('/api/stats/user-monthly-logs', { userId, month })
  },

  // 省份下钻人员列表
  getProvinceWorkers(province) {
    return post('/api/stats/province-workers', { province })
  }
}
