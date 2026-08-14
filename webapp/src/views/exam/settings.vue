<template>
  <div class="settings-page">
    <el-card>
      <template #header><span class="title">答题设置</span></template>
      <el-form label-width="200px" style="max-width:560px">
        <el-form-item label="开放练习/背题模式">
          <el-switch v-model="settings.use_learn" :active-value="'1'" :inactive-value="'0'" />
          <span class="hint">关闭后小程序练习/背题入口提示"练习模式未开启"</span>
        </el-form-item>
        <el-form-item label="仅登录用户可答题">
          <el-switch v-model="settings.check_user" :active-value="'1'" :inactive-value="'0'" />
          <span class="hint">关闭后仅限已登录用户答题（OA 恒有登录用户，建议保持开启）</span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存设置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { toast } from '@/utils/toast'
import { getSettings, updateSettings } from '@/api/exam'

const settings = ref<Record<string, string>>({ use_learn: '1', check_user: '1' })
const saving = ref(false)

async function loadData() {
  try { settings.value = await getSettings() }
  catch { /* */ }
}

async function handleSave() {
  saving.value = true
  try {
    await updateSettings([
      { key: 'use_learn', value: settings.value.use_learn || '0' },
      { key: 'check_user', value: settings.value.check_user || '1' },
    ])
    toast.success('设置已保存')
  } catch { toast.error('保存失败') }
  finally { saving.value = false }
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.settings-page { padding: 20px; }
.title { font-size: 18px; font-weight: 600; }
.hint { margin-left: 12px; color: #909399; font-size: 12px; }
</style>