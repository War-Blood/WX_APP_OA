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
  }
}
