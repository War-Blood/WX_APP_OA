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

  getMonthlySummary(params) {
    return post('/api/report/monthly-summary', params)
  },

  // M2: 日历热力图 + 项目进展
  getDailyCounts(month) {
    return post('/api/stats/daily-counts', { month })
  },

  getProjectProgress(month) {
    return post('/api/stats/project-progress', { month })
  }
}
