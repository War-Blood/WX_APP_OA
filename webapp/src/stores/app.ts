import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const isMobile = ref(typeof window !== 'undefined' && window.innerWidth < 768)

  function setSidebarCollapsed(value: boolean) {
    sidebarCollapsed.value = value
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setIsMobile(value: boolean) {
    isMobile.value = value
  }

  return {
    sidebarCollapsed,
    isMobile,
    setSidebarCollapsed,
    toggleSidebar,
    setIsMobile
  }
})
