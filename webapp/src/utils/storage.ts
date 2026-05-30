// 本地存储封装
export const storage = {
  // localStorage
  local: {
    get<T>(key: string): T | null {
      const value = localStorage.getItem(key)
      if (value) {
        try {
          return JSON.parse(value) as T
        } catch {
          return value as unknown as T
        }
      }
      return null
    },
    set(key: string, value: unknown): void {
      if (typeof value === 'string') {
        localStorage.setItem(key, value)
      } else {
        localStorage.setItem(key, JSON.stringify(value))
      }
    },
    remove(key: string): void {
      localStorage.removeItem(key)
    },
    clear(): void {
      localStorage.clear()
    }
  },

  // sessionStorage
  session: {
    get<T>(key: string): T | null {
      const value = sessionStorage.getItem(key)
      if (value) {
        try {
          return JSON.parse(value) as T
        } catch {
          return value as unknown as T
        }
      }
      return null
    },
    set(key: string, value: unknown): void {
      if (typeof value === 'string') {
        sessionStorage.setItem(key, value)
      } else {
        sessionStorage.setItem(key, JSON.stringify(value))
      }
    },
    remove(key: string): void {
      sessionStorage.removeItem(key)
    },
    clear(): void {
      sessionStorage.clear()
    }
  }
}
