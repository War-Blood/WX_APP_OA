<template>
  <aside class="module-sidebar" v-if="currentModule">
    <div class="module-title">{{ currentModule.title }}</div>
    <div class="module-menu">
      <router-link
        v-for="item in visibleChildren"
        :key="item.path"
        :to="item.path"
        class="menu-item"
        :class="{ active: isMenuActive(item.path) }"
        @click="handleMenuClick"
      >
        {{ item.title }}
      </router-link>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getActiveModule, getVisibleChildren } from '@/config/modules'

const route = useRoute()
const userStore = useUserStore()

const currentModule = computed(() => getActiveModule(route.path))

const visibleChildren = computed(() => {
  if (!currentModule.value) return []
  return getVisibleChildren(currentModule.value, userStore.userInfo?.role || 'employee')
})

function isMenuActive(path: string): boolean {
  return route.path === path
}

function handleMenuClick() {
  // Visual feedback: Vue Router handles navigation, no extra action needed
}
</script>

<style scoped lang="scss">
.module-sidebar {
  position: fixed;
  top: 48px;
  left: 56px;
  bottom: 0;
  width: 180px;
  background: #fff;
  border-right: 1px solid #E4E7ED;
  z-index: 100;
  overflow-y: auto;

  .module-title {
    padding: 16px 16px 12px;
    font-size: 16px; font-weight: 600; color: #303133;
  }

  .module-menu {
    padding: 4px 0;
  }

  .menu-item {
    display: block;
    padding: 10px 16px;
    font-size: 13px;
    color: #606266;
    text-decoration: none;
    border-left: 3px solid transparent;
    transition: background 0.15s, color 0.15s, border-color 0.2s;
    cursor: pointer;

    &:hover {
      background: #F0F2F5;
      color: #303133;
    }

    &:active {
      background: #E6F1FB;
      color: #2B6DE8;
    }

    &.active {
      background: #E6F1FB;
      color: #2B6DE8;
      border-left-color: #2B6DE8;
      font-weight: 500;
    }
  }
}
</style>
