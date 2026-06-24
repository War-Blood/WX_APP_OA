# 公出日志模块升级 PRD — Web 管理后台 (webapp/)

> 关联: 总览 `公出日志模块升级-PRD.md` | 配合: 后端 PRD / 小程序 PRD

---

## 1. 改动概览

| 页面 | 路径 | 改动类型 |
|------|------|:--:|
| 日报管理列表 | `views/report/index.vue` | 改造 |
| 补公出日志审核 | `views/report/audit.vue` | **新增** |
| 公出统计看板 | `views/report/stats.vue` | **新增** |
| 员工当日状态 | `views/report/daily-status.vue` | **新增** |
| 员工月度占比 | `views/report/monthly-summary.vue` | **新增** |
| 外场人员花名册 | `views/user/workers.vue` | **新增** |
| API 类型定义 | `api/report.ts` | 扩展 |
| 花名册 API | `api/admin.ts` | 扩展 |

---

## 2. 日报管理列表（改造）

### 新增筛选条件

```
┌────────────────────────────────────────────┐
│ 日志类型: [全部 ▼]  工作类型: [全部 ▼]       │
│ 日期: [2026-06-01] ~ [2026-06-12]          │
│ 项目: [搜索...]  人员: [搜索...]             │
│ [查询] [导出Excel]                          │
└────────────────────────────────────────────┘
```

### 列表列新增

在原列基础上新增：

| 列 | 说明 |
|------|------|
| **日志类型** | 公出日志 / 补公出日志 / 公司日报（tag 颜色区分） |
| **工作类型** | 工作（陆）/ 工作（海）/ 待工 / 在途 / 请假 / 调休 |
| **作业人员** | 显示 UID 列表（点击查看详情） |
| **提交状态** | `approved` / `pending_review` / `delayed` |
| **操作** | 查看详情 / [审核]（仅补公出日志） |

---

## 3. 补公出日志审核页（新增 views/report/audit）

### 列表

```
┌──────────────────────────────────────────────┐
│  待审核补公出日志      [全部] [待审核] [已审核] │
├──────┬──────┬──────┬──────┬──────┬─────────┤
│ 日期  │ 提交人 │ 补录日 │ 项目  │ 原因  │ 操作    │
├──────┼──────┼──────┼──────┼──────┼─────────┤
│06-10 │ 张云峰│06-08 │ 板桃  │无信号 │[审核]   │
│06-11 │ 韦少校│06-09 │ 大黑山│忘记  │[审核]   │
└──────┴──────┴──────┴──────┴──────┴─────────┘
```

### 审核弹窗

点击 [审核] →

```
┌──────────────────────────────────────┐
│  补公出日志审核                       │
│──────────────────────────────────────│
│  提交人: 张云峰                       │
│  补录日期: 2026-06-08                │
│  项目: 广西百色板桃国家电投风电场      │
│  补录原因: 海上无信号无法提交          │
│  工作内容: ... (完整展示)             │
│──────────────────────────────────────│
│  审核判定:                            │
│  ○ 特殊情况 — 日志标记为正常          │
│  ○ 非特殊/忘记 — 日志标记为延迟       │
│                                      │
│  审核意见: [_______________]          │
│                                      │
│  [确认] [取消]                        │
└──────────────────────────────────────┘
```

### API 调用

```typescript
// api/report.ts
export function getPendingReviews(params: {
  status?: 'pending' | 'reviewed' | 'all'
  page?: number; pageSize?: number
}): Promise<{ code: number; data: { list: SupplementItem[]; total: number } }> {
  return request.post('/api/report/pending-reviews', params)
}

export function reviewSupplement(params: {
  reportId: number
  decision: 'special' | 'forget'
  comment?: string
}): Promise<{ code: number; message: string }> {
  return request.post('/api/report/supplement-review', params)
}
```

---

## 4. 公出统计看板（新增 views/report/stats）

### 布局

```
┌──────────────────────────────────────────────┐
│  📊 公出日志统计              日期范围筛选     │
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────┬────────┬────────┬────────┐       │
│  │ 总日志  │ 本月新增 │ 延迟条数 │ 缺失人次 │       │
│  │ 1,907  │   54   │   12   │   23   │       │
│  └────────┴────────┴────────┴────────┘       │
│                                              │
├──────────────────────────────────────────────┤
│  按项目维度                                  │
│  ┌──────────────┬──────┬──────┬──────┐       │
│  │ 项目          │ 总条数 │ 本月  │ 缺失  │       │
│  ├──────────────┼──────┼──────┼──────┤       │
│  │ 锡盟基地      │  45  │  3   │  0   │       │
│  │ 莆田平海湾    │  38  │  5   │  2   │       │
│  │ 帆石二        │  32  │  4   │  0   │       │
│  │ ...           │ ...  │ ...  │ ...  │       │
│  └──────────────┴──────┴──────┴──────┘       │
│                                              │
├──────────────────────────────────────────────┤
│  按人员维度                                  │
│  ┌────────┬──────┬──────┬──────┬──────────┐  │
│  │ 人员    │ 总条数 │ 本月  │ 缺失  │ 最近提交  │  │
│  ├────────┼──────┼──────┼──────┼──────────┤  │
│  │ 李余伟  │  98  │  5   │  0   │ 06-10    │  │
│  │ 张云峰  │  76  │  3   │  1   │ 06-09    │  │
│  │ 王腾    │  65  │  4   │  0   │ 06-10    │  │
│  │ ...     │ ...  │ ...  │ ...  │ ...      │  │
│  └────────┴──────┴──────┴──────┴──────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

**API 调用**：
- 全员汇总：`POST /api/report/stats { scope: 'all' }`
- 按项目：`POST /api/report/stats { scope: 'project' }`（后端聚合，前端直接渲染）
- 单人：`POST /api/report/stats { scope: 'user', userId }`

---

## 5. 管理层看板 — 员工当日状态（新增 views/report/daily-status）

### 页面布局

```
┌──────────────────────────────────────────────────────────┐
│  员工当日状态                         [2026-06-13]        │
├──────────────────────────────────────────────────────────┤
│  汇总: 已提交30 | 已代填5 | 补公出2 | 公司日报3           │
│        请假2 | 调休1 | ⚠缺失2                            │
├──────────────────────────────────────────────────────────┤
│  🔍 [搜索姓名/工号...]    [全部状态 ▼]                    │
├──────────┬──────┬──────────┬──────────┬────────┬────────┤
│ 姓名      │ 工号  │ 项目      │ 工作类型  │ 状态    │ 时间    │
├──────────┼──────┼──────────┼──────────┼────────┼────────┤
│ 张云峰    │ BL001│ 锡盟基地  │ 工作（陆）│ 已提交  │ 08:30  │
│ 韦少校    │ BL002│ 莆田平海湾│ 工作（海）│ 已代填  │ 09:15  │
│           │      │          │          │ (张云峰)│        │
│ 王腾      │ BL003│ 帆石二    │ 待工      │ 已提交  │ 07:50  │
│ 田子民    │ BL004│ —        │ 请假      │ —      │ —      │
│ 李余伟    │ BL005│ —        │ —        │ ⚠未提交 │ —      │
└──────────┴──────┴──────────┴──────────┴────────┴────────┘
```

### 排序规则

默认排序优先级：**未提交 → 补公出 → 已代填 → 已提交 → 请假/调休**（异常优先前置）

### 筛选

- 状态筛选：全部 / 未提交 / 已代填 / 补公出 / 已提交 / 请假调休
- 姓名/工号搜索

### API 调用

```typescript
export function getDailyStatus(params: {
  date?: string
  status?: string
  keyword?: string
}): Promise<{ code: number; data: DailyStatusResponse }> {
  return request.post('/api/report/daily-status', params)
}
```

---

## 6. 管理层看板 — 员工月度工作占比（新增 views/report/monthly-summary）

### 页面布局

```
┌──────────────────────────────────────────────────────────┐
│  员工月度工作占比                    2026年6月             │
├──────────────────────────────────────────────────────────┤
│  选择人员: [张云峰 ▼]      月份: [2026-06 ▼]             │
│                                                          │
│  应出勤: 22天  已填报: 13天  缺报: 9天                    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │  工作（陆）  ████████████████████████  61.5%  8天 │     │
│  │  工作（海）  ████████                  15.4%  2天 │     │
│  │  待工        ████                      7.7%  1天 │     │
│  │  在途        —                          0%   0天 │     │
│  │  请假        ████                      7.7%  1天 │     │
│  │  调休        ████                      7.7%  1天 │     │
│  └─────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

### 交互

- 顶部切换人员（下拉搜索）和月份
- 条形图可视化各工作类型占比
- 可导出当前视图为 Excel（后续精进）

### API 调用

```typescript
export function getMonthlySummary(params: {
  userId: number
  month: string
}): Promise<{ code: number; data: MonthlySummaryResponse }> {
  return request.post('/api/report/monthly-summary', params)
}
```

---

## 7. 外场人员花名册（新增 views/user/workers）

### 页面布局

```
┌──────────────────────────────────────────────┐
│  外场人员花名册              [+ 新增人员]      │
│  🔍 [搜索姓名/工号...]                        │
├──────────┬──────┬──────┬──────┬──────┬───────┤
│ 姓名      │ 工号  │ 入场日  │ 状态  │ 日志数 │ 操作   │
├──────────┼──────┼──────┼──────┼──────┼───────┤
│ 张云峰    │ BL001│ 03-04 │ 在职  │  76  │ 编辑   │
│ 韦少校    │ BL002│ 03-04 │ 在职  │  54  │ 编辑   │
│ 王腾      │ BL003│ 06-04 │ 在职  │  18  │ 编辑   │
│ 田子民    │ BL004│ 03-04 │ 离职  │  32  │ 编辑   │
└──────────┴──────┴──────┴──────┴──────┴───────┘
```

### 新增/编辑弹窗

```
┌─────────────────────────┐
│  新增外场人员            │
│                         │
│  姓名: [________]        │
│  工号: [BL___]           │
│  入场日期: [2026-06-12]  │
│  关联方: [浙江贝良 ▼]    │
│                         │
│  [保存] [取消]           │
└─────────────────────────┘
```

---

## 8. API 类型定义

### api/report.ts 新增

```typescript
export interface ReportSubmitParams {
  reportType: 'biz_trip' | 'biz_trip_supplement' | 'office'
  reportDate: string
  project?: string
  area?: string
  relatedParty?: string
  workerIds?: number[]
  machineModel?: string
  workContent?: string
  requiredQty?: number
  completedQty?: number
  remark?: string
  todayWork?: string
  tomorrowPlan?: string
  todayWorkType?: string
  tomorrowWorkType?: string
  entryDate?: string
  initialBizTripDate?: string
  // 补公出
  supplementDate?: string
  supplementReason?: string
  // 公司日报
  issues?: string
  coordination?: string
}

export interface ReviewSupplementParams {
  reportId: number
  decision: 'special' | 'forget'
  comment?: string
}

export interface ReportStats {
  totalCount: number
  monthCount: number
  missingDays: number
  missingDates: string[]
  delayedCount: number
  entryDate: string
}

export interface TeamLog {
  userId: number
  userName: string
  reportDate: string
  todayWorkType: string
  workContent: string
  reportId: number
}

// 函数声明
export function reviewSupplement(params: ReviewSupplementParams): Promise<{ code: number; message: string }>
export function getStats(scope: 'user' | 'all' | 'project', userId?: number): Promise<{ code: number; data: ReportStats | AllStats | ProjectStats[] }> {
  return request.post('/api/report/stats', { scope, ...(userId ? { userId } : {}) })
}
export function getTeamLogs(userId: number, days?: number): Promise<{ code: number; data: { teamMembers: any[]; logs: TeamLog[] } }>

// 管理层看板
export interface DailyStatusWorker {
  userId: number; userName: string; workerCode: string
  project: string | null; workType: string | null
  status: 'submitted' | 'supplement' | 'office' | 'substituted' | 'leave' | 'rest' | 'missing'
  submittedAt: string | null; substituteBy: string | null
}

export interface DailyStatusResponse {
  date: string; totalWorkers: number
  summary: { submitted: number; supplement: number; office: number; substituted: number; leave: number; rest: number; missing: number }
  workers: DailyStatusWorker[]
}

export interface MonthlySummaryResponse {
  userId: number; userName: string; month: string
  totalSubmitted: number; workDays: number
  breakdown: Record<string, number>
  ratio: Record<string, string>
}

export function getDailyStatus(params: { date?: string; status?: string; keyword?: string }): Promise<{ code: number; data: DailyStatusResponse }>
export function getMonthlySummary(params: { userId: number; month: string }): Promise<{ code: number; data: MonthlySummaryResponse }>
```

### api/admin.ts 新增

```typescript
export interface WorkerItem {
  userId: number
  userName: string
  workerCode: string
  entryDate: string
  workerStatus: 'active' | 'inactive'
  totalLogs: number
  department?: string
}

// 花名册统一入口 api/admin.ts
// 所有操作走 POST /api/admin/workers，用 action 字段区分

export function getWorkerList(params: {
  page?: number; pageSize?: number; keyword?: string
}): Promise<{ total: number; list: WorkerItem[] }> {
  return request.post('/api/admin/workers', { action: 'list', ...params })
}

export function createWorker(data: {
  userName: string; workerCode: string; entryDate: string; department?: string
}): Promise<{ code: number; data: { userId: number } }> {
  return request.post('/api/admin/workers', { action: 'create', ...data })
}

export function updateWorker(data: {
  userId: number; userName?: string; entryDate?: string; workerStatus?: string
}): Promise<{ code: number; message: string }> {
  return request.post('/api/admin/workers', { action: 'update', ...data })
}

export function deleteWorker(userId: number): Promise<{ code: number; message: string }> {
  return request.post('/api/admin/workers', { action: 'delete', userId })
}
```

---

## 9. 路由配置

```typescript
// router/index.ts 新增
{
  path: '/report',
  children: [
    { path: 'audit', component: () => import('@/views/report/audit.vue'), meta: { title: '补公出审核' } },
    { path: 'stats', component: () => import('@/views/report/stats.vue'), meta: { title: '公出统计' } },
    { path: 'daily-status', component: () => import('@/views/report/daily-status.vue'), meta: { title: '员工当日状态' } },
    { path: 'monthly-summary', component: () => import('@/views/report/monthly-summary.vue'), meta: { title: '月度工作占比' } },
  ]
},
{
  path: '/user/workers',
  component: () => import('@/views/user/workers.vue'),
  meta: { title: '外场人员花名册' }
}
```
