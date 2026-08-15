# 03-api-design — API 设计

> 维度：接口契约（通用约定、错误码、端点清单）
> 读者：前端开发、后端开发、测试
> 上游依赖：`01-requirements.md`、`02-data-design.md`
> 下游影响：`06-tech-architecture.md`、前端 API 封装

## 文档目标

定义 `/api/push/*` 前后端对接契约。遵循 `大纲/设计规范/01-api-design.md`。

## 1. 通用约定

| 项 | 约定 |
|----|------|
| 协议 | HTTPS |
| 方法 | 统一 POST + JSON body |
| 认证 | JWT Bearer Token（`Authorization: Bearer <token>`） |
| API 前缀 | `/api/push/*` |
| 权限 | 全部端点 `authenticate + requireRole('admin','superadmin')` |
| 统一响应 | `{ "code": 0, "message": "success", "data": {} }` |
| 分页响应 | `{ "code": 0, "data": { "list": [], "total": N, "page": 1, "pageSize": 20, "totalPages": M } }` |
| 时间格式 | `YYYY-MM-DD HH:mm:ss` |

**安全红线**：任何响应不得包含 webhook key/secret；凭证字段仅以 `configured: boolean` 呈现。

## 2. 错误码（constants.js 2700-2799 分区新增）

| code | 常量名 | 含义 | 前端处理 |
|------|--------|------|---------|
| 2701 | PUSH_SCRIPT_NOT_FOUND | 脚本不存在 | 提示并刷新列表 |
| 2702 | PUSH_WEBHOOK_NOT_FOUND | 群机器人不存在 | 提示并刷新列表 |
| 2703 | PUSH_WEBHOOK_DISABLED | 群机器人已停用 | 提示选择其他机器人 |
| 2704 | PUSH_INVALID_CRON | cron 表达式非法 | 表单校验提示 |
| 2705 | PUSH_INVALID_TEMPLATE | 模板非法（空/变量非法） | 表单校验提示 |
| 2706 | PUSH_CONDITION_ERROR | 条件配置非法（空规则/未知字段） | 表单校验提示 |
| 2707 | PUSH_SEND_FAILED | 发送失败（测试发送时） | 展示错误摘要 |
| 2708 | PUSH_SCRIPT_DISABLED | 脚本已停用（不可测试） | 提示先启用 |
| 2709 | PUSH_WEBHOOK_NOT_CONFIGURED | env 凭证缺失 | 提示联系运维配置 .env |

## 3. 端点清单

### 3.1 群机器人管理

**POST /api/push/webhooks/list** — 分页列表

```json
{ "page": 1, "pageSize": 20, "keyword": "" }
```
响应项：`id, name, envName, enabled, configured, remark, createdAt`（configured = 服务端 env 存在对应凭证）。

**POST /api/push/webhooks/create** — 新建（不收凭证）
```json
{ "name": "生产日报群", "envName": "DAILY", "enabled": true, "remark": "" }
```
校验：envName 必填且格式 `^[A-Za-z0-9_]{2,50}$`；`configured=false` 时禁止 enabled=true（返回 2709）。

**POST /api/push/webhooks/update** — 编辑：`{ "id": 1, "name": "...", "envName": "...", "enabled": true, "remark": "..." }`

**POST /api/push/webhooks/delete** — 删除：`{ "id": 1 }`；被脚本引用时拒绝（提示先改脚本）。

**POST /api/push/webhooks/toggle** — 启停：`{ "id": 1, "enabled": false }`

### 3.2 脚本管理

**POST /api/push/scripts/list** — 分页列表，筛选：`page/pageSize/keyword/status`

**POST /api/push/scripts/detail** — 详情：`{ "id": 1 }`

**POST /api/push/scripts/create** — 新建

```json
{
  "name": "昨日日报缺失提醒",
  "description": "",
  "status": "enabled",
  "scheduleType": "daily",
  "scheduleValue": "08:30",
  "timezone": "Asia/Shanghai",
  "webhookId": 1,
  "msgtype": "text",
  "templateContent": "【日报提醒】{{date}} 昨日有 {{daily_report.missing_count}} 人未提交：{{mention_names}}",
  "mentionType": "roles",
  "mentionTargets": ["employee"],
  "conditionConfig": { "logic": "AND", "rules": [{ "source": "daily_report", "field": "missing_count", "operator": ">", "value": 0 }] },
  "retryTimes": 2,
  "retryInterval": 60,
  "maxDailySends": 20,
  "notifyOnFail": true
}
```
校验：scheduleValue 按 scheduleType 校验（HH:mm 或 cron）；conditionConfig.rules 非空；templateContent 非空；webhookId 存在且 enabled；mentionType=roles/users 时 mentionTargets 非空。

**POST /api/push/scripts/update** — 编辑（同 create 结构 + id；变更后触发调度重同步）

**POST /api/push/scripts/delete** — 删除：`{ "id": 1 }`（同时注销调度）

**POST /api/push/scripts/toggle** — 启停：`{ "id": 1, "enabled": true }`（熔断禁用后可手动恢复）

**POST /api/push/scripts/test** — 手动测试（限流：同脚本每分钟 ≤3 次）

```json
{ "id": 1, "dryRun": true }
```
- `dryRun: true`：执行条件判定 + 模板渲染，**不发送**。响应：`{ conditionResult, conditionDetail, renderedContent, mentionDetail }`
- `dryRun: false`：完整链路真实发送。响应：`{ sendStatus, errorMessage?, logId }`
- 限流超限返回 429；脚本 disabled 返回 2708。

### 3.3 执行日志

**POST /api/push/logs/list** — 分页：`page/pageSize/scriptId/status/startDate/endDate`
**POST /api/push/logs/detail** — 详情：`{ "id": 1 }`（含 conditionDetail/renderedContent/mentionDetail/attempts 全量）

### 3.4 数据源元信息

**POST /api/push/data-sources/list** — 返回预定义数据源及字段元信息

```json
{ "code": 0, "data": { "sources": [ { "id": "daily_report", "name": "昨日日报", "fields": [ { "id": "missing_count", "name": "缺失人数", "type": "number" }, ... ] } ] } }
```

## 4. 端点汇总表

| # | 方法 | 路径 | 说明 | 角色 |
|---|------|------|------|------|
| 1 | POST | /api/push/webhooks/list | 群机器人分页 | admin+ |
| 2 | POST | /api/push/webhooks/create | 新建群机器人 | admin+ |
| 3 | POST | /api/push/webhooks/update | 编辑群机器人 | admin+ |
| 4 | POST | /api/push/webhooks/delete | 删除群机器人 | admin+ |
| 5 | POST | /api/push/webhooks/toggle | 启停群机器人 | admin+ |
| 6 | POST | /api/push/scripts/list | 脚本分页 | admin+ |
| 7 | POST | /api/push/scripts/detail | 脚本详情 | admin+ |
| 8 | POST | /api/push/scripts/create | 新建脚本 | admin+ |
| 9 | POST | /api/push/scripts/update | 编辑脚本 | admin+ |
| 10 | POST | /api/push/scripts/delete | 删除脚本 | admin+ |
| 11 | POST | /api/push/scripts/toggle | 启停脚本 | admin+ |
| 12 | POST | /api/push/scripts/test | 手动测试（dryRun/真实） | admin+ |
| 13 | POST | /api/push/logs/list | 日志分页 | admin+ |
| 14 | POST | /api/push/logs/detail | 日志详情 | admin+ |
| 15 | POST | /api/push/data-sources/list | 数据源元信息 | admin+ |

## 变更记录

| 日期 | 变更内容 | 变更人 |
|------|---------|--------|
| 2026-08-18 | 初始创建 | 殇血轮回 |
