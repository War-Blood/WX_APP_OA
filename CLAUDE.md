# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 项目架构

**智慧办公助手 OA 系统** — 三层架构，面向企业提供移动办公 + Web 管理能力。

| 层 | 目录 | 技术栈 | 入口 |
|-----|------|--------|------|
| 后端 API | `backend/` | Node.js 18 + Express 4 + MySQL 8.0 + Redis 6.x | `backend/src/app.js` |
| 微信小程序 | `miniapp/` | uni-app (Vue 3 + Vite) + Pinia | `miniapp/src/` |
| Web 管理后台 | `webapp/` | Vue 3 + TypeScript + Vite + Element Plus + Pinia | `webapp/src/` |

- **生产地址**: https://warblood.online
- **API 文档**: https://warblood.online/api-docs
- **微信 AppID**: wx56609483f0ee55b6
- **数据库**: MySQL `wx_app_oa`，关键表 `users`, `daily_reports`, `approvals`, `review_records`, `messages`, `compliance_records`
- **部署**: Ubuntu 24.04 / PM2 fork 模式 / Nginx 反代到 3000 端口

---

## 常用命令

```bash
# 后端 (backend/)
npm run dev              # nodemon 热重载开发
npm start                # 生产启动
npm run lint             # ESLint
npm test                 # Jest 全量测试 + 覆盖率
npm run test:unit        # 仅单元测试
npm run test:integration # 仅集成测试

# 小程序 (miniapp/)
npm run dev:mp-weixin    # 开发编译（微信开发者工具打开 dist/dev/mp-weixin）
npm run build:mp-weixin  # 生产构建

# Web 管理后台 (webapp/)
npm run dev              # Vite 开发服务器
npm run build            # vue-tsc 类型检查 + Vite 生产构建
npm run lint             # ESLint + 自动修复
npm run format           # Prettier 格式化
npm run type-check       # vue-tsc --noEmit 类型检查
```

---

## 后端分层架构（强制）

```
routes/       → 路由层：仅 URL 分发 + 中间件绑定，禁止业务逻辑
controllers/  → 控制器层：Joi 参数校验 + 调用 service + 响应封装
services/     → 服务层：全部业务逻辑 + 事务编排，可跨控制器复用
common/config/database.js → 数据访问层：仅 SQL 执行
```

**统一响应格式**：`{ code: 0, message: "success", data: {...} }` — HTTP 状态码始终为 200，业务错误通过 `code` 区分。

**源码目录**（`backend/src/`）：
- `auth/` — 认证模块（微信登录/JWT/企业微信）
- `core/` — 核心业务（admin, approval, report, message, project）
- `features/` — 功能模块（compliance 合规管理, stats, review, wps）
- `common/` — 公共模块（config, middleware, tasks, utils）
- `config/`, `controllers/`, `middleware/`, `utils/` — ⚠️ 旧架构残留，新代码禁止写入

**API 模块**（全部 `POST` + JSON body，前缀 `/api/`）：

| 模块 | 前缀 | 模块 | 前缀 |
|------|------|------|------|
| Auth | `/api/auth/*` | Approval | `/api/approval/*` |
| Report | `/api/report/*` | Message | `/api/message/*` |
| Stats | `/api/stats/*` | Review | `/api/review/*` |
| Project | `/api/project/*` | Compliance | `/api/compliance/*` |
| Admin | `/api/admin/*` | WPS | `/api/wps/*` |

---

## 关键约束

- **SQL 全部参数化查询**（`pool.execute()` 或 `pool.query()`），禁止字符串拼接。`pool.execute()` 不支持 LIMIT 占位符 → 改用 `pool.query()`
- **PM2 只支持 fork 模式**，不支持 cluster；更新 `ecosystem.config.js` 后必须 `pm2 delete` + `pm2 start` 重新注册
- **前端禁止硬编码假数据**，小程序统一通过 `services/modules/` 调用 API，Web 后台通过 `src/api/` 调用
- **小程序使用 rpx 单位**，设计主题色 `#2B6DE8`（高效蓝）
- **Web 后台 TypeScript 严格模式**，提交前必须 `npm run type-check`
- **提交前清理**：禁止残留 `console.log`、`debugger`、注释掉的代码、硬编码密钥
- **禁止自动 push**：Git 提交仅限本地，推送需人工确认

---

## 规则文件索引

所有开发规则统一在 `.AI/rules/` 下，`core.md` 为唯一入口（始终加载）：

| 任务类型 | 额外加载的规则文件 |
|---------|-------------------|
| 后端开发 | `.AI/rules/backend-rules.md` |
| 小程序开发 | `.AI/rules/miniapp-rules.md` |
| Web 后台开发 | `.AI/rules/webapp-rules.md` |
| Git 操作 | `.AI/rules/git-workflow.md` |
| Code Review | `.AI/rules/review-checklist.md` |

子目录专属文档：`backend/CLAUDE.md`、`miniapp/CLAUDE.md`、`webapp/CLAUDE.md`（进入子目录时加载）。

Wiki 知识库入口：`.AI/Wiki/_index.md`。技能定义：`.AI/skills/`。

---

## Git 提交格式

```
<type>(<scope>): <subject>    → 标题 ≤ 72 字符，中文描述
```

| Type | 用途 | Type | 用途 |
|------|------|------|------|
| `feat` | 新功能 | `fix` | Bug 修复 |
| `refactor` | 重构 | `docs` | 文档 |
| `chore` | 构建/依赖 | `perf` | 性能优化 |

分支命名：`feature/xxx`、`fix/xxx`、`hotfix/xxx`、`release/vX.Y.Z`。