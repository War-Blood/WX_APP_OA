import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  // State
  const sidebarCollapsed = ref(false)
  const isMobile = ref(false)

  // Actions
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  const setSidebarCollapsed = (collapsed: boolean) => {
    sidebarCollapsed.value = collapsed
  }

  const setIsMobile = (mobile: boolean) => {
    isMobile.value = mobile
  }

  return {
    sidebarCollapsed,
    isMobile,
    toggleSidebar,
    setSidebarCollapsed,
    setIsMobile
  }
})
