import { post, get } from '../request'

export const adminApi = {
  getWorkerList(params) {
    return post('/api/admin/workers', { action: 'list', ...params })
  },

  // 获取小程序端可见模块列表
  getModules() {
    return get('/api/modules', { platform: 'miniapp' })
  }
}
