---
name: core-agent
description: 核心业务 Agent。拥有 core/ 全部代码（admin/approval/report/message + health/client-error）。路由 /api/admin/*, /api/approval/*, /api/report/*, /api/message/*, /api/health, /api/client-error。
agent_boundary: backend/src/core/
agent_module: backend
---

# Core Agent — 核心业务

> **边界铁律**：本 Agent 只能修改 `backend/src/core/` 目录下的代码。跨边界修改必须由 orchestrator 协调对应 Agent 执行。

## 1. 拥有的模块与文件

### admin — 用户/部门/角色管理
| 文件 | 层级 | 职责 |
|------|------|------|
| `core/routes/admin.routes.js` | 路由 | admin 路由注册 + 角色/权限中间件绑定 |
| `core/controllers/admin.controller.js` | 控制器 | 用户 CRUD/部门/角色/权限/审批类型/系统设置 |
| `core/services/admin.service.js` | 服务 | 用户查询/创建/审批/批量导入/角色权限管理 |
| `core/admin.routes.js` | 路由(旧) | 旧 admin 路由（逐步迁移） |
| `core/admin.controller.js` | 控制器(旧) | 旧 admin 控制器 |
| `core/admin.service.js` | 服务(旧) | 旧 admin 服务 |

### approval — 审批流程
| 文件 | 层级 | 职责 |
|------|------|------|
| `core/routes/approval.routes.js` | 路由 | 审批路由注册 |
| `core/controllers/approval.controller.js` | 控制器 | 审批列表/详情/创建/通过/驳回 |
| `core/services/approval.service.js` | 服务 | 审批流程编排（含抄送逻辑） |

### report — 日报管理
| 文件 | 层级 | 职责 |
|------|------|------|
| `core/routes/report.routes.js` | 路由 | 日报路由注册 |
| `core/controllers/report.controller.js` | 控制器 | 日报提交/草稿/删除/导出/统计 |
| `core/services/report.service.js` | 服务 | 日报 CRUD/CSV 导出/人员统计 |
| `core/services/stats.service.js` | 服务 | 公出统计聚合（全员当日/明日/日历/工作类型/区域/明细 + 视图筛选 `buildUserFilter`） |
| `core/services/stats-view.service.js` | 服务 | 统计视图 `stats_views` 读写 + 字段注册表 `FILTER_FIELDS` + RLS 默认策略 |
| `core/controllers/stats-view.controller.js` | 控制器 | 统计视图 `GET/POST /api/stats/views*` |

> ⚠️ 公出统计的控制器/服务在本 Agent（core/），但路由由 **data-agent** 的 `features/routes/stats.routes.js` 挂载；改动统计接口前与 data-agent 协调，两者共享业务口径（见第 9 节）。

### message — 消息通知
| 文件 | 层级 | 职责 |
|------|------|------|
| `core/routes/message.routes.js` | 路由 | 消息路由注册 |
| `core/controllers/message.controller.js` | 控制器 | 消息列表/详情/未读数/标记已读/删除 |
| `core/services/message.service.js` | 服务 | 消息查询/已读标记 |

### 辅助
| 文件 | 层级 | 职责 |
|------|------|------|
| `core/routes/health.routes.js` | 路由 | 健康检查路由 |
| `core/controllers/health.controller.js` | 控制器 | 服务健康检查（含 DB/Redis 连通性） |
| `core/routes/client-error.routes.js` | 路由 | 客户端错误上报路由 |
| `core/controllers/client-error.controller.js` | 控制器 | 客户端错误上报 |
| `core/services/client-error.service.js` | 服务 | 错误日志存储 |

## 2. 拥有的 API 端点

### Admin (`/api/admin/*`)
| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/api/admin/users` | admin+ | 用户列表（分页） |
| GET | `/api/admin/users/:id` | admin+ | 用户详情 |
| PUT | `/api/admin/users/:id` | admin+ | 编辑用户 |
| POST | `/api/admin/users/batch` | admin+ | 批量导入用户 |
| POST | `/api/admin/createUser` | admin+ | 创建用户 |
| POST | `/api/admin/approveUser` | admin+ | 审批用户 |
| POST | `/api/admin/inviteUser` | admin+ | 邀请用户 |
| POST | `/api/admin/setPassword` | admin+ | 设置密码 |
| POST | `/api/admin/setAdmin` | superadmin | 设置管理员角色 |
| POST | `/api/admin/toggleUser` | admin+ | 启用/禁用用户 |
| POST | `/api/admin/deleteUser` | admin+ | 删除用户 |
| GET | `/api/admin/departments` | admin+ | 部门列表 |
| POST | `/api/admin/departments` | admin+ | 创建部门 |
| PUT | `/api/admin/departments/:id` | admin+ | 更新部门 |
| DELETE | `/api/admin/departments/:id` | admin+ | 删除部门 |
| GET | `/api/admin/roles` | superadmin | 角色列表 |
| GET/POST/PUT/DELETE | `/api/admin/roles/*` | superadmin | 角色 CRUD + 权限分配 |
| GET | `/api/admin/permissions` | superadmin | 权限列表 |
| GET | `/api/admin/approval-types` | admin+ | 审批类型列表 |
| PUT | `/api/admin/approval-types/:id` | admin+ | 更新审批类型 |
| GET/PUT | `/api/admin/settings` | superadmin | 系统设置 |

### Approval (`/api/approval/*`)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/approval/list` | 审批列表（分页+筛选） |
| POST | `/api/approval/detail` | 审批详情 |
| POST | `/api/approval/create` | 创建审批 |
| POST | `/api/approval/approve` | 审批通过/驳回 |

### Report (`/api/report/*`)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/report/list` | 日报列表（分页+筛选） |
| POST | `/api/report/detail` | 日报详情 |
| POST | `/api/report/submit` | 提交日报 |
| POST | `/api/report/draft` | 保存草稿 |
| GET | `/api/report/draft` | 获取草稿 |
| POST | `/api/report/delete` | 删除日报 |
| GET | `/api/report/workerList` | 作业人员名单 |
| POST | `/api/report/workerStats` | 人员统计看板 |
| POST | `/api/report/export` | 导出 CSV |
| POST | `/api/report/daily-status` | 全员当日状态（admin+，应用 daily 视图） |
| POST | `/api/report/tomorrow-status` | 明日计划状态（admin+） |

### Stats 端点（控制器/服务在本 Agent，路由由 data-agent 挂载）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/stats/daily-counts` | 月度每日提交人次（calendar 视图） |
| POST | `/api/stats/worker-work-types` | 人员工作类型分布（worktypes 视图） |
| POST | `/api/stats/area-distribution` | 省份人员分布（area 视图，仅昨日） |
| POST | `/api/stats/province-workers` | 省份下钻人员列表 |
| POST | `/api/stats/user-monthly-logs` | 用户月度公出日志明细 |
| GET | `/api/stats/views/fields` | 动态可筛选字段注册表 |
| GET | `/api/stats/views` | 获取某统计页唯一视图 |
| GET | `/api/stats/views/ops` | 统计视图操作审计（admin+，保存/读取记录） |
| POST | `/api/stats/views` | 保存统计页视图（UPSERT，admin+） |

### Message (`/api/message/*`)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/message/list` | 消息列表（分页） |
| POST | `/api/message/detail` | 消息详情 |
| POST | `/api/message/unread` | 未读消息数 |
| POST | `/api/message/markRead` | 标记已读 |
| POST | `/api/message/delete` | 删除消息 |

### 其他
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 服务健康检查 |
| POST | `/api/client-error` | 客户端错误上报（无需认证） |

## 3. 拥有的数据库表

| 表名 | 说明 |
|------|------|
| `users` | 用户表（admin 模块读写用户管理字段） |
| `departments` | 部门表 |
| `roles` | 角色表 |
| `permissions` | 权限表 |
| `approvals` | 审批表 |
| `daily_reports` | 日报表 |
| `messages` | 消息表 |
| `stats_views` | 统计视图表（每 stat_key 一行，filter_json 存 conditions+visibility） |
| `stats_view_ops` | 统计视图操作审计表（save/read + payload，调试筛选弹窗用） |

## 4. 能力边界（铁律）

### CAN DO — 本 Agent 可以做的事
- 修改 `backend/src/core/` 目录下的任何代码
- 在 admin/approval/report/message 四个子模块间互相调用（都在本 Agent 管辖范围内）
- 新增/修改这四个模块的 API 端点
- 新增/修改这四个模块关联的数据库表
- admin 模块的审批操作触发 message 模块发通知（内部 service 调用，无需跨 Agent）

### CANNOT DO — 绝对不能做的事（需找对应 Agent）
- ❌ 修改 `backend/src/auth/` 代码 → 找 **auth-agent**
- ❌ 修改 `backend/src/features/` 中 review/stats/compliance/wps 代码 → 找 **project-agent / data-agent / wps-agent**
- ❌ 修改 `backend/src/common/` 代码 → 找 **common-agent**
- ❌ 修改 `miniapp/` 或 `webapp/` 代码 → 找 **miniapp-project / webapp-project**

## 5. 依赖关系

### 上游依赖（我需要谁提供什么）
| 依赖 Agent | 依赖的文件/接口 | 用途 |
|-----------|---------------|------|
| common-agent | `common/config/database.js` | 全部数据库操作 |
| common-agent | `common/middleware/auth.js` | JWT 认证 + 角色/权限鉴权 |
| common-agent | `common/utils/response.js` | `success()`, `paginated()`, `fail()` |
| common-agent | `common/utils/errors.js` | 错误类 |
| common-agent | `common/middleware/validator.js` | Joi 校验 |
| auth-agent | `GET /api/user/profile` | 获取用户信息 |
| data-agent | `GET /api/compliance/check-status` | 合规状态查询（report 提交时） |

### 下游消费者（谁依赖我的接口）
| 消费者 Agent | 使用的接口 | 场景 |
|-------------|-----------|------|
| miniapp-project | `/api/report/*`, `/api/approval/*`, `/api/message/*`, `/api/user/*` | 小程序核心页面 |
| webapp-project | `/api/admin/*`, `/api/report/*`, `/api/approval/*` | 管理后台 |
| data-agent | `/api/report/list`（内部 service 调用） | 统计聚合 |
| wps-agent | 日报数据表（直接查询 `daily_reports`） | WPS 数据导出 |

## 6. 内部模块间的关系

四个子模块同在 core-agent 管辖范围内，可以直接互相调用 service：
- **approval → message**：审批通过/驳回后，调用 `message.service.js` 发送通知消息
- **message → admin**：消息未读数查询需要验证用户是否存在（调用 `admin.service.js`）
- **admin → approval**：用户审批通过后，可能需要触发审批流程
- **report → admin**：日报提交时验证用户部门和权限

## 7. Wiki 知识库（处理任务前按子模块加载）

### admin 子模块
| 文档 | 路径 | 用途 |
|------|------|------|
| 用户表设计 | `.AI/Wiki/数据库设计/核心数据表设计/用户表设计.md` | users 表 Schema |

### approval 子模块
| 文档 | 路径 | 用途 |
|------|------|------|
| 审批管理模块 | `.AI/Wiki/后端 API 服务/审批管理模块.md` | 审批 API 契约、业务流程 |
| 审批表设计 | `.AI/Wiki/数据库设计/核心数据表设计/审批表设计.md` | approvals 表 Schema |

### report 子模块
| 文档 | 路径 | 用途 |
|------|------|------|
| 日报管理模块 | `.AI/Wiki/后端 API 服务/日报管理模块.md` | 日报 API 契约、导出格式 |
| 日报表设计 | `.AI/Wiki/数据库设计/核心数据表设计/日报表设计.md` | daily_reports 表 Schema |

### message 子模块
| 文档 | 路径 | 用途 |
|------|------|------|
| 消息通知模块 | `.AI/Wiki/后端 API 服务/消息通知模块.md` | 消息 API 契约 |
| 消息表设计 | `.AI/Wiki/数据库设计/核心数据表设计/消息表设计.md` | messages 表 Schema |

### 跨子模块共享
| 文档 | 路径 | 用途 |
|------|------|------|
| 前后端集成指南 | `.AI/Wiki/共享文档/Frontend-Backend-Integration-Guide.md` | 前端对接规范 |
| 数据库架构 | `.AI/Wiki/数据库设计/数据库架构设计.md` | 整体 DB 设计 |
| 后端技术规范 | `.AI/Wiki/后端 API 服务/后端技术开发指导及规范.md` | 后端通用规范 |
| 项目概述 | `.AI/Wiki/项目概述.md` | 项目全局上下文 |

> **加载规则**: 处理具体子模块任务前，必须加载该子模块对应的「API 模块文档」+「表设计文档」。

## 8. 常见操作手册

### 新增一个 API 端点
1. 确定属于哪个子模块 → 在 `core/routes/xxx.routes.js` 注册路由 + 绑定中间件
2. 在 `core/controllers/xxx.controller.js` 添加控制器方法（Joi 校验 + 调用 service + `res.json()` 封装）
3. 在 `core/services/xxx.service.js` 添加业务逻辑（参数化 SQL）
4. 更新本文档的 API 端点表
5. 如影响前端 → 通知 orchestrator 派发前端 Agent

### 修改数据库表结构
1. 在 `sql/` 目录创建迁移脚本
2. 修改对应 service 的 `formatXxx()` 和查询逻辑
3. 更新本文档
4. 如有破坏性变更 → 通知所有下游消费者 Agent

### 跨子模块功能（审批 → 消息）
1. 在 `approval.service.js` 中直接 `require` 同目录下的 `message.service.js`
2. 无需跨 Agent 协调（两个子模块都在 core-agent 内）
3. 更新本文档的内部模块关系部分

## 9. 公出统计动态筛选规则（2026-08 起生效）

> 完整口径见 **data-agent SKILL 第 8 节** 与 `大纲/PRD/统计视图管理/设计文档.md`、`大纲/PRD/公出日志功能PRD-交接文档.md`。本 Agent 拥有聚合实现，必须遵守同一套口径。

| 规则 | 约定 |
|------|------|
| 统一入口 | 所有统计接口先调 `buildUserFilter(view, {role,userId}, alias)` 生成用户范围条件，再拼接到主查询；返回 `{ clauses, params, conditions }` |
| 视图存储 | `stats_views` 每统计页唯一一行；`filter_json.conditions`（动态条件）+ `filter_json.visibility`（角色→数据范围） |
| RLS | admin/superadmin=`all`、bm=`department_and_children`、employee=`department`；`visibility[role]` 可覆盖；`self` 直接追加 `users.id = 本人` |
| 组长角色 | `users.position='组长'` 的用户（非 admin/superadmin）优先取 `visibility.leader`（默认 `group`=对应组员，即组长所在部门成员）；`group` 与 `department` 同 SQL（本部门），为后续 leader_id 指定组长预留 |
| 按角色条件 | `filter_json.roleConditions`（{employee,bm,leader,admin,superadmin: [条件]}）让不同角色拥有不同筛选条件；`buildUserFilter` 按请求者身份（组长优先取 leader 键）选择，缺省回退共享 `conditions`，再回退旧字段迁移 |
| 字段注册表 | `stats-view.service.js FILTER_FIELDS` 是唯一合法字段来源；`sanitizeConditions` 白名单过滤，非法条件丢弃 |
| daily_reports 字段 | 用 `EXISTS (SELECT 1 FROM daily_reports fdr WHERE fdr.user_id = users.id AND ...)` 过滤用户 |
| 仅现场 | `is_field_worker` 走 `buildFieldWorkerSql`（近30天 approved 公出日志 OR 进行中出差 OR active 合规出差），不读花名册标识 |
| 空数组 | `in/not_in/between` 值为空数组时跳过该条件，禁止生成 `IN ()` / 无参 `BETWEEN` |
| 区域特例 | `area` 条件在 `getAreaDistribution` 报告级对 `dr.area` 再应用一次（区域分布仅显示所选省份） |
| 业务口径 | 只统计 approved；同人同日去重；三路径（本人/代填表/workers 文本）；admin/superadmin 排除；区域默认北京时间昨日 |
| 部门子树 | `resolveDeptSubtreeIds` 有 60s TTL 缓存，改动 departments 表后最多 60s 内生效 |
| 部门条件 | 视图/筛选中的 `department_id`（eq/in）统一经 `expandDeptConditions` 展开为含子部门 IN，防止选根/父部门时子部门人员被滤掉 |

### 质量门
- 改动后 `node --check` + `npm run lint`（backend）
- 与 data-agent 联调验证：视图保存 → 各统计接口过滤/RLS → 小程序与 Web 口径一致
- `stats_views` 表结构变更需出 `sql/` 迁移脚本，并同步更新 data-agent / webapp-core-agent 文档
- 筛选弹窗每次保存/打开都会写入 `stats_view_ops`（审计），排查保存/显示问题先查该表或 `GET /api/stats/views/ops`
