import request from '@/utils/request'

/**
 * 合规管理API
 */
export const complianceApi = {
  /**
   * 设置出差状态
   */
  setBizTripStatus(data: { userId: number; projectName?: string; startDate: string }) {
    return request.post('/compliance/biz-trip', data)
  },
  
  /**
   * 结束出差
   */
  endBizTrip(id: number, endDate: string) {
    return request.put(`/compliance/biz-trip/${id}/end`, { endDate })
  },
  
  /**
   * 获取出差列表
   */
  getBizTripList(params: { status?: string; page?: number; pageSize?: number }) {
    return request.get('/compliance/biz-trip/list', { params })
  },
  
  /**
   * 获取缺失报告列表
   */
  getMissingReports(params: { page?: number; pageSize?: number; startDate?: string; endDate?: string }) {
    return request.get('/compliance/missing-reports', { params })
  },
  
  /**
   * 审核缺失报告
   */
  reviewMissingReport(id: number, data: { action: 'approve' | 'reject'; comment?: string }) {
    return request.post(`/compliance/missing-reports/${id}/review`, data)
  },
  
  /**
   * 更新及时性标记
   */
  updateTimeliness(id: number, timeliness: 'on_time' | 'delayed' | 'missing') {
    return request.put(`/compliance/timeliness/${id}`, { timeliness })
  },
  
  /**
   * 获取合规统计看板
   */
  getDashboard(params?: { startDate?: string; endDate?: string }) {
    return request.get('/compliance/stats/dashboard', { params })
  },
  
  /**
   * 获取我的合规记录
   */
  getMyCompliance() {
    return request.get('/compliance/my-compliance')
  },
  
  /**
   * 检查我的出差状态
   */
  checkMyBizTripStatus() {
    return request.get('/compliance/biz-trip/check-status')
  }
}
