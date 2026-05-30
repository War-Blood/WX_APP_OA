---
name: test-project
description: 智慧办公助手后端测试项目约束规则。对 test/ 目录下的所有操作自动生效，确保测试行为符合规范。
agent_created: true
---

# 测试项目约束规则

## 项目概述

**项目名称**: 智慧办公助手测试项目  
**项目类型**: Node.js Express 后端 + 微信小程序 + Web 管理后台测试  
**测试框架**: Jest + supertest  
**当前阶段**: 后端 API 已完成，测试用例待完善

## 测试范围

1. **后端 API 测试** - Express RESTful API 接口测试、MySQL 参数化查询测试、权限验证测试
2. **微信小程序测试** - 前端工具函数测试、Pinia store 测试
3. **Web 管理后台测试** - 管理后台功能测试（待 M1 开发后补充）

### 后端 API 已完成的测试目标模块

| 模块 | 路由前缀 | 说明 |
|------|----------|------|
| Auth | `/api/auth/*` | 微信登录、JWT 认证 |
| User | `/api/user/*` | 用户资料 |
| Approval | `/api/approval/*` | 审批列表/详情/创建/操作（含 cc 抄送） |
| Report | `/api/report/*` | 日报列表/详情/提交/草稿/删除 |
| Message | `/api/message/*` | 消息列表/详情/未读/标记已读 |
| Stats | `/api/stats/*` | 首页统计/最近动态/个人统计 |
| Review | `/api/project/review*` | 审核列表/详情/操作/统计 |

## 强制性要求

1. **上下文加载**: 每次任务开始时必须在上下文中加载 test/project.md
2. **意图确认**: 每次接收任务后，仔细分析用户意图，如有疑问应反问确认
3. **BUG 管理**: 强制使用 bugpack MCP 服务维护 BUG 信息

## 核心职责边界

- **只负责**根据 API 文档、交互设计文档编写测试用例
- **不涉及**任何问题分析和业务代码修改
- **只允许**测试用例相关的代码编写和修改

## 测试规范

### 测试用例编写规范
1. 测试用例必须覆盖正常流程和异常流程
2. 每个测试用例必须有明确的预期结果
3. 测试数据应独立，避免测试间相互影响
4. 使用描述性的测试名称，清晰表达测试目的

### BUG 上报规范
1. 使用 bugpack MCP 服务创建 BUG
2. BUG 描述应包含：问题描述、复现步骤、预期结果、实际结果
3. 附上相关日志和截图（如适用）
4. 指定正确的项目归属

## 目录结构

```
test/
├── cloudfunctions/
│   ├── auth.test.js
│   └── mysql.test.js
├── utils/
│   ├── auth.test.js
│   ├── cache.test.js
│   ├── date.test.js
│   ├── debounce.test.js
│   ├── form.test.js
│   └── request.test.js
├── setup.js
└── project.md
```
