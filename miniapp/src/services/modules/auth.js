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

  redeemInviteCode({ name, code, wxCode }) {
    return post('/api/auth/redeem', { name, code, wxCode })
  },

  bindWechat(code) {
    return post('/api/auth/bind-wechat', { code })
  },

  accountLogin({ account, password }) {
    return post('/api/auth/account-login', { account, password })
  }
}
