import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const unreadCount = ref(0)
  const notifications = ref([])

  function setUnreadCount(count) {
    unreadCount.value = count
  }

  function incrementUnread(count = 1) {
    unreadCount.value += count
  }

  return {
    unreadCount,
    notifications,
    setUnreadCount,
    incrementUnread
  }
})
