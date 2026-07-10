<template>
  <view class="login-page" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- Spacer: 200px from Ardot Status bottom (62px total status area - 44px native = 18px extra) -->
    <view class="top-spacer" />

    <!-- Logo centered: 80×80 white square + title + slogan -->
    <view class="logo-section">
      <view class="logo-box" @tap="devKnock">
        <text class="logo-oa">OA</text>
      </view>
      <text class="app-name">{{ APP_NAME }}</text>
      <text class="slogan">轻量化办公 · 高效能协作</text>
    </view>

    <!-- Bottom actions: fills remaining, aligned to bottom -->
    <view class="action-section">
      <view class="login-btn" @tap="handleLogin" :class="{ 'login-btn--loading': isLogging }">
        <text class="login-text">{{ isLogging ? '登录中...' : '微信一键登录' }}</text>
      </view>

      <view class="account-btn" @tap="handleAccountLogin">
        <text class="account-text">账号密码登录</text>
      </view>

      <view class="invite-btn" @tap="handleInviteRedeem">
        <text class="invite-text">使用邀请码加入</text>
      </view>

      <view class="agreement" @tap="toggleAgreement">
        <view :class="['checkbox', { checked: agreed }]">
          <text v-if="agreed" class="check-tick">✓</text>
        </view>
        <text class="agreement-text">
          登录即同意<text class="agreement-link" @tap.stop="showUserAgreement">《用户协议》</text>和<text class="agreement-link" @tap.stop="showPrivacyPolicy">《隐私政策》</text>
        </text>
      </view>
    </view>
  </view>

  <!-- 协议/政策弹窗 -->
  <view v-if="showPolicy" class="policy-overlay" @tap="showPolicy = false">
    <view class="policy-modal" @tap.stop>
      <view class="policy-header">
        <text class="policy-title">{{ policyTitle }}</text>
        <text class="policy-close" @tap="showPolicy = false">✕</text>
      </view>
      <scroll-view class="policy-body" scroll-y>
        <text class="policy-text">{{ policyContent }}</text>
      </scroll-view>
      <view class="policy-footer">
        <view class="policy-btn" @tap="showPolicy = false">
          <text class="policy-btn-text">我知道了</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { authApi } from '@/services/modules/auth'
import { useUserStore } from '@/stores/user'
import { showSuccess, showError, showToast } from '@/utils/toast'
import { APP_NAME } from '@/config/version'

const statusBarHeight = ref(0)
const agreed = ref(false)
const isLogging = ref(false)
const userStore = useUserStore()
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
  if (!agreed.value) { showError('请先阅读并同意协议'); return }
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
      uni.setStorageSync('userInfo', { ...res.data.user, nickName: res.data.user.nickname })
      userStore.setUserInfo({ ...res.data.user, nickName: res.data.user.nickname })
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
      showError(err.message)
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
          info.nickName = modalRes.content.trim()
          uni.setStorageSync('userInfo', info)
          userStore.setUserInfo(info)
          showSuccess('昵称设置成功')
        } catch { showError('设置失败，稍后在个人中心修改') }
      }
    }
  })
}

// 协议弹窗状态
const showPolicy = ref(false)
const policyTitle = ref('')
const policyContent = ref('')

const USER_AGREEMENT = [
  `${APP_NAME}用户协议`,
  '更新日期：2026年6月',
  '',
  '一、总则',
  `1.1 欢迎使用${APP_NAME}（以下简称"本服务"）。`,
  `1.2 本协议是您与${APP_NAME}运营方之间关于使用本服务所订立的协议。`,
  '',
  '二、账号管理',
  '2.1 您通过微信授权或邀请码加入后，即成为本服务的注册用户。',
  '2.2 您应当对使用本服务的行为负责，不得利用本服务从事违法违规活动。',
  '2.3 管理员有权根据企业管理制度对账号进行管理，包括但不限于禁用、删除等操作。',
  '',
  '三、服务内容',
  '3.1 本服务提供审批管理、日报管理、消息通知、项目协作等办公功能。',
  '3.2 本服务保留根据需要变更、中断或终止部分或全部服务的权利。',
  '',
  '四、免责声明',
  '4.1 本服务按"现状"提供，不对服务的及时性、安全性、准确性做出任何保证。',
  '4.2 因网络故障、系统维护等原因导致的服务中断，本服务不承担责任。',
  '',
  '五、其他',
  '5.1 本协议的解释、效力及纠纷的解决，适用中华人民共和国法律。',
  '5.2 如您对本协议有任何疑问，请联系系统管理员。'
].join('\n')

const PRIVACY_POLICY = [
  `${APP_NAME}隐私政策`,
  '更新日期：2026年6月',
  '',
  '一、信息收集',
  '1.1 当您使用微信授权登录时，我们会获取您的微信昵称和头像。',
  '1.2 当您填写日报、发起审批时，您提交的工作信息会存储在我们的服务器上。',
  '1.3 我们使用必要的 Cookie 和 Token 技术来维持您的登录状态。',
  '',
  '二、信息使用',
  '2.1 您的个人信息仅用于本服务内的身份识别和办公协作。',
  '2.2 您的日报、审批等工作数据仅对您和您所在企业的授权管理人员可见。',
  '2.3 我们不会将您的个人信息出售或共享给任何第三方。',
  '',
  '三、信息安全',
  '3.1 我们采用业界通行的安全技术（SSL加密、数据库加密等）保护您的信息。',
  '3.2 您的密码和敏感信息在存储时经过加密处理。',
  '',
  '四、您的权利',
  '4.1 您可以在个人中心查看和修改您的昵称等基本信息。',
  '4.2 如需删除账号或导出个人数据，请联系系统管理员。',
  '',
  '五、未成年人保护',
  '5.1 本服务主要面向企业员工，如果您未满18周岁，请在监护人指导下使用。',
  '',
  '六、政策更新',
  '6.1 我们可能会适时更新本隐私政策，更新后的政策将在本页面公示。',
  '6.2 如您对本隐私政策有任何疑问，请联系系统管理员。'
].join('\n')

function showUserAgreement() {
  policyTitle.value = '用户协议'
  policyContent.value = USER_AGREEMENT
  showPolicy.value = true
}

function showPrivacyPolicy() {
  policyTitle.value = '隐私政策'
  policyContent.value = PRIVACY_POLICY
  showPolicy.value = true
}

async function handleAccountLogin() {
  if (!agreed.value) {
    showError('请先同意用户协议和隐私政策')
    return
  }
  // 第一步：输入账号
  uni.showModal({
    title: '账号登录',
    editable: true,
    placeholderText: '请输入账号（工号）',
    success: (res1) => {
      if (!res1.confirm || !res1.content) return
      const account = res1.content.trim()
      // 第二步：输入密码
      uni.showModal({
        title: '账号登录 - 输入密码',
        editable: true,
        placeholderText: '请输入密码',
        success: async (res2) => {
          if (!res2.confirm || !res2.content) return
          const password = res2.content.trim()
          uni.showLoading({ title: '登录中...', mask: true })
          try {
            const res = await authApi.accountLogin({ account, password })
            if (res.code === 0 && res.data) {
              uni.setStorageSync('token', res.data.token)
              uni.setStorageSync('userInfo', res.data.user)
              // pending 用户显示等待审核
              if (res.data.user?.status === 'pending') {
                uni.showModal({
                  title: '等待审核',
                  content: '已提交重新申请，请等待管理员审核通过后再登录。',
                  showCancel: false,
                  confirmText: '我知道了',
                  success: () => uni.removeStorageSync('token')
                })
                return
              }
              uni.reLaunch({ url: '/pages/home/index' })
            } else {
              showError(res.message || '登录失败')
            }
          } catch (err) {
            showError(err?.message || '登录失败')
          } finally {
            uni.hideLoading()
          }
        }
      })
    }
  })
}

async function handleInviteRedeem() {
  // 第一步：输入姓名
  uni.showModal({
    title: '使用邀请码加入 — 第1步',
    content: '请输入您的姓名',
    editable: true,
    placeholderText: '请输入真实姓名',
    success: (step1) => {
      if (!step1.confirm || !step1.content?.trim()) return
      const name = step1.content.trim()
      // 第二步：输入邀请码
      uni.showModal({
        title: '使用邀请码加入 — 第2步',
        content: '请输入邀请码',
        editable: true,
        placeholderText: 'ABCD1234',
        success: async (step2) => {
          if (!step2.confirm || !step2.content?.trim()) return
          const code = step2.content.trim()
          uni.showLoading({ title: '验证中...', mask: true })
          try {
            const res = await authApi.redeemInviteCode({ name, code })
            uni.hideLoading()
            if (res.data?.token) {
              uni.setStorageSync('token', res.data.token)
              const userInfo = { ...res.data.user, nickName: res.data.user.nickname || name }
              uni.setStorageSync('userInfo', userInfo)
              userStore.setUserInfo(userInfo)
              goHome()
              if (!res.data.user?.nickname) {
                setTimeout(() => askNickname(), 500)
              }
            } else {
              showError('邀请码验证失败，请检查输入')
            }
          } catch (err) {
            uni.hideLoading()
            showError(err?.message || '验证失败，请检查邀请码')
          }
        }
      })
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

/* Invite code link */
.account-btn { margin-top: 20rpx; padding: 12rpx 24rpx; border: 2rpx solid rgba(255,255,255,.5); border-radius: 8rpx; }
.account-btn:active { opacity: 0.7; background: rgba(255,255,255,.1); }
.account-text { font-size: 26rpx; color: rgba(255, 255, 255, 0.9); font-weight: 500; }

.invite-btn { padding: 12rpx 24rpx; }
.invite-btn:active { opacity: 0.7; }
.invite-text { font-size: 26rpx; color: rgba(255, 255, 255, 0.85); }

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

/* Policy overlay */
.policy-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5); display: flex; align-items: flex-end; z-index: 1000;
}
.policy-modal {
  width: 100%; max-height: 80vh; background: #FFFFFF; border-radius: 24rpx 24rpx 0 0;
  display: flex; flex-direction: column;
}
.policy-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 32rpx 32rpx 16rpx; border-bottom: 1rpx solid #F0F0F0;
}
.policy-title { font-size: 32rpx; font-weight: 600; color: #333333; }
.policy-close { font-size: 36rpx; color: #999999; padding: 0 8rpx; }
.policy-body { flex: 1; padding: 24rpx 32rpx; max-height: 60vh; }
.policy-text { font-size: 28rpx; color: #333333; line-height: 1.8; white-space: pre-wrap; }
.policy-footer { padding: 16rpx 32rpx 48rpx; }
.policy-btn {
  width: 100%; height: 88rpx; background: #2B6DE8; border-radius: 44rpx;
  display: flex; align-items: center; justify-content: center;
}
.policy-btn:active { opacity: 0.85; }
.policy-btn-text { font-size: 30rpx; color: #FFFFFF; font-weight: 500; }
</style>
