<!--
 * @FilePath: \miniapp\src\App.vue
 * @Brief: 
 * @Version: 见 manifest.json versionName（由 scripts/inject-version.js 自动注入）
 * @Date: 2026-05-27 15:52:58
 * @Author: WarBlood
 * @Copyright: none
 * @LastEditors: WarBlood
 * @LastEditTime: 2026-05-27 16:39:23
-->
<script setup>
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import { authApi } from '@/services/modules/auth'

const appStore = useAppStore()
const REFRESH_INTERVAL = 24 * 3600 * 1000 // 1 天

function tryAutoRefresh() {
  const token = uni.getStorageSync('token')
  if (!token) return
  const lastRefresh = uni.getStorageSync('token_refreshed_at') || 0
  if (Date.now() - lastRefresh < REFRESH_INTERVAL) return

  uni.request({
    url: 'https://warblood.online/api/auth/refresh-token',
    method: 'POST',
    header: { 'Authorization': 'Bearer ' + token },
    success: (res) => {
      if (res.data?.code === 0) {
        uni.setStorageSync('token', res.data.data.token)
        uni.setStorageSync('token_refreshed_at', Date.now())
      }
    },
    fail: () => { /* 静默失败，下次再试 */ }
  })
}

// 邀请码注册用户（cdk_ openid）静默绑定真实微信 openid，使电脑端微信也可登录
async function tryBindWechat() {
  const token = uni.getStorageSync('token')
  if (!token) return

  // 从后端获取最新 needsWechatBind（兼容旧本地 userInfo 无此字段）
  let needsBind = false
  try {
    const res = await authApi.getProfile()
    needsBind = !!res.data?.needsWechatBind
    const userInfo = uni.getStorageSync('userInfo') || {}
    userInfo.needsWechatBind = needsBind
    uni.setStorageSync('userInfo', userInfo)
  } catch { return }

  if (!needsBind) return

  try {
    const { code } = await uni.login({ provider: 'weixin' })
    if (!code) return
    await authApi.bindWechat(code)
    const userInfo = uni.getStorageSync('userInfo') || {}
    userInfo.needsWechatBind = false
    uni.setStorageSync('userInfo', userInfo)
    tryAutoRefresh() // 刷新 token，使其携带真实 openid
  } catch { /* 静默失败，下次启动重试 */ }
}

onLaunch(() => {
  appStore.fetchModules()
  tryBindWechat()

  const token = uni.getStorageSync('token')
  const pages = getCurrentPages()
  if (token && (!pages.length || pages[0].route === 'pages/login/index')) {
    // 检查用户审核状态
    const userInfo = uni.getStorageSync('userInfo')
    if (userInfo && userInfo.status === 'pending') {
      uni.reLaunch({ url: '/pages/login/index?pending=1' })
      return
    }
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
  // pending 用户不能进入功能页
  const userInfo = uni.getStorageSync('userInfo')
  if (userInfo?.status === 'pending' && currentRoute !== 'pages/login/index') {
    uni.reLaunch({ url: '/pages/login/index?pending=1' })
  }
  // Token 自动续期（每天一次）
  tryAutoRefresh()
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
