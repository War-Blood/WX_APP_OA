/**
 * 客户端错误上报工具
 * 捕获小程序运行时的错误并上报到后端
 *
 * 用法：在 App.vue 或 main.js 中引入
 *   import '@/utils/error-reporter'
 *
 * 上报地址：POST /api/client-error
 */

const ERROR_API = '/api/client-error'

function reportError({ message, stack, url, component, extra } = {}) {
  // 只在非 Mock 模式下上报
  if (import.meta.env.VITE_USE_MOCK === 'true') return

  const data = {
    message: message || '',
    stack: stack || '',
    url: url || (typeof window !== 'undefined' ? window.location.href : ''),
    component: component || '',
    extra: extra || {},
  }

  uni.request({
    url: `https://warblood.online${ERROR_API}`,
    method: 'POST',
    data,
    header: { 'Content-Type': 'application/json' },
    fail: () => {
      // 上报失败不处理，避免死循环
    }
  })
}

// 捕获全局 JS 错误
const origOnError = globalThis.onError
globalThis.onError = function (message, source, lineno, colno, error) {
  reportError({
    message: typeof message === 'string' ? message : (message?.message || 'Unknown error'),
    stack: error?.stack || '',
    url: source,
  })
  origOnError?.call(globalThis, message, source, lineno, colno, error)
}

// 捕获未处理的 Promise 拒绝
const origOnUnhandledRejection = globalThis.onUnhandledRejection
globalThis.onUnhandledRejection = function (event) {
  const reason = event?.reason || event || {}
  reportError({
    message: reason?.message || 'Unhandled Promise rejection',
    stack: reason?.stack || '',
  })
  origOnUnhandledRejection?.call(globalThis, event)
}

export default { reportError }
