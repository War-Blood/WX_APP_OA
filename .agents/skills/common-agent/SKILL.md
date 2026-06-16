---
name: common-agent
description: 基础设施 Agent。拥有 common/ 全部代码（数据库/Redis/JWT中间件/错误处理/日志/定时任务）。所有 Agent 都依赖它，但只有它能修改 common/。
agent_boundary: backend/src/common/
agent_module: backend
---

# Common Agent — 基础设施

> **边界铁律**：本 Agent 是 `backend/src/common/` 的唯一所有者。其他 Agent 只能调用 common 模块暴露的接口，**绝对不能直接修改 common/ 下的任何代码**。

## 1. 拥有的模块与文件

| 文件 | 类型 | 职责 |
|------|------|------|
| `common/config/database.js` | 配置 | MySQL 双连接池（wx_app_oa + daily_report），事务支持 |
| `common/config/redis.js` | 配置 | Redis 连接配置 |
| `common/config/env.js` | 配置 | 环境变量统一验证（14 个必需变量） |
| `common/config/swagger.js` | 配置 | Swagger/OpenAPI 文档配置 |
| `common/middleware/auth.js` | 中间件 | JWT 认证 + 角色鉴权 + 权限鉴权 |
| `common/middleware/errorHandler.js` | 中间件 | 全局错误处理（捕获 next(err) + 统一错误响应） |
| `common/middleware/validator.js` | 中间件 | Joi 参数校验中间件工厂 |
| `common/utils/response.js` | 工具 | 统一响应格式 `success()`, `paginated()`, `fail()` |
| `common/utils/errors.js` | 工具 | 错误类体系（AppError/ValidationError/AuthError/ForbiddenError/NotFoundError/BusinessError） |
| `common/utils/logger.js` | 工具 | winston 结构化日志 |
| `common/utils/constants.js` | 工具 | 错误码常量 |
| `common/tasks/scheduler.js` | 定时任务 | node-cron 调度器 |
| `common/tasks/compliance.task.js` | 定时任务 | 合规检查定时任务 |
| `common/tasks/reminder.task.js` | 定时任务 | 提醒通知定时任务 |

## 2. 暴露的公共接口（其他 Agent 的合法调用入口）

### 数据库
```js
const db = require('../common/config/database');
// db.query(sql, params) — 参数化查询
// db.getConnection() — 获取事务连接
```

### 认证中间件
```js
const { authenticate, requireRole, requirePermission } = require('../common/middleware/auth');
// authenticate — JWT Bearer Token 验证
// requireRole('admin', 'superadmin') — 角色鉴权
// requirePermission('user:write') — 权限码鉴权
```

### 响应工具
```js
const { success, paginated, fail } = require('../common/utils/response');
// success(data, message?) → { code: 0, message: "success", data }
// paginated(list, total, page, pageSize) → { code: 0, data: { list, pagination } }
// fail(code, message) → { code, message, data: null }
```

### 错误类
```js
const { AppError, ValidationError, AuthError, ForbiddenError, NotFoundError, BusinessError } = require('../common/utils/errors');
// throw new NotFoundError('用户不存在')
// throw new ValidationError('参数校验失败')
```

### 校验中间件
```js
const { validate } = require('../common/middleware/validator');
// router.post('/create', validate(schema), controller.create)
```

## 3. 能力边界（铁律）

### CAN DO — 本 Agent 可以做的事
- 修改 `backend/src/common/` 目录下的任何代码
- 修改数据库连接池配置、新增数据源
- 修改 JWT 认证中间件的验证逻辑
- 新增/修改错误类
- 修改统一响应格式（需协调所有下游 Agent）
- 新增/修改定时任务调度逻辑
- 新增/修改日志配置
- 修改环境变量验证规则

### CANNOT DO — 绝对不能做的事
- ❌ 修改 `backend/src/auth/` 代码 → 找 **auth-agent**
- ❌ 修改 `backend/src/core/` 代码 → 找 **core-agent**
- ❌ 修改 `backend/src/features/` 代码 → 找 **project-agent / data-agent / wps-agent**

## 4. 依赖关系

### 上游依赖
无（基础设施层是最底层，不依赖任何业务 Agent）

### 下游消费者（所有 Agent 都依赖我）
| 消费者 Agent | 依赖的接口 | 用途 |
|-------------|-----------|------|
| auth-agent | database, auth middleware, response, errors | 用户认证 |
| core-agent | database, auth middleware, response, errors | 核心业务 |
| project-agent | database, auth middleware, response, errors | 项目+审核 |
| data-agent | database, auth middleware, response, errors, scheduler | 统计+合规 |
| wps-agent | database, response, errors | WPS 数据 |

## 5. 关键约束

- **修改 middleware/auth.js 需通知所有下游 Agent**：JWT 验证逻辑变更影响全部 API
- **修改 response.js 响应格式需协调所有 Agent**：统一响应格式是全项目契约
- **修改 database.js 连接池配置需谨慎**：影响全部数据库操作
- **定时任务（tasks/）的修改只能由本 Agent 或 data-agent（合规定时任务逻辑）执行**
- **`.env` 环境变量变更**：本 Agent 负责 `env.js` 中环境变量验证规则的同步更新

## 6. Wiki 知识库（处理任务前按子领域加载）

### 中间件 / 工具类
| 文档 | 路径 | 用途 |
|------|------|------|
| 中间件与工具类 | `.AI/Wiki/后端 API 服务/中间件与工具类.md` | JWT/错误处理/校验设计 |

### 数据库 / 缓存
| 文档 | 路径 | 用途 |
|------|------|------|
| 数据库架构设计 | `.AI/Wiki/数据库设计/数据库架构设计.md` | 双库架构、连接池设计 |
| 查询优化 | `.AI/Wiki/数据库设计/查询优化.md` | SQL 性能优化 |
| 迁移脚本 | `.AI/Wiki/数据库设计/迁移脚本.md` | 数据库迁移规范 |
| MySQL 部署 | `.AI/Wiki/部署配置/数据库部署/MySQL 数据库部署.md` | 数据库部署运维 |
| Redis 部署 | `.AI/Wiki/部署配置/数据库部署/Redis 缓存部署.md` | 缓存部署运维 |

### 定时任务
| 文档 | 路径 | 用途 |
|------|------|------|
| 定时任务 | `.AI/Wiki/后端 API 服务/定时任务.md` | node-cron 调度设计 |

### 部署运维
| 文档 | 路径 | 用途 |
|------|------|------|
| 后端部署 | `.AI/Wiki/部署配置/应用部署/后端 API 服务部署.md` | PM2/Nginx/环境变量 |
| Nginx 配置 | `.AI/Wiki/部署配置/应用部署/Nginx 反向代理配置.md` | 反向代理配置 |
| 监控运维 | `.AI/Wiki/部署配置/监控运维.md` | 健康检查/日志/告警 |
| 服务器配置 | `.AI/Wiki/部署配置/服务器配置.md` | 生产服务器信息 |

### 故障排查
| 文档 | 路径 | 用途 |
|------|------|------|
| 故障排查 | `.AI/Wiki/故障排查/故障排查.md` | 常见问题诊断 |
| 应急响应 | `.AI/Wiki/故障排查/应急响应.md` | 紧急问题处理 |
| 性能分析 | `.AI/Wiki/故障排查/性能分析.md` | 性能瓶颈定位 |

### 共享
| 文档 | 路径 | 用途 |
|------|------|------|
| 开发规范 | `.AI/Wiki/开发规范/代码规范.md` | 编码标准 |
| 项目概述 | `.AI/Wiki/项目概述.md` | 项目全局上下文 |

> **加载规则**: 中间件修改必须加载「中间件与工具类」；数据库配置变更必须加载「数据库架构设计」；部署操作必须加载「后端部署」+「Nginx 配置」；故障处理必须加载「故障排查」+「应急响应」。

## 7. 常见操作手册

### 新增一个错误类
1. 在 `common/utils/errors.js` 中添加新的错误类（继承 AppError）
2. 在 `common/middleware/errorHandler.js` 中添加对该错误类的处理
3. 在 `common/utils/constants.js` 中注册错误码
4. 更新本文档的接口清单

### 修改 JWT 中间件
1. 在 `common/middleware/auth.js` 中修改验证逻辑
2. 确保 `auth-agent` 的 JWT 签发逻辑兼容（如 payload 结构变更需通知 auth-agent）
3. 更新本文档
4. 通知所有下游 Agent JWT 中间件有变更

### 新增定时任务
1. 在 `common/tasks/` 下新建任务文件
2. 在 `common/tasks/scheduler.js` 中注册任务和 cron 表达式
3. 更新本文档
