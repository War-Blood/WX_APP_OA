import { post } from '../request'

export const reviewApi = {
  getList(params) {
    return post('/api/project/reviewList', params)
  },

  getDetail(id) {
    return post('/api/project/reviewDetail', { id })
  },

  doAction(id, action, opinion) {
    return post('/api/project/reviewAction', { id, action, opinion })
  },

  // reject 是 doAction 的便捷方法
  reject(id, opinion) {
    return post('/api/project/reviewAction', { id, action: 'reject', opinion })
  },

  approve(id, opinion) {
    return post('/api/project/reviewAction', { id, action: 'approve', opinion })
  },

  getReviewStats(params) {
    return post('/api/project/reviewStats', params)
  }
}
