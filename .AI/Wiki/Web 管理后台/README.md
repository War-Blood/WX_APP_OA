# Web 管理后台文档索引

> 智慧办公助手 — Web 管理后台（Vue3 + TypeScript + Vite + Element Plus）

---

## 文档清单

| 文档 | 版本/日期 | 类型 | 说明 |
|------|----------|------|------|
| [Web-PRD.md](./Web-PRD.md) | 2026-05-29 | 产品需求 | Web 管理后台产品需求规格说明书 |
| [Technical-Selection.md](./Technical-Selection.md) | 2026-05-29 | 技术选型 | Web 端技术选型方案 |

---

## 架构速览

### 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 框架 | Vue 3 + Composition API | `<script setup>` 语法 |
| 类型 | TypeScript | 严格模式 |
| 构建 | Vite | 快速 HMR |
| UI 框架 | Element Plus | 主题色 #2B6DE8 |
| 状态管理 | Pinia | Vue 3 官方状态管理 |
| HTTP | Axios | 统一请求封装 + 拦截器 |
| 路由 | Vue Router 4 | History 模式 |

### 路由清单（7个已定义 + 3个缺失）

| 路由 | 页面 | 状态 |
|------|------|------|
| `/` | 首页/工作台 | ✅ 已实现 |
| `/login` | 登录页 | ✅ 已实现 |
| `/report` | 日报管理 | ✅ 已实现 |
| `/approval` | 审批管理 | ✅ 已实现 |
| `/project` | 项目管理 | ✅ 已实现 |
| `/user` | 用户管理 | ✅ 已实现 |
| `/stats` | 数据统计 | ✅ 已实现 |
| `/asset` | 资产管理 | ❌ 缺失页面 |
| `/announcement` | 公告管理 | ❌ 缺失页面 |
| `/settings` | 系统设置 | ❌ 缺失页面 |

### API 模块（5个 + 1个内联）

| 模块 | 文件 | 说明 |
|------|------|------|
| auth | src/api/auth.ts | 认证（登录/登出/用户信息） |
| project | src/api/project.ts | 项目管理 |
| report | src/api/report.ts | 日报管理 |
| stats | src/api/stats.ts | 数据统计 |
| user | src/api/user.ts | 用户管理 |
| approval（内联） | 页面内直接调用 | 审批相关（无独立 API 模块） |

### Stores（2个 Pinia）

| Store | 文件 | 说明 |
|-------|------|------|
| app | src/stores/app.ts | 应用全局状态 |
| user | src/stores/user.ts | 用户认证状态 |

---

## 已知代码差距（Gap）

| # | 问题 | 位置 | 严重程度 |
|---|------|------|---------|
| 1 | `refreshProfile` 方法在 store 中未定义，但在组件中被调用 | user store | 🔴 高 |
| 2 | 侧边栏路由配置中缺少 3 个页面入口（asset/announcement/settings） | sidebar/layout | 🟡 中 |
| 3 | `getActivities` API 已定义但从未被调用 | stats API / 首页 | 🟡 中 |
| 4 | 审批相关逻辑直接内联在页面中，无独立 API 模块 | approval pages | 🟡 中 |
| 5 | UserInfo 类型在多个文件中重复定义 | types/ | 🟡 中 |
| 6 | 缺少 asset/announcement/settings 三个页面的实现 | pages/ | 🟡 中 |
| 7 | 全局错误处理未覆盖 401 自动跳转登录 | request interceptor | 🟡 中 |
| 8 | 无单元测试覆盖 | tests/ | 🟢 低 |
| 9 | 无 E2E 测试覆盖 | tests/ | 🟢 低 |
| 10 | TypeScript 严格模式下部分类型推断不完整 | 各模块 | 🟢 低 |

---

## 共享文档

跨端共享文档在 [../shared-docs/](../shared-docs/)，Web 端开发必读：

| 文档 | 说明 |
|------|------|
| [API-Interfaces.md](../shared-docs/API-Interfaces.md) | 全量 API 接口定义（请求/响应格式） |
| [Frontend-Backend-Integration-Guide.md](../shared-docs/Frontend-Backend-Integration-Guide.md) | 前后端对接规范 |
| [前端技术开发指导及规范.md](../shared-docs/前端技术开发指导及规范.md) | 前端统一开发规范 |
| [HANDOVER.md](../shared-docs/HANDOVER.md) | 项目交接与整体架构 |

---

## 关键文件速查

| 文件 | 说明 |
|------|------|
| `src/router/index.ts` | 路由配置 |
| `src/api/index.ts` | API 模块统一导出 + Axios 实例 |
| `src/stores/user.ts` | 用户认证状态（含 Token 管理） |
| `src/stores/app.ts` | 应用全局状态 |
| `src/layout/` | 布局组件（含侧边栏） |
| `src/utils/` | 工具函数 |
| `vite.config.ts` | Vite 构建配置 |
