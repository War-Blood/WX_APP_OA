# 后端 API 服务 — CLAUDE.md

> 本文件是 backend/ 目录的 Claude Code 入口文档。每次在此目录下操作时自动加载。

---

## 项目身份

**智慧办公助手 OA 后端 API 服务** — 为微信小程序和 Web 管理后台提供 RESTful API。

| 项 | 值 |
|----|-----|
| 运行环境 | Node.js 18.x + Express 4.x |
| 数据库 | MySQL 8.0（mysql2 连接池） |
| 缓存 | Redis 6.x（会话 + 限流） |
| 认证 | JWT Bearer Token（微信 openid / 账号密码） |
| API 风格 | RESTful，统一 `POST` 方法 + JSON body |
| 生产地址 | https://warblood.online |
| 日志 | Winston 结构化日志 |
| 校验 | Joi 声明式校验 |
| 安全 | Helmet + rate-limit + CORS |

---

## 统一响应格式

所有 API 必须返回此格式：

```json
{ "code": 0, "message": "success", "data": { ... } }
```

| 工具函数 | 用途 |
|---------|------|
| `success(data, message?)` | 成功响应 |
| `paginated(list, total, page, pageSize)` | 分页响应 `{ code: 0, data: { list, pagination: { total, page, pageSize, totalPages } } }` |
| `fail(message, code?)` | 业务失败 `{ code: -1, message }` |

---

## 分层架构（铁律）

```
routes/       → 路由层：仅做 URL 分发 + 中间件绑定，禁止业务逻辑
controllers/  → 控制器层：参数提取 + 校验 + 调用 service + 响应封装
services/     → 服务层：全部业务逻辑 + 事务编排，可跨控制器复用
common/config/database.js → 数据访问层：仅 SQL 执行
common/config/redis.js    → 缓存层
```

**调用链条**：`app.js → routes → 中间件(auth/validator) → controller → service → db/redis`

---

## 目录结构

```
backend/
├── src/
│   ├── app.js                # 应用入口（Express 配置 + 路由注册）
│   ├── auth/                 # 认证模块（微信登录/JWT/企业微信）
│   │   ├── routes/
│   │   ├── controllers/
│   │   └── services/
│   ├── core/                 # 核心业务模块
│   │   ├── routes/           # admin, approval, health, message, project, report
│   │   ├── controllers/      # 对应控制器 + admin/approval/health/message/project/report
│   │   └── services/         # 对应服务层
│   ├── features/             # 功能模块
│   │   ├── compliance/       # 合规管理（出差合规检查）
│   │   ├── routes/           # stats, review, wps
│   │   └── services/
│   ├── common/               # 公共模块
│   │   ├── config/           # database.js, env.js, redis.js, swagger.js
│   │   ├── middleware/        # auth.js, errorHandler.js, validator.js
│   │   ├── tasks/            # 定时任务（node-cron）
│   │   └── utils/            # constants.js, errors.js, logger.js, response.js
│   ├── system/               # 系统模块
│   ├── config/               # ⚠️ 已废弃
│   ├── controllers/          # ⚠️ 旧架构残留
│   ├── middleware/            # ⚠️ 旧架构残留
│   └── utils/                # ⚠️ 旧架构残留
├── scripts/                  # SQL 迁移脚本
├── tests/
│   ├── unit/
│   └── integration/
├── .env                      # 环境变量（不入库）
├── .env.example
└── package.json
```

> ⚠️ `src/config/`、`src/controllers/`、`src/middleware/`、`src/utils/`（非 common 下的）为旧架构残留，新代码禁止写入。

---

## API 模块清单

| 模块 | 路由文件 | 路由前缀 | 状态 |
|------|---------|---------|------|
| 认证 (Auth) | `auth/routes/auth.routes.js` | `/api/auth/*` | ✅ |
| 审批 (Approval) | `core/routes/approval.routes.js` | `/api/approval/*` | ✅ |
| 日报 (Report) | `core/routes/report.routes.js` | `/api/report/*` | ✅ |
| 消息 (Message) | `core/routes/message.routes.js` | `/api/message/*` | ✅ |
| 统计 (Stats) | `features/routes/stats.routes.js` | `/api/stats/*` | ✅ |
| 审核 (Review) | `features/routes/review.routes.js` | `/api/review/*` | ✅ |
| 项目管理 | `core/routes/project.routes.js` | `/api/project/*` | ✅ |
| 合规管理 | `features/compliance/` | `/api/compliance/*` | ✅ |
| WPS 数据 | `features/routes/wps.routes.js` | `/api/wps/*` | ✅ |
| 管理员 | `core/routes/admin.routes.js` | `/api/admin/*` | ✅ |
| 健康检查 | `app.js` 内联 | `/api/health` | ✅ |

---

## 开发命令

```bash
npm run dev              # 开发模式（nodemon 热重载）
npm start                # 生产模式
npm run lint             # ESLint 检查
npm test                 # 全量测试 + 覆盖率
npm run test:unit        # 仅单元测试
npm run test:integration # 仅集成测试
npm run init-db          # 初始化数据库
npm run migrate          # 运行迁移脚本
```

---

## 代码规范速查

- **JS 风格**：单引号 + 分号，2 空格缩进
- **命名**：文件名 kebab-case，变量 camelCase，常量 UPPER_SNAKE_CASE
- **SQL**：所有查询使用参数化（`pool.execute()` 或 `pool.query()`），禁止拼接 SQL
- **敏感信息**：一律走 `.env` + `process.env.XXX`，禁止硬编码
- **错误处理**：controller 中 `try/catch` → `next(err)`，由 `errorHandler` 中间件统一处理
- **分页 LIMIT**：`pool.execute()` 不支持 LIMIT 占位符 → 改用 `pool.query()`

---

## 标准代码模式

### 路由注册

```js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/xxx.controller');
const { authenticate } = require('../../common/middleware/auth');

router.post('/list',   authenticate, controller.list);
router.post('/create', authenticate, controller.create);
// ...

module.exports = router;
```

### 控制器

```js
const service = require('../services/xxx.service');
const { success, paginated } = require('../../common/utils/response');

async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 10 } = req.body;
    const result = await service.list(req.user.userId, { page, pageSize });
    res.json(paginated(result.list, result.total, Number(page), Number(pageSize)));
  } catch (err) { next(err); }
}
```

### 服务层

```js
const db = require('../../common/config/database');
const { NotFoundError } = require('../../common/utils/errors');

async function list(userId, { page, pageSize }) {
  const [{ total }] = await db.query('SELECT COUNT(*) AS total FROM xxx WHERE user_id = ?', [userId]);
  const rows = await db.query(
    'SELECT * FROM xxx WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, Number(pageSize), (page - 1) * pageSize]
  );
  return { list: rows, total };
}
```

---

## 规则与文档索引

| 加载时机 | 文件 |
|---------|------|
| **始终** | 项目根 `CLAUDE.md` |
| 后端开发 | `.AI/rules/backend-rules.md` |
| 代码规范 | `.AI/rules/coding-standards.md` |
| Git 操作 | `.AI/rules/git-workflow.md` |
| Code Review | `.AI/rules/review-checklist.md` |
| Skill 定义 | `.AI/skills/backend-project/SKILL.md` |
| Wiki | `.AI/Wiki/后端 API 服务/` |