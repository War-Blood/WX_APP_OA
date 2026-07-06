/**
 * Toast 统一封装 — Web 端
 * 统一持续时间 1.5s，方便后续全局调整
 */

import { ElMessage } from 'element-plus'

const DURATION = 1500

export const toast = {
  success(msg: string) {
    ElMessage.success({ message: msg, duration: DURATION })
  },
  error(msg: string) {
    ElMessage.error({ message: msg, duration: DURATION })
  },
  warning(msg: string) {
    ElMessage.warning({ message: msg, duration: DURATION })
  },
  info(msg: string) {
    ElMessage.info({ message: msg, duration: DURATION })
  },
}