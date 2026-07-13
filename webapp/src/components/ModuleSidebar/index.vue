<template>
  <aside class="module-sidebar" v-if="currentModule">
    <div class="module-title">{{ currentModule.title }}</div>
    <div class="module-menu">
      <template v-for="item in renderedMenu" :key="item._key">
        <!-- 分组标签 -->
        <div v-if="item._type === 'group'" class="menu-group-label">{{ item.group }}</div>
        <!-- 菜单项 -->
        <router-link
          v-else
          :to="item.path"
          class="menu-item"
          :class="{ active: isMenuActive(item.path) }"
          @click="handleMenuClick"
        >
          {{ item.title }}
        </router-link>
      </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getActiveModule, getVisibleChildren, type MenuItem } from '@/config/modules'

const route = useRoute()
const userStore = useUserStore()

const currentModule = computed(() => getActiveModule(route.path))

type RenderedItem =
  | (MenuItem & { _key: string; _type: 'item' })
  | { _key: string; _type: 'group'; group: string }

const renderedMenu = computed<RenderedItem[]>(() => {
  if (!currentModule.value) return []
  const children = getVisibleChildren(currentModule.value, userStore.userInfo?.role || 'employee')

  const result: RenderedItem[] = []
  let lastGroup = ''

  for (let i = 0; i < children.length; i++) {
    const item = children[i]
    const g = item.group || ''

    // 每当 group 变化且非空时插入分组标签
    if (g && g !== lastGroup) {
      result.push({ _key: `group-${g}`, _type: 'group', group: g })
    }
    result.push({ ...item, _key: `item-${i}`, _type: 'item' })
    lastGroup = g
  }

  return result
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

  .menu-group-label {
    padding: 12px 16px 4px;
    font-size: 11px;
    font-weight: 600;
    color: #909399;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-top: 1px solid #EBEEF5;
    margin-top: 4px;

    &:first-child {
      border-top: none;
      margin-top: 0;
    }
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
