---
name: project-agent
description: 项目+审核 Agent。拥有 core/ 中 project 相关代码 + features/ 中 review 相关代码。路由 /api/project/* (含 review 子路由)。项目管理与审核管理统一归属。
agent_boundary: backend/src/core/controllers/project.controller.js, backend/src/core/services/project.service.js, backend/src/core/routes/project.routes.js, backend/src/features/controllers/review.controller.js, backend/src/features/services/review.service.js, backend/src/features/routes/review.routes.js
agent_module: backend
---

# Project Agent — 项目与审核

> **边界铁律**：本 Agent 只能修改 project（core/ 下）和 review（features/ 下）的文件。跨边界修改必须由 orchestrator 协调对应 Agent 执行。

## 1. 拥有的模块与文件

### project — 项目管理（位于 core/）
| 文件 | 层级 | 职责 |
|------|------|------|
| `core/routes/project.routes.js` | 路由 | 项目路由注册 |
| `core/controllers/project.controller.js` | 控制器 | 项目列表/详情/统计 |
| `core/services/project.service.js` | 服务 | 项目 CRUD/统计查询 |

### review — 审核管理（位于 features/）
| 文件 | 层级 | 职责 |
|------|------|------|
| `features/routes/review.routes.js` | 路由 | 审核路由注册（admin+ 权限） |
| `features/controllers/review.controller.js` | 控制器 | 审核列表/详情/操作/统计 |
| `features/services/review.service.js` | 服务 | 审核业务逻辑 |

## 2. 拥有的 API 端点

### Project (`/api/project/*`)
| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/project/list` | JWT | 项目列表（分页+搜索） |
| POST | `/api/project/detail` | JWT | 项目详情 |
| POST | `/api/project/stats` | JWT | 项目统计 |

### Review (`/api/project/review*`) — 嵌套在 project 路由前缀下
| 方法 | 路径 | 认证 | 权限 | 说明 |
|------|------|------|------|------|
| POST | `/api/project/reviewList` | JWT | admin+ | 审核列表 |
| POST | `/api/project/reviewDetail` | JWT | admin+ | 审核详情 |
| POST | `/api/project/reviewAction` | JWT | admin+ | 审核操作（通过/驳回） |
| POST | `/api/project/reviewStats` | JWT | admin+ | 审核统计 |

> **注意**：review 路由虽然在 `/api/project/` 路径下，但代码在 `features/` 目录。两个模块统一由本 Agent 管理。

## 3. 拥有的数据库表

| 表名 | 说明 |
|------|------|
| `projects` | 项目表 |
| `review_records` | 审核记录表 |

## 4. 能力边界（铁律）

### CAN DO — 本 Agent 可以做的事
- 修改 `core/` 下 project 相关的 3 个文件（routes/controller/service）
- 修改 `features/` 下 review 相关的 3 个文件（routes/controller/service）
- 新增/修改项目 API 端点
- 新增/修改审核 API 端点
- 修改 `projects` 和 `review_records` 表结构
- 项目模块和审核模块之间的内部协调（同属本 Agent）

### CANNOT DO — 绝对不能做的事（需找对应 Agent）
- ❌ 修改 `backend/src/auth/` 代码 → 找 **auth-agent**
- ❌ 修改 `backend/src/core/` 中 admin/approval/report/message 代码 → 找 **core-agent**
- ❌ 修改 `backend/src/features/` 中 stats/compliance/wps 代码 → 找 **data-agent / wps-agent**
- ❌ 修改 `backend/src/common/` 代码 → 找 **common-agent**

## 5. 依赖关系

### 上游依赖（我需要谁提供什么）
| 依赖 Agent | 依赖的文件/接口 | 用途 |
|-----------|---------------|------|
| common-agent | `common/config/database.js` | 数据库操作 |
| common-agent | `common/middleware/auth.js` | JWT + `requireRole()` |
| common-agent | `common/utils/response.js` | `success()`, `paginated()`, `fail()` |
| common-agent | `common/utils/errors.js` | 错误类 |
| core-agent | `GET /api/admin/users/:id`（内部调用） | 审核时获取用户信息 |

### 下游消费者（谁依赖我的接口）
| 消费者 Agent | 使用的接口 | 场景 |
|-------------|-----------|------|
| miniapp-project | `/api/project/list`, `/api/project/detail` | 小程序项目页 |
| webapp-project | `/api/project/*`, `/api/project/review*` | 管理后台项目+审核页 |
| data-agent | `/api/project/list`（内部 service 调用） | 统计项目数据 |

## 6. Wiki 知识库（处理任务前必须加载）

### project 子模块
| 文档 | 路径 | 用途 |
|------|------|------|
| 数据库架构 | `.AI/Wiki/数据库设计/数据库架构设计.md` | projects 表 Schema |

### review 子模块
| 文档 | 路径 | 用途 |
|------|------|------|
| 审核管理模块 | `.AI/Wiki/后端 API 服务/审核管理模块.md` | 审核 API 契约、业务流程 |
| 审核记录表设计 | `.AI/Wiki/数据库设计/核心数据表设计/审核记录表设计.md` | review_records 表 Schema |

### 跨子模块共享
| 文档 | 路径 | 用途 |
|------|------|------|
| 后端技术规范 | `.AI/Wiki/后端 API 服务/后端技术开发指导及规范.md` | 后端通用规范 |
| 前后端集成指南 | `.AI/Wiki/共享文档/Frontend-Backend-Integration-Guide.md` | 前端对接 |
| 项目概述 | `.AI/Wiki/项目概述.md` | 项目全局上下文 |

> **加载规则**: 处理审核任务前必须加载「审核管理模块」+「审核记录表设计」；处理项目任务前加载「数据库架构」。

## 7. 常见操作手册

### 新增审核规则/流程
1. 在 `features/services/review.service.js` 添加审核逻辑
2. 如需新增路由 → 在 `features/routes/review.routes.js` 注册
3. 如需新增控制器 → 在 `features/controllers/review.controller.js` 添加方法
4. 更新本文档 API 端点表
5. 如影响前端审核页面 → 通知 orchestrator 派发前端 Agent

### 新增项目字段
1. 在 `sql/` 创建 `ALTER TABLE projects` 迁移脚本
2. 在 `core/services/project.service.js` 修改 `formatProject()` + SQL 查询
3. 在 `core/controllers/project.controller.js` 修改 Joi schema
4. 更新本文档
