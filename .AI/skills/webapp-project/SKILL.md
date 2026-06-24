---
name: webapp-project
description: 智慧办公助手 Web 管理后台前端项目约束规则。对 webapp/ 目录下的所有操作自动生效，确保行为符合项目规范。
agent_created: true
---

# Web 管理后台前端项目约束规则

## 项目概览

**智慧办公助手 Web 管理后台** — 小程序内容中控台 + 系统运维平台，为系统管理员提供基于浏览器的管理界面。

- **技术栈**：Vue 3 + TypeScript + Vite + Element Plus + Pinia + Vue Router
- **当前阶段**：M0 已完成（项目初始化），M1 未启动（用户与权限）
- **后端地址**：`https://warblood.online`

## 强制性要求

1. **上下文加载**: 每次任务执行前必须在上下文中加载 `.AI/rules/webapp-rules.md`
2. **意图确认**: 接受任务后需仔细分析用户意图，如有疑问应反问确认
3. **Git 维护**: 每次修改都需要维护 Git 仓库，提交到本地仓库；推送远程需人工确认（详见 `.AI/rules/git-workflow.md`）
4. **PRD 对齐**: 开发前必须阅读 `.AI/Wiki/Web 管理后台/Web-PRD.md`，严格按照 PRD 定义的功能开发

## 核心原则

### 后端 API 调用规范

- **这是一个纯粹的前端项目**
- 遇到后端 API 问题时，**严格按后端 SDK 文档调用**
- 如果发现后端 SDK 有问题，**直接指出问题在后端**，不得强行修改前端业务逻辑适配后端

### 代码规范
- 使用 Vue 3 Composition API + TypeScript
- 严格类型检查：提交前运行 `npm run type-check`
- 代码格式化和 lint：提交前运行 `npm run lint`
- 移除 console.log / debugger 后提交
- UI 组件库使用 Element Plus

## 项目里程碑

| 里程碑 | 阶段 | 状态 | 主要交付物 |
|--------|------|------|-----------|
| M0 | 项目初始化 | ✅ 已完成 | 项目搭建、PRD 文档、目录结构、基础配置 |
| M1 | 用户与权限 | 🔜 进行中 | 登录页 + 用户列表页已完成；部门树、角色权限矩阵待实现 |
| M2 | 内容编排 | ⚪ 待开发 | 工作台配置、模块开关、角色菜单可见性 |
| M3 | 审批管理 | 🔜 进行中 | 审批列表/详情/操作视图已完成；模板配置、流程设计器、超时监控待实现 |
| M4 | 仪表盘+日报 | ✅ 部分完成 | 仪表盘首页 + 日报管理(审核/统计/导出/人员看板)已完成；模板配置待实现 |
| M5 | 系统运维 | ⚪ 待开发 | 企业信息、安全策略、操作日志、运行监控、数据备份 |
| M6 | 项目+资产 | 🔜 进行中 | 项目列表/详情视图已完成；任务看板拖拽、资产台账/领用/盘点待实现 |
| M7 | 公告+消息 | ⚪ 待开发 | 公告发布统计、消息模板推送、功能联调 |
| M新增 | 合规管理 | ✅ 部分完成 | 合规统计看板 + 出差管理 + 缺失报告审核已完成；合规规则配置待实现 |
| M8 | 发布上线 | ⚪ 待开发 | 全量测试、性能优化、文档完善、生产部署 |

## 分支管理

- `main` — 生产分支
- `develop` — 开发分支
- `feature/*` — 功能分支

## 目录结构

```
webapp/
├── docs/               # 产品文档（PRD 等）
├── public/             # 静态资源
├── src/
│   ├── api/            # API接口定义
│   ├── assets/         # 图片、样式等资源
│   ├── components/     # 公共组件
│   ├── composables/    # 组合式函数
│   ├── layouts/        # 布局组件
│   ├── router/         # 路由配置
│   ├── stores/         # Pinia状态管理
│   ├── styles/         # 全局样式
│   ├── utils/          # 工具函数
│   ├── views/          # 页面视图
│   ├── App.vue         # 根组件
│   └── main.ts         # 入口文件
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 开发命令

```bash
npm run dev           # 启动开发服务器
npm run build         # 构建生产版本
npm run lint          # 代码检查
npm run type-check    # 类型检查
npm run format        # 代码格式化
```

## 端到端代码示例

下面是一个完整的功能模块示例（"用户管理"页），展示 Vue 3 + TypeScript + Element Plus 标准模式：

### API 模块 (`src/api/user.ts`)

```typescript
import request from '@/utils/request'

export interface UserItem {
  id: string; username: string; nickName: string
  department: string; role: string; status: string
  phone?: string; email?: string; createTime: string
}
export interface UserListResult { total: number; list: UserItem[] }

export function getUserList(params: {
  page?: number; pageSize?: number; keyword?: string; role?: string; status?: string
}): Promise<UserListResult> {
  return request.post('/api/admin/users', params)
}

export function createUser(data: Partial<UserItem>): Promise<UserItem> {
  return request.post('/api/admin/createUser', data)
}

export function deleteUser(id: string): Promise<void> {
  return request.post('/api/admin/deleteUser', { id })
}
```

### Pinia Store (`src/stores/user.ts`)

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref<any>(null)

  const isLoggedIn = computed(() => !!token.value)
  const role = computed(() => userInfo.value?.role || '')

  function setToken(t: string) { token.value = t; localStorage.setItem('token', t) }

  async function login(username: string, password: string) {
    const res = await authApi.login({ username, password })
    setToken(res.data.token)
    userInfo.value = res.data.user
  }

  function logout() {
    token.value = ''; userInfo.value = null
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  return { token, userInfo, isLoggedIn, role, login, logout }
})
```

### 视图组件 (`src/views/user/index.vue`)

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Delete } from '@element-plus/icons-vue'
import { getUserList, deleteUser, type UserItem } from '@/api/user'

const loading = ref(false)
const keyword = ref('')
const list = ref<UserItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const roleOptions = [
  { label: '全部', value: '' },
  { label: '管理员', value: 'admin' },
  { label: '普通员工', value: 'employee' },
]

async function loadUsers() {
  loading.value = true
  try {
    const res = await getUserList({ page: page.value, pageSize: pageSize.value, keyword: keyword.value || undefined })
    list.value = res.list; total.value = res.total
  } catch { ElMessage.error('加载失败') }
  finally { loading.value = false }
}

function handleSearch() { page.value = 1; loadUsers() }

async function handleDelete(row: UserItem) {
  try {
    await ElMessageBox.confirm(`确定删除用户 ${row.nickName}？`, '删除确认', { type: 'warning' })
    await deleteUser(row.id)
    ElMessage.success('删除成功')
    loadUsers()
  } catch { /* cancelled */ }
}

function handlePageChange(p: number) { page.value = p; loadUsers() }

onMounted(() => loadUsers())
</script>

<template>
  <div class="user-page">
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input v-model="keyword" placeholder="搜索用户名/部门" clearable :prefix-icon="Search" style="width:240px" @keyup.enter="handleSearch" />
        <el-select v-model="roleFilter" placeholder="角色" style="width:140px" @change="handleSearch">
          <el-option v-for="o in roleOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
        <el-button :icon="Refresh" @click="handleSearch">刷新</el-button>
      </div>
      <el-button type="primary" :icon="Plus">新增用户</el-button>
    </div>
    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="nickName" label="姓名" width="120" />
      <el-table-column prop="username" label="账号" width="150" />
      <el-table-column prop="department" label="部门" width="120" />
      <el-table-column prop="role" label="角色" width="100" />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
            {{ row.status === 'active' ? '正常' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="160" />
      <el-table-column label="操作" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" link>编辑</el-button>
          <el-button size="small" type="danger" link :icon="Delete" @click="handleDelete(row)" />
        </template>
      </el-table-column>
    </el-table>
    <div class="pagination-wrap">
      <span>共 {{ total }} 条</span>
      <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" background @current-change="handlePageChange" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.user-page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.toolbar-left { display: flex; gap: 12px; align-items: center; }
.pagination-wrap { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; }
</style>
```

**关键模式速查**：

| 层级 | 职责 | 关键模式 |
|------|------|----------|
| API 模块 | TypeScript 接口 + 类型化 Promise | `interface XxxItem`, `request.post<T>(url, params)` |
| Pinia Store | 全局状态 + localStorage 持久化 | `defineStore('name', () => {})`, `localStorage.getItem/setItem` |
| 视图组件 | Element Plus 表格 + 搜索 + 分页 | `<script setup lang="ts">`, `ref<T>()`, `async/await + try/catch` |
| 路由 | 懒加载 + 路由守卫 | `() => import('@/views/...')`, `router.beforeEach` 检查 token |
