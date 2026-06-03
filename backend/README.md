# 智慧办公助手 — 后端服务

> OA 办公微信小程序 + Web 管理后台的后端 API 服务

---

## 项目简介

本目录是「智慧办公助手」OA 系统的**后端服务项目**，基于 Node.js + Express 构建，为以下两个前端提供 RESTful API：

| 前端 | 技术栈 | 说明 |
|------|--------|------|
| 微信小程序 | uni-app + Vue 3 | 员工端移动办公（审批、日报、任务、公告等） |
| Web 管理后台 | 待定 | 管理员浏览器端控制台（仪表盘、用户管理、内容编排等） |

---

## 技术栈

| 类别 | 选型 |
|------|------|
| 运行时 | Node.js 18.x |
| 框架 | Express 4.x |
| 数据库 | MySQL 8.0 |
| 缓存 | Redis 6.x |
| 认证 | JWT（jsonwebtoken） |
| Excel | exceljs |
| 图片 | sharp |
| 验证码 | svg-captcha |
| 定时任务 | node-cron |
| API 文档 | swagger-jsdoc |
| 日志 | winston |
| 校验 | joi |
| 测试 | jest + supertest |

---

## 当前状态

🟡 **技术选型完成** — 技术栈已确认，进入「阶段 2：基础架构搭建」

### 已完成

- [x] 项目规则文件（.trae/rules/project.md）
- [x] 项目核心文档（project.md）
- [x] 依赖配置（package.json）
- [x] 技术选型确认（8 大模块全量确认）

### 待开始

- [ ] 基础架构搭建（分层目录、中间件、配置）
- [ ] 认证模块（微信登录、Web 登录、JWT、RBAC）
- [ ] 核心业务（审批、日报、项目、任务）
- [ ] 管理后台支撑（用户管理、权限配置）
- [ ] 测试与部署

---

## 项目结构

```
backend/
├── docs/                       # 项目文档
│   ├── Mini-PRD.md             # 小程序端 PRD
│   ├── Web-PRD.md              # Web 管理后台 PRD
│   ├── API-Interfaces.md       # API 接口文档
│   └── Frontend-Backend-Integration-Guide.md  # 前后端联调指南
├── src/                        # 源码目录（待搭建）
│   ├── app.js                  # 应用入口
│   ├── routes/                 # 路由层
│   ├── controllers/            # 控制器层
│   ├── services/               # 服务层
│   ├── middleware/              # 中间件
│   ├── config/                 # 数据库/Redis/存储配置
│   └── utils/                  # 工具函数
├── scripts/                    # SQL 脚本
├── tests/                      # 测试文件
├── package.json                # 项目依赖与脚本
├── project.md                  # 项目核心文档
└── README.md                   # 本文件
```

---

## 核心文档

- [project.md](project.md) — 项目核心文档，包含技术选型、里程碑、规范
- [docs/Mini-PRD.md](docs/Mini-PRD.md) — 小程序端产品需求规格说明书
- [docs/Web-PRD.md](docs/Web-PRD.md) — Web 管理后台产品需求规格说明书
- [docs/API-Interfaces.md](docs/API-Interfaces.md) — 后端 API 接口文档
- [docs/Frontend-Backend-Integration-Guide.md](docs/Frontend-Backend-Integration-Guide.md) — 前后端联调指南

---

## 开发规范

详见 [project.md](project.md)，关键要求：

1. 每次任务执行前必须加载 `project.md`
2. 接受任务后仔细分析用户意图，有疑问反问确认
3. 优先协同多个 Agent 并行完成任务
4. 每次修改维护 Git 本地仓库
5. 未经用户允许，不提交远程仓库
6. 维护本 README.md 说明项目内容