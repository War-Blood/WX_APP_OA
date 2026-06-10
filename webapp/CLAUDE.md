# Web 管理后台 — CLAUDE.md

> 本文件是 webapp/ 目录的 Claude Code 入口文档。每次在此目录下操作时自动加载。

---

## 项目身份

**智慧办公助手 Web 管理后台** — 小程序内容中控台 + 系统运维平台，为管理员提供基于浏览器的管理界面。

| 项 | 值 |
|----|-----|
| 框架 | Vue 3 + TypeScript + Vite |
| UI | Element Plus |
| 状态管理 | Pinia（Setup 语法） |
| 路由 | Vue Router 4 |
| 图表 | ECharts 5 |
| HTTP | Axios |
| 样式 | SCSS |
| 后端地址 | https://warblood.online |
| 设计主题 | 高效蓝 `#2B6DE8`（通过 Element Plus CSS 变量覆盖） |

---

## 项目里程碑

| 里程碑 | 阶段 | 状态 | 主要交付物 |
|--------|------|------|-----------|
| M0 | 项目初始化 | ✅ 已完成 | 项目搭建、PRD 文档、目录结构 |
| M1 | 用户与权限 | 🔜 进行中 | 登录页 + 用户列表页已完成 |
| M2 | 内容编排 | ⚪ 待开发 | 工作台配置、模块开关、角色菜单 |
| M3 | 审批管理 | 🔜 进行中 | 审批列表/详情/操作已完成 |
| M4 | 仪表盘+日报 | ✅ 部分完成 | 仪表盘首页 + 日报管理已完成 |
| M5 | 系统运维 | ⚪ 待开发 | 企业信息、安全策略、操作日志 |
| M6 | 项目+资产 | 🔜 进行中 | 项目列表/详情已完成 |
| M7 | 公告+消息 | ⚪ 待开发 | 公告发布、消息模板推送 |
| M新增 | 合规管理 | ✅ 部分完成 | 合规统计看板 + 出差管理已完成 |
| M8 | 发布上线 | ⚪ 待开发 | 全量测试、性能优化、生产部署 |

---

## 目录结构

```
webapp/
├── public/                  # 静态资源
├── src/
│   ├── main.ts              # 入口（注册 Pinia + Router + Element Plus）
│   ├── App.vue              # 根组件
│   ├── api/                 # API 接口定义（按模块）
│   │   ├── auth.ts          # 认证
│   │   ├── user.ts          # 用户管理
│   │   ├── approval-type.ts # 审批类型
│   │   ├── report.ts        # 日报管理
│   │   ├── project.ts       # 项目管理
│   │   ├── compliance.ts    # 合规管理
│   │   ├── stats.ts         # 统计数据
│   │   ├── role.ts          # 角色管理
│   │   └── settings.ts      # 系统设置
│   ├── assets/              # 图片、样式等资源
│   ├── components/          # 公共组件
│   ├── composables/         # 组合式函数
│   ├── layouts/             # 布局组件（侧边栏 + 顶栏 + 内容区）
│   ├── router/              # 路由配置（懒加载 + 权限守卫）
│   ├── stores/              # Pinia 状态管理（user, app）
│   ├── styles/              # 全局样式 + Element Plus 主题覆盖
│   ├── types/               # TypeScript 类型声明
│   ├── utils/               # 工具函数（request 封装等）
│   └── views/               # 页面视图（按模块）
│       ├── login/           # 登录页
│       ├── dashboard/       # 仪表盘首页
│       ├── user/            # 用户管理
│       ├── role/            # 角色管理
│       ├── approval/        # 审批管理
│       ├── approval-config/ # 审批配置
│       ├── report/          # 日报管理
│       ├── project/         # 项目管理
│       ├── compliance/      # 合规管理
│       ├── settings/        # 系统设置
│       └── error/           # 错误页（404 等）
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 开发命令

```bash
npm run dev           # 启动开发服务器（Vite）
npm run build         # 类型检查 + 生产构建
npm run preview       # 预览生产构建
npm run lint          # ESLint 检查 + 自动修复
npm run format        # Prettier 格式化
npm run type-check    # TypeScript 类型检查（vue-tsc --noEmit）
```

---

## 核心原则

1. **纯前端项目**：所有业务数据通过后端 API 获取
2. **遇后端问题直接指出**：不强行修改前端适配后端
3. **TypeScript 严格模式**：提交前必须通过 `npm run type-check`
4. **禁止 `any`**：除非有注释说明原因
5. **提交前清理**：移除所有 `console.log` / `debugger`
6. **Vue 3 Composition API**：统一 `<script setup lang="ts">`

---

## 标准代码模式

### API 模块 (`src/api/xxx.ts`)

```typescript
import request from '@/utils/request';

export interface UserItem {
  id: string;
  username: string;
  nickName: string;
  department: string;
  role: string;
  status: string;
  phone?: string;
  email?: string;
  createTime: string;
}

export interface UserListResult {
  total: number;
  list: UserItem[];
}

export function getUserList(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  role?: string;
  status?: string;
}): Promise<UserListResult> {
  return request.post('/api/admin/users', params);
}

export function createUser(data: Partial<UserItem>): Promise<UserItem> {
  return request.post('/api/admin/createUser', data);
}

export function deleteUser(id: string): Promise<void> {
  return request.post('/api/admin/deleteUser', { id });
}
```

### Pinia Store (`src/stores/user.ts`)

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/auth';

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '');
  const userInfo = ref<any>(null); // 可替换为具体 UserInfo 类型

  const isLoggedIn = computed(() => !!token.value);
  const role = computed(() => userInfo.value?.role || '');

  function setToken(t: string) {
    token.value = t;
    localStorage.setItem('token', t);
  }

  async function login(username: string, password: string) {
    const res = await authApi.login({ username, password });
    setToken(res.data.token);
    userInfo.value = res.data.user;
  }

  function logout() {
    token.value = '';
    userInfo.value = null;
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  return { token, userInfo, isLoggedIn, role, login, logout };
});
```

### 视图组件 (`src/views/xxx/index.vue`)

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Plus, Delete } from '@element-plus/icons-vue';
import { getUserList, deleteUser, type UserItem } from '@/api/user';

const loading = ref(false);
const keyword = ref('');
const list = ref<UserItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

async function loadData() {
  loading.value = true;
  try {
    const res = await getUserList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
    });
    list.value = res.list;
    total.value = res.total;
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  loadData();
}

async function handleDelete(row: UserItem) {
  try {
    await ElMessageBox.confirm(`确定删除用户 ${row.nickName}？`, '删除确认', { type: 'warning' });
    await deleteUser(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch {
    /* 用户取消 */
  }
}

function handlePageChange(p: number) {
  page.value = p;
  loadData();
}

onMounted(() => loadData());
</script>

<template>
  <div class="page-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="keyword"
          placeholder="搜索"
          clearable
          :prefix-icon="Search"
          style="width: 240px"
          @keyup.enter="handleSearch"
        />
        <el-button :icon="Refresh" @click="handleSearch">刷新</el-button>
      </div>
      <el-button type="primary" :icon="Plus">新增</el-button>
    </div>

    <!-- 表格 -->
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

    <!-- 分页 -->
    <div class="pagination-wrap">
      <span>共 {{ total }} 条</span>
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        background
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-container { padding: 20px; }
.toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
.toolbar-left { display: flex; gap: 12px; align-items: center; }
.pagination-wrap {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 16px;
}
</style>
```

---

## 关键模式速查

| 层级 | 职责 | 关键模式 |
|------|------|----------|
| API 模块 | TS 接口定义 + 类型化 Promise | `interface XxxItem {}`, `request.post<T>(url, params)` |
| Pinia Store | 全局状态 + localStorage 持久化 | `defineStore('name', () => {})`, `localStorage.getItem/setItem` |
| 视图组件 | Element Plus 表格 + 搜索 + 分页 | `<script setup lang="ts">`, `ref<T>()`, `async/await + try/catch` |
| 路由 | 懒加载 + 权限守卫 | `() => import('@/views/...')`, `router.beforeEach` 检查 token |
| Request | Axios 封装 + Token 注入 + 错误拦截 | `axios.create({ baseURL })`, 请求/响应拦截器 |

---

## 规则与文档索引

| 加载时机 | 文件 |
|---------|------|
| **始终** | 项目根 `CLAUDE.md` |
| Web 后台开发 | `.AI/rules/webapp-rules.md` |
| 代码规范 | `.AI/rules/coding-standards.md` |
| Git 操作 | `.AI/rules/git-workflow.md` |
| Code Review | `.AI/rules/review-checklist.md` |
| Skill 定义 | `.AI/skills/webapp-project/SKILL.md` |
| Wiki | `.AI/Wiki/Web 管理后台/` |
| PRD | `.AI/Wiki/Web 管理后台/Web-PRD.md` |