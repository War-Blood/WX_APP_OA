import { post } from '../request'

/**
 * 数据统计 API 模块
 */
export const statsApi = {
  /**
   * 获取首页统计数据
   * @param {string} role - 用户角色：employee / admin
   * @returns {Promise} 统计数据
   */
  getHomeStats(role) {
    return post('/api/stats/home', { role })
  },

  /**
   * 获取最近动态列表（分页）
   * @param {Object} params - 查询参数
   * @param {number} params.page - 当前页码
   * @param {number} params.pageSize - 每页条数
   * @returns {Promise} 动态列表
   */
  getActivities(params) {
    return post('/api/stats/activities', params)
  },

  /**
   * 获取个人中心统计
   * @returns {Promise} 个人统计数据
   */
  getProfileStats() {
    return post('/api/stats/profile')
  },

  /**
   * 记录微信订阅消息授权
   * @param {string[]} templateIds - 模板ID列表
   */
  recordSubscribe(templateIds) {
    return post('/api/compliance/subscribe', { templateIds })
  },

  /**
   * 查询当前用户订阅状态
   */
  getSubscribeStatus() {
    return post('/api/compliance/subscribe-status', {})
  }
}
