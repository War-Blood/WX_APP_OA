<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import AppSidebar from '@/components/AppSidebar/index.vue'
import AppHeader from '@/components/AppHeader/index.vue'

const appStore = useAppStore()
const userStore = useUserStore()

onMounted(async () => {
  if (userStore.token && !userStore.userInfo) {
    try { await userStore.refreshProfile() } catch { /* ignore */ }
  }
})

const sidebarWidth = computed(() => {
  return appStore.sidebarCollapsed ? '64px' : '220px'
})
</script>

<template>
  <div class="layout">
    <!-- 侧边栏 -->
    <AppSidebar class="sidebar" />
    
    <!-- 主内容区 -->
    <div class="main" :style="{ marginLeft: sidebarWidth }">
      <AppHeader />
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.layout {
  min-height: 100vh;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  transition: width 0.3s;
}

.main {
  min-height: 100vh;
  transition: margin-left 0.3s;
}

.content {
  padding: 16px;
  background-color: $bg-color;
  min-height: calc(100vh - 60px);
}
</style>
