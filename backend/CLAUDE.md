# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 架构

**OA 后端 API 服务** — Node.js 18 + Express 4 + MySQL 8.0 + Redis 6.x，为小程序和 Web 后台提供 RESTful API。

> 分层架构、统一响应格式等全局约束见 `.AI/rules/core.md`（R14-R19）。

### 源码组织 — Agent 归属

> **Agent 边界铁律（R40）**：每个目录由独立 Agent 管辖，跨目录修改需由 orchestrator 协调。

| 目录 | 用途 | 归属 Agent | 技能文件 |
|------|------|-----------|---------|
| `src/auth/` | 认证模块 | **auth-agent** | `../.agents/skills/auth-agent/SKILL.md` |
| `src/core/` | 核心业务（admin/approval/report/message） | **core-agent** | `../.agents/skills/core-agent/SKILL.md` |
| `src/core/(project)` + `src/features/(review)` | 项目+审核 | **project-agent** | `../.agents/skills/project-agent/SKILL.md` |
| `src/features/(stats, compliance/)` | 统计+合规 | **data-agent** | `../.agents/skills/data-agent/SKILL.md` |
| `src/features/(wps)` | WPS 对接 | **wps-agent** | `../.agents/skills/wps-agent/SKILL.md` |
| `src/common/` | 基础设施（DB/Redis/中间件/定时任务） | **common-agent** | `../.agents/skills/common-agent/SKILL.md` |

> ⚠️ `src/config/`、`src/controllers/`、`src/middleware/`、`src/utils/`（非 common 下的）为旧架构残留，新代码禁止写入。

### API 模块速查

全部 POST + JSON body，前缀 `/api/`：

| 模块 | 前缀 | 模块 | 前缀 |
|------|------|------|------|
| Auth | `/api/auth/*` | Approval | `/api/approval/*` |
| Report | `/api/report/*` | Message | `/api/message/*` |
| Stats | `/api/stats/*` | Review | `/api/review/*` |
| Project | `/api/project/*` | Compliance | `/api/compliance/*` |
| Admin | `/api/admin/*` | WPS | `/api/wps/*` |
| Health | `/api/health` | | |

---

## 常用命令

```bash
npm run dev              # nodemon 热重载
npm start                # 生产启动
npm run lint             # ESLint
npm test                 # Jest 全量 + 覆盖率（阈值 70%）
npm run test:unit        # 仅 tests/unit/
npm run test:integration # 仅 tests/integration/
npm run init-db          # 初始化数据库
npm run migrate          # 运行迁移
```

---

## 代码模式

```js
// 路由 — src/core/routes/xxx.routes.js
router.post('/list', authenticate, controller.list);
router.post('/create', authenticate, validate(createSchema), controller.create);

// 控制器 — src/core/controllers/xxx.controller.js
async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 10 } = req.body;
    const result = await service.list(req.user.userId, { page, pageSize });
    res.json(paginated(result.list, result.total, Number(page), Number(pageSize)));
  } catch (err) { next(err); }
}

// 服务层 — src/core/services/xxx.service.js
async function list(userId, { page, pageSize }) {
  const [{ total }] = await db.query('SELECT COUNT(*) AS total FROM t WHERE user_id = ?', [userId]);
  const rows = await db.query('SELECT * FROM t WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, Number(pageSize), (page - 1) * pageSize]);
  return { list: rows, total };
}
```

### 关键约束

> SQL 参数化查询、PM2 部署等全局约束见 `.AI/rules/core.md` 和 `.AI/rules/tech-stack.md`。

- 所有导出的公共函数必须加 JSDoc（`@description` + `@param` + `@returns`）
- 错误通过 `next(err)` 传递给 `errorHandler` 中间件统一处理