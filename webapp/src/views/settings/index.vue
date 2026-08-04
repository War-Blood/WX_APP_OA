<script setup lang="ts">
import { toast } from '@/utils/toast'
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { getSystemConfig, updateSystemConfig, type ConfigItem } from '@/api/settings'

const loading = ref(false)
const saving = ref(false)
const configs = ref<ConfigItem[]>([])

const defaultConfigs: ConfigItem[] = [
  { key: 'company_name', value: '', group: 'enterprise', description: '企业名称' },
  { key: 'company_logo', value: '', group: 'enterprise', description: '企业Logo URL' },
  { key: 'login_attempts', value: '5', group: 'security', description: '最大登录尝试次数' },
  { key: 'lock_duration', value: '30', group: 'security', description: '锁定时间（分钟）' },
  { key: 'password_min_length', value: '8', group: 'security', description: '密码最小长度' },
  { key: 'session_timeout', value: '480', group: 'security', description: '会话超时（分钟）' },
  { key: 'report_remind_time', value: '17:00', group: 'notification', description: '日报提醒时间' },
  { key: 'wechat_template_remind', value: '', group: 'notification', description: '微信提醒模板ID' },
]

async function loadConfig() {
  loading.value = true
  try {
    const data = await getSystemConfig()
    configs.value = defaultConfigs.map(def => {
      const found = data.find((d: ConfigItem) => d.key === def.key)
      return found ? { ...def, ...found, value: found.value || def.value } : def
    })
  } catch { configs.value = [...defaultConfigs] }
  finally { loading.value = false }
}

async function saveConfig() {
  if (!validateConfigs()) return
  try {
    await ElMessageBox.confirm('确认保存系统配置？', '保存确认', {
      confirmButtonText: '确认保存',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  saving.value = true
  try {
    await updateSystemConfig(configs.value.map(c => ({ key: c.key, value: c.value, group: c.group, description: c.description })))
    toast.success('配置已保存')
    loadConfig()
  } catch {
    toast.error('配置保存失败')
  }
  finally { saving.value = false }
}

const groups = [
  { key: 'enterprise', label: '企业信息' },
  { key: 'security', label: '安全策略' },
  { key: 'notification', label: '通知设置' },
]

function groupedConfigs(group: string) { return configs.value.filter(c => c.group === group) }

const numericKeys = new Set(['login_attempts', 'lock_duration', 'password_min_length', 'session_timeout'])
const timeKeys = new Set(['report_remind_time'])

function isNumericConfig(key: string) { return numericKeys.has(key) }
function isTimeConfig(key: string) { return timeKeys.has(key) }

function validateConfigs() {
  for (const config of configs.value) {
    if (isNumericConfig(config.key)) {
      const num = Number(config.value)
      if (!Number.isInteger(num) || num <= 0) {
        toast.warning(`${config.description}必须为正整数`)
        return false
      }
    }
    if (isTimeConfig(config.key) && !/^\d{2}:\d{2}$/.test(config.value)) {
      toast.warning(`${config.description}格式必须为 HH:mm`)
      return false
    }
  }
  return true
}

onMounted(() => { loadConfig() })
</script>

<template>
  <div class="settings-page">
    <div class="toolbar">
      <h3>系统设置</h3>
      <el-button type="primary" :loading="saving" @click="saveConfig">保存配置</el-button>
    </div>
    <div v-loading="loading">
      <div v-for="g in groups" :key="g.key" class="config-group">
        <h4 class="group-title">{{ g.label }}</h4>
        <el-form label-width="140px">
          <el-form-item v-for="c in groupedConfigs(g.key)" :key="c.key" :label="c.description || c.key">
            <el-input-number
              v-if="isNumericConfig(c.key)"
              :model-value="Number(c.value) || 0"
              :min="1"
              :max="99999"
              style="width: 220px"
              @update:model-value="c.value = String($event ?? '')"
            />
            <el-time-picker
              v-else-if="isTimeConfig(c.key)"
              :model-value="c.value"
              value-format="HH:mm"
              format="HH:mm"
              style="width: 220px"
              @update:model-value="c.value = $event || ''"
            />
            <el-input v-else v-model="c.value" :placeholder="c.description" />
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.settings-page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;
  h3 { margin: 0; font-size: 18px; }
}
.config-group { margin-bottom: 24px; padding: 20px; background: #fff; border-radius: 8px; border: 1px solid #ebeef5;
  .group-title { margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 1px solid #ebeef5; font-size: 16px; color: #303133; }
  .el-form-item { margin-bottom: 16px; }
}
</style>
