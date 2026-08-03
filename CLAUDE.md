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

**源码目录**（`backend/src/`）— 每个目录归属一个独立的模块 Agent：

| 目录 | 归属 Agent | 技能文件 |
|------|-----------|---------|
| `auth/` | auth-agent | `.agents/skills/auth-agent/SKILL.md` |
| `core/` | core-agent | `.agents/skills/core-agent/SKILL.md` |
| `core/(project)` + `features/(review)` | project-agent | `.agents/skills/project-agent/SKILL.md` |
| `features/(stats + compliance/)` | data-agent | `.agents/skills/data-agent/SKILL.md` |
| `features/(wps)` | wps-agent | `.agents/skills/wps-agent/SKILL.md` |
| `common/` | common-agent | `.agents/skills/common-agent/SKILL.md` |

> ⚠️ `config/`, `controllers/`, `middleware/`, `utils/`（非 common 下的）为旧架构残留，新代码禁止写入。
>
> ⚠️ **Agent 边界铁律（R40）**：每个 Agent 只能修改自己管辖目录的代码。跨 Agent 修改必须由主程 orchestrator（`.agents/skills/project-orchestrator/SKILL.md`）协调。

**API 模块**（全部 `POST` + JSON body，前缀 `/api/`）：

| 模块 | 前缀 | 模块 | 前缀 |
|------|------|------|------|
| Auth | `/api/auth/*` | Approval | `/api/approval/*` |
| Report | `/api/report/*` | Message | `/api/message/*` |
| Stats | `/api/stats/*` | Review | `/api/review/*` |
| Project | `/api/project/*` | Compliance | `/api/compliance/*` |
| Admin | `/api/admin/*` | WPS | `/api/wps/*` |
| Health | `/api/health` | | |

---

## 关键约束

> 详细规则见 `.AI/rules/core.md`（全局铁律 R1-R46）及各专项规则文件。

- **提交前清理**：禁止残留 `console.log`、`debugger`、注释掉的代码、硬编码密钥
- **Git 规范**：详见 `.AI/rules/git-workflow.md`（提交格式、分支策略、自动推送 test）
- **自动上传**：每次内容修改并 `git commit` 后，自动执行 `git push WX_APP_OA <当前分支>:test`（无需用户确认）。禁止 push `main`/`stable`，禁止 `--force`

---

## 规则文件索引

所有开发规则统一在 `.AI/rules/` 下，`core.md` 为唯一入口（始终加载）：

| 任务类型 | 额外加载的规则文件 |
|---------|-------------------|
| 全部任务 | `.AI/rules/core.md`（始终加载）+ `.AI/rules/coding-standards.md` |
| 后端开发 | `.AI/rules/backend-rules.md` + 对应模块 Agent 的 `SKILL.md` |
| 小程序开发 | `.AI/rules/miniapp-rules.md` |
| Web 后台开发 | `.AI/rules/webapp-rules.md` |
| Git 操作 | `.AI/rules/git-workflow.md` |
| Code Review | `.AI/rules/review-checklist.md` |
| 技术选型 | `.AI/rules/tech-stack.md` |
| 跨模块协作 | `COLLABORATION-RULES.md`（含 R015-R017 Agent 协作规则） |

子目录专属文档：`backend/CLAUDE.md`、`miniapp/CLAUDE.md`、`webapp/CLAUDE.md`（进入子目录时加载）。

Wiki 知识库入口：`.AI/Wiki/_index.md`。

### Agent 技能体系

所有开发任务由 **orchestrator** 主程（`.agents/skills/project-orchestrator/SKILL.md`）统一分发，共 12 个模块 Agent 各司其职：

#### 后端 Agent（6 个）

| Agent | 职责 | 加载条件 |
|-------|------|---------|
| auth-agent | 认证（登录/JWT/TOTP） | 涉及 auth/ 或认证相关需求 |
| core-agent | 核心业务（admin/approval/report/message） | 涉及 core/ 或日报/审批/消息相关需求 |
| project-agent | 项目+审核 | 涉及项目或审核相关需求 |
| data-agent | 统计+合规 | 涉及统计/合规相关需求 |
| wps-agent | WPS 外部对接 | 涉及 WPS 相关需求 |
| common-agent | 基础设施（DB/Redis/中间件/花名册） | 涉及 common/ 或基础设施变更 |

#### 小程序 Agent（3 个）

| Agent | 职责 | 加载条件 |
|-------|------|---------|
| miniapp-core-agent | 日报/统计/消息/首页/功能中心 | 涉及小程序日报填写/查看/统计/消息/首页 |
| miniapp-admin-agent | 审核/审批/合规 | 涉及小程序审核/审批/合规管理 |
| miniapp-common-agent | 组件/API服务层/Store/路由/登录/设置 | 涉及小程序公共组件/API层/状态管理/路由配置 |

#### Web 后台 Agent（3 个）

| Agent | 职责 | 加载条件 |
|-------|------|---------|
| webapp-core-agent | 日报管理/审核/统计/仪表盘/项目 | 涉及 Web 日报/统计/仪表盘/项目管理 |
| webapp-admin-agent | 用户/花名册/审批/角色/合规 | 涉及 Web 用户管理/花名册/审批/角色/合规 |
| webapp-common-agent | 组件/API定义/Store/路由/登录/设置 | 涉及 Web 公共组件/API层/状态管理/路由配置 |

> ⚠️ **前端 Agent 分层规则**:
> - 业务 Agent（core/admin）只改自己管辖的业务页面，不改公共层
> - 公共 Agent（common）只改 components/services/api/stores/router，不改业务页面
> - 跨层需求（如业务页需要新 API 方法）→ 公共 Agent 先扩展，业务 Agent 后使用

Agent 记忆状态索引：`memory/agent-index.md`。
