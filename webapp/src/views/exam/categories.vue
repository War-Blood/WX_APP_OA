<template>
  <div class="categories-page">
    <el-card>
      <template #header>
        <div class="toolbar">
          <span class="title">分类管理</span>
          <el-button type="primary" @click="openEdit(null)">+ 新增根分类</el-button>
        </div>
      </template>
      <div v-loading="loading" class="tree-wrap">
        <el-tree :data="categories" :props="{ label: 'name', children: 'children' }" node-key="id" default-expand-all>
          <template #default="{ data }">
            <div class="cat-node">
              <span class="cat-name">
                {{ data.path || data.name }}
                <el-tag size="small" type="info" style="margin-left:8px">{{ data.questionNum }}题</el-tag>
                <el-tag v-if="data.time" size="small" style="margin-left:4px">{{ data.time }}分钟</el-tag>
              </span>
              <span class="cat-ops">
                <el-button size="small" link @click.stop="openEdit(data)">编辑</el-button>
                <el-button size="small" link @click.stop="openEdit(null, data.id)">+子分类</el-button>
                <el-button size="small" link type="danger" @click.stop="handleDelete(data)">删除</el-button>
              </span>
            </div>
          </template>
        </el-tree>
      </div>
    </el-card>

    <el-dialog v-model="editVisible" :title="editingId ? '编辑分类' : '新增分类'" width="420px" destroy-on-close @closed="resetForm">
      <el-form :model="form" label-width="90px">
        <el-form-item label="父分类">
          <el-select v-model="form.parentId" :disabled="!!editingId" clearable style="width:100%" placeholder="不选则为根分类">
            <el-option v-for="c in categoryOptions" :key="c.id" :label="c.path || c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称"><el-input v-model="form.name" maxlength="50" /></el-form-item>
        <el-form-item label="封面URL"><el-input v-model="form.cover" placeholder="可选" /></el-form-item>
        <el-form-item label="建议时长"><el-input-number v-model="form.time" :min="1" :max="180" /> <span class="hint">分钟</span></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible=false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { toast } from '@/utils/toast'
import type { ExamCategory } from '@/api/exam'
import { getCategoryList, createCategory, updateCategory, deleteCategory } from '@/api/exam'

const loading = ref(false)
const categories = ref<ExamCategory[]>([])
const categoryOptions = ref<{ id: number; name: string; path?: string }[]>([])

const editVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({ parentId: 0, name: '', cover: '', time: 10, sortOrder: 0 })

function flattenCategoryOptions(nodes: ExamCategory[]) {
  nodes.forEach(n => {
    categoryOptions.value.push({ id: n.id, name: n.name, path: n.path })
    if (n.children && n.children.length) flattenCategoryOptions(n.children)
  })
}

async function loadData() {
  loading.value = true
  try {
    categories.value = await getCategoryList()
    categoryOptions.value = []
    flattenCategoryOptions(categories.value)
  } catch { toast.error('加载失败') }
  finally { loading.value = false }
}

function openEdit(node: ExamCategory | null, presetParentId?: number) {
  if (node) {
    editingId.value = node.id
    form.parentId = node.parentId
    form.name = node.name
    form.cover = node.cover || ''
    form.time = node.time || 10
    form.sortOrder = node.sortOrder || 0
  } else {
    editingId.value = null
    form.parentId = presetParentId || 0
    form.name = ''
    form.cover = ''
    form.time = 10
    form.sortOrder = 0
  }
  editVisible.value = true
}

function resetForm() {
  editingId.value = null
  Object.assign(form, { parentId: 0, name: '', cover: '', time: 10, sortOrder: 0 })
}

async function handleSave() {
  if (!form.name.trim()) { toast.warning('名称不能为空'); return }
  try {
    if (editingId.value) {
      await updateCategory({ id: editingId.value, name: form.name, cover: form.cover || undefined, time: form.time, sortOrder: form.sortOrder })
    } else {
      await createCategory({ parentId: form.parentId || undefined, name: form.name, cover: form.cover || undefined, time: form.time, sortOrder: form.sortOrder })
    }
    editVisible.value = false
    await loadData()
    toast.success('已保存')
  } catch { toast.error('保存失败') }
}

async function handleDelete(node: ExamCategory) {
  try {
    await ElMessageBox.confirm(`确定删除分类"${node.name}"？`, '删除确认', { type: 'warning' })
    await deleteCategory(node.id)
    await loadData()
    toast.success('已删除')
  } catch { /* cancelled */ }
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.categories-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 18px; font-weight: 600; }
.tree-wrap { max-height: calc(100vh - 200px); overflow: auto; }
.cat-node { display: flex; justify-content: space-between; align-items: center; flex: 1; padding-right: 8px; }
.cat-name { display: flex; align-items: center; }
.hint { margin-left: 8px; color: #909399; }
</style>
