# 智慧办公助手 OA 系统 — CLAUDE.md

> 本文件是 Claude Code 的项目入口文档。每次会话自动加载。

---

## 项目概览

**智慧办公助手** — 面向企业的 OA 办公系统，三层架构：

| 层 | 目录 | 技术栈 | 开发命令 |
|-----|------|--------|---------|
| 后端 API | `backend/` | Node.js 18 + Express 4 + MySQL 8.0 + Redis 6.x | `npm run dev` |
| 微信小程序 | `miniapp/` | uni-app (Vue 3) + Pinia | `npm run dev:mp-weixin` |
| Web 管理后台 | `webapp/` | Vue 3 + TypeScript + Element Plus + Pinia | `npm run dev` |

- **生产地址**: https://warblood.online
- **API 文档**: https://warblood.online/api-docs
- **微信 AppID**: wx56609483f0ee55b6

---

## 规则文件入口

所有开发规则统一在 `.AI/` 目录下管理：

| 规则文件 | 用途 | 何时加载 |
|---------|------|---------|
| `.AI/rules/core.md` | 全局铁律入口（命名/格式/输出标准） | **始终加载** |
| `.AI/rules/tech-stack.md` | 技术栈单一来源 | 技术选型/环境配置时 |
| `.AI/rules/coding-standards.md` | 分层架构/响应格式/API 设计 | 代码修改时 |
| `.AI/rules/git-workflow.md` | 分支/Commit/推送策略 | Git 操作时 |
| `.AI/rules/backend-rules.md` | 后端分层约束/文档索引 | `backend/` 操作时 |
| `.AI/rules/miniapp-rules.md` | 小程序页面层级/设计令牌/API 调用 | `miniapp/` 操作时 |
| `.AI/rules/webapp-rules.md` | Web 后台技术栈/里程碑/目录规范 | `webapp/` 操作时 |
| `.AI/rules/review-checklist.md` | 功能/安全/性能/测试审查清单 | Code Review 时 |

---

## Wiki 知识库

项目 Wiki 位于 `.AI/Wiki/`，入口为 `.AI/Wiki/_index.md`。

主要模块：
- **后端 API 服务** — 架构、认证、审批、日报、消息、统计、审核、合规模块
- **小程序前端** — 页面结构、组件库、API 集成、状态管理、设计规范
- **Web 管理后台** — 架构、里程碑、路由、API 集成
- **数据库设计** — ER 图、表结构、迁移脚本、RBAC 权限系统
- **部署配置** — Docker、Nginx、PM2、数据库部署
- **开发规范** — 代码规范、Git 工作流、API 设计规范
- **测试策略** — 单元测试、集成测试、测试配置
- **故障排查** — 常见问题、性能分析、调试工具
- **共享文档** — API 契约、前后端集成指南、技术规划

---

## 后端架构要点

```
backend/src/
├── app.js                     # 应用入口
├── auth/                      # 认证模块（微信登录/JWT/企业微信）
│   ├── controllers/
│   ├── routes/
│   └── services/
├── core/                      # 核心业务模块
│   ├── controllers/           # admin, approval, health, message, project, report
│   ├── routes/                # 路由定义 + index.js 汇总
│   └── services/              # 业务逻辑层
├── features/                  # 功能模块
│   ├── compliance/            # 合规管理（出差合规检查）
│   ├── routes/                # stats, review, wps
│   └── services/
├── common/                    # 公共模块
│   ├── config/                # database, env, redis, swagger
│   ├── middleware/             # auth, errorHandler, validator
│   ├── tasks/                 # 定时任务（提醒、合规检查）
│   └── utils/                 # constants, errors, logger, response
├── config/                    # ⚠️ 已废弃，待删除
├── controllers/               # ⚠️ 旧的 health 控制器
├── middleware/                 # ⚠️ 旧的中间件
└── utils/                     # ⚠️ 旧的工具
```

> ⚠️ 标记的目录为旧架构残留，功能已迁移到 `common/` 和 `core/` 中。

### API 模块清单

| 模块 | 路由前缀 | 状态 |
|------|---------|------|
| 认证 (Auth) | `/api/auth/*` | ✅ 完成 |
| 审批 (Approval) | `/api/approval/*` | ✅ 完成 |
| 日报 (Report) | `/api/report/*` | ✅ 完成 |
| 消息 (Message) | `/api/message/*` | ✅ 完成 |
| 统计 (Stats) | `/api/stats/*` | ✅ 完成 |
| 审核 (Review) | `/api/review/*` | ✅ 完成 |
| 项目管理 | `/api/project/*` | ✅ 完成 |
| 合规管理 | `/api/compliance/*` | ✅ 完成 |
| WPS 数据 | `/api/wps/*` | ✅ 完成 |
| 管理员 | `/api/admin/*` | ✅ 完成 |
| 健康检查 | `/api/health` | ✅ 完成 |

---

## 数据库

- **数据库名**: wx_app_oa (新) / daily_report (旧生产)
- **关键表**: users, daily_reports, approvals, review_records, messages, compliance_records
- **迁移脚本**: `sql/` 和 `backend/scripts/` 目录下
- **最新迁移**: `sql/migration_v1_rbac.sql`

---

## 部署信息

| 项 | 值 |
|----|-----|
| 服务器 | Ubuntu 24.04, IP 111.229.107.123 |
| SSH | `wx-app-server`, 密钥 `C:\Users\WarBlood\.ssh\wx_app_key.pem` |
| 域名 | warblood.online |
| 进程管理 | PM2 (fork 模式) |
| Web 服务器 | Nginx (反代到 3000 端口) |
| 部署脚本 | `deploy.sh` |
| 验证脚本 | `verify-deploy.sh` |

---

## 全局铁律（摘要，详见 `.AI/rules/core.md`）

1. **JS/TS 使用单引号 + 分号**
2. **2 空格缩进，禁止 Tab**
3. **文件名 kebab-case，变量 camelCase，常量 UPPER_SNAKE_CASE**
4. **禁止硬编码密钥，统一用 `.env`**
5. **禁止提交 console.log / debugger / 注释掉的代码**
6. **先读后写 (Read → Edit)**
7. **后端严格分层: routes → controllers → services**
8. **前端禁止硬编码假数据，统一通过 services/modules 调用 API**

---

## 开发工作流

1. 阅读对应 `.AI/rules/` 规则文件
2. 先理解现有代码 (Read)
3. 进行修改 (Edit/Write)
4. 运行 lint 和测试验证
5. 生成变更摘要
