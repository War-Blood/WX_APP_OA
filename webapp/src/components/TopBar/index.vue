<template>
  <header class="topbar">
    <div class="topbar-left">
      <el-button
        class="icon-btn collapse-btn"
        circle
        :aria-label="appStore.sidebarCollapsed ? '展开菜单' : '收起菜单'"
        @click="appStore.toggleSidebar"
      >
        <el-icon :size="16">
          <Expand v-if="appStore.sidebarCollapsed" />
          <Fold v-else />
        </el-icon>
      </el-button>
      <div class="logo">OA</div>
    </div>
    <div class="topbar-center">
      <div
        class="search-box"
        role="button"
        tabindex="0"
        :aria-label="'打开全局搜索'"
        @click="openSearch"
        @keyup.enter="openSearch"
      >
        <el-icon><Search /></el-icon>
        <span>搜索</span>
        <kbd>Ctrl+K</kbd>
      </div>
    </div>
    <div class="topbar-right">
      <el-dropdown trigger="click" @command="handleCommand">
        <div class="user-area">
          <el-avatar :size="32" :src="userStore.userInfo?.avatarUrl">
            {{ initial }}
          </el-avatar>
          <span class="user-name">{{ userStore.userInfo?.nickName || '未登录' }}</span>
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

  <el-dialog
    v-model="searchVisible"
    title="全局搜索"
    width="560px"
    append-to-body
    destroy-on-close
    class="global-search-dialog"
  >
    <el-input
      v-model="searchQuery"
      placeholder="输入页面名称或路由"
      clearable
      :prefix-icon="Search"
      autofocus
      @keyup.enter="goToFirstResult"
    />
    <div class="search-results">
      <div
        v-for="item in filteredSearchItems"
        :key="item.path"
        class="search-result-item"
        role="button"
        tabindex="0"
        @click="goToItem(item)"
        @keyup.enter="goToItem(item)"
      >
        <div class="result-title">
          <span>{{ item.title }}</span>
          <el-tag size="small" type="info">{{ item.group }}</el-tag>
        </div>
        <span class="result-path">{{ item.path }}</span>
      </div>
      <el-empty
        v-if="!filteredSearchItems.length"
        description="没有匹配的页面"
        :image-size="64"
      />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { useModuleStore } from '@/stores/module'
import { modules, getVisibleChildren } from '@/config/modules'
import { Search, ArrowDown, Expand, Fold } from '@element-plus/icons-vue'

interface SearchItem {
  title: string
  path: string
  group: string
}

const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()
const moduleStore = useModuleStore()

const searchVisible = ref(false)
const searchQuery = ref('')

const allSearchItems = computed<SearchItem[]>(() => {
  const role = userStore.userInfo?.role || 'employee'
  return modules
    .filter(mod => moduleStore.isModuleVisible(mod, role))
    .flatMap(mod => {
      const children = getVisibleChildren(mod, role)
      if (!children.length) {
        return [{ title: mod.title, path: mod.path, group: mod.title }]
      }
      return children.map(child => ({
        title: child.title,
        path: child.path,
        group: mod.title
      }))
    })
})

const filteredSearchItems = computed<SearchItem[]>(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) return allSearchItems.value.slice(0, 12)
  return allSearchItems.value
    .filter(item => `${item.title} ${item.path}`.toLowerCase().includes(keyword))
    .slice(0, 12)
})

const initial = computed(() => {
  const name = userStore.userInfo?.nickName || 'U'
  return name.charAt(0).toUpperCase()
})

function openSearch() {
  searchQuery.value = ''
  searchVisible.value = true
}

function closeSearch() {
  searchVisible.value = false
}

function goToItem(item: SearchItem) {
  closeSearch()
  router.push(item.path)
}

function goToFirstResult() {
  const first = filteredSearchItems.value[0]
  if (first) goToItem(first)
}

function handleKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    openSearch()
  }
}

async function handleCommand(cmd: string) {
  if (cmd === 'logout') {
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
  } else if (cmd === 'profile') {
    router.push('/profile')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
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
    width: 96px;
    display: flex;
    align-items: center;
    gap: 8px;

    .collapse-btn {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
    }

    .logo {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: #2B6DE8;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .topbar-center {
    flex: 1;
    display: flex;
    justify-content: center;

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 320px;
      height: 32px;
      padding: 0 12px;
      border-radius: 16px;
      background: #F0F2F5;
      color: #C0C4CC;
      font-size: 13px;
      cursor: pointer;
      outline: none;

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

      &:hover,
      &:focus-visible {
        background: #E4E7ED;
        color: #606266;
      }
    }
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;

    .icon-btn {
      border: none;
      background: transparent;
      color: #606266;

      &:hover {
        background: #F0F2F5;
        color: #2B6DE8;
      }
    }

    .user-area {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;

      &:hover {
        background: #F0F2F5;
      }

      .user-name {
        font-size: 13px;
        color: #303133;
      }

      .arrow {
        font-size: 12px;
        color: #909399;
      }
    }
  }
}

.search-results {
  margin-top: 12px;
  max-height: 420px;
  overflow-y: auto;

  .search-result-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 6px;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: #E6F1FB;
      outline: none;
    }

    .result-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #303133;
    }

    .result-path {
      font-size: 12px;
      color: #909399;
    }
  }
}
</style>
