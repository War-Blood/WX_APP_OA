<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { adminLogin } from '@/api/auth'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const loginForm = ref({ username: '', password: '' })

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const formRef = ref()

const handleLogin = async () => {
  await formRef.value.validate()

  loading.value = true
  try {
    const res = await adminLogin({
      account: loginForm.value.username,
      password: loginForm.value.password
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

    ElMessage.success(`欢迎回来，${res.user.nickname || res.user.userName}`)
    router.push('/')
  } catch {
    // 错误提示由请求拦截器统一处理
  } finally {
    loading.value = false
  }
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

        <el-button
          type="primary"
          size="large"
          class="login-btn"
          :loading="loading"
          @click="handleLogin"
        >
          登 录
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
  width: 400px;
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
    margin-top: 16px;
    background: #2B6DE8;
    border-color: #2B6DE8;

    &:hover {
      background: #1A4FC7;
      border-color: #1A4FC7;
    }
  }
}
</style>
