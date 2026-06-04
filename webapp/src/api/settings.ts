import request from '@/utils/request'

export interface ConfigItem {
  id?: number
  key: string
  value: string
  group: string
  description?: string
}

/** 获取系统配置 */
export function getSystemConfig(): Promise<ConfigItem[]> {
  return request.get('/admin/settings')
}

/** 更新系统配置 */
export function updateSystemConfig(configs: ConfigItem[]): Promise<void> {
  return request.put('/admin/settings', { configs })
}
