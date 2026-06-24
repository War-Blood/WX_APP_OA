# 后端文档索引

> 智慧办公助手 — 后端 API 服务（Node.js / Express）

---

## 文档清单

| 文档 | 版本/日期 | 类型 | 说明 |
|------|----------|------|------|
| [后端技术开发指导及规范.md](./后端技术开发指导及规范.md) | v1.0 / 2026-05-29 | 开发规范 | 分层架构、命名规范、编码规范、Git策略、安全规范 |
| [后端接口文档.md](./后端接口文档.md) | 2026-05-29 | API 文档 | 后端内部接口详细说明 |
| [技术可行性分析报告.md](./技术可行性分析报告.md) | 2026-05-29 | 可行性分析 | 技术选型可行性评估 |

---

## 架构速览

```
routes/        → 路由层（请求分发、中间件绑定）
controllers/   → 控制器层（参数校验、响应封装）
services/      → 服务层（业务逻辑编排）
  ↓
common/config/database.js → MySQL 参数化查询（mysql2）
common/config/redis.js    → 缓存层
```

### 模块分布

| 目录 | 用途 | 说明 |
|------|------|------|
| `src/auth/` | 认证模块 | 微信登录 / JWT / 用户资料 |
| `src/core/` | 核心业务 | approval / report / message |
| `src/features/` | 扩展业务 | stats / review |
| `src/common/` | 公共模块 | 数据库/Redis/日志/中间件/工具函数 |

### 已实现 API 路由

| 前缀 | 模块 | 状态 |
|------|------|------|
| `/api/auth/*` | auth | ✅ 已完成 |
| `/api/user/*` | auth | ✅ 已完成 |
| `/api/approval/*` | core | ✅ 已完成 |
| `/api/report/*` | core | ✅ 已完成 |
| `/api/message/*` | core | ✅ 已完成 |
| `/api/stats/*` | features | ✅ 已完成 |
| `/api/project/review*` | features | ✅ 已完成 |
| `/api/announcement/*` | 待开发 | ⬜ P1 |
| `/api/project/*` | 待开发 | ⬜ P1 |
| `/api/admin/*` | 待开发 | ⬜ P1 |
| `/api/asset/*` | 待开发 | ⬜ P2 |
| `/health` | core | ✅ 已完成 |
| `/api-docs` | Swagger | ✅ 已配置 |

### 技术栈

- **运行时**: Node.js + Express
- **数据库**: MySQL（双库：wx_app_oa + daily_report）
- **认证**: JWT (Bearer Token) + RBAC（employee/admin/superadmin）
- **缓存**: Redis
- **日志**: Winston
- **文档**: Swagger (swagger-jsdoc + swagger-ui-express)
- **测试**: Jest + Supertest

---

## 共享文档

跨端共享文档在 [../shared-docs/](../shared-docs/)，后端开发必读：

| 文档 | 说明 |
|------|------|
| [API-Interfaces.md](../shared-docs/API-Interfaces.md) | 全量 API 接口定义与错误码 |
| [Frontend-Backend-Integration-Guide.md](../shared-docs/Frontend-Backend-Integration-Guide.md) | 前后端对接规范 |
| [HANDOVER.md](../shared-docs/HANDOVER.md) | 项目交接与部署信息 |

---

## 关键文件速查

| 文件 | 说明 |
|------|------|
| `src/app.js` | 应用入口 |
| `src/config/database.js` | MySQL 连接池 |
| `src/config/env.js` | 环境变量加载 |
| `src/middleware/auth.js` | JWT 认证中间件 |
| `src/middleware/errorHandler.js` | 全局错误处理 |
| `src/utils/response.js` | 统一响应格式 `{code, message, data}` |
| `scripts/*.sql` | 数据库建表/迁移脚本 |
| `.env.example` | 环境变量模板 |
