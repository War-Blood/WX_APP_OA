<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getActiveModule, modules } from '@/config/modules'
import TopBar from '@/components/TopBar/index.vue'
import PrimaryNav from '@/components/PrimaryNav/index.vue'
import ModuleSidebar from '@/components/ModuleSidebar/index.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

onMounted(async () => {
  if (userStore.token && !userStore.userInfo) {
    try { await userStore.refreshProfile() } catch { /* ignore */ }
  }
})

const activeModuleKey = computed(() => {
  return getActiveModule(route.path)?.key || 'dashboard'
})

function handleModuleSelect(key: string) {
  const target = modules.find(m => m.key === key)
  if (target) router.push(target.path)
}
</script>

<template>
  <div class="layout-worktile">
    <!-- 顶栏 -->
    <TopBar />

    <!-- 一级图标栏 -->
    <PrimaryNav
      :active-key="activeModuleKey"
      @select="handleModuleSelect"
    />

    <!-- 二级侧栏 -->
    <ModuleSidebar />

    <!-- 主内容区 -->
    <div class="main-content" :key="route.fullPath">
      <router-view />
    </div>
  </div>
</template>

<style scoped lang="scss">
.layout-worktile {
  min-height: 100vh;
  background: #F5F7FA;
}

.main-content {
  margin-top: 48px;      // TopBar height
  margin-left: 236px;     // 56px PrimaryNav + 180px ModuleSidebar
  min-height: calc(100vh - 48px);
  padding: 20px;
  transition: margin-left 0.2s ease-out;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
