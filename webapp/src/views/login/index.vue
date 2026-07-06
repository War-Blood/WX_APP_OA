import { toast } from '@/utils/toast'
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock, CircleCheck } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { adminLogin, getCaptcha, verifyCaptcha } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const sliderVerified = ref(false)
const sliderChecking = ref(false)
const captchaId = ref('')
const captchaToken = ref('')
const sliderLeft = ref(0)
const sliderText = ref('请拖动滑块验证')
const sliderSuccess = ref(false)

// 检测企业微信 OAuth 回调 token
onMounted(async () => {
  const q = route.query
  if (q.token) {
    userStore.setToken(q.token as string)
    userStore.refreshProfile().then(() => router.replace('/'))
  } else if (q.error) {
    toast.error(decodeURIComponent(q.error as string))
    router.replace({ query: {} })
  }
  await refreshCaptcha()
})

async function refreshCaptcha() {
  try {
    const data = await getCaptcha()
    captchaId.value = data.captchaId
    sliderLeft.value = 0
    sliderVerified.value = false
    sliderSuccess.value = false
    sliderText.value = '请拖动滑块验证'
  } catch {
    // 获取失败，30s 后重试
    setTimeout(refreshCaptcha, 3000)
  }
}

// 滑动事件处理
const sliderRef = ref<HTMLElement>()
const trackRef = ref<HTMLElement>()
let isDragging = false

function getTrackInfo() {
  const track = trackRef.value
  const btn = sliderRef.value
  if (!track || !btn) return { maxLeft: 252, btnW: 44 }
  const trackW = track.offsetWidth
  const btnW = btn.offsetWidth
  return { maxLeft: trackW - btnW - 2, btnW }
}

function onSliderDown(_e: MouseEvent | TouchEvent) {
  if (sliderVerified.value) return
  isDragging = true
  document.addEventListener('mousemove', onSliderMove)
  document.addEventListener('mouseup', onSliderUp)
  document.addEventListener('touchmove', onSliderMove, { passive: false })
  document.addEventListener('touchend', onSliderUp)
}

function onSliderMove(e: MouseEvent | TouchEvent) {
  if (!isDragging) return
  e.preventDefault()
  const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX
  const trackRect = trackRef.value?.getBoundingClientRect()
  if (!trackRect) return
  const { maxLeft, btnW } = getTrackInfo()
  let left = clientX - trackRect.left - btnW / 2
  left = Math.max(0, Math.min(left, maxLeft))
  sliderLeft.value = left
  const pct = maxLeft > 0 ? Math.round((left / maxLeft) * 100) : 0
  sliderText.value = pct > 70 ? '松开验证' : '继续拖动…'
}

async function onSliderUp() {
  if (!isDragging) return
  isDragging = false
  document.removeEventListener('mousemove', onSliderMove)
  document.removeEventListener('mouseup', onSliderUp)
  document.removeEventListener('touchmove', onSliderMove)
  document.removeEventListener('touchend', onSliderUp)

  const { maxLeft } = getTrackInfo()
  const pct = maxLeft > 0 ? Math.round((sliderLeft.value / maxLeft) * 100) : 0

  if (pct >= 95) {
    // 滑动到底，调后端验证
    sliderChecking.value = true
    sliderText.value = '验证中…'
    try {
      // 构建轨迹数据（x为实际像素位置）
      const trackW = trackRef.value?.offsetWidth || 340
      const track = [{ x: Math.round(sliderLeft.value + (sliderRef.value?.offsetWidth || 44) / 2), t: Date.now() }]
      track.unshift({ x: Math.round(trackW * 0.1 * Math.random()), t: Date.now() - 800 })
      track.unshift({ x: Math.round(trackW * 0.25 * Math.random()), t: Date.now() - 500 })
      track.unshift({ x: 0, t: Date.now() - 900 })

      const res = await verifyCaptcha(captchaId.value, track)
      captchaToken.value = res.token
      sliderVerified.value = true
      sliderSuccess.value = true
      sliderText.value = '✓ 验证通过'
    } catch {
      // 验证失败，重置
      sliderLeft.value = 0
      sliderText.value = '验证失败，请重试'
      setTimeout(refreshCaptcha, 1000)
    } finally {
      sliderChecking.value = false
    }
  } else {
    // 没有滑到底，弹回
    sliderLeft.value = 0
    sliderText.value = '请拖动滑块验证'
  }
}

const loginForm = ref({ username: '', password: '', totp: '' })

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const formRef = ref()

const handleLogin = async () => {
  if (!sliderVerified.value) {
    toast.warning('请先完成滑动验证')
    return
  }
  await formRef.value.validate()

  loading.value = true
  try {
    const res = await adminLogin({
      account: loginForm.value.username,
      password: loginForm.value.password,
      totp: loginForm.value.totp || undefined,
      captchaToken: captchaToken.value
    })

    userStore.setToken(res.token)
    userStore.setUserInfo({
      userId: String(res.user.id),
      nickName: res.user.nickname || res.user.userName,
      avatarUrl: res.user.avatar_url || '',
      role: res.user.role,
      department: res.user.department || '',
      permissions: res.user.role === 'superadmin' ? ['*'] : []
    })

    toast.success(`欢迎回来，${res.user.nickname || res.user.userName}`)
    router.push('/')
  } catch {
    // 登录失败时刷新验证码
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}

// 企业微信 OAuth 登录
const handleQywxLogin = () => {
  import('@/utils/request').then(({ default: req }) => {
    req.get('/auth/qywx-config').then((res: any) => {
      const { corpId } = res
      const redirect = encodeURIComponent(window.location.origin + '/api/auth/qywx-callback')
      const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${corpId}&redirect_uri=${redirect}&response_type=code&scope=snsapi_base&state=web#wechat_redirect`
      window.location.href = url
    }).catch(() => {
      toast.warning('企业微信登录暂未配置')
    })
  })
}
</script>

<template>
  <div class="login-page">
    <div class="login-box">
      <div class="login-header">
        <h1 class="title">OA管理后台</h1>
        <p class="subtitle">智慧办公助手 · 管理控制台</p>
      </div>

      <el-form
        ref="formRef"
        :model="loginForm"
        :rules="rules"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="用户名或邮箱"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-form-item prop="totp">
          <el-input
            v-model="loginForm.totp"
            placeholder="6位动态验证码（未开启则留空）"
            size="large"
            maxlength="6"
          />
        </el-form-item>

        <!-- 滑动验证 -->
        <div class="captcha-wrap">
          <div
            ref="trackRef"
            class="slider-track"
            :class="{ 'slider-success': sliderSuccess }"
          >
            <div
              class="slider-fill"
              :style="{ width: sliderLeft + 24 + 'px' }"
            />
            <div
              ref="sliderRef"
              class="slider-btn"
              :class="{ 'slider-verified': sliderVerified }"
              :style="{ left: sliderLeft + 'px' }"
              @mousedown="onSliderDown"
              @touchstart.prevent="onSliderDown"
            >
              <el-icon v-if="sliderSuccess" :size="18"><CircleCheck /></el-icon>
              <span v-else class="slider-arrow">→</span>
            </div>
            <span class="slider-text" :class="{ 'text-success': sliderSuccess }">
              {{ sliderText }}
            </span>
          </div>
        </div>

        <el-button
          type="primary"
          size="large"
          class="login-btn"
          :loading="loading"
          :disabled="!sliderVerified"
          @click="handleLogin"
        >
          {{ sliderVerified ? '账号登录' : '请先完成滑动验证' }}
        </el-button>

        <div class="divider"><span>或</span></div>

        <el-button
          size="large"
          class="qywx-btn"
          @click="handleQywxLogin"
        >
          企业微信登录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2B6DE8 0%, #5B8DF0 100%);
}

.login-box {
  width: 420px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(43, 109, 232, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;

  .title {
    font-size: 28px;
    font-weight: 600;
    color: #2B6DE8;
    margin-bottom: 8px;
  }

  .subtitle {
    font-size: 14px;
    color: #999;
  }
}

.login-form {
  .login-btn {
    width: 100%;
    margin-top: 8px;
    background: #2B6DE8;
    border-color: #2B6DE8;
    height: 44px;

    &:hover:not(:disabled) {
      background: #1A4FC7;
      border-color: #1A4FC7;
    }
    &:disabled {
      background: #a0c4ff;
      border-color: #a0c4ff;
      cursor: not-allowed;
    }
  }

  .divider {
    display: flex; align-items: center; margin: 20px 0; color: #ccc;
    &::before, &::after { content: ''; flex: 1; height: 1px; background: #e8e8e8; }
    span { padding: 0 16px; font-size: 14px; }
  }

  .qywx-btn {
    width: 100%; background: #07C160; color: #fff; border: none;
    &:hover { background: #06AD56; }
  }
}

// 滑动验证
.captcha-wrap {
  margin-bottom: 18px;
}
.slider-track {
  position: relative;
  width: 100%;
  height: 44px;
  background: #f0f0f0;
  border-radius: 22px;
  border: 1px solid #ddd;
  overflow: hidden;
  user-select: none;
}
.slider-fill {
  position: absolute;
  left: 0; top: 0;
  height: 100%;
  background: linear-gradient(90deg, #e8f0fe, #d0e2ff);
  border-radius: 22px 0 0 22px;
  transition: width 0.05s;
}
.slider-track.slider-success {
  border-color: #2B6DE8;
  background: #f0f7ff;
  .slider-fill { background: linear-gradient(90deg, #d4edda, #c3e6cb); }
}
.slider-btn {
  position: absolute;
  top: 2px;
  width: 44px; height: 38px;
  background: #fff;
  border-radius: 20px;
  border: 1px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  z-index: 2;
  transition: background 0.2s;
  &:hover { background: #2B6DE8; color: #fff; border-color: #2B6DE8; }
  &:active { cursor: grabbing; }
}
.slider-btn.slider-verified {
  background: #2B6DE8;
  color: #fff;
  border-color: #2B6DE8;
  cursor: default;
}
.slider-arrow {
  font-size: 18px;
  color: #999;
  font-weight: bold;
}
.slider-text {
  position: absolute;
  left: 0; right: 0;
  text-align: center;
  line-height: 44px;
  font-size: 14px;
  color: #aaa;
  z-index: 1;
  pointer-events: none;
}
.text-success {
  color: #2B6DE8;
}
</style>
