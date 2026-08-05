# 03-api-design — API 设计

> 维度：接口契约（通用约定、错误码、端点清单）
> 读者：前端开发、后端开发、测试
> 上游依赖：`01-requirements.md`、`02-data-design.md`
> 下游影响：`06-tech-architecture.md`、前端 API 封装

## 文档目标

定义工作日报的前后端对接契约。工作日报复用 `/api/report/*` 与 `/api/stats/*`，不新建前缀。

## 1. 通用约定

| 项 | 约定 |
|----|------|
| 协议 | HTTPS |
| 方法 | 统一 POST + JSON body |
| 数据格式 | application/json; charset=utf-8 |
| 认证 | JWT Bearer Token（`Authorization: Bearer <token>`） |
| API 前缀 | `/api/report/*`、`/api/stats/*`（复用） |
| 统一响应 | `{ "code": 0, "message": "success", "data": {} }` |
| 分页响应 | `{ "code": 0, "message": "success", "data": { "list": [], "total": 0 } }` |
| 时间格式 | `YYYY-MM-DD`（日期）/ `YYYY-MM-DD HH:mm:ss`（时间） |
| ID 类型 | number / 字符串 |

### 统一响应结构

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

### 分页请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 20 |

## 2. 错误码表

| code | 含义 | 前端处理 |
|------|------|---------|
| 0 | 成功 | 正常处理 |
| 40001 | 参数错误 | 提示参数错误信息 |
| 40100 | 未登录 | 跳转登录页 |
| 40300 | 无权限 | 提示无权限 |
| 40400 | 资源不存在 | 提示资源不存在 |
| 40900 | 业务冲突（如重复提交） | 提示冲突信息 |
| 50000 | 服务器错误 | 提示系统异常 |

### 本功能块专属错误码

工作日报复用日报模块错误码，不新分配号段：

| code | 含义 | 前端处理 |
|------|------|---------|
| REPORT_ALREADY_SUBMITTED | 当日已有已提交日报 | 提示重复提交 |
| REPORT_SUBSTITUTED | 当日已被他人代填 | 显示代填条 |
| REPORT_DELETE_FORBIDDEN | 无权删除他人日报 | 提示无权限 |

## 3. 端点清单

### 端点 1：提交工作日报

| 项 | 值 |
|----|-----|
| 方法 | POST |
| 路径 | `/api/report/submit` |
| 说明 | 提交工作日报（reportType='office'） |
| 角色要求 | employee |
| 认证 | 需要 |

**请求示例：**

```json
{
  "reportType": "office",
  "reportDate": "2026-08-05",
  "todayWork": "处理 OA 系统日报模块联调，修复统计口径问题",
  "tomorrowPlan": "推进工作日报上线验证",
  "issues": "无",
  "coordination": "无"
}
```

**请求参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| reportType | string | 是 | 'office'（工作日报） |
| reportDate | string | 是 | 日报日期 YYYY-MM-DD |
| todayWork | string | 是 | 今日工作内容 |
| tomorrowPlan | string | 否 | 明日工作计划 |
| issues | string | 否 | 遇到的问题 |
| coordination | string | 否 | 需协调事项（落库 content 列） |

**响应示例（成功）：**

```json
{ "code": 0, "message": "success", "data": { "reportId": 123 } }
```

**响应示例（失败）：**

```json
{ "code": 40900, "message": "当日日报已提交", "data": null }
```

### 端点 2：日报列表（按类型筛选）

| 项 | 值 |
|----|-----|
| 方法 | POST |
| 路径 | `/api/report/list` |
| 说明 | 分页列表，新增 reportType 筛选（工作日报管理页传 'office'） |
| 角色要求 | 登录（admin 看全部） |
| 认证 | 需要 |

**请求示例：**

```json
{
  "page": 1,
  "pageSize": 20,
  "reportType": "office",
  "startDate": "2026-08-01",
  "endDate": "2026-08-05",
  "keyword": ""
}
```

**响应示例（成功）：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 1,
    "list": [
      {
        "id": 123,
        "reportDate": "2026-08-05",
        "reportType": "office",
        "submitter": "张三",
        "todayWork": "处理联调",
        "tomorrowPlan": "上线验证",
        "issues": "无",
        "content": "无",
        "status": "approved"
      }
    ]
  }
}
```

### 端点 3：日报详情

| 项 | 值 |
|----|-----|
| 方法 | POST |
| 路径 | `/api/report/detail` |
| 说明 | 详情（含工作日报四字段；项目/工作量卡对 office 隐藏由前端处理） |
| 角色要求 | 登录 |
| 认证 | 需要 |

**请求：** `{ "id": 123 }`

### 端点 4：编辑工作日报

| 项 | 值 |
|----|-----|
| 方法 | POST |
| 路径 | `/api/report/update` |
| 说明 | 管理员编辑工作日报（reportType='office'） |
| 角色要求 | admin / superadmin |
| 认证 | 需要 |

**请求：** `{ "reportId": 123, "reportDate": "2026-08-05", "todayWork": "...", "tomorrowPlan": "...", "issues": "...", "content": "..." }`

### 端点 5：删除 / 恢复

| 项 | 值 |
|----|-----|
| 方法 | POST |
| 路径 | `/api/report/delete`、`/api/report/restore` |
| 说明 | 软删除 / 恢复（管理员可删任意，普通用户仅自己） |
| 角色要求 | 登录 / admin |
| 认证 | 需要 |

### 端点 6：全员当日状态

| 项 | 值 |
|----|-----|
| 方法 | POST |
| 路径 | `/api/report/daily-status` |
| 说明 | 当日全员状态，工作日报提交者以 status='office' 出现，summary.office 计数 |
| 角色要求 | admin / superadmin |
| 认证 | 需要 |

**请求：** `{ "date": "2026-08-05" }`

**响应示例（成功，摘要节选）：**

```json
{
  "code": 0,
  "data": {
    "date": "2026-08-05",
    "summary": { "submitted": 10, "office": 3, "leave": 1, "missing": 2 },
    "workers": [
      { "userId": 5, "userName": "张三", "status": "office", "reportId": 123, "project": null }
    ]
  }
}
```

### 端点 7：明日状态

| 项 | 值 |
|----|-----|
| 方法 | POST |
| 路径 | `/api/report/tomorrow-status` |
| 说明 | 明日计划，取 N-1 日日报（含工作日报）的明日计划；空 tomorrowWorkType 前端归「未填写」 |
| 角色要求 | admin / superadmin |
| 认证 | 需要 |

### 端点 8：日历每日提交统计

| 项 | 值 |
|----|-----|
| 方法 | POST |
| 路径 | `/api/stats/daily-counts` |
| 说明 | 日历热力图数据，工作日报提交者计入 submitted 与 total |
| 角色要求 | 登录 |
| 认证 | 需要 |

**请求：** `{ "month": "2026-08" }`

**响应示例（成功）：**

```json
{
  "code": 0,
  "data": {
    "month": "2026-08",
    "data": [{ "date": "2026-08-05", "submitted": 13, "total": 15 }]
  }
}
```

## 4. 端点汇总表

| # | 方法 | 路径 | 说明 | 角色 |
|---|------|------|------|------|
| 1 | POST | /api/report/submit | 提交工作日报 | employee |
| 2 | POST | /api/report/list | 列表（支持 reportType 筛选） | 登录/admin |
| 3 | POST | /api/report/detail | 详情 | 登录 |
| 4 | POST | /api/report/update | 编辑工作日报 | admin+ |
| 5 | POST | /api/report/delete / restore | 删除 / 恢复 | 登录/admin |
| 6 | POST | /api/report/daily-status | 全员当日（含 office） | admin+ |
| 7 | POST | /api/report/tomorrow-status | 明日状态（含 office） | admin+ |
| 8 | POST | /api/stats/daily-counts | 日历（含 office） | 登录 |

## 变更记录

| 日期 | 变更内容 | 变更人 |
|------|---------|--------|
| 2026-08-05 | 初始创建（复用 /api/report/* 与 /api/stats/*） | 殇血轮回 |
