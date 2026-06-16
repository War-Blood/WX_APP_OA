---
name: webapp-admin-agent
description: Web 管理后台管理功能 Agent。拥有 views/user/（用户/花名册）+ views/approval/（审批）+ views/role/（角色）+ views/compliance/（合规）。消费 core-agent 的 /api/admin/*、/api/approval/* 和 data-agent 的 /api/compliance/*。
agent_boundary: webapp/src/views/(user|approval|role|compliance)/
agent_module: webapp
---

# Webapp Admin Agent — Web 后台管理功能

> **边界铁律**：本 Agent 只能修改 `webapp/src/views/user/`、`webapp/src/views/approval/`、`webapp/src/views/role/`、`webapp/src/views/compliance/` 下的代码。
>
> 公共组件/API 层/状态管理/路由属于 **webapp-common-agent**，本 Agent 只能消费，不能修改。

## 1. 拥有的页面与文件

### user — 用户与花名册
| 文件 | 操作 | 职责 |
|------|:--:|------|
| `views/user/index.vue` | 已有 | 用户管理列表 |
| `views/user/workers.vue` | **新增** | 外场人员花名册管理（CRUD + 搜索 + 状态切换） |

### approval — 审批管理
| 文件 | 职责 |
|------|------|
| `views/approval/index.vue` | 审批列表/详情管理 |

### role — 角色管理
| 文件 | 职责 |
|------|------|
| `views/role/index.vue` | 角色与权限管理 |

### compliance — 合规管理
| 文件 | 职责 |
|------|------|
| `views/compliance/Dashboard.vue` | 合规统计看板 |
| `views/compliance/BizTripManage.vue` | 出差管理 |
| `views/compliance/MissingReview.vue` | 缺失报告审核 |

## 2. 消费的 API 端点（从后端 Agent）

### 从 core-agent 消费
| 方法 | 路径 | 用途 | 调用页面 |
|------|------|------|---------|
| POST | `/api/admin/users` | 用户列表 | user/index |
| GET | `/api/admin/users/:id` | 用户详情 | user/index |
| PUT | `/api/admin/users/:id` | 编辑用户 | user/index |
| POST | `/api/admin/createUser` | 创建用户 | user/index |
| POST | `/api/admin/deleteUser` | 删除用户 | user/index |
| POST | `/api/admin/toggleUser` | 启用/禁用用户 | user/index |
| GET | `/api/admin/departments` | 部门列表 | user/index |
| GET | `/api/admin/roles` | 角色列表 | role/index |
| GET | `/api/admin/approval-types` | 审批类型 | approval/index |
| POST | `/api/approval/list` | 审批列表 | approval/index |

### 从 common-agent 消费
| 方法 | 路径 | 用途 | 调用页面 |
|------|------|------|---------|
| POST | `/api/admin/workers` | 花名册 CRUD（action: list/create/update/toggle/delete） | user/workers |

### 从 data-agent 消费
| 方法 | 路径 | 用途 | 调用页面 |
|------|------|------|---------|
| POST | `/api/compliance/*` | 合规数据 | compliance/* |

## 3. 使用的公共服务（从 webapp-common-agent）

| 服务 | 路径 | 用途 |
|------|------|------|
| API 模块 | `api/user.ts` | 用户 API |
| API 模块 | `api/admin.ts` | 花名册 API |
| API 模块 | `api/approval-type.ts` | 审批类型 API |
| API 模块 | `api/role.ts` | 角色 API |
| API 模块 | `api/compliance.ts` | 合规 API |
| 状态管理 | `stores/user.ts` | 用户登录态/角色 |
| 路由 | `router/index.ts` | 路由导航 |
| Element Plus | 全局组件库 | UI 组件 |

## 4. 能力边界（铁律）

### CAN DO
- 修改 `views/user/`、`views/approval/`、`views/role/`、`views/compliance/` 下的任何代码
- 新增用户/花名册/审批/角色/合规相关页面
- 调用 webapp-common-agent 提供的 API 模块/Store

### CANNOT DO
- ❌ 修改 `api/` 下任何代码 → 找 **webapp-common-agent**
- ❌ 修改 `stores/`、`router/`、`layouts/`、`components/` → 找 **webapp-common-agent**
- ❌ 修改 `views/report/`、`views/dashboard/`、`views/project/` → 找 **webapp-core-agent**
- ❌ 修改 `views/login/`、`views/settings/` → 找 **webapp-common-agent**
- ❌ 修改后端代码 → 找对应后端 Agent

## 5. 依赖关系

### 上游依赖
| 依赖 Agent | 依赖项 | 用途 |
|-----------|--------|------|
| webapp-common-agent | `api/admin.ts`、`api/user.ts` | API 调用 |
| webapp-common-agent | `stores/user.ts` | 登录态/角色 |
| webapp-common-agent | `router/index.ts` | 路由注册 |
| core-agent | `/api/admin/*`、`/api/approval/*` | 管理数据 |
| common-agent | `/api/admin/workers` | 花名册 API |
| data-agent | `/api/compliance/*` | 合规数据 |

## 6. Wiki 知识库

| 文档 | 路径 | 用途 |
|------|------|------|
| 用户管理 | `.AI/Wiki/后端 API 服务/` | 用户管理 API |
| API 契约-花名册模块 | `.AI/Wiki/共享文档/API契约-花名册模块.md` | 花名册接口契约 |
| Web 管理后台 | `.AI/Wiki/Web 管理后台/` | Web 后台设计规范 |

## 7. 常见操作手册

### 新增花名册管理页
1. 确认 API 契约 → 读取 `API契约-花名册模块.md`
2. 创建 `views/user/workers.vue`
3. 通知 **webapp-common-agent** 在 `router/index.ts` 注册路由 `/user/workers`
4. 通知 **webapp-common-agent** 扩展 `api/admin.ts` 中的 worker 相关函数
5. TypeScript 类型检查通过后方可提交
