<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const handleCommand = (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'logout':
      userStore.logout()
      router.push('/login')
      break
  }
}
</script>

<template>
  <header class="header">
    <div class="breadcrumb">
      <el-breadcrumb>
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>{{ $route.meta.title || '仪表盘' }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    
    <div class="right">
      <el-dropdown @command="handleCommand">
        <span class="user-info">
          <el-avatar :size="32" :src="userStore.userInfo?.avatarUrl">
            {{ userStore.userInfo?.nickName?.charAt(0) || 'U' }}
          </el-avatar>
          <span class="username">{{ userStore.userInfo?.nickName || '管理员' }}</span>
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">个人中心</el-dropdown-item>
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<style scoped lang="scss">
.header {
  height: 60px;
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.breadcrumb {
  font-size: 14px;
}

.right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.025);
  }
  
  .username {
    margin: 0 8px;
    font-size: 14px;
    color: $text-regular;
  }
}
</style>
