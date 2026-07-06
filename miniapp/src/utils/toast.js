/**
 * Toast 统一封装 — 小程序端
 * 统一持续时间 1.5s，方便后续全局调整
 */

const DURATION = 1500

/**
 * 普通提示
 * @param {string} title - 提示文字
 * @param {'none'|'success'|'error'|'loading'} [icon='none'] - 图标类型
 */
export function showToast(title, icon = 'none') {
  uni.showToast({ title, icon, duration: DURATION })
}

/** 成功提示 */
export function showSuccess(title) {
  showToast(title, 'success')
}

/** 错误提示 */
export function showError(title) {
  showToast(title, 'none')
}