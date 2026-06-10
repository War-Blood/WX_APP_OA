# 项目规则 - 智慧办公助手后端服务

> 本文件为项目级规则，会被所有 Agent 自动加载。Git 规范详见 `.AI/rules/git-workflow.md`，编码规范详见 `.AI/rules/coding-standards.md`。

---

## 项目性质

这是「智慧办公助手」OA 微信小程序的**纯后端 API 服务**。

- **技术栈**: Node.js 18.x + Express 4.x + MySQL 8.0 + Redis 6.x
- **认证方式**: JWT Bearer Token（基于微信 openid / 账号密码）
- **响应格式**: `{ code: 0, message: "success", data: {...} }`
- **服务地址**: `https://warblood.online`

---

## 强制规则（所有 Agent 必须遵守）

1. **上下文加载**: 每次任务执行前必须在上下文中加载 `.AI/rules/backend-rules.md`
2. **意图确认**: 接受任务后需仔细分析用户意图，如有疑问应反问确认
3. **Agent 协作**: 执行任务时在合适的 Agent 配置中选取 Agent 调用，能协同多个 Agent 时协同调用，提升任务效率
4. **Git 维护**: 每次修改都需要维护 Git 仓库，提交代码修改记录到本地仓库（详见 `.AI/rules/git-workflow.md`）
5. **远程仓库**: 用户未主动要求，不得擅自提交到远程仓库
6. **README 维护**: 在工作目录维护一个 README.md 说明该目录下项目内容的情况

---

## 核心原则

> 这是一个**纯粹的后端项目**，在遇到调用前端问题后，需要严格按照后端的 SDK 文档进行排查：
> - 如果发现后端 SDK 有问题 → 定位原因在后端，进行修改
> - 如果排查前端调用不符合 SDK 文档规范 → 直接给出结论，不强行修改后端进行适配

---

## 分层架构

```
routes/       → 路由层（请求路由分发）
controllers/  → 控制器层（参数校验、调用服务）
services/     → 服务层（业务逻辑）
  ↓
config/database.js → 数据访问层（MySQL 参数化查询）
config/redis.js    → 缓存层
```

---

## 代码规范

- 遵循 RESTful API 设计原则
- 统一响应格式：`{ code: 0, message: "success", data: {...} }`
- 所有 SQL 操作使用参数化查询（mysql2 prepared statements），防止 SQL 注入
- 敏感信息通过 `.env` 环境变量管理，禁止硬编码
- **分号**: 语句末尾必须加分号 `;`（ESLint `semi: always` 强制）
- API 响应时间目标：90% 请求 ≤ 500ms
- 使用 winston 进行结构化日志记录
- 错误处理规范详见 `.AI/Wiki/开发规范/` 和 `.AI/rules/coding-standards.md`

---

## 技术选型（按模块）

| 类别 | 选型 | 用途 |
|------|------|------|
| Excel | exceljs | 批量导入/导出、模板下载 |
| 验证码 | svg-captcha | Web 端图形验证码 |
| 图片处理 | sharp | 头像压缩裁剪 |
| 定时任务 | node-cron | 自动备份、公告定时发布 |
| API 文档 | swagger-jsdoc + swagger-ui-express | JSDoc→OpenAPI 文档 |
| 测试 | jest + supertest | 单元测试 + API 集成测试 |
| 部署 | PM2 + 本地VM → 腾讯云 | 进程管理 + 云迁移 |
| 文件存储 | 腾讯云 COS | 头像/附件/备份 |
| DB 迁移 | SQL 脚本（scripts/） | 建表与变更管理 |
| 消息通知 | 站内轮询（DB + 拉取） | 通知存取 |

---

## 关键文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| 小程序 PRD | `.AI/Wiki/小程序前端/PRD.md` | 小程序端产品需求规格说明书 |
| Web 后台 PRD | `.AI/Wiki/Web 管理后台/Web-PRD.md` | Web 管理后台产品需求规格说明书 |
| API 接口文档 | `.AI/Wiki/共享文档/API-Interfaces.md` | 后端接口定义与响应规范 |
| 前后端联调指南 | `.AI/Wiki/共享文档/Frontend-Backend-Integration-Guide.md` | 前后端对接规范 |
| 后端技术规范 | `.AI/Wiki/后端 API 服务/后端技术开发指导及规范.md` | 后端开发指导 |

---

## 可用 Skills

| Skill | 用途 |
|-------|------|
| code-review | 代码审查，检查代码质量、正确性和最佳实践 |
| security-review | 安全扫描，检查安全漏洞和风险 |
| bugpack-manager | Bug 管理，创建、查询、更新 Bug 状态 |
| api-testing-expert | REST API 测试、回归测试、Bug 生命周期管理 |
| backend-debug | 后端调试工作流与最佳实践 |
| bugpack-operations | BugPack REST API 操作 |
| ui-ux-pro-max | UI/UX 设计智能与可搜索数据库 |
