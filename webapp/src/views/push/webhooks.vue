<template>
  <div class="push-webhooks-page">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="使用说明"
      description="填写群机器人名称与企微群机器人 Webhook 地址即可使用；Webhook 保存后仅显示脱敏摘要，不会完整回显。建议在企微群机器人「安全设置」中开启加签并填入密钥，同时配置可信 IP 白名单。"
      style="margin-bottom: 16px"
    />

    <el-card>
      <template #header>
        <div class="card-header">
          <span>群机器人</span>
        </div>
      </template>

      <div class="filters">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索名称 / 备注"
          clearable
          style="width: 220px"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button type="success" @click="openCreate">新建群机器人</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe border style="margin-top: 16px">
        <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="Webhook" min-width="180">
          <template #default="{ row }">
            <code v-if="row.maskedKey">{{ row.maskedKey }}</code>
            <span v-else class="sub-text">未配置</span>
          </template>
        </el-table-column>
        <el-table-column label="凭证状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.configured" type="success" size="small">已配置</el-tag>
            <el-tag v-else type="danger" size="small">未配置</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled"
              :disabled="!row.configured"
              @change="(v: boolean | string | number) => handleToggle(row, Boolean(v))"
            />
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        background
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="loadData"
        @size-change="handleSizeChange"
      />
    </el-card>

    <el-dialog v-model="editVisible" :title="editingId ? '编辑群机器人' : '新建群机器人'" width="560px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="110px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="如：生产日报群" maxlength="50" show-word-limit />
        </el-form-item>

        <el-form-item label="Webhook" prop="webhookUrl">
          <el-input
            v-model="form.webhookUrl"
            :placeholder="editingId && form.maskedKey ? '留空保持不变（当前：' + form.maskedKey + '）' : 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx'"
          />
          <div class="field-tip">支持粘贴完整 Webhook 地址或直接填 Key</div>
        </el-form-item>

        <el-collapse class="advanced-collapse" v-model="advancedOpen">
          <el-collapse-item title="高级安全设置（选填）" name="security">
            <el-form-item label="加签密钥" class="secret-item">
              <el-input
                v-model="form.secret"
                type="password"
                show-password
                :placeholder="editingId && form.hasSecret ? '留空保持不变（已配置加签）' : '选填：企微机器人加签密钥'"
              />
              <div class="field-tip">在企微「安全设置」开启加签后填写；未开启可不填（系统自动兼容）</div>
            </el-form-item>
          </el-collapse-item>
        </el-collapse>

        <el-form-item label="启用" class="enable-item">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" placeholder="群名 / 用途" maxlength="255" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { toast } from '@/utils/toast'
import {
  getPushWebhookList,
  createPushWebhook,
  updatePushWebhook,
  deletePushWebhook,
  togglePushWebhook,
  type PushWebhookItem,
} from '@/api/push'

const loading = ref(false)
const saving = ref(false)
const list = ref<PushWebhookItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({ keyword: '' })

const editVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const advancedOpen = ref<string[]>([])
const form = reactive({
  name: '',
  webhookUrl: '',
  secret: '',
  enabled: true,
  remark: '',
  maskedKey: '',
  hasSecret: false,
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  webhookUrl: [
    {
      validator: (_rule, value: string, callback) => {
        if (editingId.value && form.maskedKey && !value) return callback()
        if (value && (value.includes('qyapi.weixin.qq.com/cgi-bin/webhook/send?key=') || /^[A-Za-z0-9\-_]{8,}$/.test(value.trim()))) {
          return callback()
        }
        callback(new Error('请填写有效的企微群机器人 Webhook 地址或 Key'))
      },
      trigger: 'blur',
    },
  ],
}

async function loadData() {
  loading.value = true
  try {
    const res = await getPushWebhookList({ page: page.value, pageSize: pageSize.value, keyword: filters.keyword || undefined })
    list.value = res.list
    total.value = res.total
  } catch {
    // toast 已由 request 统一处理
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadData()
}

function handleSizeChange() {
  page.value = 1
  loadData()
}

function openCreate() {
  editingId.value = null
  Object.assign(form, { name: '', webhookUrl: '', secret: '', enabled: true, remark: '', maskedKey: '', hasSecret: false })
  advancedOpen.value = []
  editVisible.value = true
}

function openEdit(row: PushWebhookItem) {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    webhookUrl: '',
    secret: '',
    enabled: row.enabled,
    remark: row.remark,
    maskedKey: row.maskedKey,
    hasSecret: row.configured,
  })
  advancedOpen.value = []
  editVisible.value = true
}

async function handleSave() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    const payload = {
      name: form.name,
      webhookUrl: form.webhookUrl || undefined,
      secret: form.secret || undefined,
      enabled: form.enabled,
      remark: form.remark,
    }
    if (editingId.value) {
      await updatePushWebhook({ id: editingId.value, ...payload })
      toast.success('已保存')
    } else {
      await createPushWebhook(payload)
      toast.success('已创建')
    }
    editVisible.value = false
    loadData()
  } catch {
    // toast 已统一处理
  } finally {
    saving.value = false
  }
}

async function handleToggle(row: PushWebhookItem, enabled: boolean) {
  try {
    await togglePushWebhook(row.id, enabled)
    toast.success(enabled ? '已启用' : '已停用')
    loadData()
  } catch {
    loadData()
  }
}

async function handleDelete(row: PushWebhookItem) {
  try {
    await ElMessageBox.confirm(`确认删除群机器人「${row.name}」？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deletePushWebhook(row.id)
    toast.success('已删除')
    loadData()
  } catch {
    // toast 已统一处理
  }
}

onMounted(loadData)
</script>

<style scoped>
.filters {
  display: flex;
  gap: 12px;
  align-items: center;
}
.field-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
  margin-top: 4px;
}
.sub-text {
  font-size: 12px;
  color: #909399;
}
.advanced-collapse {
  margin-bottom: 8px;
  border: none;
}
.advanced-collapse :deep(.el-collapse-item__header) {
  font-size: 13px;
  color: #909399;
}
.secret-item {
  margin-bottom: 8px;
}
.enable-item {
  margin-top: 4px;
}
</style>
