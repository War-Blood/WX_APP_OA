---
name: backend-project
description: [已弃用] 后端 API 服务通用参考。后端已按领域拆分为 6 个独立 Agent：auth / core / project / data / wps / common。新任务请使用对应 Agent，主程 orchestrator 会自动路由。
agent_created: true
deprecated: true
replaced_by:
  - auth-agent (.agents/skills/auth-agent/SKILL.md)
  - core-agent (.agents/skills/core-agent/SKILL.md)
  - project-agent (.agents/skills/project-agent/SKILL.md)
  - data-agent (.agents/skills/data-agent/SKILL.md)
  - wps-agent (.agents/skills/wps-agent/SKILL.md)
  - common-agent (.agents/skills/common-agent/SKILL.md)
---

> ⚠️ **本 Skill 已弃用**。后端已按领域拆分为 6 个独立 Agent，每个 Agent 有精确的 `agent_boundary`（文件级边界）。
>
> 本文件保留为后端通用参考（分层架构、代码模式、里程碑），具体模块开发请使用对应的 Agent。
>
> 新 Agent 列表见 `orchestrator` SKILL.md 或 `memory/agent-index.md`。

# 后端服务项目约束规则

## 项目概览

**智慧办公助手 OA 后端 API 服务**，为微信小程序和 Web 管理后台提供 RESTful API。

- **运行环境**：Node.js 18.x + Express 4.x + MySQL 8.0 + Redis 6.x
- **认证方式**：JWT Bearer Token（微信 openid / 账号密码）
- **统一响应格式**：`{ code: 0, message: "success", data: {...} }`
- **API 风格**：RESTful
- **基础地址**：`https://warblood.online`

## 强制性要求

1. **上下文加载**: 每次任务执行前必须在上下文中加载 `.AI/rules/backend-rules.md`
2. **意图确认**: 接受任务后需仔细分析用户意图，如有疑问应反问确认
3. **Git 维护**: 每次修改都需要维护 Git 仓库（Git 规范详见 `.AI/rules/git-workflow.md`）
4. **远程仓库**: Git 推送策略详见 `.AI/rules/git-workflow.md`

## 分层架构约束

```
routes/       → 路由层（请求路由分发、中间件绑定）
controllers/  → 控制器层（参数校验、请求响应封装）
services/     → 服务层（业务逻辑编排、事务管理）
  ↓
config/database.js → 数据访问层（MySQL 参数化查询、连接池）
config/redis.js    → 缓存层（会话、热点数据）
```

**调用原则**：
- 路由层只做分发，不写业务逻辑
- 控制器层负责参数校验（Joi）和响应格式化
- 服务层包含所有业务逻辑，可跨控制器复用
- 数据访问层只做 SQL 执行，不掺杂业务判断

## 代码规范

- 遵循 RESTful API 设计原则
- 统一响应格式：`{ code: 0, message: "success", data: {...} }`
- 所有 SQL 操作使用参数化查询（mysql2 prepared statements），防止 SQL 注入
- 敏感信息通过 `.env` 环境变量管理，禁止硬编码
- 使用 winston 进行结构化日志记录

## 开发里程碑

| 阶段 | 里程碑 | 状态 |
|------|--------|------|
| 1 | 项目初始化、基础架构搭建 | ✅ 已完成 |
| 2 | 认证模块（微信登录/JWT/用户资料） | ✅ 已完成 |
| 3 | 审批模块（list/detail/create/approve + cc） | ✅ 已完成 |
| 4 | 日报模块（submit/draft/delete 完整字段） | ✅ 已完成 |
| 5 | 消息模块（list/detail/unread/markRead） | ✅ 已完成 |
| 6 | Stats 模块（home/activities/profile） | ✅ 已完成 |
| 7 | Review 模块（list/detail/action/stats） | ✅ 已完成 |
| 8 | 公告/项目/用户管理/资产模块 | ⬜ P1 待开发 |
| 9 | 部署上线 | ⬜ 待部署 |

## 核心原则

这是一个**纯粹的后端项目**：
- 如果发现后端 SDK 有问题 → 定位原因在后端，进行修改
- 如果排查前端调用不符合 SDK 文档规范 → 直接给出结论，不强行修改后端进行适配

## 目录结构

```
backend/
├── docs/                       # 项目文档（已迁移至 .AI/Wiki/后端 API 服务/）
├── src/                        # 源码目录
│   ├── app.js                  # 应用入口
│   ├── routes/                 # 路由层
│   ├── controllers/            # 控制器层
│   ├── services/               # 服务层
│   ├── middleware/              # 中间件
│   ├── config/                 # 数据库/Redis 配置
│   └── utils/                  # 工具函数
├── scripts/                    # SQL 脚本
├── tests/                      # 测试文件
├── .env                        # 环境变量（不入库）
└── package.json                # 依赖配置
```

## 端到端代码示例

下面是一个完整的功能模块示例（"事项"模块），展示从路由到数据库的完整请求流：

### 路由层 (`src/core/routes/task.routes.js`)

```js
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { authenticate } = require('../../common/middleware/auth');

// 所有路由需要登录认证
router.post('/list',   authenticate, taskController.list);
router.post('/create', authenticate, taskController.create);
router.post('/toggle', authenticate, taskController.toggle);
router.post('/delete', authenticate, taskController.delete);

module.exports = router;
```

### 控制器层 (`src/core/controllers/task.controller.js`)

```js
const taskService = require('../services/task.service');
const { success, paginated } = require('../../common/utils/response');

async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 10, status } = req.body;
    const userId = req.user.userId;
    const result = await taskService.list(userId, { page, pageSize, status });
    res.json(paginated(result.list, result.total, Number(page), Number(pageSize)));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { title, description, priority } = req.body;
    const task = await taskService.create({ userId: req.user.userId, title, description, priority });
    res.json(success(task));
  } catch (err) { next(err); }
}

async function toggle(req, res, next) {
  try {
    const { id } = req.body;
    const task = await taskService.toggle({ id, userId: req.user.userId });
    res.json(success(task));
  } catch (err) { next(err); }
}

async function deleteTask(req, res, next) {
  try {
    const { id } = req.body;
    await taskService.deleteTask({ id, userId: req.user.userId });
    res.json(success(null, '删除成功'));
  } catch (err) { next(err); }
}

module.exports = { list, create, toggle, deleteTask };
```

### 服务层 (`src/core/services/task.service.js`)

```js
const db = require('../../common/config/database');
const { NotFoundError, ForbiddenError } = require('../../common/utils/errors');

function formatTask(row) {
  return {
    id: row.id, title: row.title,
    description: row.description || '',
    priority: row.priority, status: row.status,
    completedAt: row.completed_at || null,
    createdAt: row.created_at,
  };
}

async function list(userId, { page, pageSize, status }) {
  const params = [userId];
  let where = 'WHERE user_id = ?';
  if (status) { where += ' AND status = ?'; params.push(status); }

  const [{ total }] = await db.query(`SELECT COUNT(*) AS total FROM tasks ${where}`, params);
  const rows = await db.query(
    `SELECT * FROM tasks ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(pageSize), (page - 1) * pageSize]
  );
  return { list: rows.map(formatTask), total };
}

async function create({ userId, title, description, priority = 1 }) {
  const now = new Date();
  const [result] = await db.query(
    `INSERT INTO tasks (user_id, title, description, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
    [userId, title, description, priority, now, now]
  );
  const [row] = await db.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
  return formatTask(row);
}

async function toggle({ id, userId }) {
  const [rows] = await db.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, userId]);
  if (!rows) throw new NotFoundError('任务不存在');
  const newStatus = rows.status === 'completed' ? 'pending' : 'completed';
  await db.query('UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?',
    [newStatus, newStatus === 'completed' ? new Date() : null, new Date(), id]);
  return formatTask({ ...rows, status: newStatus });
}

module.exports = { list, create, toggle, deleteTask: async ({ id, userId }) => {
  const [rows] = await db.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, userId]);
  if (!rows) throw new NotFoundError('任务不存在');
  await db.query('DELETE FROM tasks WHERE id = ?', [id]);
}};
```

**关键模式速查**：

| 层级 | 职责 | 关键模式 |
|------|------|----------|
| Route | 绑定 HTTP 方法 + 中间件 + 控制器 | `router.post(path, authenticate, controller.method)` |
| Controller | 提取参数、调用 service、格式化响应 | `const { x } = req.body` → `service.method()` → `res.json(success())` |
| Service | 业务逻辑、DB 操作、抛类型错误 | `db.query(sql, [params])`, `throw new NotFoundError()` |
| Response | 统一 `{ code, message, data }` 格式 | `success()`, `paginated()`, `fail()` |
