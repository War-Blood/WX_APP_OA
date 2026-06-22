import { post, get, put } from '../request'

export const authApi = {
  login(code) {
    return post('/api/auth/login', { code })
  },

  qywxLogin(code) {
    return post('/api/auth/qywx-login', { code })
  },

  getProfile() {
    return get('/api/user/profile')
  },

  updateProfile(data) {
    return put('/api/user/profile', data)
  },

  redeemInviteCode({ name, code }) {
    return post('/api/auth/redeem', { name, code })
  }
}
