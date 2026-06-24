import { post } from '../request'

export const messageApi = {
  getList(params) {
    return post('/api/message/list', params)
  },

  getDetail(id) {
    return post('/api/message/detail', { id })
  },

  getUnreadCount() {
    return post('/api/message/unread')
  },

  markRead(id) {
    return post('/api/message/markRead', { id })
  },

  deleteMsg(id) {
    return post('/api/message/delete', { id })
  }
}
