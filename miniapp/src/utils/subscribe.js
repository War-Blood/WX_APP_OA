import { statsApi } from '@/services/modules/stats'

const SUBSCRIBE_TEMPLATE_ID = 'VHg7c_RAaB1hu772YDtQllDOSDelBUR20h_PtDLxgKc'

/**
 * 公出日志入口点击时续订「日报提醒」订阅
 * 勾选"总是保持以上选择，不再询问"后: requestSubscribeMessage 不再弹窗, 静默累加一次下发额度
 * 失败静默, 不影响进入公出日志
 */
export function renewDailyReminder() {
  uni.requestSubscribeMessage({ tmplIds: [SUBSCRIBE_TEMPLATE_ID] })
    .then((res) => {
      if (res[SUBSCRIBE_TEMPLATE_ID] === 'accept') {
        statsApi.recordSubscribe([SUBSCRIBE_TEMPLATE_ID]).catch(() => {})
      }
    })
    .catch(() => {})
}
