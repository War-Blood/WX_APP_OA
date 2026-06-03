# 软件开发计划 — Development Plan

## 智慧办公助手 · 后端 API 服务

| 文档版本 | 修订日期   | 修订内容                 | 修订人     |
| -------- | ---------- | ------------------------ | ---------- |
| V1.0     | 2026-05-29 | 初始版本：里程碑划分与详细任务分解 | 产品经理 许清楚 |

---

## 目录

1. [项目概述](#1-项目概述)
2. [整体里程碑规划](#2-整体里程碑规划)
3. [里程碑2：基础架构搭建 — 详细任务分解](#3-里程碑2基础架构搭建--详细任务分解)
4. [任务依赖关系与执行顺序](#4-任务依赖关系与执行顺序)
5. [验收标准](#5-验收标准)
6. [待确认事项](#6-待确认事项)

---

## 1. 项目概述

### 1.1 项目定位

「智慧办公助手」是一款轻量化 OA 办公系统，本后端 API 服务同时支撑：

- **微信小程序端**（uni-app Vue3）：员工端办公场景（审批、日报、任务、公告等）
- **Web 管理后台**：管理员端运维管理（用户管理、数据看板、系统配置等）

### 1.2 当前状态

| 里程碑 | 名称             | 状态     | 已完成内容                                                   |
| ------ | ---------------- | -------- | ------------------------------------------------------------ |
| M1     | 项目初始化       | ✅ 已完成 | 项目脚手架、package.json、文档体系（PRD/API/UI/联调）、目录结构、Git 仓库 |

> **关键发现**：`src/` 源码目录尚未创建，M1 仅完成了文档和配置层面的初始化。M2 需要从零搭建完整的 Express 后端骨架。

### 1.3 技术栈回顾

| 类别         | 选型                                    | 版本     |
| ------------ | --------------------------------------- | -------- |
| 运行时       | Node.js                                 | 18.x LTS |
| Web 框架     | Express                                 | 4.x      |
| 数据库       | MySQL                                   | 8.0      |
| 缓存         | Redis                                   | 6.x      |
| 数据库驱动   | mysql2（参数化查询）                    | ^3.9.0   |
| 认证         | jsonwebtoken（JWT）                     | ^9.0.2   |
| 参数校验     | joi                                     | ^17.11.0 |
| 日志         | winston                                 | ^3.11.0  |
| 安全         | helmet + cors + express-rate-limit      | -        |
| API 文档     | swagger-jsdoc + swagger-ui-express      | -        |
| HTTP 客户端  | axios                                   | ^1.6.0   |
| 测试框架     | jest + supertest                        | -        |
| Excel 处理   | exceljs                                 | ^4.4.0   |
| 图片处理     | sharp                                   | ^0.33.0  |
| 定时任务     | node-cron                               | ^3.0.3   |

---

## 2. 整体里程碑规划

| 阶段 | 里程碑名称       | 状态          | 计划输出                                            |
| ---- | ---------------- | ------------- | --------------------------------------------------- |
| M1   | 项目初始化       | ✅ 已完成      | 文档体系、package.json、项目结构                    |
| M2   | **基础架构搭建** | ⬜ **本阶段** | Express 骨架、DB/Redis 连接、中间件、日志、Swagger  |
| M3   | 认证模块         | ⬜ 待开始      | 微信登录、JWT、RBAC 中间件                           |
| M4   | 核心业务 - 审批  | ⬜ 待开始      | 审批 CRUD、流程、类型管理                            |
| M5   | 核心业务 - 日报  | ⬜ 待开始      | 日报 CRUD、审核、统计、导出                          |
| M6   | 项目/任务模块    | ⬜ 待开始      | 项目管理、任务看板、进度统计                         |
| M7   | 管理后台支撑     | ⬜ 待开始      | 用户管理、权限配置、内容编排                         |
| M8   | 系统运维         | ⬜ 待开始      | 日志审计、备份恢复、监控                             |
| M9   | 测试与优化       | ⬜ 待开始      | 全套测试、性能优化、安全加固                         |
| M10  | 部署上线         | ⬜ 待开始      | VM 部署、域名配置、监控告警                          |

---

## 3. 里程碑2：基础架构搭建 — 详细任务分解

### 3.1 总体目标

搭建 Express 后端服务的基础骨架，实现以下能力：

1. **服务启动**：Express 服务器正常启动，加载所有中间件
2. **数据库连接**：MySQL 连接池 + Redis 缓存连接
3. **请求处理管线**：CORS → Helmet → Rate Limit → JWT 解析 → 路由分发 → 响应格式化 → 错误处理
4. **日志系统**：Winston 结构化日志（控制台 + 文件）
5. **参数校验**：Joi 封装，统一校验中间件
6. **API 文档**：Swagger 自动生成 API 文档
7. **健康检查**：`GET /api/health` 端点
8. **数据库初始化脚本**：创建 OA 系统独立数据库和基础表
9. **Docker 开发环境**：可选，提供 docker-compose 配置

### 3.2 任务清单（按执行顺序）

---

#### TASK-2.1 创建项目源码目录结构

**描述**：创建完整的 `src/` 目录树，作为所有源码的容器。

**创建文件/目录清单**：

```
backend/
├── src/                          # [新建] 源码目录
│   ├── app.js                    # [新建] 应用入口
│   ├── config/                   # [新建] 配置目录
│   │   ├── database.js           # [新建] MySQL 连接池
│   │   ├── redis.js              # [新建] Redis 客户端
│   │   ├── env.js                # [新建] 环境变量管理
│   │   └── swagger.js            # [新建] Swagger 配置
│   ├── middleware/                # [新建] 中间件目录
│   │   ├── auth.js               # [新建] JWT 认证中间件（桩）
│   │   ├── validator.js          # [新建] Joi 校验中间件
│   │   └── errorHandler.js       # [新建] 全局错误处理
│   ├── routes/                   # [新建] 路由目录
│   │   ├── index.js              # [新建] 路由聚合入口
│   │   └── health.js             # [新建] 健康检查路由
│   ├── controllers/              # [新建] 控制器目录
│   │   └── health.js             # [新建] 健康检查控制器
│   ├── services/                 # [新建] 服务层目录
│   │   └── index.js              # [新建] 服务层入口（可空占位）
│   └── utils/                    # [新建] 工具目录
│       ├── logger.js             # [新建] Winston 日志封装
│       ├── response.js           # [新建] 统一响应格式化
│       ├── errors.js             # [新建] 自定义错误类
│       └── constants.js          # [新建] 常量定义（状态枚举等）
├── scripts/                      # [新建] 脚本目录
│   ├── init-db.js                # [新建] 数据库初始化脚本
│   └── seed.js                   # [新建] 种子数据脚本
├── tests/                        # [新建] 测试目录
│   ├── setup.js                  # [新建] 测试环境配置
│   ├── unit/                     # [新建] 单元测试
│   │   └── utils/
│   │       └── response.test.js  # [新建] 响应工具测试
│   └── integration/              # [新建] 集成测试
│       ├── health.test.js        # [新建] 健康检查 API 测试
│       └── app.test.js           # [新建] 应用启动测试
├── uploads/                      # [新建] 上传文件目录
│   └── .gitkeep                  # [新建] 占位文件
├── .env                          # [新建] 环境变量（不提交）
├── .env.example                  # [新建] 环境变量示例
├── .gitignore                    # [新建] Git 忽略规则
├── docker-compose.yml            # [可选新建] 本地开发环境
└── Dockerfile                    # [可选新建] Docker 构建文件
```

**依赖**：无（起始任务）

**预估工作量**：0.5 小时

---

#### TASK-2.2 配置环境变量与常量

**描述**：创建 `.env.example` 和 `.gitignore`，定义所有环境变量模板。

**创建文件清单**：

| 文件                   | 说明                                   |
| ---------------------- | -------------------------------------- |
| `.env.example`         | 环境变量模板（含注释说明）             |
| `.gitignore`           | 忽略 node_modules、.env、uploads 等    |
| `src/utils/constants.js` | 业务常量（状态枚举、错误码、角色枚举） |

**环境变量清单**：

```env
# 服务配置
NODE_ENV=development
PORT=3000

# 数据库配置 - OA 新库
OA_DB_HOST=111.229.107.123
OA_DB_PORT=3306
OA_DB_USER=root
OA_DB_PASSWORD=
OA_DB_NAME=wx_app_oa

# 旧版 daily_report 数据库（用户表复用）
OLD_DB_HOST=111.229.107.123
OLD_DB_PORT=3306
OLD_DB_USER=root
OLD_DB_PASSWORD=
OLD_DB_NAME=daily_report

# Redis 配置
REDIS_HOST=111.229.107.123
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT 配置
JWT_SECRET=
JWT_EXPIRES_IN=7d

# 微信小程序配置
WX_APPID=wx56609483f0ee55b6
WX_SECRET=

# 日志配置
LOG_LEVEL=debug
LOG_DIR=./logs

# Swagger 配置
SWAGGER_ENABLED=true

# 腾讯云 COS（P1 阶段配置）
COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=
COS_REGION=
```

**依赖**：TASK-2.1（需要在 `utils/constants.js` 中定义常量）

**预估工作量**：1 小时

---

#### TASK-2.3 配置环境变量加载模块

**描述**：创建 `src/config/env.js`，使用 dotenv 加载 `.env` 文件，提供统一的配置访问接口。

**创建文件清单**：

| 文件                  | 说明                                         |
| --------------------- | -------------------------------------------- |
| `src/config/env.js`   | 环境变量加载、验证、导出 `config` 对象       |

**核心功能**：
- 加载 `.env` 文件
- 验证必要环境变量是否存在（启动时检查）
- 导出类型安全的配置对象
- 提供默认值兜底

**依赖**：TASK-2.2（需要 `.env.example` 模板）

**预估工作量**：0.5 小时

---

#### TASK-2.4 搭建日志系统（Winston）

**描述**：封装 Winston 日志工具，支持控制台输出 + 文件滚动日志。

**创建文件清单**：

| 文件                    | 说明                                              |
| ----------------------- | ------------------------------------------------- |
| `src/utils/logger.js`   | Winston 封装，导出 `logger` 实例                  |

**核心功能**：
- 控制台输出（开发环境带颜色）
- 文件日志（`logs/` 目录，按日滚动）
- 日志级别：error / warn / info / debug
- 统一格式：`[timestamp] [level] [module] message`
- Express 请求日志中间件挂载

**依赖**：TASK-2.3（需要 config.env 获取日志配置）

**预估工作量**：0.5 小时

---

#### TASK-2.5 搭建统一响应工具与错误类

**描述**：创建响应格式化工具和自定义错误类体系。

**创建文件清单**：

| 文件                     | 说明                                                   |
| ------------------------ | ------------------------------------------------------ |
| `src/utils/response.js`  | 统一响应格式化：`success()` / `fail()` / `paginated()` |
| `src/utils/errors.js`    | 自定义错误类：AppError / ValidationError / AuthError / ForbiddenError / NotFoundError |

**核心功能**：
- `response.success(data)` → `{ code: 0, message: "success", data }`
- `response.fail(code, message, data?)` → `{ code, message, data }`
- `response.paginated(list, total, page, pageSize)` → 标准分页响应
- 错误类体系，每个类包含 `statusCode`（HTTP）和 `code`（业务码）

**错误码映射**（与 API 文档一致）：

| Code | HTTP Status | 错误类             | 说明             |
| ---- | ----------- | ------------------ | ---------------- |
| 0    | 200         | -                  | 成功             |
| 401  | 401         | AuthError          | 未授权/Token过期 |
| 403  | 403         | ForbiddenError     | 无权限           |
| 1001 | 400         | ValidationError    | 参数校验失败     |
| 1002 | 404         | NotFoundError      | 资源不存在       |
| 2001 | 200         | AppError           | 业务逻辑错误     |

**依赖**：TASK-2.4（需要 logger 记录错误日志）

**预估工作量**：1 小时

---

#### TASK-2.6 搭建数据库连接层（MySQL）

**描述**：创建 MySQL 连接池，提供统一的数据库访问接口。

**创建文件清单**：

| 文件                       | 说明                                   |
| -------------------------- | -------------------------------------- |
| `src/config/database.js`   | MySQL 连接池管理 + 查询封装            |

**核心功能**：
- 基于 mysql2 创建连接池（pool）
- 封装备选查询方法：`query(sql, params)` / `execute(sql, params)` / `transaction(callback)`
- 连接池错误处理与自动重连
- 支持多数据库：OA 新库 + daily_report 旧库
- 提供 `getConnection()` 获取原始连接（事务场景）

**依赖**：TASK-2.3（需要数据库配置）、TASK-2.4（日志记录）

**预估工作量**：1.5 小时

---

#### TASK-2.7 搭建缓存层（Redis）

**描述**：创建 Redis 客户端连接。

**创建文件清单**：

| 文件                   | 说明                                    |
| ---------------------- | --------------------------------------- |
| `src/config/redis.js`  | Redis 客户端封装                        |

**核心功能**：
- 基于 `redis` 包创建客户端
- 连接事件监听（connect / error / reconnecting）
- 封装备选方法：`get(key)` / `set(key, value, ttl?)` / `del(key)`
- Redis 不可用时降级（不阻塞服务）

**依赖**：TASK-2.3（需要 Redis 配置）、TASK-2.4（日志记录）

**预估工作量**：1 小时

---

#### TASK-2.8 搭建中间件层

**描述**：创建核心业务中间件，包括认证（桩）、参数校验、全局错误处理。

**创建文件清单**：

| 文件                          | 说明                                                         |
| ----------------------------- | ------------------------------------------------------------ |
| `src/middleware/auth.js`      | JWT 认证中间件（桩实现：解析 Token → 挂载 `req.user`）      |
| `src/middleware/validator.js` | Joi Schema 校验中间件工厂                                    |
| `src/middleware/errorHandler.js` | 全局错误处理中间件                                         |

**各中间件详情**：

**auth.js（桩实现）：**
- 从 `Authorization: Bearer <token>` 头中提取 JWT
- 调用 `jwt.verify()` 解析 → 挂载 `req.user`
- Token 无效/过期 → 抛出 AuthError(401)
- 预留 RBAC 扩展点：`requireRole(...roles)` 中间件工厂（M3 实现）

**validator.js：**
- 工厂函数：`validate(schema, source = 'body')`
- 支持校验 `body` / `query` / `params`
- 校验失败 → 抛出 ValidationError(1001)
- 错误信息友好化：字段名 + 错误原因

**errorHandler.js：**
- 捕获所有未处理的错误
- 区分自定义错误（AppError 子类）vs 未知错误
- 自定义错误 → 返回对应的 `code` 和 `message`
- 未知错误 → 返回 500，记录完整错误栈到日志
- 生产环境不暴露错误详情

**依赖**：TASK-2.5（需要 response.js 和 errors.js）

**预估工作量**：2 小时

---

#### TASK-2.9 实现健康检查端点

**描述**：创建 `GET /api/health` 端点，用于服务健康状态监控。

**创建文件清单**：

| 文件                        | 说明                     |
| --------------------------- | ------------------------ |
| `src/routes/health.js`      | 健康检查路由             |
| `src/controllers/health.js` | 健康检查控制器           |
| `src/routes/index.js`       | 路由聚合入口             |

**健康检查返回内容**：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "status": "ok",
    "timestamp": "2026-05-29 10:00:00",
    "uptime": 12345,
    "version": "1.0.0",
    "checks": {
      "database": { "status": "ok", "responseTime": "5ms" },
      "redis": { "status": "ok", "responseTime": "2ms" }
    }
  }
}
```

**设计要点**：
- 路由挂载路径：`/api/health`
- 无需 JWT 认证（探测端点）
- 主动检查 DB + Redis 连接状态
- 任意依赖失败时返回 503，但不在 data 中暴露敏感信息

**依赖**：TASK-2.6（DB 连接）、TASK-2.7（Redis 连接）、TASK-2.8（中间件）

**预估工作量**：1 小时

---

#### TASK-2.10 搭建 Swagger API 文档

**描述**：配置 Swagger 自动生成 API 文档，挂载到 `/api-docs` 路由。

**创建文件清单**：

| 文件                      | 说明                              |
| ------------------------- | --------------------------------- |
| `src/config/swagger.js`   | Swagger 配置（OpenAPI 定义）      |

**核心功能**：
- 定义 OpenAPI 规范基本信息
- 配置 JWT Bearer Token 认证方案
- 设置扫描路径：`src/routes/*.js` + `src/controllers/*.js`
- 挂载路由到 `/api-docs`

**Swagger 配置项**：

| 项目           | 值                                              |
| -------------- | ----------------------------------------------- |
| 标题           | 智慧办公助手 API 文档                           |
| 版本           | 1.0.0                                          |
| 描述           | 微信小程序 + Web 管理后台共用后端 API           |
| 服务地址       | https://warblood.online                         |
| 认证方式       | Bearer Token（JWT）                             |

**依赖**：TASK-2.9（路由已挂载后可做文档注释示例）

**预估工作量**：1 小时

---

#### TASK-2.11 编写应用入口（app.js）

**描述**：组装所有组件，启动 Express 服务器。

**创建文件清单**：

| 文件             | 说明                                              |
| ---------------- | ------------------------------------------------- |
| `src/app.js`     | 应用入口：组装中间件 → 挂载路由 → 启动服务器    |

**加载顺序**：

```
1. dotenv 加载环境变量
2. 初始化日志系统（logger）
3. 初始化数据库连接池（database）
4. 初始化 Redis 客户端（redis）
5. 创建 Express 实例
6. 注册全局中间件（按顺序）:
   a. helmet                           ← HTTP 安全头
   b. cors                             ← 跨域
   c. express-rate-limit               ← 限流（100次/15分钟）
   d. express.json({ limit: '10mb' }) ← JSON 解析
   e. requestLogger（自定义）          ← 请求日志
7. 挂载 Swagger UI（/api-docs）
8. 挂载路由（/api）
9. 全局错误处理中间件（errorHandler）
10. 启动服务器，监听 PORT
11. 优雅退出处理（SIGTERM/SIGINT）
```

**依赖**：TASK-2.3 ~ TASK-2.10（所有基础组件）

**预估工作量**：1.5 小时

---

#### TASK-2.12 编写数据库初始化脚本

**描述**：创建 OA 系统独立数据库和基础建表脚本。

**创建文件清单**：

| 文件                    | 说明                                       |
| ----------------------- | ------------------------------------------ |
| `scripts/init-db.js`    | 数据库初始化脚本（建库 + 建表）            |
| `scripts/seed.js`       | 种子数据脚本（插入测试数据）               |

**数据库规划**：

| 数据库            | 用途                               | 数据源             |
| ----------------- | ---------------------------------- | ------------------ |
| `daily_report`    | 旧版用户表（`users`）              | 复用（只读）       |
| `wx_app_oa`       | OA 系统全部新表                    | 新建               |

**OA 系统建表清单（M2 阶段创建基础表）**：

| 表名                    | 说明               | 阶段 | 备注                         |
| ----------------------- | ------------------ | ---- | ---------------------------- |
| `users`                 | 用户表（新版）     | M2   | 初始从旧库同步或手动导入     |
| `departments`           | 部门表             | M2   | 基础组织架构                 |
| `approval_types`        | 审批类型配置表     | M2   | 方便 M4 快速开发             |
| `approval_instances`    | 审批实例表         | M2   | 建表规范围，M4 填充业务逻辑  |
| `approval_flow_nodes`   | 审批流程节点表     | M2   | 基础表结构                   |
| `daily_reports`         | 日报表             | M2   | 建表规范围，M5 填充业务逻辑  |
| `messages`              | 消息表             | M2   | 基础表结构                   |
| `announcements`         | 公告表             | M2   | 基础表结构                   |
| `projects`              | 项目表             | M2   | 基础表结构                   |
| `tasks`                 | 任务表             | M2   | 基础表结构                   |
| `assets`                | 资产表             | M2   | 基础表结构                   |
| `operation_logs`        | 操作日志表         | M2   | 基础审计表结构               |
| `system_config`         | 系统配置表         | M2   | 存储全局配置键值对           |

> 建表只建基础字段（id, 业务字段, status, create_time, update_time），业务逻辑相关的约束和索引在后缀里程碑中完善。

**数据库设计原则**：
- 所有表使用 `InnoDB` 引擎
- 默认字符集 `utf8mb4`
- 所有表包含：`id`（自增主键）、`created_at`、`updated_at`
- 逻辑删除使用 `deleted_at`（软删除）
- 时间字段统一使用 `DATETIME` 类型

**依赖**：TASK-2.6（数据库连接配置）

**预估工作量**：3 小时

---

#### TASK-2.13 编写测试用例

**描述**：为基础架构组件编写单元测试和集成测试。

**创建文件清单**：

| 文件                               | 说明                       |
| ---------------------------------- | -------------------------- |
| `tests/setup.js`                   | 测试环境配置（全局 before/after） |
| `tests/unit/utils/response.test.js` | 响应工具单元测试           |
| `tests/integration/health.test.js` | 健康检查 API 集成测试      |
| `tests/integration/app.test.js`    | 应用启动和中间件集成测试   |

**测试覆盖范围**：

| 测试类型   | 覆盖内容                                       |
| ---------- | ---------------------------------------------- |
| 单元测试   | `response.js` 的 success/fail/paginated 方法   |
| 单元测试   | `errors.js` 的自定义错误类                     |
| 单元测试   | `env.js` 的环境变量校验逻辑                    |
| 集成测试   | 应用启动 / 中间件加载 / CORS 头                |
| 集成测试   | `GET /api/health` 返回正确结构                 |
| 集成测试   | 404 路由返回正确错误格式                       |
| 集成测试   | 请求体 JSON 解析（valid / invalid JSON）       |

**依赖**：TASK-2.11（app.js 就绪后）和 TASK-2.5（response.js / errors.js）

**预估工作量**：2 小时

---

#### TASK-2.14 编写 Docker 开发环境配置（可选）

**描述**：提供 docker-compose.yml 和 Dockerfile，方便本地开发环境搭建。

**创建文件清单**：

| 文件                  | 说明                         |
| --------------------- | ---------------------------- |
| `docker-compose.yml`  | MySQL + Redis + App 容器编排 |
| `Dockerfile`          | 应用镜像构建                 |

> 注意：数据库使用远程 111.229.107.123，Docker 仅用于搭建本地一致的开发环境。

**依赖**：TASK-2.11（app.js 就绪后）

**预估工作量**：1 小时（可选，可根据实际需求决定是否执行）

---

### 3.3 任务汇总表

| 任务 ID    | 任务名称                         | 创建文件数 | 预估工时 | 依赖               |
| ---------- | -------------------------------- | ---------- | -------- | ------------------ |
| TASK-2.1   | 创建项目源码目录结构             | 目录结构   | 0.5h     | -                  |
| TASK-2.2   | 配置环境变量与常量               | 3          | 1.0h     | TASK-2.1           |
| TASK-2.3   | 配置环境变量加载模块             | 1          | 0.5h     | TASK-2.2           |
| TASK-2.4   | 搭建日志系统（Winston）          | 1          | 0.5h     | TASK-2.3           |
| TASK-2.5   | 搭建统一响应工具与错误类         | 2          | 1.0h     | TASK-2.4           |
| TASK-2.6   | 搭建数据库连接层（MySQL）        | 1          | 1.5h     | TASK-2.3, TASK-2.4 |
| TASK-2.7   | 搭建缓存层（Redis）              | 1          | 1.0h     | TASK-2.3, TASK-2.4 |
| TASK-2.8   | 搭建中间件层                     | 3          | 2.0h     | TASK-2.5           |
| TASK-2.9   | 实现健康检查端点                 | 3          | 1.0h     | TASK-2.6,2.7,2.8   |
| TASK-2.10  | 搭建 Swagger API 文档            | 1          | 1.0h     | TASK-2.9           |
| TASK-2.11  | 编写应用入口 app.js              | 1          | 1.5h     | TASK-2.3~2.10      |
| TASK-2.12  | 编写数据库初始化脚本             | 2          | 3.0h     | TASK-2.6           |
| TASK-2.13  | 编写测试用例                     | 4          | 2.0h     | TASK-2.5, TASK-2.11 |
| TASK-2.14  | Docker 开发环境配置（可选）      | 2          | 1.0h     | TASK-2.11          |
| **合计**   | **14 个任务**                    | **~26 文件** | **~16h** | -                  |

---

## 4. 任务依赖关系与执行顺序

### 4.1 依赖关系图

```
TASK-2.1 (目录结构)
    │
    ▼
TASK-2.2 (环境变量+常量)
    │
    ├────────────────────┐
    ▼                    ▼
TASK-2.3 (env加载)    TASK-2.12 (DB脚本) ← 可并行
    │
    ├──────────┬──────────┐
    ▼          ▼          ▼
TASK-2.4    TASK-2.6    TASK-2.7
(日志)      (MySQL)     (Redis)
    │          │          │
    └────┬─────┘          │
         ▼                │
      TASK-2.5            │
    (响应+错误类)          │
         │                │
         ▼                │
      TASK-2.8            │
     (中间件)              │
         │                │
         └────┬───────────┘
              ▼
          TASK-2.9
        (健康检查)
              │
              ▼
          TASK-2.10
          (Swagger)
              │
              ▼
          TASK-2.11
          (app.js)
              │
        ┌─────┴─────┐
        ▼           ▼
   TASK-2.13    TASK-2.14
   (测试)       (Docker,可选)
```

### 4.2 建议执行顺序（3 轮迭代）

**第 1 轮：基础骨架**（TASK-2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.8）
- 先建目录和基础工具
- 搭建日志 + 响应 + 错误 + 中间件 → 可测试最小请求处理管线

**第 2 轮：数据层 + 路由**（TASK-2.6 → 2.7 → 2.9 → 2.10 + 2.12 并行）
- 数据库和缓存连接
- 健康检查和 Swagger → 验证整体管线通顺
- 数据库初始化脚本可以和其他任务并行

**第 3 轮：集成验证**（TASK-2.11 → 2.13 → 2.14）
- 组装所有组件
- 编写测试覆盖
- Docker 环境（可选）

> TASK-2.12（数据库初始化）可独立在 TASK-2.2 之后开始，与第 1 轮并行执行。

---

## 5. 验收标准

### 5.1 功能性验收

| 验收项 | 验收标准 | 验证方法 |
|--------|----------|----------|
| 服务启动 | `npm start` 后服务正常监听 3000 端口，无报错 | 观察控制台输出 |
| 健康检查 | `GET /api/health` 返回 `{"code":0,"data":{"status":"ok",...}}` | curl / Postman |
| Swagger 文档 | `GET /api-docs` 可访问 Swagger UI 页面 | 浏览器打开 |
| MySQL 连接 | 健康检查中 `checks.database.status` 为 `ok` | curl 验证 |
| Redis 连接 | 健康检查中 `checks.redis.status` 为 `ok` | curl 验证 |
| 统一响应格式 | 所有接口返回 `{"code":...,"message":...,"data":...}` | curl / Postman |
| CORS 头 | 响应中包含 `Access-Control-Allow-Origin` 头 | curl -I 验证 |
| 安全头 | 响应中包含 `X-Content-Type-Options`、`X-Frame-Options` 等 Helmet 头 | curl -I 验证 |
| 限流保护 | 15分钟内同一 IP 超过 100 次请求返回 429 | curl 批量请求测试 |
| 参数校验 | 向接口发送错误参数时，返回 `{"code":1001,"message":"..."}` | curl 测试 |
| 全局错误处理 | 访问不存在的路由返回 `{"code":1002,"message":"资源不存在"}` | curl 测试 |

### 5.2 非功能性验收

| 验收项 | 验收标准 | 验证方法 |
|--------|----------|----------|
| 日志输出 | 控制台和文件都输出结构化 JSON 日志 | 查看 logs/ 目录 |
| 优雅退出 | `Ctrl+C` 时，服务在 10 秒内完成清理并退出 | 观察日志 |
| 测试通过 | `npm test` 全部测试通过，覆盖率 ≥ 70% | 运行测试 |
| Swagger 可访问 | Swagger UI 正确渲染 API 分组和参数描述 | 浏览器访问 |

### 5.3 M2 阶段完成标志

1. ✅ `src/app.js` 启动后可通过 `GET /api/health` 验证全部组件状态
2. ✅ `GET /api-docs` 可访问 Swagger 页面
3. ✅ `npm test` 全部通过，覆盖率 ≥ 70%
4. ✅ `npm run init-db` 可正常执行建库建表
5. ✅ 控制台和文件日志正常输出
6. ✅ `.env.example` 配置完整，注释清晰
7. ✅ `src/` 目录结构符合 project.md 定义的分层架构（routes/ → controllers/ → services/ → config/）

---

## 6. 待确认事项

以下事项需要在开发前由开发团队确认，或在开发过程中与技术负责人沟通：

### 6.1 高优先级（影响架构决策）

| 序号 | 事项 | 说明 | 建议方案 |
|------|------|------|----------|
| 1 | **旧版 daily_report.users 表结构** | 需确认旧版用户表的字段定义，确定新版 users 表如何与之对齐 | 建议：新版建完整 users 表，首次通过脚本从旧库同步 |
| 2 | **MySQL 远程连接账户权限** | 确认 111.229.107.123 服务器上的 MySQL 账户是否有远程访问权限，以及创建数据库的权限 | 建议：获取 root 权限或由 DBA 创建 `wx_app_oa` 数据库 |
| 3 | **Redis 服务可用性** | 确认远程 Redis 是否已部署并可连接，以及密码和端口配置 | 建议：如不可用，初期可降级为内存缓存或注释 Redis 相关代码 |
| 4 | **微信小程序 AppSecret** | 确认 `wx56609483f0ee55b6` 对应的 AppSecret 已获取，用于 login 接口 | 需管理员登录微信公众平台获取 |

### 6.2 中优先级（影响开发流程）

| 序号 | 事项 | 说明 | 建议方案 |
|------|------|------|----------|
| 5 | **JWT Secret 生成方案** | JWT_SECRET 需要生成一个强随机字符串 | 建议：使用 `openssl rand -base64 32` 生成 |
| 6 | **后端开发服务器域名** | 开发期间小程序端请求的后端地址 | 建议：开发阶段使用 localhost + ngrok 或直接使用远程服务器 IP |
| 7 | **日志保留策略** | 日志文件保留天数 | 建议：保留 30 天，按大小滚动（每文件 10MB） |
| 8 | **Git 分支策略** | M2 开发提交是直接提交到 master 还是创建 dev 分支 | 建议：dev 分支开发，稳定后合并到 master |

### 6.3 低优先级（可后续确认）

| 序号 | 事项 | 说明 | 建议方案 |
|------|------|------|----------|
| 9 | **腾讯云 COS 配置** | 头像/附件存储是否需要走 COS | P1 阶段再配置，M2 先用本地文件存储 |
| 10 | **Docker 环境必要性** | 是否需要 Docker 封装 | 可选，视团队开发环境一致性需求决定 |
| 11 | **PM2 配置** | 生产环境进程管理配置 | M9/M10 阶段再处理 |

---

> **文档维护说明**：本文档为软件开发计划基线文档。里程碑内的任务细节（文件清单、验收标准）是开发团队的执行依据。后续里程碑（M3-M10）的详细分解将在各阶段开始前补充。
>
> 最后更新：2026-05-29
> 产品经理：许清楚
