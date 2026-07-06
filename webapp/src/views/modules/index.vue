import { toast } from '@/utils/toast'
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

const loading = ref(false)
const saving = ref(false)
const modules = ref<any[]>([])

interface ModuleItem {
  key: string; name: string; icon: string; route: string
  visible: boolean; platforms: string[]; roles: string[]; sort: number
}

async function loadModules() {
  loading.value = true
  try {
    const res: any = await request.post('/admin/modules', { action: 'getModules' })
    modules.value = res || []
  } catch { toast.error('加载失败') }
  finally { loading.value = false }
}

async function saveModules() {
  saving.value = true
  try {
    await request.post('/admin/modules', { action: 'saveModules', modules: modules.value })
    toast.success('保存成功')
    loadModules()
  } catch { toast.error('保存失败') }
  finally { saving.value = false }
}

function toggleRole(mod: ModuleItem, role: string) {
  const idx = mod.roles.indexOf(role)
  if (idx > -1) mod.roles.splice(idx, 1)
  else mod.roles.push(role)
}

function toggleVisible(mod: ModuleItem) {
  mod.visible = !mod.visible
  if (!mod.visible) mod.roles = []
  else if (mod.roles.length === 0) mod.roles = ['admin', 'employee', 'superadmin']
}

function filteredModules(platform: string) {
  return modules.value.filter((m: ModuleItem) => m.platforms.includes(platform)).sort((a: ModuleItem, b: ModuleItem) => a.sort - b.sort)
}

onMounted(() => loadModules())
</script>

<template>
  <div class="modules-page">
    <div class="toolbar">
      <h3>模块管理</h3>
      <el-button type="primary" :loading="saving" @click="saveModules">保存配置</el-button>
    </div>
    <div v-loading="loading">
      <div class="config-group">
        <h4 class="group-title">📱 小程序端模块</h4>
        <el-table :data="filteredModules('miniapp')" stripe border size="small">
          <el-table-column prop="name" label="模块名称" width="120" />
          <el-table-column prop="route" label="页面路径" min-width="180">
            <template #default="{ row }">
              <span v-if="row.route" style="font-size:12px;color:#909399">{{ row.route }}</span>
              <el-tag v-else size="small" type="info">未设置</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="roles" label="可见角色" width="220">
            <template #default="{ row }">
              <span style="display:flex;gap:4px;flex-wrap:wrap">
                <el-button
                  v-for="r in ['employee','admin','superadmin']" :key="r"
                  :size="'small'"
                  :type="row.roles.includes(r) ? 'primary' : 'info'"
                  :plain="!row.roles.includes(r)"
                  @click="toggleRole(row, r)"
                >
                  {{ r === 'superadmin' ? '超管' : r === 'admin' ? '管理员' : '员工' }}
                </el-button>
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="visible" label="可见" width="70">
            <template #default="{ row }">
              <el-switch :model-value="row.visible" size="small" @change="toggleVisible(row)" />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="config-group">
        <h4 class="group-title">🖥️ Web 后台模块</h4>
        <el-table :data="filteredModules('web')" stripe border size="small">
          <el-table-column prop="name" label="模块名称" width="120" />
          <el-table-column prop="route" label="路由" min-width="180">
            <template #default="{ row }">
              <span v-if="row.route" style="font-size:12px;color:#909399">{{ row.route }}</span>
              <el-tag v-else size="small" type="info">无路由</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="roles" label="可见角色" width="220">
            <template #default="{ row }">
              <span style="display:flex;gap:4px;flex-wrap:wrap">
                <el-button
                  v-for="r in ['employee','admin','superadmin']" :key="r"
                  :size="'small'"
                  :type="row.roles.includes(r) ? 'primary' : 'info'"
                  :plain="!row.roles.includes(r)"
                  @click="toggleRole(row, r)"
                >
                  {{ r === 'superadmin' ? '超管' : r === 'admin' ? '管理员' : '员工' }}
                </el-button>
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="visible" label="可见" width="70">
            <template #default="{ row }">
              <el-switch :model-value="row.visible" size="small" @change="toggleVisible(row)" />
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.modules-page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
  h3 { margin: 0; font-size: 18px; }
}
.config-group { margin-bottom: 20px; padding: 20px; background: #fff; border-radius: 8px; border: 1px solid #ebeef5;
  .group-title { margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 1px solid #ebeef5; font-size: 16px; color: #303133; }
}
</style>
