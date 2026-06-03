import { post } from '../request'

export const approvalApi = {
  getList(params) {
    return post('/api/approval/list', params)
  },

  getDetail(id) {
    return post('/api/approval/detail', { id })
  },

  create(data) {
    return post('/api/approval/create', data)
  },

  approve(id, data) {
    return post('/api/approval/approve', { id, ...data })
  },

  getApprovers() {
    return post('/api/admin/users', { pageSize: 100, role: 'admin', status: 'active' })
  }
}
