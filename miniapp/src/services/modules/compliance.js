import { get, post, put } from '../request'

/**
 * 合规管理API模块
 */
export const complianceApi = {
  /**
   * 设置出差状态(管理员)
   */
  setBizTripStatus(data) {
    return post('/api/compliance/biz-trip', data)
  },
  
  /**
   * 结束出差(管理员)
   */
  endBizTrip(id, endDate) {
    return put(`/api/compliance/biz-trip/${id}/end`, { endDate })
  },
  
  /**
   * 获取出差列表(管理员)
   */
  getBizTripList(params) {
    return get('/api/compliance/biz-trip/list', params)
  },
  
  /**
   * 获取缺失报告列表(管理员)
   */
  getMissingReports(params) {
    return get('/api/compliance/missing-reports', params)
  },
  
  /**
   * 审核缺失报告(管理员)
   */
  reviewMissingReport(id, data) {
    return post(`/api/compliance/missing-reports/${id}/review`, data)
  },
  
  /**
   * 更新及时性标记(管理员)
   */
  updateTimeliness(id, timeliness) {
    return put(`/api/compliance/timeliness/${id}`, { timeliness })
  },
  
  /**
   * 获取合规统计看板(管理员)
   */
  getDashboard(params) {
    return get('/api/compliance/stats/dashboard', params)
  },
  
  /**
   * 获取我的合规记录
   */
  getMyCompliance() {
    return get('/api/compliance/my-compliance')
  },
  
  /**
   * 检查我的出差状态
   */
  checkMyBizTripStatus() {
    return get('/api/compliance/biz-trip/check-status')
  }
}
