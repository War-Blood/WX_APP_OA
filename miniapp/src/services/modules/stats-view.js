import { get } from '../request'

/**
 * 统计视图 API（观看被授权视图）
 */
export const statsViewApi = {
  /** 当前角色可见视图列表（按统计页） */
  list(statKey) {
    return get('/stats/views', { statKey })
  },
  /** 视图详情 */
  detail(id) {
    return get(`/stats/views/${id}`)
  }
}
