<template>
  <nav class="primary-nav">
    <div
      v-for="mod in visibleModules"
      :key="mod.key"
      class="nav-item"
      :class="{ active: activeKey === mod.key }"
      @click="$emit('select', mod.key)"
    >
      <el-icon :size="20"><component :is="mod.icon" /></el-icon>
      <span class="nav-label">{{ mod.title }}</span>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { getVisibleModules } from '@/config/modules'

const props = defineProps<{ activeKey: string }>()
defineEmits<{ select: [key: string] }>()

const userStore = useUserStore()
const visibleModules = computed(() => {
  return getVisibleModules(userStore.userInfo?.role || 'employee')
})
</script>

<style scoped lang="scss">
.primary-nav {
  position: fixed;
  top: 48px;
  left: 0;
  bottom: 0;
  width: 56px;
  background: #fff;
  border-right: 1px solid #E4E7ED;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 2px;

  .nav-item {
    width: 40px; height: 48px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 2px;
    border-radius: 8px;
    cursor: pointer;
    color: #909399;
    transition: all 100ms ease;

    .nav-label {
      font-size: 10px;
      line-height: 1;
    }

    &:hover {
      background: #F0F2F5;
      color: #606266;
    }

    &.active {
      background: #2B6DE8;
      color: #fff;
    }
  }
}
</style>
