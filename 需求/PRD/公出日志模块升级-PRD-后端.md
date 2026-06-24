# 公出日志模块升级 PRD — 后端 (backend/)

> 关联: 总览 `公出日志模块升级-PRD.md` | 配合: 小程序 PRD / Web 后台 PRD

---

## 1. 数据模型变更

### 1.1 users 表新增字段

```sql
ALTER TABLE users 
  ADD COLUMN worker_code VARCHAR(20) COMMENT '工号',
  ADD COLUMN entry_date DATE COMMENT '入场日期',
  ADD COLUMN worker_status ENUM('active','inactive') DEFAULT 'active' COMMENT '外场人员状态';
```

### 1.2 daily_reports 表变更

```sql
ALTER TABLE daily_reports 
  ADD COLUMN report_type ENUM('biz_trip','biz_trip_supplement','office') 
    DEFAULT 'biz_trip' COMMENT '日志类型',
  ADD COLUMN supplement_date DATE COMMENT '补录目标日期',
  ADD COLUMN supplement_reason TEXT COMMENT '补录原因',
  MODIFY today_work_type VARCHAR(20) COMMENT '今日工作类型: 工作（陆）/工作（海）/待工/在途/请假/调休',
  MODIFY tomorrow_work_type VARCHAR(20) COMMENT '明日工作类型';
```

### 1.3 新建 daily_report_workers 关联表

```sql
CREATE TABLE daily_report_workers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id INT UNSIGNED NOT NULL,
  worker_uid INT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_uid) REFERENCES users(id),
  UNIQUE KEY uk_report_worker (report_id, worker_uid)
);
```

---

## 2. API 接口

### 2.1 提交日报（改造）

**POST /api/report/submit**

```json
// 请求
{
  "reportType": "biz_trip",           // biz_trip | biz_trip_supplement | office
  "reportDate": "2026-06-12",

  // 公出日志/补公出日志 字段
  "project": "...",
  "area": "...",
  "relatedParty": "...",
  "workerIds": [7, 8],                // 改为 UID 数组，替代原 workers 文本
  "machineModel": "MySE233",
  "workContent": "...",
  "requiredQty": 10,
  "completedQty": 5,
  "remark": "...",
  "todayWork": "...",
  "todayWorkType": "工作（陆）",
  "tomorrowWorkType": "工作（陆）",
  "entryDate": "2026-03-04",
  "initialBizTripDate": "2026-05-27",

  // 补公出日志独有
  "supplementDate": "2026-06-10",
  "supplementReason": "海上无信号无法提交",

  // 公司日报独有
  "todayWork": "...",
  "tomorrowPlan": "...",
  "issues": "...",
  "coordination": "..."
}

// 响应
{ "code": 0, "message": "success", "data": { "reportId": 1908 } }
```

**校验规则（controller 层 Joi）**：
- `reportType` = `biz_trip` → project/area/workerIds 必填
- `reportType` = `biz_trip_supplement` → 同 biz_trip + supplementDate/supplementReason 必填
- `reportType` = `office` → todayWork 必填，其余可选
- `todayWorkType` = `请假` / `调休` → 允许 project/area/workerIds 为空

---

### 2.2 检查当日是否已被代填（新增）

**POST /api/report/check-duplicate**

```json
// 请求
{ "userId": 7, "reportDate": "2026-06-12" }

// 响应 — 已被代填
{
  "code": 2001,
  "message": "当日公出日志已由 张云峰 代填",
  "data": { "submittedBy": "张云峰", "reportId": 1906 }
}

// 响应 — 可正常提交
{ "code": 0, "message": "success", "data": { "canSubmit": true } }
```

---

### 2.3 补公出日志审核（新增）

**POST /api/report/supplement-review**

```json
// 请求（仅管理员可调用）
{
  "reportId": 1910,
  "decision": "special",                // special | forget
  "comment": "海上作业无信号"
}

// 响应
{ "code": 0, "message": "审核完成" }
```

**Service 层逻辑**：
```
decision = 'special'
  → status = 'approved', timeliness = 'on_time'

decision = 'forget'
  → status = 'approved', timeliness = 'delayed'
```

---

### 2.4 统计看板（改造，支持三种模式）

**POST /api/report/stats**

```json
// 模式1: 单人统计
{ "scope": "user", "userId": 7 }

// 模式2: 全员汇总（仅管理员/Web后台）
{ "scope": "all" }

// 模式3: 按项目聚合（仅管理员/Web后台）
{ "scope": "project" }


// ===== 单人统计响应 =====
{
  "code": 0,
  "data": {
    "scope": "user",
    "totalCount": 156,          // 累计日志条数（含代填+补录）
    "monthCount": 12,           // 当月条数
    "missingDays": 5,           // 缺失天数(入场→昨日)
    "missingDates": [           // 缺失日期列表(最近30条)
      "2026-06-08", "2026-06-07", "2026-06-05", "2026-06-03", "2026-06-01"
    ],
    "delayedCount": 3,          // 延迟条数
    "entryDate": "2026-03-04"   // 入场日期
  }
}

// ===== 全员汇总响应 =====
{
  "code": 0,
  "data": {
    "scope": "all",
    "totalLogs": 1907,          // 全系统日志总条数
    "monthNew": 54,             // 本月新增条数
    "delayedTotal": 12,         // 延迟总条数
    "missingPersonCount": 23    // 今天有缺失的人数
  }
}

// ===== 按项目聚合响应 =====
{
  "code": 0,
  "data": {
    "scope": "project",
    "projects": [
      { "project": "锡盟基地", "total": 45, "month": 3, "missing": 0 },
      { "project": "莆田平海湾", "total": 38, "month": 5, "missing": 2 }
    ]
  }
}
```

**计算逻辑** (service 层)：
```js
scope = 'user':
  totalCount   = COUNT(*) FROM daily_reports 
                 WHERE user_id = ? OR id IN (SELECT report_id FROM daily_report_workers WHERE worker_uid = ?)
  monthCount   = 同上 + AND MONTH(report_date) = MONTH(NOW())
  missingDays  = 入场日期至昨日天数 - 已提交天数
  delayedCount = 同上 + AND timeliness = 'delayed'

scope = 'all':
  totalLogs   = COUNT(*) FROM daily_reports WHERE report_type != 'office'
  monthNew    = 同上 + MONTH(report_date) = MONTH(NOW())
  delayedTotal= COUNT(*) WHERE timeliness = 'delayed'
  missingPersonCount = 当天未填日志的在职人员数

scope = 'project':
  按 project 字段 GROUP BY，聚合 total/month/missing
```

---

### 2.5 同组日志列表（新增）

**POST /api/report/team-logs**

```json
// 请求
{ "userId": 7, "days": 7 }

// 响应
{
  "code": 0,
  "data": {
    "teamMembers": [
      { "userId": 8, "userName": "冯双" },
      { "userId": 11, "userName": "曹国永" }
    ],
    "logs": [ /* daily_reports 列表，只读 */ ]
  }
}
```

**"同组"判定规则（量化）**：
```js
// 同组 = 同一 related_party + 最近 30 天内有日志提交的 project
// project 匹配使用子串：取前 20 个字符进行 LIKE 匹配，覆盖项目名简称/别名
async function getTeamMembers(userId) {
  const user = await db.query('SELECT related_party FROM daily_reports WHERE user_id = ? ORDER BY report_date DESC LIMIT 1', [userId]);
  if (!user) return [];
  
  const recentProjects = await db.query(
    `SELECT DISTINCT project FROM daily_reports 
     WHERE related_party = ? AND report_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    [user.related_party]
  );
  
  return db.query(
    `SELECT DISTINCT u.id AS userId, u.user_name AS userName 
     FROM users u
     JOIN daily_reports dr ON u.id = dr.user_id
     WHERE dr.related_party = ?
       AND (${recentProjects.map(p => `dr.project LIKE CONCAT(LEFT(?, 20), '%')`).join(' OR ')})
       AND u.id != ?`,
    [user.related_party, ...recentProjects.map(p => p.project), userId]
  );
}
```

---

### 2.6 补公出日志待审核列表（新增）

**POST /api/report/pending-reviews**

```json
// 请求
{ "status": "pending", "page": 1, "pageSize": 20 }
// status: pending(待审核) | reviewed(已审核) | all(全部)

// 响应
{
  "code": 0,
  "data": {
    "list": [
      {
        "reportId": 1910,
        "reportDate": "2026-06-10",
        "supplementDate": "2026-06-08",
        "submitterName": "张云峰",
        "project": "广西百色板桃国家电投风电场",
        "supplementReason": "海上无信号",
        "status": "pending_review",
        "createdAt": "2026-06-11 09:30:00"
      }
    ],
    "total": 5
  }
}
```

---

### 2.7 外场人员花名册（新增）

**统一入口 POST /api/admin/workers**，通过 `action` 字段区分操作（约定了统一的 action 模式，前端调用方只需变更 action 值）：

| action | 额外参数 | 说明 |
|:--:|------|------|
| `list` | `{ page, pageSize, keyword }` | 分页查询 |
| `create` | `{ userName, workerCode, entryDate }` | 新增外场人员 |
| `update` | `{ userId, userName, entryDate }` | 编辑 |
| `toggle` | `{ userId, status }` | active/inactive |
| `delete` | `{ userId }` | 软删除 |

> **设计说明**：采用统一入口 + action 模式而非独立路由，便于前端统一请求路径、权限中间件集中管理。

---

### 2.8 管理层看板 — 员工当日状态（新增）

**POST /api/report/daily-status**

```json
// 请求（仅管理员可调用）
{ "date": "2026-06-13" }  // 默认今天

// 响应
{
  "code": 0,
  "data": {
    "date": "2026-06-13",
    "totalWorkers": 45,
    "summary": {
      "submitted": 30,       // 已提交公出日志
      "supplement": 2,       // 补公出日志（审核中/已通过）
      "office": 3,           // 公司日报
      "substituted": 5,      // 已被他人代填
      "leave": 2,            // 请假
      "rest": 1,             // 调休
      "missing": 2           // 未提交（缺失）
    },
    "workers": [
      {
        "userId": 7,
        "userName": "张云峰",
        "workerCode": "BL001",
        "project": "锡盟基地",
        "workType": "工作（陆）",
        "status": "submitted",
        "submittedAt": "2026-06-13 08:30:00",
        "substituteBy": null
      },
      {
        "userId": 8,
        "userName": "韦少校",
        "workerCode": "BL002",
        "project": "莆田平海湾",
        "workType": "工作（海）",
        "status": "substituted",
        "submittedAt": "2026-06-13 09:15:00",
        "substituteBy": "张云峰"
      },
      {
        "userId": 10,
        "userName": "田子民",
        "workerCode": "BL004",
        "project": null,
        "workType": "请假",
        "status": "leave",
        "submittedAt": null,
        "substituteBy": null
      }
    ]
  }
}
```

**status 枚举**：`submitted`(已提交) | `supplement`(补公出) | `office`(公司日报) | `substituted`(已代填) | `leave`(请假) | `rest`(调休) | `missing`(未提交)

**计算逻辑** (service 层)：
```js
1. 查 users WHERE worker_status = 'active' → 所有在职外场人员
2. 查 daily_reports WHERE report_date = ? → 当日提交记录
3. 查 daily_report_workers 关联表 → 代填关系
4. 对每个在职人员判定 status：
   - 今日有 biz_trip 日志 → submitted（或 substituted 如果由他人代填）
   - 今日有 biz_trip_supplement → supplement
   - 今日有 office 日志 → office
   - today_work_type = '请假' → leave
   - today_work_type = '调休' → rest
   - 无任何记录 → missing
5. 汇总计数 → summary
```

---

### 2.9 管理层看板 — 员工月度工作占比（新增）

**POST /api/report/monthly-summary**

```json
// 请求（管理员看全员，员工看自己）
{ "userId": 7, "month": "2026-06" }

// 响应
{
  "code": 0,
  "data": {
    "userId": 7,
    "userName": "张云峰",
    "month": "2026-06",
    "totalSubmitted": 13,         // 本月已填报天数
    "workDays": 22,               // 应出勤天数（入场→月底）
    "breakdown": {
      "工作（陆）": 8,
      "工作（海）": 2,
      "待工": 1,
      "在途": 0,
      "请假": 1,
      "调休": 1
    },
    "ratio": {
      "工作（陆）": "61.5%",
      "工作（海）": "15.4%",
      "待工": "7.7%",
      "在途": "0%",
      "请假": "7.7%",
      "调休": "7.7%"
    }
  }
}
```

**计算逻辑** (service 层)：
```js
1. 查 users 获取 entry_date，算 workDays（入场日→月底的自然日数）
2. 查 daily_reports 
   WHERE user_id = ? AND MONTH(report_date) = ? AND report_type != 'office'
3. 按 today_work_type GROUP BY COUNT → breakdown
4. ratio = 各项 / totalSubmitted × 100%
```

> **设计说明**：月度占比按「已填报天数」计算分母，不计入未提交天数。如需查看缺勤率，配合 stats 接口的 missingDays 即可。

---

## 3. Service 层核心逻辑

### 3.1 提交日报 (report.service.js)

```
1. Joi 校验（controller）
2. 补充 entryDate：如前端未传，从 users.entry_date 自动查取
3. 补充 initialBizTripDate：如未传且 entryDate 已确定，默认等同 entryDate
4. 检查重复：SELECT FROM daily_report_workers WHERE worker_uid = ? AND report_date = ?
   → 如已代填，返回 code 2001
5. 请假/调休处理：workerIds 传 [] 时跳过代填写入
6. 插入 daily_reports（含 report_type 判断字段集）
7. workerIds 不为空时：批量插入 daily_report_workers（事务）
8. report_type = 'biz_trip_supplement' → status = 'pending_review'
   其他 → status = 'approved'
9. 返回 reportId
```

**请假/调休提交规范**：
- 前端传 `workerIds: []`（空数组），后端收到空数组跳过代填关联写入
- work_content 自动填充为 todayWorkType 的中文值（'请假' / '调休'）
- 其余业务字段（project/area/machine/requiredQty/completedQty）存 NULL

### 3.2 统计计算 (stats.service.js)

```
1. 查 users 获取 entry_date
2. 查 daily_reports WHERE user_id = ? OR IN (daily_report_workers)
3. 查 daily_report_workers WHERE worker_uid = ? → 代填日志
4. 合并去重 → 计数
5. 生成日期序列 entry_date → 昨日 → 对比 → 得缺失列表
```

---

## 4. 中间件

| 中间件 | 用途 |
|------|------|
| `authenticate` | JWT 验证（已有） |
| `requireAdmin` | 审核 + 花名册管理需要 admin 角色（已有） |

---

## 5. entryDate 自动补充

`entryDate` 不要求前端用户手填，从登录用户信息中自动获取：

```js
// middleware/auth.js 已注入 req.user.userId
// controller 层补充逻辑
async function submit(req, res, next) {
  const data = { ...req.body };

  // 如前端未传 entryDate，从 users 表获取
  if (!data.entryDate) {
    const [user] = await db.query('SELECT entry_date FROM users WHERE id = ?', [req.user.userId]);
    if (user?.entry_date) data.entryDate = user.entry_date;
  }

  // initialBizTripDate 如未传，默认同 entryDate
  if (!data.initialBizTripDate && data.entryDate) {
    data.initialBizTripDate = data.entryDate;
  }

  const result = await reportService.submit(data, req.user.userId);
  res.json(success(result));
}
```

---

## 6. wps_reports_view 视图更新

新增字段和类型后需重建视图，排除 `office` 类型（公司日报不入 WPS 报表）：

```sql
DROP VIEW IF EXISTS wps_reports_view;
CREATE VIEW wps_reports_view AS
SELECT 
  dr.id,
  dr.report_date AS `01-日报时间`,
  COALESCE(u.user_name, '') AS `02-填写人`,
  COALESCE(dr.entry_date, dr.report_date) AS `03-入场时间`,
  dr.initial_biz_trip_date AS `04-初始出差时间`,
  dr.project AS `05-项目名称`,
  dr.area AS `06-项目所在区域`,
  dr.related_party AS `07-相关方单位`,
  COALESCE(
    (SELECT GROUP_CONCAT(u2.user_name SEPARATOR '、') 
     FROM daily_report_workers drw 
     JOIN users u2 ON drw.worker_uid = u2.id 
     WHERE drw.report_id = dr.id), 
    ''
  ) AS `08-作业人员`,
  COALESCE(dr.machine_model, '') AS `09-机型`,
  COALESCE((SELECT COUNT(*) FROM daily_report_workers WHERE report_id = dr.id), 0) AS `10-人数`,
  COALESCE(dr.work_content, '') AS `11-从事工作内容`,
  COALESCE(dr.required_qty, 0) AS `12-需要完成数量`,
  COALESCE(dr.completed_qty, 0) AS `13-累计完成数量`,
  COALESCE(dr.progress_percent, 0) AS `14-当前进度`,
  COALESCE(dr.today_work, '') AS `15-当日工作小结`,
  COALESCE(dr.tomorrow_plan, '') AS `16-明天工作内容`,
  COALESCE(dr.today_work_type, '') AS `17-今日工作类型`,
  COALESCE(dr.tomorrow_work_type, '') AS `18-明日工作类型`
FROM daily_reports dr
LEFT JOIN users u ON dr.user_id = u.id
WHERE dr.status = 'approved'
  AND dr.report_type != 'office';  -- 公司日报不入 WPS 报表
```

> **注意**：作业人员改用 `daily_report_workers` 关联表聚合，不再从 `dr.workers` 文本字段取。历史数据 `workers` 文本保留但不再写入。

---

## 7. 模块结构（最终）

```
backend/src/core/report/
  ├── routes/
  │   └── report.routes.js       ← 8个路由绑定
  ├── controllers/
  │   └── report.controller.js   ← submit/checkDuplicate/supplementReview/stats/teamLogs/pendingReviews/dailyStatus/monthlySummary
  └── services/
      ├── report.service.js      ← 改造submit + 审核 + 代填 + 当日状态
      └── stats.service.js       ← 三种scope统计 + 月度占比

backend/src/core/admin/
  └── services/
      └── worker.service.js      ← 花名册 CRUD(统一action入口)

sql/
  └── update_wps_view.sql        ← wps_reports_view 重建
```
