import { ref } from 'vue'
import { defineStore } from 'pinia'
import request from '@/utils/request'
import type { ModuleConfig } from '@/config/modules'

interface ModuleOverride {
  visible: boolean
  roles: string[]
}

const STORAGE_KEY = 'web_module_overrides'

function loadLocal(): Record<string, ModuleOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export const useModuleStore = defineStore('module', () => {
  const overrides = ref<Record<string, ModuleOverride>>(loadLocal())
  const loaded = ref(false)

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides.value))
  }

  function applyWebModules(list: Array<{ key: string; visible?: boolean; roles?: string[] }>) {
    const next = { ...overrides.value }
    list.forEach(item => {
      next[item.key] = {
        visible: item.visible !== false,
        roles: Array.isArray(item.roles) ? item.roles : []
      }
    })
    overrides.value = next
    persist()
  }

  function isModuleVisible(moduleConfig: ModuleConfig, role: string): boolean {
    const override = overrides.value[moduleConfig.key]
    if (!override) return moduleConfig.roles.includes(role)
    return override.visible && override.roles.includes(role)
  }

  async function loadRemote() {
    if (loaded.value) return
    loaded.value = true
    try {
      const res = await request.post('/admin/modules', {
        action: 'getModules',
        platform: 'web'
      })
      const list = Array.isArray(res) ? res : []
      const next = { ...overrides.value }
      list.forEach((item: Record<string, unknown>) => {
        const key = String(item.key || '')
        if (!key) return
        next[key] = {
          visible: item.visible !== false,
          roles: Array.isArray(item.roles) ? item.roles as string[] : []
        }
      })
      overrides.value = next
      persist()
    } catch {
      // keep static defaults when module config API is unavailable
    }
  }

  return {
    overrides,
    loaded,
    applyWebModules,
    isModuleVisible,
    loadRemote
  }
})
