# 小程序对接指南

## API 基础信息

| 项目 | 值 |
|------|-----|
| BASE_URL | https://warblood.online |
| 认证方式 | Bearer Token (JWT) |
| 响应格式 | { code, message, data } |

## 认证流程

1. 小程序 `wx.login()` 获取 code
2. `POST /api/auth/login { code }` → 返回 `{ token, user }`
3. 存储 token 到 Storage
4. 后续请求在 `Authorization` 头携带 `Bearer token`

## API 列表

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 微信 code 登录，返回 JWT |
| GET | /api/user/profile | 获取当前用户资料 |
| PUT | /api/user/profile | 更新用户资料 |

### 日报

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/report/list | 日报列表（分页） |
| POST | /api/report/detail | 日报详情 |
| POST | /api/report/submit | 提交日报 |

### 审批

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/approval/list | 审批列表 |
| POST | /api/approval/detail | 审批详情 |
| POST | /api/approval/create | 创建审批 |
| POST | /api/approval/approve | 审批操作 |

### 消息

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/message/list | 消息列表 |
| POST | /api/message/detail | 消息详情 |
| POST | /api/message/unread | 未读消息数 |
| POST | /api/message/markRead | 标记已读 |

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 服务健康状态 |
| GET | /api-docs | Swagger API 文档 |

## 数据流说明

- 日报、审批、消息的创建操作会自动生成对应的消息通知
- 审批流程为线性审批，支持通过/驳回
- 用户首次微信登录自动创建账号

## 错误码

| code | HTTP | 说明 |
|------|------|------|
| 0 | 200 | 成功 |
| 401 | 401 | 未授权/Token 过期 |
| 403 | 403 | 无权限 |
| 1001 | 400 | 参数校验失败 |
| 1002 | 404 | 资源不存在 |
| 2001 | 200 | 业务逻辑错误 |

## 开发注意事项

1. 开发阶段使用 `http://111.229.107.123:3000` 直连（如遇 HTTPS 限制）
2. 微信小程序需在后台配置 request 合法域名：`warblood.online`
3. Token 过期返回 401，前端应跳转登录页
