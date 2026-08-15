<template>
  <div class="push-webhooks-page">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="凭证安全说明"
      description="webhook 的 key/secret 由服务端 .env 统一管理（对齐 WPS），不会入库、不会在此页面展示。每个群机器人对应 .env 中的 WECOM_ROBOT_<名称>_KEY 与 WECOM_ROBOT_<名称>_SECRET 两组变量，请运维在 .env 配置后重启服务。"
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
          placeholder="搜索名称 / env 引用名"
          clearable
          style="width: 240px"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button type="success" @click="openCreate">新建群机器人</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe border style="margin-top: 16px">
        <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="env 引用名" min-width="160">
          <template #default="{ row }">
            <code>{{ row.envName }}</code>
          </template>
        </el-table-column>
        <el-table-column label="凭证状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.configured" type="success" size="small">已配置</el-tag>
            <el-tooltip v-else content="请运维在 .env 配置 WECOM_ROBOT_<name>_KEY/_SECRET 后重启" placement="top">
              <el-tag type="danger" size="small">未配置</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled"
              :disabled="!row.configured"
              @change="(v: boolean | string | number) => handleToggle(row, Boolean(v))"
            />
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
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

    <el-dialog v-model="editVisible" :title="editingId ? '编辑群机器人' : '新建群机器人'" width="520px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="110px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="如：生产日报群" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="env 引用名" prop="envName">
          <el-input v-model="form.envName" placeholder="如：DAILY" maxlength="50" />
          <div class="field-tip">对应 .env 中 WECOM_ROBOT_<b>{{ form.envName || '名称' }}</b>_KEY 与 _SECRET</div>
        </el-form-item>
        <el-form-item label="启用">
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
const form = reactive({
  name: '',
  envName: '',
  enabled: true,
  remark: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  envName: [
    { required: true, message: '请输入 env 引用名', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_]{2,50}$/, message: '2-50 位字母/数字/下划线', trigger: 'blur' },
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
  Object.assign(form, { name: '', envName: '', enabled: true, remark: '' })
  editVisible.value = true
}

function openEdit(row: PushWebhookItem) {
  editingId.value = row.id
  Object.assign(form, { name: row.name, envName: row.envName, enabled: row.enabled, remark: row.remark })
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
    if (editingId.value) {
      await updatePushWebhook({ id: editingId.value, ...form })
      toast.success('已保存')
    } else {
      await createPushWebhook(form)
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
</style>
