---
name: webapp-common-agent
description: Web 管理后台公共层 Agent。拥有 components/ + api/ + stores/ + router/ + layouts/ + utils/ + views/login/ + views/settings/ + views/error/。是所有 Web 业务 Agent 的底层依赖，提供组件/API 封装/状态管理/路由配置。
agent_boundary: webapp/src/(components|api|stores|router|layouts|utils|views/(login|settings|error)|App.vue|main.ts)/
agent_module: webapp
---

# Webapp Common Agent — Web 后台公共层

> **边界铁律**：本 Agent 只能修改 `webapp/src/` 下属于公共基础设施的文件：components/、api/、stores/、router/、layouts/、utils/ 以及 login/settings/error 页面。
>
> 业务页面（report/dashboard/project/user/approval/role/compliance）属于对应的业务 Agent，本 Agent 不得修改。

## 1. 拥有的文件

### 公共组件 (components/)
| 文件 | 职责 |
|------|------|
| `components/AppHeader/index.vue` | 顶部导航栏 |
| `components/AppSidebar/index.vue` | 侧边菜单栏 |
| `components/FilterDialog.vue` | 公出统计筛选弹窗（动态条件 + 视图可见性，基于后端字段注册表渲染） |
| ~~`components/StatsFilterBar.vue`~~ | 已删除（2026-08 被 FilterDialog + stats_views 取代，禁止恢复） |

### API 定义层 (api/)
| 文件 | 职责 |
|------|------|
| `api/report.ts` | 日报 API 类型定义 + 调用函数 |
| `api/auth.ts` | 认证 API |
| `api/user.ts` | 用户管理 API |
| `api/admin.ts` | 花名册 API（新增 workers 相关） |
| `api/approval-type.ts` | 审批类型 API |
| `api/role.ts` | 角色 API |
| `api/compliance.ts` | 合规 API |
| `api/project.ts` | 项目 API |
| `api/settings.ts` | 系统设置 API |
| `api/stats.ts` | 统计 API |
| `api/statsView.ts` | 统计视图 API（`/api/stats/views*`：字段注册表/获取视图/保存视图） |

### 状态管理 (stores/)
| 文件 | 职责 |
|------|------|
| `stores/user.ts` | 用户状态（token/userInfo/role） |
| `stores/app.ts` | 应用全局状态 |

### 路由 (router/)
| 文件 | 职责 |
|------|------|
| `router/index.ts` | 路由配置 + 导航守卫 |

### 布局 (layouts/)
| 文件 | 职责 |
|------|------|
| `layouts/DefaultLayout.vue` | 管理后台默认布局（侧边栏+顶栏+内容区） |

### 工具函数 (utils/)
| 文件 | 职责 |
|------|------|
| `utils/request.ts` | HTTP 请求封装（Axios + 拦截器） |
| `utils/storage.ts` | localStorage 封装 |

### 通用页面
| 文件 | 职责 |
|------|------|
| `views/login/index.vue` | 登录页 |
| `views/settings/index.vue` | 系统设置页 |
| `views/error/404.vue` | 404 错误页 |

### 应用入口文件
| 文件 | 职责 |
|------|------|
| `App.vue` | 应用根组件 |
| `main.ts` | 主入口 |

## 2. 消费的 API 端点

### 从 auth-agent 消费
| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/auth/login` | 账号密码登录 |

## 3. 提供给业务 Agent 的服务

| 服务 | 业务 Agent 使用方式 |
|------|-------------------|
| `api/report.ts` | webapp-core-agent 调用日报 API |
| `api/statsView.ts` | webapp-core-agent 调用统计视图保存/获取 API |
| `api/project.ts` | webapp-core-agent 调用项目 API |
| `api/user.ts` | webapp-admin-agent 调用用户管理 API |
| `api/admin.ts` | webapp-admin-agent 调用花名册 API |
| `api/approval-type.ts` | webapp-admin-agent 调用审批类型 API |
| `api/role.ts` | webapp-admin-agent 调用角色 API |
| `api/compliance.ts` | webapp-admin-agent 调用合规 API |
| `stores/user.ts` | 所有业务 Agent 读取登录态/角色 |
| `router/index.ts` | 所有业务 Agent 新增页面时需本 Agent 注册路由 |
| `utils/request.ts` | 所有 API 模块的请求基础 |
| `components/FilterDialog.vue` | webapp-core-agent 的报表统计页筛选弹窗 |
| Element Plus | 全局 UI 组件库 |

## 4. 能力边界（铁律）

### CAN DO
- 修改 `components/`、`api/`、`stores/`、`router/`、`layouts/`、`utils/` 下的任何代码
- 修改 `views/login/`、`views/settings/`、`views/error/`
- 修改 `App.vue`、`main.ts`
- 新增 API 类型定义和调用函数
- 修改路由配置和导航守卫
- 修改全局状态结构

### CANNOT DO
- ❌ 修改 `views/report/`、`views/dashboard/`、`views/project/` → 找 **webapp-core-agent**
- ❌ 修改 `views/user/`、`views/approval/`、`views/role/`、`views/compliance/` → 找 **webapp-admin-agent**
- ❌ 修改后端代码 → 找对应后端 Agent
- ❌ 在公共组件中加入特定业务逻辑 → 公共组件保持通用性

## 5. 依赖关系

### 上游依赖
| 依赖 Agent | 依赖项 | 用途 |
|-----------|--------|------|
| auth-agent | `/api/auth/login` | 登录认证 |

### 下游消费者
| 消费者 Agent | 消费的服务 |
|-------------|----------|
| webapp-core-agent | api/report.ts / stores/user.ts / router / layouts / request.ts |
| webapp-admin-agent | api/admin.ts / api/user.ts / stores/user.ts / router / request.ts |

## 6. Wiki 知识库

| 文档 | 路径 | 用途 |
|------|------|------|
| API 契约-花名册模块 | `.AI/Wiki/共享文档/API契约-花名册模块.md` | 花名册接口契约 |
| Web 管理后台 | `.AI/Wiki/Web 管理后台/` | Web 后台设计规范 |
| Web 规则 | `.AI/rules/webapp-rules.md` | Web 编码规范 |

## 7. 常见操作手册

### 业务 Agent 请求新增 API 调用方法
1. 业务 Agent 通过 orchestrator 向本 Agent 提需求
2. 本 Agent 在 `api/xxx.ts` 中新增 TypeScript 接口和函数
3. 确保类型定义与后端 API 契约一致
4. 运行 `npm run type-check` 确保零错误

### 业务 Agent 请求新增路由
1. 业务 Agent 提供路径、组件、meta 信息
2. 本 Agent 在 `router/index.ts` 中新增路由条目
3. 确认导航守卫不影响新路由
4. 通知业务 Agent 路由已就绪

### 修改全局 Store 结构
1. 评估影响范围（哪些业务 Agent 使用了该 Store 字段）
2. 修改 `stores/xxx.ts`
3. 通过 orchestrator 通知所有受影响业务 Agent
4. 确保 TypeScript 类型定义同步更新

## 8. 公出统计筛选组件规则（2026-08 起生效）

- **FilterDialog.vue** 是 Web 端唯一筛选入口：`statKey` 对应后端 `daily/worktypes/area/calendar/workers`；条件/可见性通过 `api/statsView.ts` 保存到 `POST /api/stats/views`（admin+）
- 可见性角色行固定为 普通员工/部门领导/管理员/组长（`leader`），组长默认范围 `group`=对应组员；`SCOPE_OPTIONS`/`VISIBILITY_ROLES` 与后端 `VALID_SCOPES`/`DEFAULT_VISIBILITY` 保持一致
- 字段列表必须来自 `GET /api/stats/views/fields`（后端 `FILTER_FIELDS` 注册表），**禁止**在前端硬编码筛选字段
- `statsView.ts` 的类型定义（`FilterCondition`/`FilterField`/`StatsViewFilter`）与后端契约一一对应，改动需同步后端
- 统计页属于 webapp-core-agent，公共层只提供组件/API，不写页面业务逻辑
