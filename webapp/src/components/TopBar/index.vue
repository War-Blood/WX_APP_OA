<template>
  <header class="topbar">
    <div class="topbar-left">
      <div class="logo">OA</div>
    </div>
    <div class="topbar-center">
      <div class="search-box" @click="emit('search')">
        <el-icon><Search /></el-icon>
        <span>搜索</span>
        <kbd>Ctrl+K</kbd>
      </div>
    </div>
    <div class="topbar-right">
      <el-badge :value="0" :hidden="true" :max="99">
        <el-button class="icon-btn" circle @click="emit('notifications')">
          <el-icon :size="18"><Bell /></el-icon>
        </el-button>
      </el-badge>
      <el-dropdown trigger="click" @command="handleCommand">
        <div class="user-area">
          <el-avatar :size="32" :src="userStore.userInfo?.avatarUrl">
            {{ initial }}
          </el-avatar>
          <span class="user-name">{{ userStore.userInfo?.nickName }}</span>
          <el-icon class="arrow"><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">个人中心</el-dropdown-item>
            <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { Search, Bell, ArrowDown } from '@element-plus/icons-vue'

const emit = defineEmits<{
  search: []
  notifications: []
}>()

const router = useRouter()
const userStore = useUserStore()

const initial = computed(() => {
  const name = userStore.userInfo?.nickName || 'U'
  return name.charAt(0).toUpperCase()
})

function handleCommand(cmd: string) {
  if (cmd === 'logout') {
    userStore.logout()
    router.push('/login')
  } else if (cmd === 'profile') {
    router.push('/profile')
  }
}
</script>

<style scoped lang="scss">
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #E4E7ED;
  z-index: 200;
  gap: 16px;

  .topbar-left {
    width: 48px;
    display: flex;
    align-items: center;
    .logo {
      width: 28px; height: 28px;
      border-radius: 6px;
      background: #2B6DE8;
      color: #fff;
      font-size: 12px; font-weight: 600;
      display: flex; align-items: center; justify-content: center;
    }
  }

  .topbar-center {
    flex: 1;
    display: flex; justify-content: center;
    .search-box {
      display: flex; align-items: center; gap: 8px;
      width: 320px; height: 32px;
      padding: 0 12px;
      border-radius: 16px;
      background: #F0F2F5;
      color: #C0C4CC;
      font-size: 13px;
      cursor: pointer;
      kbd {
        margin-left: auto;
        padding: 1px 6px;
        font-size: 11px;
        border-radius: 3px;
        background: #E4E7ED;
        color: #909399;
        border: 1px solid #D3D1C7;
        font-family: inherit;
      }
      &:hover { background: #E4E7ED; }
    }
  }

  .topbar-right {
    display: flex; align-items: center; gap: 12px;
    flex-shrink: 0;

    .icon-btn {
      border: none; background: transparent;
      color: #606266;
      &:hover { background: #F0F2F5; color: #2B6DE8; }
    }

    .user-area {
      display: flex; align-items: center; gap: 8px;
      cursor: pointer;
      padding: 4px 8px; border-radius: 6px;
      &:hover { background: #F0F2F5; }
      .user-name { font-size: 13px; color: #303133; }
      .arrow { font-size: 12px; color: #909399; }
    }
  }
}
</style>
