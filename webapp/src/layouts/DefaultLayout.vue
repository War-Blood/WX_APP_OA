<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { useModuleStore } from '@/stores/module'
import { getActiveModule, modules } from '@/config/modules'
import TopBar from '@/components/TopBar/index.vue'
import PrimaryNav from '@/components/PrimaryNav/index.vue'
import ModuleSidebar from '@/components/ModuleSidebar/index.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()
const moduleStore = useModuleStore()

let mediaQuery: MediaQueryList | null = null

function syncViewport(event?: MediaQueryListEvent) {
  const isMobile = event ? event.matches : window.innerWidth < 768
  appStore.setIsMobile(isMobile)
  if (isMobile) appStore.setSidebarCollapsed(true)
}

onMounted(async () => {
  if (userStore.token && !userStore.userInfo) {
    try {
      await userStore.refreshProfile()
    } catch {
      userStore.logout()
      router.push('/login')
    }
  }

  mediaQuery = window.matchMedia('(max-width: 768px)')
  syncViewport()
  mediaQuery.addEventListener('change', syncViewport)
  moduleStore.loadRemote()
})

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', syncViewport)
})

const activeModuleKey = computed(() => {
  return getActiveModule(route.path)?.key || 'dashboard'
})

const contentMarginLeft = computed(() => {
  if (appStore.isMobile) return 56
  return appStore.sidebarCollapsed ? 56 : 236
})

const breadcrumbs = computed(() => {
  return route.matched
    .filter(item => item.meta.title)
    .map(item => item.meta.title as string)
})

function handleModuleSelect(key: string) {
  const target = modules.find(m => m.key === key)
  if (target) router.push(target.path)
}
</script>

<template>
  <div class="layout-worktile" :class="{ 'is-mobile': appStore.isMobile }">
    <TopBar />
    <PrimaryNav :active-key="activeModuleKey" @select="handleModuleSelect" />
    <ModuleSidebar
      v-if="!appStore.sidebarCollapsed"
      :class="{ 'mobile-sidebar': appStore.isMobile }"
    />
    <div
      v-if="appStore.isMobile && !appStore.sidebarCollapsed"
      class="mobile-mask"
      @click="appStore.setSidebarCollapsed(true)"
    />

    <div
      class="main-content"
      :class="{ 'sidebar-collapsed': appStore.sidebarCollapsed }"
      :style="{ marginLeft: contentMarginLeft + 'px' }"
      :key="route.fullPath"
    >
      <div class="page-header">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item v-for="title in breadcrumbs" :key="title">
            {{ title }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>
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
  margin-top: 48px;
  min-height: calc(100vh - 48px);
  padding: 20px;
  transition: margin-left 0.2s ease-out;

  .page-header {
    margin-bottom: 16px;
  }
}

.layout-worktile.is-mobile {
  .main-content {
    padding: 12px;
  }

  .mobile-sidebar {
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.12);
  }
}

.mobile-mask {
  position: fixed;
  inset: 48px 0 0 56px;
  z-index: 90;
  background: rgba(15, 23, 42, 0.28);
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
