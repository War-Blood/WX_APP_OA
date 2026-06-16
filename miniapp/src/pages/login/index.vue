<template>
  <view class="login-page" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- Spacer: 200px from Ardot Status bottom (62px total status area - 44px native = 18px extra) -->
    <view class="top-spacer" />

    <!-- Logo centered: 80×80 white square + title + slogan -->
    <view class="logo-section">
      <view class="logo-box" @tap="devKnock">
        <text class="logo-oa">OA</text>
      </view>
      <text class="app-name">智慧办公助手</text>
      <text class="slogan">轻量化办公 · 高效能协作</text>
    </view>

    <!-- Bottom actions: fills remaining, aligned to bottom -->
    <view class="action-section">
      <view class="login-btn" @tap="handleLogin" :class="{ 'login-btn--loading': isLogging }">
        <text class="login-text">{{ isLogging ? '登录中...' : '微信一键登录' }}</text>
      </view>

      <view class="agreement" @tap="toggleAgreement">
        <view :class="['checkbox', { checked: agreed }]">
          <text v-if="agreed" class="check-tick">✓</text>
        </view>
        <text class="agreement-text">
          登录即同意<text class="agreement-link">《用户协议》</text>和<text class="agreement-link">《隐私政策》</text>
        </text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { authApi } from '@/services/modules/auth'

const statusBarHeight = ref(0)
const agreed = ref(false)
const isLogging = ref(false)
// 开发后门：连击 logo 5 次，仅 dev 生效；生产构建 process.env.NODE_ENV 为 production，条件编译移除
const devTapCount = ref(0)
let devTapTimer = null

 // #ifdef MP-WEIXIN
const isQywx = typeof wx.qy !== 'undefined'
 // #endif
 // #ifndef MP-WEIXIN
const isQywx = false
 // #endif

onMounted(() => {
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 44
})

function devKnock() {
  // #ifndef PRODUCTION
  devTapCount.value++
  clearTimeout(devTapTimer)
  if (devTapCount.value >= 5) {
    devTapCount.value = 0
    showDevRolePicker()
    return
  }
  devTapTimer = setTimeout(() => { devTapCount.value = 0 }, 2000)
  // #endif
}

function toggleAgreement() { agreed.value = !agreed.value }

function goHome() { uni.switchTab({ url: '/pages/home/index' }) }

function showDevRolePicker() {
  uni.showActionSheet({
    itemList: ['员工模式', '管理员模式'],
    success: (res) => {
      const roleConfig = [
        { role: 'employee', nickName: '开发用户(员工)', department: '技术部' },
        { role: 'admin', nickName: '开发用户(管理员)', department: '管理部' }
      ]
      const config = roleConfig[res.tapIndex]
      uni.setStorageSync('token', 'dev-mode-token')
      uni.setStorageSync('userInfo', {
        nickName: config.nickName, avatarUrl: '', role: config.role, department: config.department
      })
      goHome()
    }
  })
}

async function handleLogin() {
  if (!agreed.value) { uni.showToast({ title: '请先阅读并同意协议', icon: 'none' }); return }
  isLogging.value = true
  try {
    let res
    if (isQywx) {
      const qywxCode = await new Promise((resolve, reject) => {
        wx.qy.login({ success: (r) => resolve(r.code), fail: reject })
      })
      res = await authApi.qywxLogin(qywxCode)
    } else {
      const { code } = await uni.login({ provider: 'weixin' })
      res = await authApi.login(code)
    }
    if (res.data?.token) {
      uni.setStorageSync('token', res.data.token)
      uni.setStorageSync('userInfo', res.data.user)
      // pending 用户显示等待审核
      if (res.data.user?.status === 'pending') {
        uni.showModal({
          title: '等待审核',
          content: '您的账号正在审核中，请联系管理员审核通过后再登录。',
          showCancel: false,
          confirmText: '我知道了',
          success: () => uni.removeStorageSync('token')
        })
        isLogging.value = false
        return
      }
      goHome()
      if (!res.data.user?.nickname) {
        setTimeout(() => askNickname(), 500)
      }
    }
  } catch (err) {
    if (err?.message) {
      uni.showToast({ title: err.message, icon: 'none' })
    }
  } finally { isLogging.value = false }
}

async function askNickname() {
  uni.showModal({
    title: '设置昵称',
    content: '请输入您的姓名，方便同事识别',
    editable: true,
    placeholderText: '请输入真实姓名',
    success: async (modalRes) => {
      if (modalRes.confirm && modalRes.content?.trim()) {
        try {
          await authApi.updateProfile({ nickname: modalRes.content.trim() })
          const info = uni.getStorageSync('userInfo') || {}
          info.nickname = modalRes.content.trim()
          uni.setStorageSync('userInfo', info)
          uni.showToast({ title: '昵称设置成功', icon: 'success' })
        } catch { uni.showToast({ title: '设置失败，稍后在个人中心修改', icon: 'none' }) }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.login-page {
  width: 100%; height: 100vh; display: flex; flex-direction: column; align-items: center;
  background: linear-gradient(180deg, #144EC2 0%, #3373EB 100%);
  overflow: hidden;
}

/* Spacer: Ardot from Status(62px)→Logo(262px) = 200px */
.top-spacer {
  height: 400rpx;
  flex-shrink: 0;
}

/* Logo: 80×80 white, 20px radius, blue "OA" text */
.logo-section {
  display: flex; flex-direction: column; align-items: center; gap: 36rpx; flex-shrink: 0;
}
.logo-box {
  width: 160rpx; height: 160rpx; background: #FFFFFF; border-radius: 40rpx;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 16rpx 56rpx rgba(13, 46, 148, 0.45);
}
.logo-oa { font-size: 60rpx; font-weight: 700; color: #1B5AD0; }
.app-name { font-size: 52rpx; font-weight: 700; color: #FFFFFF; letter-spacing: 4rpx; }
.slogan { font-size: 28rpx; color: rgba(255, 255, 255, 0.9); letter-spacing: 2rpx; }

/* Bottom: fills remaining space, items aligned to bottom */
.action-section {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  padding-bottom: 80rpx; gap: 36rpx; width: 100%;
}

/* Button: 311×52px, white 0.96, 26px radius, blue #1B5AD0 */
.login-btn {
  width: 622rpx; height: 104rpx; background: rgba(255, 255, 255, 0.96); border-radius: 52rpx;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(13, 46, 148, 0.35);
  transition: opacity 0.2s;
}
.login-btn:active { opacity: 0.85; }
.login-btn--loading { opacity: 0.7; }
.login-text { font-size: 34rpx; font-weight: 600; color: #1B5AD0; letter-spacing: 2rpx; }

/* Agreement: 16×16 checkbox, 8px radius, white text */
.agreement { display: flex; align-items: center; gap: 16rpx; }
.checkbox {
  width: 32rpx; height: 32rpx; border-radius: 16rpx; border: 2rpx solid rgba(255, 255, 255, 0.5);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.checkbox.checked { background: #FFFFFF; border-color: #FFFFFF; }
.check-tick { font-size: 20rpx; color: #1B5AD0; font-weight: 700; }
.agreement-text { font-size: 24rpx; color: rgba(255, 255, 255, 0.9); }
.agreement-link { color: #FFFFFF; text-decoration: underline; }
</style>
