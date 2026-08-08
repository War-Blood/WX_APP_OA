import { statsApi } from '@/services/modules/stats'

const SUBSCRIBE_TEMPLATE_ID = 'VHg7c_RAaB1hu772YDtQllDOSDelBUR20h_PtDLxgKc'

/**
 * 公出日志入口点击时续订「日报提醒」订阅
 * 仅在订阅已消耗(subscribed=false)时才调 requestSubscribeMessage 续订, 避免平时进公出日志反复弹窗
 * 勾选"总是保持以上选择，不再询问"后静默续订; 失败静默, 不影响进入公出日志
 */
export async function renewDailyReminder() {
  try {
    const status = await statsApi.getSubscribeStatus()
    if (status.data?.subscribed) return // 有额度, 不弹窗
    const res = await uni.requestSubscribeMessage({ tmplIds: [SUBSCRIBE_TEMPLATE_ID] })
    if (res[SUBSCRIBE_TEMPLATE_ID] === 'accept') {
      await statsApi.recordSubscribe([SUBSCRIBE_TEMPLATE_ID]).catch(() => {})
    }
  } catch (e) { /* 静默失败 */ }
}
