---
name: backend-project
description: 智慧办公助手 OA 后端 API 服务项目约束规则。对 backend/ 目录下的所有操作自动生效，确保行为符合项目规范。
agent_created: true
---

# 后端服务项目约束规则

## 项目概览

**智慧办公助手 OA 后端 API 服务**，为微信小程序和 Web 管理后台提供 RESTful API。

- **运行环境**：Node.js 18.x + Express 4.x + MySQL 8.0 + Redis 6.x
- **认证方式**：JWT Bearer Token（微信 openid / 账号密码）
- **统一响应格式**：`{ code: 0, message: "success", data: {...} }`
- **API 风格**：RESTful
- **基础地址**：`https://warblood.online`

## 强制性要求

1. **上下文加载**: 每次任务执行前必须在上下文中加载 backend/project.md
2. **意图确认**: 接受任务后需仔细分析用户意图，如有疑问应反问确认
3. **Git 维护**: 每次修改都需要维护 Git 仓库
4. **远程仓库**: 用户未主动要求，不得擅自提交到远程仓库

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
├── docs/                       # 项目文档
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
