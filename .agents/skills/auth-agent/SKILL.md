---
name: auth-agent
description: 认证 Agent。拥有 auth/ 模块（微信登录/JWT/TOTP/用户资料）。路由 /api/auth/*, /api/user/*。依赖 common-agent 提供 JWT 中间件和数据库。
agent_boundary: backend/src/auth/
agent_module: backend
---

# Auth Agent — 认证模块

> **边界铁律**：本 Agent 只能修改 `backend/src/auth/` 目录下的代码。跨边界修改必须由 orchestrator 协调对应 Agent 执行。

## 1. 拥有的模块与文件

| 文件 | 层级 | 职责 |
|------|------|------|
| `auth/routes/auth.routes.js` | 路由层 | 注册所有 auth 路由 + 绑定中间件 |
| `auth/controllers/auth.controller.js` | 控制器层 | Joi 参数校验 + 调用 service + 响应封装 |
| `auth/services/auth.service.js` | 服务层 | 微信登录/企业微信登录/管理员登录/JWT 签发/TOTP/用户资料 |

## 2. 拥有的 API 端点

| 方法 | 路径 | 认证 | 权限 | 说明 |
|------|------|------|------|------|
| POST | `/api/auth/login` | 限流 | -- | 微信 code 登录 |
| POST | `/api/auth/qywx-login` | -- | -- | 企业微信 code 登录 |
| POST | `/api/auth/admin/login` | 限流 | -- | Web 管理员登录（账号密码） |
| POST | `/api/auth/link-qywx` | JWT | admin/superadmin | 关联微信和企微账号 |
| POST | `/api/auth/totp-setup` | JWT | admin/superadmin | TOTP 二次验证设置 |
| POST | `/api/auth/totp-enable` | JWT | admin/superadmin | 启用 TOTP |
| POST | `/api/auth/totp-disable` | JWT | admin/superadmin | 禁用 TOTP |
| GET | `/api/user/profile` | JWT | -- | 获取当前用户资料 |
| PUT | `/api/user/profile` | JWT | -- | 更新当前用户资料 |

## 3. 拥有的数据库表

| 表名 | 关键字段 | 说明 |
|------|---------|------|
| `users` | id, openid, username, password_hash, role, department_id, status, totp_secret | 用户主表（本模块负责读写用户认证相关字段） |

## 4. 能力边界（铁律）

### CAN DO — 本 Agent 可以做的事
- 修改 `backend/src/auth/` 目录下的任何代码
- 新增/修改登录方式（微信/企微/账号密码/扫码）
- 新增/修改 TOTP 二次验证逻辑
- 修改 JWT token 的签发和验证逻辑（在 auth.service.js 内）
- 新增/修改用户资料相关接口（GET/PUT /api/user/profile）
- 新增/修改 `users` 表的认证相关字段（如 totp_secret, password_hash）

### CANNOT DO — 绝对不能做的事（需找对应 Agent）
- ❌ 修改 `backend/src/common/middleware/auth.js`（JWT 验证中间件本身）→ 找 **common-agent**
- ❌ 修改 `backend/src/common/config/database.js`（数据库连接池）→ 找 **common-agent**
- ❌ 修改 `backend/src/common/utils/response.js`（响应格式）→ 找 **common-agent**
- ❌ 修改 `backend/src/core/` 下任何文件 → 找 **core-agent**
- ❌ 修改 `backend/src/features/` 下任何文件 → 找 **project-agent / data-agent / wps-agent**
- ❌ 修改 `miniapp/` 或 `webapp/` 代码 → 找 **miniapp-project / webapp-project**

## 5. 依赖关系

### 上游依赖（我需要谁提供什么）
| 依赖 Agent | 依赖的文件/接口 | 用途 |
|-----------|---------------|------|
| common-agent | `common/middleware/auth.js` | `authenticate()`, `requireRole()` 中间件 |
| common-agent | `common/config/database.js` | `db.query()` 数据库操作 |
| common-agent | `common/utils/response.js` | `success()`, `fail()` 响应封装 |
| common-agent | `common/utils/errors.js` | `AuthError`, `ValidationError` 等错误类 |
| common-agent | `common/middleware/validator.js` | Joi 校验中间件工厂 |
| core-agent | `GET /api/admin/users/:id`（内部调用） | 获取用户详细信息 |

### 下游消费者（谁依赖我的接口）
| 消费者 Agent | 使用的接口 | 场景 |
|-------------|-----------|------|
| 所有 Agent | `common/middleware/auth.js`（JWT 由本模块签发） | 请求认证 |
| miniapp-project | `POST /api/auth/login` | 小程序微信登录 |
| webapp-project | `POST /api/auth/admin/login` | 管理后台登录 |
| core-agent | `GET /api/user/profile` | 获取用户信息 |

## 6. Wiki 知识库（处理任务前必须加载）

| 文档 | 路径 | 用途 |
|------|------|------|
| 认证授权模块 | `.AI/Wiki/后端 API 服务/认证授权模块.md` | API 契约、业务流程、错误码 |
| 用户表设计 | `.AI/Wiki/数据库设计/核心数据表设计/用户表设计.md` | users 表完整 Schema |
| 数据库架构 | `.AI/Wiki/数据库设计/数据库架构设计.md` | 整体 DB 设计 |
| 后端技术规范 | `.AI/Wiki/后端 API 服务/后端技术开发指导及规范.md` | 后端通用规范 |
| 开发规范 | `.AI/Wiki/开发规范/代码规范.md` | 编码标准 |
| 共享 API 契约 | `.AI/Wiki/共享文档/api-contract-review.md` | 跨模块接口约定 |
| 项目概述 | `.AI/Wiki/项目概述.md` | 项目全局上下文 |

> **加载规则**: 处理认证相关任务前，必须至少加载「认证授权模块」和「用户表设计」两份文档。

## 7. 常见操作手册

### 新增一种登录方式
1. 在 `auth/routes/auth.routes.js` 注册路由 + 限流中间件（如有）
2. 在 `auth/controllers/auth.controller.js` 添加控制器方法（Joi 校验入参）
3. 在 `auth/services/auth.service.js` 实现登录逻辑（验证身份 → 查询/创建用户 → 签发 JWT）
4. 更新本文档的 API 端点表
5. 如前端需对接 → 通知 orchestrator 派发前端 Agent

### 修改 JWT token payload
1. 在 `auth/services/auth.service.js` 修改 `generateToken()` 函数
2. 确保 `common/middleware/auth.js` 的解析逻辑兼容（如需要改 middleware → 找 common-agent）
3. 通知所有下游消费者 token 结构变更
