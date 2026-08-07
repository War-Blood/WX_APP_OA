# 01 — API 设计规范

## 通用约定

| 项 | 约定 |
|----|------|
| 协议 | 全部 `POST` + JSON body（除特殊 GET 端点） |
| 前缀 | `/api/<module>/*` |
| 认证 | `Authorization: Bearer <token>` |
| Content-Type | `application/json` |

## 响应格式

```json
// 成功
{ "code": 0, "message": "success", "data": { ... } }

// 成功（分页）
{ "code": 0, "data": { "list": [...], "total": N, "page": 1, "pageSize": 20, "totalPages": M } }

// 错误
{ "code": <ErrorCode>, "message": "<描述>", "data": null }
```

## 路由注册

```js
// backend/src/app.js —— 答题模块（v2.0 合并 kesixin/dati）
const examRoutes = require('./features/exam/routes/exam.routes');
app.use('/api/exam', examRoutes);
```

## 目录结构

```
backend/src/features/<module>/
├── services/<entity>.service.js    # 数据访问 + 业务逻辑
├── controllers/<entity>.controller.js  # 请求/响应包装
└── routes/<module>.routes.js       # 端点注册 + 权限中间件
```

## 错误码

| 范围 | 模块 |
|------|------|
| 1000-1199 | Auth |
| 2000-2099 | Report |
| 2200-2299 | Review |
| 2300-2399 | Worker |
| 2800-2899 | Attendance |
| 3000-3099 | 答题模块（ANSWER_*，原 Exam 更名） |

新模块按 `千位递增` 规则分配范围。

## 权限

```js
const adminAuth = [authenticate, requireRole('admin', 'superadmin')];
router.post('/list', ...adminAuth, controller.list);
router.post('/my-endpoint', authenticate, controller.myFunc);
```

## 错误处理

```js
throw new ValidationError('参数不能为空');
throw new BusinessError('操作失败', null, ErrorCode.EXAM_NOT_FOUND);
throw new NotFoundError('资源不存在');
// 通过 next(err) 传递给 errorHandler 统一处理
```
