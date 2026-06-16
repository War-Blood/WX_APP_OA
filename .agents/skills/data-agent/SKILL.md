---
name: data-agent
description: 数据与合规 Agent。拥有 features/ 中 stats + compliance 全部代码。路由 /api/stats/*, /api/compliance/*。含定时任务（合规提醒）。
agent_boundary: backend/src/features/controllers/stats.controller.js, backend/src/features/services/stats.service.js, backend/src/features/routes/stats.routes.js, backend/src/features/compliance/
agent_module: backend
---

# Data Agent — 统计与合规

> **边界铁律**：本 Agent 只能修改 `features/` 中 stats 和 compliance 的代码。跨边界修改必须由 orchestrator 协调对应 Agent 执行。

## 1. 拥有的模块与文件

### stats — 统计看板（位于 features/）
| 文件 | 层级 | 职责 |
|------|------|------|
| `features/routes/stats.routes.js` | 路由 | 统计路由注册 |
| `features/controllers/stats.controller.js` | 控制器 | 首页统计/动态/个人统计/日报统计 |
| `features/services/stats.service.js` | 服务 | 多表聚合查询统计 |

### compliance — 合规管理（位于 features/compliance/）
| 文件 | 层级 | 职责 |
|------|------|------|
| `compliance/routes/compliance.routes.js` | 路由 | 合规路由注册（管理员+员工接口） |
| `compliance/controllers/compliance.controller.js` | 控制器 | 出差管理/缺失报告审核/合规统计 |
| `compliance/services/compliance.service.js` | 服务 | 合规核心业务逻辑 |
| `compliance/services/reminder.service.js` | 服务 | 合规提醒服务 |
| `compliance/services/stats.service.js` | 服务 | 合规统计服务 |

### 定时任务（位于 common/tasks/，但逻辑由本 Agent 维护）
| 文件 | 说明 |
|------|------|
| `common/tasks/compliance.task.js` | 合规检查定时任务（调度框架在 common-agent，业务逻辑归本 Agent） |
| `common/tasks/reminder.task.js` | 提醒通知定时任务（同上） |

## 2. 拥有的 API 端点

### Stats (`/api/stats/*`)
| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/stats/home` | JWT | 首页统计数据 |
| POST | `/api/stats/activities` | JWT | 最近动态列表（分页） |
| POST | `/api/stats/profile` | JWT | 个人中心统计 |
| POST | `/api/stats/reportStats` | JWT | 日报统计看板 |

### Compliance (`/api/compliance/*`)
| 方法 | 路径 | 认证 | 权限 | 说明 |
|------|------|------|------|------|
| POST | `/api/compliance/biz-trip` | JWT | admin+ | 设置用户出差状态 |
| PUT | `/api/compliance/biz-trip/:id/end` | JWT | admin+ | 结束出差 |
| GET | `/api/compliance/biz-trip/list` | JWT | admin+ | 出差列表 |
| GET | `/api/compliance/missing-reports` | JWT | admin+ | 缺失报告列表 |
| POST | `/api/compliance/missing-reports/:id/review` | JWT | admin+ | 审核缺失报告 |
| PUT | `/api/compliance/timeliness/:id` | JWT | admin+ | 更新及时性 |
| GET | `/api/compliance/stats/dashboard` | JWT | admin+ | 合规统计看板 |
| GET | `/api/compliance/my-compliance` | JWT | -- | 我的合规记录 |
| GET | `/api/compliance/biz-trip/check-status` | JWT | -- | 查询我的出差状态 |

## 3. 拥有的数据库表

| 表名 | 说明 |
|------|------|
| `compliance_records` | 合规记录表（出差状态/缺失报告/及时性） |

## 4. 能力边界（铁律）

### CAN DO — 本 Agent 可以做的事
- 修改 `features/` 中 stats 和 compliance 的所有代码
- 新增/修改统计分析接口和聚合查询
- 新增/修改合规管理接口和业务逻辑
- 修改 `compliance_records` 表结构
- 修改合规相关的定时任务**业务逻辑**（`compliance.task.js`, `reminder.task.js`）
- stats 查询跨表聚合（可查询 reports/projects/users 等表，但只能 SELECT 不能修改）

### CANNOT DO — 绝对不能做的事（需找对应 Agent）
- ❌ 修改 `backend/src/auth/` 代码 → 找 **auth-agent**
- ❌ 修改 `backend/src/core/` 中任何代码 → 找 **core-agent**
- ❌ 修改 `backend/src/features/` 中 review/wps 代码 → 找 **project-agent / wps-agent**
- ❌ 修改 `backend/src/common/` 代码（含定时任务调度框架 scheduler.js）→ 找 **common-agent**
- ❌ 修改其他 Agent 拥有的数据表（`daily_reports`, `projects`, `users` 等）→ 找对应 Agent

### 特殊说明：定时任务
- `common/tasks/compliance.task.js` 和 `common/tasks/reminder.task.js` 的**调度注册**在 `common/tasks/scheduler.js`（归 common-agent）
- 但这两个文件的**业务逻辑**归本 Agent 维护
- 新增合规定时任务时：本 Agent 写业务逻辑 → common-agent 注册调度

## 5. 依赖关系

### 上游依赖（我需要谁提供什么）
| 依赖 Agent | 依赖的文件/接口 | 用途 |
|-----------|---------------|------|
| common-agent | `common/config/database.js` | 数据库操作 |
| common-agent | `common/middleware/auth.js` | JWT + `requireRole()` |
| common-agent | `common/utils/response.js` | `success()`, `paginated()`, `fail()` |
| common-agent | `common/utils/errors.js` | 错误类 |
| common-agent | `common/tasks/scheduler.js` | 定时任务调度注册 |
| core-agent | `daily_reports` 表（只读查询） | 统计聚合、缺失报告检测 |
| core-agent | `users` 表（只读查询） | 用户信息关联 |
| project-agent | `projects` 表（只读查询） | 项目统计 |

### 下游消费者（谁依赖我的接口）
| 消费者 Agent | 使用的接口 | 场景 |
|-------------|-----------|------|
| miniapp-project | `/api/stats/*`, `/api/compliance/my-compliance` | 小程序统计+合规页 |
| webapp-project | `/api/stats/*`, `/api/compliance/*` | 管理后台数据看板+合规管理 |
| core-agent | `GET /api/compliance/check-status` | 日报提交时的合规检查 |

## 6. Wiki 知识库（处理任务前按子模块加载）

### stats 子模块
| 文档 | 路径 | 用途 |
|------|------|------|
| 统计分析模块 | `.AI/Wiki/后端 API 服务/统计分析模块.md` | 统计 API 契约、聚合逻辑 |
| 数据库架构 | `.AI/Wiki/数据库设计/数据库架构设计.md` | 跨表查询的 Schema 参考 |
| 查询优化 | `.AI/Wiki/数据库设计/查询优化.md` | 聚合查询性能优化 |

### compliance 子模块
| 文档 | 路径 | 用途 |
|------|------|------|
| 定时任务 | `.AI/Wiki/后端 API 服务/定时任务.md` | 合规提醒定时任务设计 |

### 共享
| 文档 | 路径 | 用途 |
|------|------|------|
| 后端技术规范 | `.AI/Wiki/后端 API 服务/后端技术开发指导及规范.md` | 后端通用规范 |
| 前后端集成指南 | `.AI/Wiki/共享文档/Frontend-Backend-Integration-Guide.md` | 前端对接 |
| 项目概述 | `.AI/Wiki/项目概述.md` | 项目全局上下文 |

> **加载规则**: stats 任务必须加载「统计分析模块」+「查询优化」；compliance 任务必须加载「定时任务」。

## 7. 常见操作手册

### 新增统计指标
1. 在 `features/services/stats.service.js` 添加聚合查询（可跨表 SELECT）
2. 在 `features/controllers/stats.controller.js` 添加控制器方法
3. 在 `features/routes/stats.routes.js` 注册路由
4. 更新本文档 API 端点表

### 新增合规检查规则
1. 在 `compliance/services/compliance.service.js` 添加检查逻辑
2. 如需定时检查 → 修改 `common/tasks/compliance.task.js` 业务逻辑 + 通知 common-agent 注册调度
3. 在 `compliance/controllers/compliance.controller.js` 暴露接口
4. 更新本文档

### 新增合规定时提醒
1. 在 `common/tasks/reminder.task.js` 添加提醒逻辑（本 Agent 负责）
2. 向 orchestrator 申请 common-agent 在 `scheduler.js` 注册新的 cron 表达式
3. 更新本文档
