import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import OaIcon from './components/oa-icon/oa-icon.vue'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.component('OaIcon', OaIcon)
  return { app }
}
