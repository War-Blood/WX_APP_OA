# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 架构

**OA Web 管理后台** — Vue 3 + TypeScript + Vite + Element Plus + Pinia，面向管理员的中控台 + 运维平台。

### 数据流

```
View (<script setup lang="ts">)
  → src/api/xxx.ts (类型化 API 定义)
    → src/utils/request.ts (Axios 封装 + Token 注入 + 错误拦截)
      → https://warblood.online/api/*
```

状态：`stores/`（Pinia Setup 语法）→ 持久化到 `localStorage`

### 源码组织

```
webapp/src/
├── api/              # API 接口 + TypeScript 类型（auth, user, report, project, compliance, approval-type, role, settings, stats）
├── views/            # 页面视图（login, dashboard, user, role, approval, approval-config, report, project, compliance, settings, error）
├── components/       # 公共组件
├── composables/      # 组合式函数
├── layouts/          # 布局（侧边栏 + 顶栏 + 内容区）
├── router/           # Vue Router 4（懒加载 + beforeEach 权限守卫）
├── stores/           # Pinia（user, app）
├── styles/           # 全局 SCSS + Element Plus 主题覆盖
├── types/            # 共享 TS 类型声明
└── utils/            # request.ts 等工具
```

### 里程碑进度

| M0 初始化 | M1 用户权限 | M3 审批 | M4 仪表盘日报 | M6 项目资产 | 合规 | 其他 |
|-----------|------------|--------|-------------|------------|------|------|
| ✅ | 🔜 | 🔜 | ✅ 部分 | 🔜 | ✅ 部分 | ⚪ M2/M5/M7/M8 |

---

## 常用命令

```bash
npm run dev           # Vite 开发服务器
npm run build         # vue-tsc 类型检查 + Vite 构建
npm run lint          # ESLint + 自动修复
npm run format        # Prettier
npm run type-check    # vue-tsc --noEmit（提交前必须通过）
```

---

## 代码模式

```typescript
// API 模块 — api/user.ts
export interface UserItem {
  id: string; username: string; nickName: string
  department: string; role: string; status: string; createTime: string
}
export function getUserList(params: {
  page?: number; pageSize?: number; keyword?: string
}): Promise<{ total: number; list: UserItem[] }> {
  return request.post('/api/admin/users', params)
}

// Pinia Store — stores/user.ts
export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const isLoggedIn = computed(() => !!token.value)
  function setToken(t: string) { token.value = t; localStorage.setItem('token', t) }
  return { token, isLoggedIn, setToken }
})
```

### 视图组件模式（列表页标准结构）

```vue
<script setup lang="ts">
const loading = ref(false)
const list = ref<UserItem[]>([])
const page = ref(1)
const total = ref(0)

async function loadData() {
  loading.value = true
  try {
    const res = await getUserList({ page: page.value, pageSize: 20 })
    list.value = res.list; total.value = res.total
  } catch { ElMessage.error('加载失败') }
  finally { loading.value = false }
}

onMounted(() => loadData())
</script>
<!-- 模板: el-input 搜索 + el-table + el-pagination -->
```

### 关键约束

- **纯前端项目**：数据全部通过 `src/api/` 获取
- TypeScript 严格模式，提交前 `npm run type-check` 必须零错误
- 禁止 `any`（特殊情况需加 `// any: <原因>` 注释）
- `<script setup lang="ts">` 统一语法
- 提交前清理 `console.log` / `debugger`
- Router 使用懒加载：`() => import('@/views/...')`
- **自动上传**:每次代码修改并 `git commit` 后，自动执行 `git push WX_APP_OA <当前分支>:test`（无需用户确认）。禁止 push `main`/`stable`，禁止 `--force`。详见 `.AI/rules/git-workflow.md`。

---

## 规则文件索引

> 本项目开发规则统一在 `.AI/rules/` 下，`core.md` 为唯一入口（始终加载）。进入本目录开发时按任务类型加载：

| 任务类型 | 加载的规则文件 |
|---------|---------------|
| 全部任务 | `.AI/rules/core.md` + `.AI/rules/coding-standards.md` |
| Web 后台开发 | `.AI/rules/webapp-rules.md` |
| Git 操作 | `.AI/rules/git-workflow.md` |
| Code Review | `.AI/rules/review-checklist.md` |
| 技术选型 | `.AI/rules/tech-stack.md` |
| 错误码 | `.AI/rules/error-codes.md` |
