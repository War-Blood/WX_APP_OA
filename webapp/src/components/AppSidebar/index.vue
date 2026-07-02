<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { Fold, Expand } from '@element-plus/icons-vue'
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()

const isCollapse = computed(() => appStore.sidebarCollapsed)
const activeMenu = computed(() => route.path)
const role = computed(() => userStore.userInfo?.role || 'employee')

const allMenuItems = [
  { path: '/dashboard', title: '仪表盘', icon: 'DataLine', roles: ['employee', 'admin', 'superadmin'] },
  { path: '/user', title: '用户管理', icon: 'User', roles: ['admin', 'superadmin'] },
  { path: '/role', title: '角色管理', icon: 'Avatar', roles: ['superadmin'] },
  { path: '/approval', title: '审批管理', icon: 'DocumentChecked', roles: ['admin', 'superadmin'] },
  {
    path: '/report', title: '日志管理', icon: 'Document', roles: ['employee', 'admin', 'superadmin'],
    children: [
      { path: '/report', title: '日报管理' },
      { path: '/report/stats', title: '公出统计' },
      { path: '/report/audit', title: '补公出审核', roles: ['admin', 'superadmin'] },
      { path: '/report/daily-status', title: '当日状态', roles: ['admin', 'superadmin'] },
      { path: '/report/monthly-summary', title: '月度占比' },
      { path: '/user/workers', title: '花名册', roles: ['admin', 'superadmin'] }
    ]
  },
  { path: '/project', title: '项目管理', icon: 'FolderOpened', roles: ['admin', 'superadmin'] },
  {
    path: '/attendance', title: '考勤管理', icon: 'Calendar', roles: ['admin', 'superadmin'],
    children: [
      { path: '/attendance/schedule', title: '排班管理' },
      { path: '/attendance/summary', title: '考勤汇总' },
      { path: '/attendance/leave-manage', title: '请假出差管理' }
    ]
  },
  {
    path: '/compliance', title: '合规管理', icon: 'Verified', roles: ['admin', 'superadmin'],
    children: [
      { path: '/compliance/dashboard', title: '合规统计看板' },
      { path: '/compliance/biz-trip', title: '出差管理' },
      { path: '/compliance/missing-review', title: '缺失报告审核' }
    ]
  },
  { path: '/modules', title: '模块管理', icon: 'Switch', roles: ['superadmin'] },
  { path: '/settings', title: '系统设置', icon: 'Setting', roles: ['superadmin'] }
]

const menuItems = computed(() => {
  return allMenuItems
    .filter(item => !item.roles || item.roles.includes(role.value))
    .map(item => {
      if (item.children) {
        return { ...item, children: item.children.filter(c => !c.roles || c.roles.includes(role.value)) }
      }
      return item
    })
})

const handleSelect = (path: string) => { router.push(path) }
const toggleCollapse = () => { appStore.toggleSidebar() }
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
      <template v-for="item in menuItems" :key="item.path">
        <el-sub-menu v-if="item.children" :index="item.path">
          <template #title>
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </template>
          <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
            {{ child.title }}
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item v-else :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </template>
    </el-menu>
    <div class="collapse-btn" @click="toggleCollapse">
      <el-icon><Fold v-if="!isCollapse" /><Expand v-else /></el-icon>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.sidebar {
  width: 220px; height: 100vh; background-color: #304156;
  display: flex; flex-direction: column; transition: width 0.3s;
  &.is-collapse { width: 64px; }
}
.logo {
  height: 60px; display: flex; align-items: center; justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  .logo-text { color: #fff; font-size: 18px; font-weight: bold; white-space: nowrap; overflow: hidden; }
}
.el-menu { flex: 1; border-right: none; }
.collapse-btn {
  height: 50px; display: flex; align-items: center; justify-content: center;
  color: #bfcbd9; cursor: pointer; border-top: 1px solid rgba(255, 255, 255, 0.1);
  &:hover { color: #fff; background-color: rgba(255, 255, 255, 0.05); }
}
</style>
