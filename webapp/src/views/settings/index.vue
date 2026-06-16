<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getSystemConfig, updateSystemConfig, type ConfigItem } from '@/api/settings'
import request from '@/utils/request'

const activeTab = ref('enterprise')
const loading = ref(false)
const saving = ref(false)
const configs = ref<ConfigItem[]>([])

// 模块管理
const moduleLoading = ref(false)
const moduleSaving = ref(false)
const modules = ref<any[]>([])

interface ModuleItem {
  key: string; name: string; icon: string; route: string
  visible: boolean; platforms: string[]; roles: string[]; sort: number
}

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
  } catch {
    configs.value = [...defaultConfigs]
  }
  finally { loading.value = false }
}

async function saveConfig() {
  saving.value = true
  try {
    const toSave = configs.value.map(c => ({
      key: c.key, value: c.value, group: c.group, description: c.description,
    }))
    await updateSystemConfig(toSave)
    ElMessage.success('配置已保存')
  } catch { /* handled by interceptor */ }
  finally { saving.value = false }
}

async function loadModules() {
  moduleLoading.value = true
  try {
    const res: any = await request.post('/api/admin/modules', { action: 'getModules' })
    modules.value = res.data || []
  } catch {
    ElMessage.error('加载模块配置失败')
  }
  finally { moduleLoading.value = false }
}

async function saveModules() {
  moduleSaving.value = true
  try {
    await request.post('/api/admin/modules', { action: 'saveModules', modules: modules.value })
    ElMessage.success('模块配置已保存')
  } catch {
    ElMessage.error('保存模块配置失败')
  }
  finally { moduleSaving.value = false }
}

function toggleVisible(mod: ModuleItem) {
  mod.visible = !mod.visible
  if (!mod.visible) mod.roles = []
  else if (mod.roles.length === 0) mod.roles = ['admin', 'employee', 'superadmin']
}

function filteredModules(platform: string) {
  return modules.value.filter((m: ModuleItem) => m.platforms.includes(platform)).sort((a: ModuleItem, b: ModuleItem) => a.sort - b.sort)
}

const groups = [
  { key: 'enterprise', label: '企业信息' },
  { key: 'security', label: '安全策略' },
  { key: 'notification', label: '通知设置' },
]

function groupedConfigs(group: string) {
  return configs.value.filter(c => c.group === group)
}

onMounted(() => { loadConfig() })
</script>

<template>
  <div class="settings-page">
    <div class="toolbar">
      <h3>系统设置</h3>
      <el-button
        v-if="activeTab === 'module'"
        type="primary"
        :loading="moduleSaving"
        @click="saveModules"
      >
        保存模块配置
      </el-button>
      <el-button
        v-else
        type="primary"
        :loading="saving"
        @click="saveConfig"
      >
        保存配置
      </el-button>
    </div>

    <el-tabs v-model="activeTab" @tab-change="(tab: any) => { if (tab === 'module') loadModules() }">
      <el-tab-pane v-for="g in groups" :key="g.key" :label="g.label" :name="g.key">
        <div v-loading="loading">
          <div class="config-group">
            <el-form label-width="140px">
              <el-form-item
                v-for="c in groupedConfigs(g.key)"
                :key="c.key"
                :label="c.description || c.key"
              >
                <el-input v-model="c.value" :placeholder="c.description" />
              </el-form-item>
            </el-form>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="模块管理" name="module">
        <div v-loading="moduleLoading">
          <!-- 小程序端模块 -->
          <div class="config-group">
            <h4 class="group-title">📱 小程序端模块</h4>
            <el-table :data="filteredModules('miniapp')" stripe border size="small">
              <el-table-column prop="name" label="模块名称" width="120" />
              <el-table-column prop="route" label="页面路径" min-width="200">
                <template #default="{ row }">
                  <span v-if="row.route" style="font-size:12px;color:#909399">{{ row.route }}</span>
                  <el-tag v-else size="small" type="info">未设置</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="roles" label="可见角色" width="180">
                <template #default="{ row }">
                  <el-tag v-if="row.roles.length === 0" size="small" type="danger">不可见</el-tag>
                  <template v-else>
                    <el-tag v-for="r in row.roles" :key="r" size="small" style="margin-right:4px">
                      {{ r === 'superadmin' ? '超管' : r === 'admin' ? '管理员' : '员工' }}
                    </el-tag>
                  </template>
                </template>
              </el-table-column>
              <el-table-column prop="visible" label="可见" width="70">
                <template #default="{ row }">
                  <el-switch
                    :model-value="row.visible"
                    size="small"
                    @change="toggleVisible(row)"
                  />
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- Web 端模块 -->
          <div class="config-group">
            <h4 class="group-title">🖥️ Web 后台模块</h4>
            <el-table :data="filteredModules('web')" stripe border size="small">
              <el-table-column prop="name" label="模块名称" width="120" />
              <el-table-column prop="route" label="页面路径" min-width="200">
                <template #default="{ row }">
                  <span v-if="row.route" style="font-size:12px;color:#909399">{{ row.route }}</span>
                  <el-tag v-else size="small" type="info">未设置</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="roles" label="可见角色" width="180">
                <template #default="{ row }">
                  <el-tag v-if="row.roles.length === 0" size="small" type="danger">不可见</el-tag>
                  <template v-else>
                    <el-tag v-for="r in row.roles" :key="r" size="small" style="margin-right:4px">
                      {{ r === 'superadmin' ? '超管' : r === 'admin' ? '管理员' : '员工' }}
                    </el-tag>
                  </template>
                </template>
              </el-table-column>
              <el-table-column prop="visible" label="可见" width="70">
                <template #default="{ row }">
                  <el-switch
                    :model-value="row.visible"
                    size="small"
                    @change="toggleVisible(row)"
                  />
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped lang="scss">
.settings-page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
  h3 { margin: 0; font-size: 18px; }
}
.config-group { margin-bottom: 20px; padding: 20px; background: #fff; border-radius: 8px; border: 1px solid #ebeef5;
  .group-title { margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 1px solid #ebeef5; font-size: 16px; color: #303133; }
  :deep(.el-form-item) { margin-bottom: 16px; }
}
</style>
