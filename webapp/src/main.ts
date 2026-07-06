import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 全局样式
import './styles/index.scss'

// 统一消息弹窗持续时间为 1.5s（ElMessage 默认 3s）
const TOAST_DURATION = 1500
const _orig = { ...ElMessage } as Record<string, any>
;['success', 'warning', 'info', 'error'].forEach((type) => {
  const fn = _orig[type]
  ;(ElMessage as any)[type] = (msg: any, opts?: any) => {
    if (typeof msg === 'string') return fn({ message: msg, duration: TOAST_DURATION, ...opts })
    return fn({ duration: TOAST_DURATION, ...msg })
  }
})

const app = createApp(App)

// 全局注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
