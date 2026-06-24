# API 契约 — 花名册模块

> **提供方**: common-agent（`backend/src/common/`，通过 `core/routes/admin.routes.js` 挂载路由）
> **消费方**: miniapp-common-agent（`worker-picker` 组件）、webapp-admin-agent（`views/user/workers.vue`）
> **版本**: v2.0 | **最后更新**: 2026-06-13

---

## 契约原则

1. **统一入口**: 所有花名册操作走 `POST /api/admin/workers`，通过 `action` 字段区分操作
2. **提供方负责**: common-agent 保证 action 接口稳定，新增 action 前需通知消费方
3. **消费方负责**: 前端严格按 action 值调用，不自行构造 SQL 或直接操作数据库

---

## 接口: POST /api/admin/workers

### 请求格式

所有操作统一使用此端点，通过 `action` 字段区分：

```json
{ "action": "<action>", "...其他参数" }
```

### action 一览

| action | 说明 | 额外参数 | 权限 |
|--------|------|---------|:--:|
| `list` | 分页查询花名册 | `page`, `pageSize`, `keyword` | admin+ |
| `create` | 新增外场人员 | `userName`, `workerCode`, `entryDate` | admin+ |
| `update` | 编辑人员信息 | `userId`, `userName?`, `entryDate?` | admin+ |
| `toggle` | 切换在职/离职 | `userId`, `status` | admin+ |
| `delete` | 软删除 | `userId` | admin+ |

---

### action=list — 查询花名册

**请求**:
```json
{
  "action": "list",
  "page": 1,
  "pageSize": 20,
  "keyword": "张云峰"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `page` | int | 否 | 页码，默认 1 |
| `pageSize` | int | 否 | 每页条数，默认 20，最大 100 |
| `keyword` | string | 否 | 按姓名或工号模糊搜索 |

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 45,
    "list": [
      {
        "userId": 7,
        "userName": "张云峰",
        "workerCode": "BL001",
        "entryDate": "2026-03-04",
        "workerStatus": "active",
        "totalLogs": 76
      }
    ]
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `userId` | int | 用户唯一 ID |
| `userName` | string | 姓名（用于搜索和展示） |
| `workerCode` | string | 工号（如 BL001） |
| `entryDate` | date | 入场日期 `YYYY-MM-DD` |
| `workerStatus` | enum | `active`(在职) / `inactive`(离职) |
| `totalLogs` | int | 该人员累计日志数 |

**前端使用场景**:
- 小程序 `worker-picker` 组件：搜索+多选花名册人员
- Web 后台花名册管理页：列表展示

---

### action=create — 新增外场人员

**请求**:
```json
{
  "action": "create",
  "userName": "新员工",
  "workerCode": "BL050",
  "entryDate": "2026-06-01"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `userName` | string | ✅ | 姓名 |
| `workerCode` | string | ✅ | 工号，不可重复 |
| `entryDate` | date | ✅ | 入场日期 `YYYY-MM-DD` |

**响应**:
```json
{ "code": 0, "message": "创建成功", "data": { "userId": 55 } }
```

**错误**:
```json
{ "code": 1001, "message": "工号已存在", "data": null }
```

---

### action=update — 编辑人员

**请求**:
```json
{
  "action": "update",
  "userId": 7,
  "userName": "张云峰",
  "entryDate": "2026-03-04"
}
```

**响应**:
```json
{ "code": 0, "message": "更新成功" }
```

---

### action=toggle — 切换状态

**请求**:
```json
{ "action": "toggle", "userId": 7, "status": "inactive" }
```

| 参数 | 值 | 说明 |
|------|-----|------|
| `status` | `active` | 在职 |
| `status` | `inactive` | 离职（不再出现在选人列表中） |

**响应**:
```json
{ "code": 0, "message": "状态已更新" }
```

---

### action=delete — 删除

**请求**:
```json
{ "action": "delete", "userId": 7 }
```

**响应**:
```json
{ "code": 0, "message": "删除成功" }
```

---

## 前端消费方对接清单

| action | 小程序调用（miniapp-common-agent） | Web后台调用（webapp-admin-agent） |
|--------|----------------------------------|----------------------------------|
| `list` | `worker-picker` 组件搜索花名册 | 花名册列表页加载数据 |
| `create` | — | 新增弹窗 → 保存 |
| `update` | — | 编辑弹窗 → 保存 |
| `toggle` | — | 离职操作 → 确认弹窗 |
| `delete` | — | 删除操作 → 确认弹窗 |

### 小程序调用封装（`services/modules/admin.js`）

```js
import { post } from '../request'

export const adminApi = {
  getWorkerList(params) {
    return post('/api/admin/workers', { action: 'list', ...params })
  }
}
```

### Web 后台调用封装（`api/admin.ts`）

```typescript
export function getWorkerList(params: {
  page?: number; pageSize?: number; keyword?: string
}): Promise<{ total: number; list: WorkerItem[] }> {
  return request.post('/api/admin/workers', { action: 'list', ...params })
}

export function createWorker(data: {
  userName: string; workerCode: string; entryDate: string
}): Promise<{ code: number; data: { userId: number } }> {
  return request.post('/api/admin/workers', { action: 'create', ...data })
}

export function updateWorker(data: {
  userId: number; userName?: string; entryDate?: string
}): Promise<{ code: number; message: string }> {
  return request.post('/api/admin/workers', { action: 'update', ...data })
}

export function toggleWorker(userId: number, status: 'active' | 'inactive'): Promise<{ code: number; message: string }> {
  return request.post('/api/admin/workers', { action: 'toggle', userId, status })
}

export function deleteWorker(userId: number): Promise<{ code: number; message: string }> {
  return request.post('/api/admin/workers', { action: 'delete', userId })
}
```
