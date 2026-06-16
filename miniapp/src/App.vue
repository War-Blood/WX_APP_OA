<!--
 * @FilePath: \miniapp\src\App.vue
 * @Brief: 
 * @Version: 1.0
 * @Date: 2026-05-27 15:52:58
 * @Author: WarBlood
 * @Copyright: none
 * @LastEditors: WarBlood
 * @LastEditTime: 2026-05-27 16:39:23
-->
<script setup>
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

onLaunch(() => {
  // 预加载模块可见性配置
  appStore.fetchModules()

  const token = uni.getStorageSync('token')
  const pages = getCurrentPages()
  if (token && (!pages.length || pages[0].route === 'pages/login/index')) {
    uni.switchTab({ url: '/pages/home/index' })
  }
})

onShow(() => {
  const token = uni.getStorageSync('token')
  const pages = getCurrentPages()
  const currentRoute = pages[0]?.route || ''
  if (!token && currentRoute !== 'pages/login/index') {
    uni.reLaunch({ url: '/pages/login/index' })
  }
})
</script>

<style>
page {
  background-color: #F7F7F7;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  font-size: 28rpx;
  color: #333333;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
</style>
