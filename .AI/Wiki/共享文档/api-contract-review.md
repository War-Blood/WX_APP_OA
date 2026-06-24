# API 接口契约一致性审查报告

> 审查时间：2025-07-10  
> 审查人：程晓技（技术经理）  
> 项目：智慧办公助手 OA  
> 范围：miniapp / webapp → backend 全量 API 契约

---

## 总览

| 严重程度 | 数量 | 简述 |
|----------|------|------|
| 🔴 CRITICAL | 4 | 前端调用但后端完全缺失的端点、DB列名透传导致前端无法正确渲染 |
| 🟠 HIGH | 1 | 请求参数字段名不一致（前后端不互通） |
| 🟡 MEDIUM | 3 | 请求参数后端未消费、响应格式不一致、审核意见丢失 |
| 🔵 LOW | 3 | 代码风格不统一、分页工具未统一使用 |

---

## 🔴 CRITICAL（阻断级）

### C1. 缺失后端路由：`POST /api/project/list`

- **调用方**：`webapp/src/api/project.ts` → `getProjectList()`
- **请求**：`POST /project/list`，参数 `{ page?, pageSize?, keyword? }`
- **期望响应**：`ProjectListResult = { total, list: ProjectItem[] }`
- **后端现状**：**路由完全不存在**。`backend/src/core/routes/index.js` 和 `features/routes/` 中均无 `/project/list`。
- **影响**：webapp 项目列表页完全无法使用。
- **建议**：在 `core/routes/` 新增 `project.routes.js`，或在 `review.routes.js` 中追加该路由。

### C2. 缺失后端路由：`POST /api/project/detail`

- **调用方**：`webapp/src/api/project.ts` → `getProjectDetail()`
- **请求**：`POST /project/detail`，参数 `{ id }`
- **期望响应**：`ProjectDetail`（含 members、reports、stats 嵌套）
- **后端现状**：**路由完全不存在**。
- **影响**：webapp 项目详情页完全无法使用。

### C3. 缺失后端路由：`POST /api/project/stats`

- **调用方**：`webapp/src/api/project.ts` → `getProjectStats()`
- **请求**：`POST /project/stats`，参数 `{ projectId?, period? }`
- **期望响应**：`ProjectStats = { totalReports, approvedCount, pendingCount, rejectedCount, approvalRate, trendList }`
- **后端现状**：**路由完全不存在**。注意后端有 `/api/project/reviewStats`，但其返回格式与 webapp 期望的 `ProjectStats` 不同（reviewStats 返回 `{ totalPending, todayReviewed, avgReviewTime, approvalRate, trendList }`）。
- **影响**：webapp 项目统计页完全无法使用。

### C4. 日报列表/详情返回 DB 原始字段（snake_case），前端期望 camelCase

- **调用方**：`webapp/src/api/report.ts` → `getReportList()`, `getReportDetail()`
- **后端**：`report.service.js` 的 `list()` 和 `detail()` 均执行 `SELECT * FROM daily_reports`，直接将 DB 行（snake_case）返回。
- **字段对照**：

| 前端期望 (camelCase) | 后端实际返回 (snake_case) | 差异 |
|----------------------|---------------------------|------|
| `date` | `report_date` | 字段名不匹配 |
| `workContent` | `work_content` | 字段名不匹配 |
| `todayWorkType` | `today_work_type` | 字段名不匹配 |
| `submitTime` | `created_at` | 字段名不匹配 |
| `statusText` | ❌ 无 | 缺失（需映射 pending→待审核 等） |
| `progressText` | ❌ 无 | 缺失 |
| `submitter` | ❌ 无（仅有 `user_id`数字） | 需 JOIN users 表 |
| `summary` | ❌ 无 | DB 中无此列 |
| `entryDate` | `entry_date` | 仅 detail，字段名不匹配 |
| `initialBizTripDate` | `initial_biz_trip_date` | 仅 detail，字段名不匹配 |
| `tomorrowPlan` | `tomorrow_plan` | 仅 detail，字段名不匹配 |

- **对比**：`review.service.js` 的 `reviewDetail()` 已做了完整 camelCase 映射和字段别名，report 模块应参照该模式改造。
- **影响**：webapp 日报列表/详情页大量字段显示为空/undefined。

---

## 🟠 HIGH（高危）

### H1. `reviewAction`：前端发 `note`，后端读 `opinion`

- **调用方**：
  - `miniapp/src/services/modules/review.js` → `doAction(id, action, note)` → `POST /api/project/reviewAction` body: `{ id, action, note }`
  - `webapp/src/api/report.ts` → `reviewAction(id, action, note)` → `POST /api/project/reviewAction` body: `{ id, action, note }`
- **后端**：`review.controller.js` line 75：
  ```js
  const { id, action, opinion } = req.body;  // 读的是 opinion，不是 note
  ```
- **service 层**：`review.service.js` 的 `reviewAction({ reportId, reviewerId, action, opinion })` — 当 `action === 'reject'` 时校验 `opinion` 必填。
- **影响**：审核操作（尤其是驳回意见）**永远传递不到后端**。驳回时 `opinion` 为空会触发 `BusinessError('驳回时必须填写审核意见')`，导致驳回操作失败。
- **建议**：统一为 `opinion`（与 reviewDetail 返回的 `reviewOpinion` 语义一致），修改两个前端的字段名。

---

## 🟡 MEDIUM（中危）

### M1. `report/list`：前端发 `keyword`，后端未消费

- **调用方**：`webapp/src/api/report.ts` → `getReportList({ keyword, ... })`
- **后端**：`report.controller.js` line 16 只解构了 `{ page, pageSize, status, startDate, endDate }`，未读取 `keyword`。`report.service.js` 的 `list()` 也没有 `keyword` 参数。
- **影响**：webapp 的日报搜索功能静默失效，用户输入关键词无效果。

### M2. `admin/users`：分页响应未使用 `paginated()` 工具

- **后端**：`admin.controller.js` → `res.json(success(result))`  
  `admin.service.js` → `getUserList()` 返回 `{ total, page, pageSize, list }`  
  经 `success()` 包装后 → `{ code: 0, data: { total, page, pageSize, list } }`
- **标准**：其他列表接口（report、approval、message）使用 `paginated()` → `{ code: 0, data: { list, total, page, pageSize, totalPages } }`
- **差异**：`admin/users` 的 `data` 中缺少 `totalPages` 字段。webapp `UserListResult` 未声明 `totalPages`，当前无功能影响，但 API 契约不统一。
- **建议**：改用 `paginated(result.list, result.total, result.page, result.pageSize)`。

### M3. `reviewList` 响应格式：未使用 `paginated()` 工具

- **后端**：`review.controller.js` line 28-39 手写了完整 JSON 对象，而非调用 `paginated()`。
- 虽然输出字段与 `paginated()` 一致（多了一个 `stats`），但代码风格不统一，增加维护风险。
- **建议**：改用 `paginated()` 并手动追加 `stats`，或扩展 `paginated()` 支持 `extra` 参数。

---

## 🔵 LOW（低优）

### L1. `report/list`：后端硬编码 `WHERE user_id = ?`

- **后端**：`report.service.js` 的 `list()` 始终按 `req.user.id` 过滤，仅返回当前用户的日报。
- **场景**：webapp 管理后台的 `getReportList` 注释为「管理员可看全部」，但实际只能看到自己的。
- **说明**：管理员可能需要通过 `/project/reviewList` 查看所有日报。当前行为可能是设计意图，但注释与实现不符。
- **建议**：根据用户角色判断：admin/superadmin 跳过 `user_id` 过滤。

### L2. 响应封装一致性

- `reviewList` 和 `admin/userList` 未使用 `paginated()` 工具函数，其余列表接口均使用。
- 建议统一所有分页接口使用 `paginated()`。

### L3. 前端接口定义分散

- 审核相关接口散落在两个文件中：`webapp/src/api/project.ts`（reviewList/reviewAction）和 `webapp/src/api/report.ts`（getReviewList/reviewAction）。
- `report.ts` 定义了 `ReviewItem`、`ReviewListResult`，又调用 `/project/review*` 端点。
- 建议：将审核相关接口集中到 `webapp/src/api/review.ts`。

---

## 端点覆盖矩阵

| 端点 | miniapp | webapp | 后端路由 | 状态 |
|------|---------|--------|----------|------|
| `POST /api/auth/login` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/auth/admin/login` | — | ✅ | ✅ | ✅ 正常 |
| `GET /api/user/profile` | ✅ | ✅ | ✅ | ✅ 正常 |
| `PUT /api/user/profile` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/message/list` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/message/detail` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/message/unread` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/message/markRead` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/report/list` | ✅ | ✅ | ✅ | 🔴 C4 (snake_case) + 🟡 M1 (keyword) |
| `POST /api/report/detail` | ✅ | ✅ | ✅ | 🔴 C4 (snake_case) |
| `POST /api/report/submit` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/report/draft` (save) | ✅ | — | ✅ | ✅ 正常 |
| `GET /api/report/draft` (get) | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/report/delete` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/approval/list` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/approval/detail` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/approval/create` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/approval/approve` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/stats/home` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/stats/activities` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/stats/profile` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/project/reviewList` | ✅ | ✅ | ✅ | 🟡 M3 (格式) |
| `POST /api/project/reviewDetail` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/project/reviewAction` | ✅ | ✅ | ✅ | 🟠 H1 (note→opinion) |
| `POST /api/project/reviewStats` | ✅ | — | ✅ | ✅ 正常 |
| `POST /api/project/list` | — | ✅ | ❌ | 🔴 C1 |
| `POST /api/project/detail` | — | ✅ | ❌ | 🔴 C2 |
| `POST /api/project/stats` | — | ✅ | ❌ | 🔴 C3 |
| `POST /api/admin/users` | — | ✅ | ✅ | 🟡 M2 (格式) |
| `POST /api/admin/setAdmin` | — | ✅ | ✅ | ✅ 正常 |
| `POST /api/admin/toggleUser` | — | ✅ | ✅ | ✅ 正常 |
| `POST /api/admin/createUser` | — | ✅ | ✅ | ✅ 正常 |
| `POST /api/admin/approveUser` | — | ✅ | ✅ | ✅ 正常 |
| `POST /api/admin/setPassword` | — | ✅ | ✅ | ✅ 正常 |

**总计**：33 个端点，4 个 CRITICAL，1 个 HIGH，3 个 MEDIUM，3 个 LOW。

---

## 修复优先级建议

1. **立即**：修复 H1（`note` → `opinion`），一行改动即可恢复审核驳回功能。
2. **本周**：实现 C1/C2/C3 三个缺失的 project 路由。
3. **本周**：改造 `report.service.js` 的 list/detail 返回 camelCase 格式化数据（参照 `review.service.js`）。
4. **跟进**：统一 `admin/userList` 和 `reviewList` 使用 `paginated()` 工具。
