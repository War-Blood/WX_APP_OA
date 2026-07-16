# 02 — Web 管理后台页面布局规范

## 四层结构

```
┌────────────────────────────────────────────┐
│  TopBar (48px)  [Logo] [搜索] [+新建] [通知]│
├──┬──────────┬──────────────────────────────┤
│  │ 二级侧栏   │  主内容区                      │
│一 │ModuleSide│  MainContent                  │
│级 │bar 180px │                              │
│图 │          │  ┌─ PageToolbar ──────────┐  │
│标 │ 模块标题  │  │ 标题 [+按钮组] [筛选]    │  │
│栏 │ ──────── │  ├────────────────────────┤  │
│56 │ 子菜单1  │  │ el-table / el-card      │  │
│px │ 子菜单2  │  │ el-dialog               │  │
│   │ 子菜单3  │  └────────────────────────┘  │
└──┴──────────┴──────────────────────────────┘
```

## 核心尺寸

| 区域 | 尺寸 | 定位 |
|------|------|------|
| TopBar | 48px 高 | fixed top |
| PrimaryNav | 56px 宽 | fixed left（top:48px） |
| ModuleSidebar | 180px 宽 | fixed left（top:48px, left:56px） |
| 主内容区 | 剩余宽度 | margin-top:48px; margin-left:236px |
| 内容区内边距 | 20px | padding |
| 卡片间距 | 16px | gap |
| 卡片圆角 | 8px | border-radius |
| 卡片阴影 | `0 1px 3px rgba(0,0,0,0.06)` | box-shadow |

## 标准页面模板

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { toast } from '@/utils/toast'
import { someApi } from '@/api/xxx'

const loading = ref(false); const tableData = ref<any[]>([]); const total = ref(0); const page = ref(1)

async function loadData() {
  loading.value = true
  try {
    const res: any = await someApi.getList({ page: page.value, pageSize: 20 })
    tableData.value = res.list || []; total.value = res.total || 0
  } catch { toast.error('加载失败') }
  finally { loading.value = false }
}

onMounted(() => loadData())
</script>

<template>
  <div class="xxx-page">
    <el-card>
      <template #header>
        <div class="toolbar">
          <span class="title">页面标题</span>
          <div class="actions">
            <el-input v-model="keyword" placeholder="搜索" clearable style="width:200px" @keyup.enter="loadData" />
            <el-button type="primary" @click="openCreate">新增</el-button>
          </div>
        </div>
      </template>
      <el-table :data="tableData" v-loading="loading" stripe>...</el-table>
      <el-pagination ... @current-change="loadData" />
    </el-card>

    <el-dialog v-model="dialogVisible" title="标题" width="520px">
      <el-form :model="form" label-width="80px">...</el-form>
      <template #footer>
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.xxx-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 18px; font-weight: 600; }
.actions { display: flex; gap: 12px; }
</style>
```

## 弹窗规格

| 类型 | 宽度 |
|------|------|
| 简单表单（1-3字段） | 480px |
| 复杂表单（4+字段） | 520px |
| 详情/大表单 | 600-700px |

## 操作后自动刷新（强制）

所有创建/编辑/删除操作成功后必须调用 `loadData()` 刷新列表：

```js
async function handleSave() {
  try { await api.save(form); toast.success('保存成功'); dialogVisible.value = false; loadData() } catch { toast.error('保存失败') }
}
```
