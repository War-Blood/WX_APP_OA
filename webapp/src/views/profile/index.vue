<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { getProfile, updateProfile, changePassword } from '@/api/auth'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const profile = ref<Awaited<ReturnType<typeof getProfile>> | null>(null)

const editVisible = ref(false)
const editLoading = ref(false)
const editFormRef = ref<FormInstance>()
const editForm = ref({
  nickname: '',
  phone: '',
  email: '',
  position: '',
})
const editRules: FormRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
}

const pwdVisible = ref(false)
const pwdLoading = ref(false)
const pwdFormRef = ref<FormInstance>()
const pwdForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const pwdRules: FormRules = {
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, message: '新密码至少8位', trigger: 'blur' },
  ],
  confirmPassword: [{ required: true, message: '请再次输入新密码', trigger: 'blur' }],
}

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    superadmin: '超级管理员',
    admin: '管理员',
    employee: '员工'
  }
  return map[userStore.userInfo?.role || ''] || userStore.userInfo?.role || '-'
})

async function loadProfile() {
  loading.value = true
  try {
    profile.value = await getProfile()
  } catch {
    profile.value = null
  } finally {
    loading.value = false
  }
}

function openEdit() {
  editForm.value = {
    nickname: profile.value?.nickname || userStore.userInfo?.nickName || '',
    phone: profile.value?.phone || '',
    email: profile.value?.email || '',
    position: profile.value?.position || '',
  }
  editVisible.value = true
}

async function handleEdit() {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return
  editLoading.value = true
  try {
    const updated = await updateProfile(editForm.value)
    toast.success('资料已更新')
    editVisible.value = false
    loadProfile()
    if (userStore.userInfo) {
      userStore.setUserInfo({
        ...userStore.userInfo,
        nickName: updated.nickname || userStore.userInfo.nickName,
      })
    }
  } catch {
    // 错误提示由请求拦截器统一处理
  } finally {
    editLoading.value = false
  }
}

function openPassword() {
  pwdForm.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  }
  pwdVisible.value = true
}

async function handlePassword() {
  const valid = await pwdFormRef.value?.validate().catch(() => false)
  if (!valid) return
  if (pwdForm.value.newPassword !== pwdForm.value.confirmPassword) {
    toast.warning('两次输入的新密码不一致')
    return
  }
  pwdLoading.value = true
  try {
    await changePassword({
      currentPassword: pwdForm.value.currentPassword,
      newPassword: pwdForm.value.newPassword,
    })
    toast.success('密码已修改')
    pwdVisible.value = false
  } catch {
    // 错误提示由请求拦截器统一处理
  } finally {
    pwdLoading.value = false
  }
}

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确认退出登录？', '退出确认', {
      confirmButtonText: '退出登录',
      cancelButtonText: '取消',
      type: 'warning'
    })
    try {
      const { logout: requestLogout } = await import('@/api/auth')
      await requestLogout()
    } catch {
      // token 本地清理仍会执行
    }
    userStore.logout()
    router.push('/login')
  } catch {
    // cancelled
  }
}

onMounted(loadProfile)
</script>

<template>
  <div class="profile-page" v-loading="loading">
    <section class="profile-card">
      <div class="profile-main">
        <el-avatar :size="72" :src="userStore.userInfo?.avatarUrl">
          {{ (userStore.userInfo?.nickName || 'U').charAt(0).toUpperCase() }}
        </el-avatar>
        <div class="profile-name">{{ userStore.userInfo?.nickName || '未登录' }}</div>
        <div class="profile-role">{{ roleLabel }}</div>
      </div>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="用户名">
          {{ profile?.userName || userStore.userInfo?.nickName || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="昵称">
          {{ profile?.nickname || userStore.userInfo?.nickName || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="部门">
          {{ profile?.department || userStore.userInfo?.department || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="职务">
          {{ profile?.position || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="邮箱">
          {{ profile?.email || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="角色">
          {{ roleLabel }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="profile-actions">
        <el-button type="primary" @click="openEdit">编辑资料</el-button>
        <el-button type="warning" @click="openPassword">修改密码</el-button>
        <el-button type="primary" @click="loadProfile">刷新资料</el-button>
        <el-button @click="handleLogout">退出登录</el-button>
      </div>
    </section>

    <el-dialog v-model="editVisible" title="编辑资料" width="520px" destroy-on-close>
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="90px">
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="editForm.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="editForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="editForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="职务">
          <el-input v-model="editForm.position" placeholder="请输入职务" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="handleEdit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="pwdVisible" title="修改密码" width="480px" destroy-on-close>
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="100px">
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input v-model="pwdForm.currentPassword" type="password" show-password placeholder="请输入当前密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="至少8位，包含字母和数字" />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="pwdForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="warning" :loading="pwdLoading" @click="handlePassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.profile-page {
  max-width: 860px;
}

.profile-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 24px;

  .profile-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;

    .profile-name {
      font-size: 20px;
      font-weight: 600;
      color: #303133;
    }

    .profile-role {
      font-size: 13px;
      color: #909399;
    }
  }

  .profile-actions {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}
</style>
