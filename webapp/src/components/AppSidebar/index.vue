<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { Fold, Expand } from '@element-plus/icons-vue'
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const isCollapse = computed(() => appStore.sidebarCollapsed)

const activeMenu = computed(() => route.path)

const menuItems = [
  {
    path: '/dashboard',
    title: '仪表盘',
    icon: 'DataLine'
  },
  {
    path: '/user',
    title: '用户管理',
    icon: 'User'
  },
  {
    path: '/approval',
    title: '审批管理',
    icon: 'DocumentChecked'
  },
  {
    path: '/report',
    title: '公出日志管理',
    icon: 'Document'
  },
  {
    path: '/project',
    title: '项目管理',
    icon: 'FolderOpened'
  },
  {
    path: '/asset',
    title: '资产管理',
    icon: 'Box'
  },
  {
    path: '/announcement',
    title: '公告管理',
    icon: 'Bell'
  },
  {
    path: '/settings',
    title: '系统设置',
    icon: 'Setting'
  }
]

const handleSelect = (path: string) => {
  router.push(path)
}

const toggleCollapse = () => {
  appStore.toggleSidebar()
}
</script>

<template>
  <aside class="sidebar" :class="{ 'is-collapse': isCollapse }">
    <div class="logo">
      <span class="logo-text">{{ isCollapse ? 'OA' : '智慧办公助手' }}</span>
    </div>
    
    <el-menu
      :default-active="activeMenu"
      :collapse="isCollapse"
      :collapse-transition="false"
      background-color="#304156"
      text-color="#bfcbd9"
      active-text-color="#2B6DE8"
      @select="handleSelect"
    >
      <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
        <el-icon>
          <component :is="item.icon" />
        </el-icon>
        <template #title>{{ item.title }}</template>
      </el-menu-item>
    </el-menu>
    
    <div class="collapse-btn" @click="toggleCollapse">
      <el-icon>
        <Fold v-if="!isCollapse" />
        <Expand v-else />
      </el-icon>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.sidebar {
  width: 220px;
  height: 100vh;
  background-color: #304156;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  
  &.is-collapse {
    width: 64px;
  }
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  .logo-text {
    color: #fff;
    font-size: 18px;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
  }
}

.el-menu {
  flex: 1;
  border-right: none;
}

.collapse-btn {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bfcbd9;
  cursor: pointer;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  
  &:hover {
    color: #fff;
    background-color: rgba(255, 255, 255, 0.05);
  }
}
</style>
