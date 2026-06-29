import { defineStore } from 'pinia'
import { ref } from 'vue'
import { adminApi } from '@/services/modules/admin'

function getFallbackModules() {
  return [
    { key: 'approval', name: '审批管理', icon: 'approval', route: '/pages/approval/index/index', visible: true, sort: 1 },
    { key: 'report', name: '公出日志', icon: 'report', route: '/pages/employee/report-edit/index', visible: true, sort: 2 },
    { key: 'report_history', name: '日报历史', icon: 'history', route: '/pages/employee/report-history/index', visible: true, sort: 3 },
    { key: 'review', name: '日志审核', icon: 'review', route: '/pages/admin/review-list/index', visible: true, sort: 4 },
    { key: 'message', name: '消息中心', icon: 'message', route: '/pages/message/index/index', visible: true, sort: 5 },
    { key: 'compliance', name: '合规记录', icon: 'compliance', route: '/pages/compliance/my-compliance/index', visible: true, sort: 6 },
    { key: 'stats', name: '公出统计', icon: 'stats', route: '/pages/profile/stats', visible: true, sort: 7 }
  ]
}

export const useAppStore = defineStore('app', () => {
  const unreadCount = ref(0)
  const notifications = ref([])

  // 模块可见性
  const modules = ref(getFallbackModules())
  const modulesLoaded = ref(false)

  function setUnreadCount(count) {
    unreadCount.value = count
  }

  function incrementUnread(count = 1) {
    unreadCount.value += count
  }

  // 获取远端模块列表，失败时兜底硬编码列表
  async function fetchModules() {
    try {
      const res = await adminApi.getModules()
      const data = res.data
      if (Array.isArray(data) && data.length > 0) {
        modules.value = data
      }
    } catch {
      // 失败时保留初始化时的兜底列表
    } finally {
      modulesLoaded.value = true
    }
  }

  // 根据 key 获取单个模块信息
  function getModule(key) {
    return modules.value.find(m => m.key === key)
  }

  return {
    unreadCount,
    notifications,
    modules,
    modulesLoaded,
    setUnreadCount,
    incrementUnread,
    fetchModules,
    getModule
  }
})
