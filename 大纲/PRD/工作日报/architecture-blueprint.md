# 架构蓝图 — 工作日报

> 阶段：3 架构蓝图
> 输入：00-index ~ 09-milestones 共 10 份维度文档
> 产出：代码骨架设计（不含实际代码）
> 日期：2026-08-05
> 说明：本期实现已完成（commit 12e3963），蓝图描述实际落地结构，作为代码骨架映射。

## 1. 项目目录结构

> 工作日报是日报模块内的类型扩展，不新建后端功能目录；在现有 report/stats 文件上做增量改动。

### backend（增量改动，不新建目录）

```
backend/src/core/
├── controllers/
│   └── report.controller.js      # 增量：submit 放行 office、list 透传 reportType
├── services/
│   ├── report.service.js         # 增量：list 增加 reportType 过滤
│   └── stats.service.js          # 增量：当日/明日/日历放开 office
└── routes/
    ├── report.routes.js          # 无新增端点（复用）
    └── (features/routes/stats.routes.js)  # 无新增端点（复用）
```

### miniapp（增量改动，不新建页面）

```
miniapp/src/pages/
├── employee/
│   ├── report-edit/index.vue     # 增量：typeTabs 加 office Tab、隐藏工作类型选择器
│   ├── report-history/index.vue  # 增量：office 类型标签
│   └── report-detail/index.vue   # 增量：office 类型标签
├── profile/stats.vue             # 增量：statusLabel office
└── admin/daily-overview/index.vue# 增量：statusLabelMap office
```

### webapp（新建 1 页面 + 增量）

```
webapp/src/
├── views/report/
│   ├── daily.vue                 # 新建：工作日报管理页
│   ├── index.vue                 # 增量：reportTypeOptions/getReportTypeTag 加 office
│   └── daily-status.vue          # 增量：office 标签
├── api/report.ts                 # 增量：getReportList 加 reportType 类型
├── router/index.ts               # 增量：/report/daily 路由
├── config/modules.ts             # 增量：工作日报菜单项
└── components/ReportDetailDialog.vue # 增量：office 标签
```

## 2. 前端组件树

### Miniapp 写日报页（report-edit）组件树

```
report-edit
├── NavBar（复用 nav-bar）              # 标题 + 保存草稿
├── type-tab-bar（页面内分段 Tab）       # 公出日志 / 补公出日志 / 工作日报
├── 工作日报表单（v-if currentTab==='office'）
│   ├── Card（填写日期）                 # 复用日期 picker
│   ├── Card（今日工作内容 textarea）    # 必填 2000 字
│   └── Card（计划与问题 textarea×3）    # 明日计划/问题/协调
└── Button（提交工作日报）
```

**复用组件**：nav-bar / date-picker / toast
**新增组件**：无（复用现有 type-tab-bar 与表单结构）

### Miniapp 公出统计页（profile/stats）组件树

```
stats
├── tab-bar（个人/全员当日/日历/项目/人员）
├── 全员当日
│   └── worker-card 分组（含 .worker-card--office 工作日报组）
├── 明日视图
│   └── 按 tomorrowWorkType 分组（空类型→未填写组）
└── 日历
    └── 热力格（submitted/total）
```

### Webapp 工作日报管理页（daily.vue）组件树

```
daily
├── 筛选区 ElForm（keyword/status/日期范围/刷新）
├── ElTable（日报时间/填写人/今日工作/明日计划/问题/协调/状态/操作）
├── ElPagination（分页）
├── ReportDetailDialog（复用详情弹窗）
├── ElDialog（编辑四字段弹窗）
└── ElMessageBox（删除确认 + 10s 撤销）
```

**复用组件**：ReportDetailDialog / AppHeader / AppSidebar / DefaultLayout
**新增组件**：无

## 3. 前端路由设计

### Miniapp pages.json 新增条目

**无新增页面**——工作日报复用现有 `pages/employee/report-edit/index`、`pages/profile/stats` 等已注册页面，仅在页面内增加 Tab 分支。【假设】无需改动 pages.json。

### Webapp router/index.ts 新增路由

```typescript
// report.children 下新增
{
  path: 'daily',
  name: 'ReportDaily',
  component: () => import('@/views/report/daily.vue'),
  meta: { title: '工作日报', roles: ['admin', 'superadmin'] }
}
```

### config/modules.ts 新增菜单

```typescript
// report.children 下新增
{ title: '工作日报', path: '/report/daily', roles: ['admin', 'superadmin'] }
```

### meta 字段说明

| 字段 | 值 | 说明 |
|------|-----|------|
| title | 工作日报 | 页面标题，侧栏/面包屑显示 |
| roles | ['admin','superadmin'] | 仅管理员可访问，employee 不可见 |

## 4. 前端状态管理

### 结论：不新增独立 store

工作日报复用现有 Pinia store（`miniapp/src/stores/user.js` 提供角色/用户信息），页面数据通过 API 直接获取，不引入 work-report 专用 store。【假设】本期无跨页共享状态需求。

### 数据流

```
页面交互 → services/modules/report.js 调用 → /api/report/* → 后端 → 页面响应式渲染
```

| 端 | 状态来源 | 用途 |
|----|---------|------|
| miniapp | `stores/user.js` | isAdmin 控制公出统计 Tab 可见性 |
| webapp | `stores/user.ts` | 角色控制菜单/路由可见性 |

## 5. 前端 API 服务层

### Miniapp — services/modules/report.js + stats.js（复用，无新增函数）

| 函数 | 参数 | 返回值 | 端点 |
|------|------|--------|------|
| `submit` | `{ reportType:'office', reportDate, todayWork, ... }` | `{ reportId }` | POST /api/report/submit |
| `getList` | `{ page, pageSize, reportType, ... }` | `{ total, list }` | POST /api/report/list |
| `getDailyStatus` | `{ date }` | `{ date, summary, workers }` | POST /api/report/daily-status |
| `getTomorrowStatus` | `{ date }` | `{ date, prevDate, summary, workers }` | POST /api/report/tomorrow-status |
| `getDailyCounts` | `{ month }` | `{ month, data }` | POST /api/stats/daily-counts |

### Webapp — api/report.ts（增量）

```typescript
// getReportList 参数补 reportType（工作日报页固定传 'office'）
export interface ReportListParams {
  page?: number; pageSize?: number; status?: string; reportType?: string;
  startDate?: string; endDate?: string; keyword?: string;
}
export function getReportList(params: ReportListParams): Promise<ReportListResult>;
```

## 6. 后端模块划分

### Route — 复用现有路由，无新增端点

| 端点 | 中间件 | Controller 方法 |
|------|--------|----------------|
| POST /api/report/submit | authenticate | controller.submit |
| POST /api/report/list | authenticate | controller.list |
| POST /api/report/update | authenticate, requireRole('admin','superadmin') | controller.update |
| POST /api/report/daily-status | authenticate, requireRole('admin','superadmin') | controller.dailyStatus |
| POST /api/report/tomorrow-status | authenticate, requireRole('admin','superadmin') | controller.tomorrowStatus |
| POST /api/stats/daily-counts | authenticate | controller.dailyCounts |

### Controller — controllers/report.controller.js（增量）

| 方法 | 请求参数 | 返回数据 |
|------|---------|---------|
| `submit` | `req.body: { reportType, reportDate, todayWork, ... }` | `{ code, data: { reportId } }` |
| `list` | `req.body: { page, pageSize, reportType, ... }` | `{ code, data: { total, list } }` |

**增量逻辑**：submit 白名单加 'office'；office 跳过 todayWorkType 校验；list 透传 reportType。

### Service — services/report.service.js + stats.service.js（增量）

| 函数 | 参数 | 返回值 | 依赖 |
|------|------|--------|------|
| `reportService.list` | `(userId, { page, pageSize, status, reportType, ... })` | `{ list, total }` | db.query |
| `reportService.submit` | `(data, userId)` | `{ reportId }` | db.transaction |
| `statsService.getDailyStatus` | `(date)` | `{ date, summary, workers }` | db.query |
| `statsService.getTomorrowStatus` | `(date)` | `{ date, prevDate, summary, workers }` | getDailyStatus |
| `statsService.getDailyCounts` | `(month)` | `{ month, data }` | db.query |

## 7. 后端数据库模型映射

### 表 → Service 映射

| 表名 | 对应 Service | 说明 |
|------|-------------|------|
| daily_reports | report.service.js / stats.service.js | 工作日报 = report_type='office'，无新表 |
| users | 只读引用 | 提交人/姓名 |
| attendance_leave_requests | stats.service.js | 出差/请假判定（只读） |
| daily_report_workers | 不写入 | 工作日报无代填关系 |

### 实体关系

```
users 1:N daily_reports（外键：user_id）
users 1:N attendance_leave_requests（外键：applicant_id）
```

### 索引建议（复用现有，不新增）

| 表名 | 索引字段 | 类型 | 说明 |
|------|---------|------|------|
| daily_reports | user_id, report_date | 唯一 | 一人一天一条 |
| daily_reports | report_date | 普通 | 按日统计 |
| daily_reports | status, report_date | 联合 | 非草稿统计 |

## 8. 后端中间件设计

### 通用中间件（复用，无新增）

| 中间件 | 文件 | 作用 |
|--------|------|------|
| authenticate | `common/middleware/auth.js` | JWT Bearer 验证 |
| requireRole | `common/middleware/auth.js` | 角色控制（admin/superadmin） |
| errorHandler | `common/utils/` 错误处理 | 统一响应 code/message |

### 模块专属中间件（新增）

无。工作日报复用现有认证/权限/错误处理中间件。

## 9. Agent 归属表

| 文件路径 | 归属 Agent | 类型 | 上游依赖 |
|----------|-----------|------|---------|
| `backend/src/core/controllers/report.controller.js` | core-agent | controller | 03-api-design |
| `backend/src/core/services/report.service.js` | core-agent | service | controller |
| `backend/src/core/services/stats.service.js` | core-agent（跨 data-agent 域，orchestrator 协调） | service | controller |
| `miniapp/src/pages/employee/report-edit/index.vue` | miniapp-core-agent | page | api |
| `miniapp/src/pages/profile/stats.vue` | miniapp-core-agent | page | api |
| `miniapp/src/pages/employee/report-history/index.vue` | miniapp-core-agent | page | api |
| `miniapp/src/pages/employee/report-detail/index.vue` | miniapp-core-agent | page | api |
| `miniapp/src/pages/admin/daily-overview/index.vue` | miniapp-admin-agent | page | api |
| `webapp/src/views/report/daily.vue` | webapp-core-agent | view | api |
| `webapp/src/views/report/index.vue` | webapp-core-agent | view | api |
| `webapp/src/views/report/daily-status.vue` | webapp-core-agent | view | api |
| `webapp/src/api/report.ts` | webapp-common-agent | api | 03-api-design |
| `webapp/src/router/index.ts` | webapp-common-agent | router | view |
| `webapp/src/config/modules.ts` | webapp-common-agent | menu | view |
| `webapp/src/components/ReportDetailDialog.vue` | webapp-common-agent | component | view |

## 10. 关键依赖

### 新增 npm 包

| 包名 | 用途 | 安装位置 |
|------|------|---------|
| 无 | — | — |

### 复用模块

| 模块 | 来源 | 用途 |
|------|------|------|
| report.controller/service | `backend/src/core/` | 提交/列表/统计 |
| stats.service | `backend/src/core/services/stats.service.js` | 当日/明日/日历 |
| reportApi | `miniapp/src/services/modules/report.js` | 小程序接口 |
| statsApi | `miniapp/src/services/modules/stats.js` | 小程序统计接口 |
| report.ts | `webapp/src/api/report.ts` | Web 接口 |
| ReportDetailDialog | `webapp/src/components/` | 详情弹窗复用 |
| auth middleware | `backend/src/common/middleware/auth.js` | 认证/权限 |

### 外部服务依赖

| 服务 | 用途 | 接入方式 |
|------|------|---------|
| 无 | — | — |

> 数据库/Redis/微信均复用现有接入，无新增外部依赖。
