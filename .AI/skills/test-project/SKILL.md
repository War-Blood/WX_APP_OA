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

1. **上下文加载**: 每次任务开始时必须在上下文中加载 `.AI/rules/coding-standards.md`（编码规范）和 `.AI/rules/review-checklist.md`（测试检查项）
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

## 端到端代码示例

下面是一个完整的测试模块示例，展示 Jest + supertest 后端 API 测试的标准模式：

### 单元测试: 中间件 (`tests/unit/middleware/auth.test.js`)

```js
'use strict';

// Mock 外部依赖
jest.mock('jsonwebtoken');
jest.mock('../../../src/common/config/env', () => ({
  jwt: { secret: 'test-secret' },
}));
jest.mock('../../../src/common/config/database', () => ({
  query: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const db = require('../../../src/common/config/database');
const { authenticate, requireRole } = require('../../../src/common/middleware/auth');
const { AuthError, ForbiddenError } = require('../../../src/common/utils/errors');

describe('auth 中间件', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { headers: {}, user: null };
    res = {};
    next = jest.fn();
    db.query.mockResolvedValue([{ status: 'active', role: 'admin' }]);
  });

  describe('authenticate - JWT 认证', () => {
    it('should_return_401_when_no_authorization_header', () => {
      authenticate(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthError);
      expect(err.httpStatus).toBe(401);
    });

    it('should_return_401_when_token_is_invalid', () => {
      req.headers.authorization = 'Bearer invalid-token';
      jwt.verify.mockImplementation(() => { throw new Error('jwt malformed'); });
      authenticate(req, res, next);
      expect(next.mock.calls[0][0]).toBeInstanceOf(AuthError);
    });

    it('should_return_401_when_token_is_expired', () => {
      req.headers.authorization = 'Bearer expired-token';
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => { throw err; });
      authenticate(req, res, next);
      expect(next.mock.calls[0][0].message).toBe('Token 已过期，请重新登录');
    });

    it('should_attach_user_and_call_next_when_token_is_valid', async () => {
      req.headers.authorization = 'Bearer valid-token';
      const payload = { userId: 1, role: 'admin' };
      jwt.verify.mockReturnValue(payload);
      await authenticate(req, res, next);
      expect(req.user).toEqual(payload);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireRole - 角色鉴权', () => {
    it('should_return_401_when_user_not_authenticated', () => {
      const middleware = requireRole('admin');
      middleware(req, res, next);
      expect(next.mock.calls[0][0]).toBeInstanceOf(AuthError);
    });

    it('should_return_403_when_role_not_matched', () => {
      req.user = { role: 'employee' };
      requireRole('admin')(req, res, next);
      expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
    });

    it('should_pass_when_role_is_allowed', () => {
      req.user = { role: 'admin' };
      requireRole('admin', 'superadmin')(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
```

### 集成测试: API 端点 (`tests/integration/approval.test.js`)

```js
'use strict';

const request = require('supertest');
const app = require('../../src/app');

describe('POST /api/approval/list', () => {
  const validToken = 'Bearer eyJ...'; // 测试用 token

  it('should_return_401_when_no_token', async () => {
    const res = await request(app).post('/api/approval/list').send({ page: 1, pageSize: 10 });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });

  it('should_return_paginated_list_when_authenticated', async () => {
    const res = await request(app)
      .post('/api/approval/list')
      .set('Authorization', validToken)
      .send({ page: 1, pageSize: 10, status: 'pending' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toHaveProperty('list');
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('page', 1);
  });

  it('should_filter_by_status_when_status_param_provided', async () => {
    const res = await request(app)
      .post('/api/approval/list')
      .set('Authorization', validToken)
      .send({ status: 'approved' });

    expect(res.body.data.list.every(item => item.status === 'approved')).toBe(true);
  });
});

describe('POST /api/approval/create', () => {
  it('should_return_1001_when_required_fields_missing', async () => {
    const res = await request(app)
      .post('/api/approval/create')
      .set('Authorization', validToken)
      .send({ title: '测试审批' }); // 缺少 approvalTypeId

    expect(res.body.code).toBe(1001);
  });
});
```

**关键模式速查**：

| 模式 | 示例 | 说明 |
|------|------|------|
| Mock 外部依赖 | `jest.mock('jsonwebtoken')` | 文件顶部 mock，避免真实副作用 |
| Mock env 配置 | `jest.mock('../../../src/common/config/env', () => ({...}))` | 工厂函数提供测试用配置 |
| 测试中间件 | `req = { headers: {} }; next = jest.fn()` | 构造假 req/res/next，验证 next 参数 |
| 类型化错误断言 | `expect(err).toBeInstanceOf(AuthError)` | 用 instanceOf 验证错误类型 |
| HTTP 集成测试 | `request(app).post('/api/...').set('Authorization', token).send(body)` | supertest 链式调用 |
| 响应格式断言 | `expect(res.body.code).toBe(0)` | 验证统一 `{ code, message, data }` 格式 |
| 测试命名 | `should_xxx_when_xxx` | 清晰表达测试意图和条件 |
| 覆盖率 | `jest --coverage`, 四项 ≥70% | branches/functions/lines/statements |
