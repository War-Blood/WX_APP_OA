# 考勤管理 PRD — 开发文档

> 版本: v2.0 | 日期: 2026-06-29 | 状态: 设计中
>
> 关联模块: 考勤 `attendance_schedules`、`attendance_leave_requests`
>
> 导出模板参照: `需求/work/2026年5月技术工程中心公出加班统计表.xlsx`（双 Sheet 结构）+ `需求/work/技术工程中心人员公出考勤统计表生成工具.html`（exceljs 生成逻辑源）

---

## 一、产品概述

### 1.1 功能定位

考勤功能模块为「智慧办公助手 OA 系统」新增排班、出差打卡、请假申请、考勤汇总三大能力，覆盖小程序端（员工）与 Web 后台端（管理员）。

| 角色 | 端 | 核心能力 |
|------|----|---------|
| 员工 `employee` | 小程序 `miniapp` | 查看个人排班、出差开始/结束打卡、提交请假申请（即时生效）、查看个人考勤汇总 |
| 管理员 `admin` / `superadmin` | Web 后台 `webapp` | 排班日历管理（日/周/月+批量）、全公司考勤汇总与导出 |
| 管理员 | 小程序 `miniapp` | 移动端排班查看 |

### 1.2 数据来源

**新增表（2 张，零侵入现有系统）**：

| 表名 | 用途 |
|------|------|
| `attendance_schedules` | 排班日历（简化状态制：user × date × status） |
| `attendance_leave_requests` | 请假申请单（免审批，提交即生效）+ 出差打卡记录（开始/结束两次操作） |

**复用现有表**：`users`（人员）、`departments`（部门树）、`messages`（通知推送）、`daily_reports`（**只读引用**——导出/汇总/出差未提交检测时读取公出日志）

> ⚠️ 本模块**不修改任何现有表结构**。考勤模块**请假免审批**——提交即生效。
> **出差为两次打卡操作**：出差开始和出差结束分两次独立操作，不预设结束日期。
>
> ⚠️ 关于 `daily_reports`：考勤模块**只读取不写入**——导出考勤汇总、汇总查询、前端展示时**读取公出日志**获取项目区域（`area`）、工作类型（`today_work_type`）、工作内容（`work_content`）。同时用于**出差期间未提交检测**：出差中某日无公出日志且无请假 → 当日标记「未提交」。

### 1.3 设计原则

1. **请假免审批**：请假申请提交即生效（`status='active'`），事务内同步覆盖 `attendance_schedules` 对应日期的排班状态
2. **出差两次打卡**：出差开始和出差结束为两次独立操作，不预设结束日期；出差开始后状态变为「出差中」，结束后记录结束时间
3. **出差未提交检测**：出差期间每日检测——无公出日志（`daily_reports`）且无请假（`attendance_leave_requests`）→ 当日标记「未提交」
4. **不回写日报**：提交后不修改 `daily_reports`，模块边界清晰、零风险
5. **公出日志全局覆盖**：导出/汇总/前端展示三处统一按「公出日志 > 排班状态」优先级判定考勤状态
6. **零侵入**：仅新增 2 张表、新增 `features/attendance/` 目录、新增错误码分区，不动现有代码
7. **双端覆盖**：Web 后台提供完整管理能力，小程序提供员工移动端能力

---

## 二、数据库设计

### 2.1 新增表 ER 关系

```
users ──< attendance_schedules
users ──< attendance_leave_requests

【只读引用】daily_reports (user_id + report_date) → 导出/汇总/展示时跨表读取 area/today_work_type/work_content
```

### 2.2 完整建表 SQL DDL

> 迁移脚本路径建议：`sql/v2.1_attendance_migration.sql`，参照 `sql/v2.0_migration.sql` 的 `IF NOT EXISTS` 幂等风格。

```sql
-- ============================================
-- 考勤功能模块 v2.1 - 数据库迁移脚本
-- 执行时间: 2026-06-29
-- 变更内容: 新增 2 张考勤相关表（免审批版）
-- ============================================

SET NAMES utf8mb4;

-- ============================================
-- 1. 排班日历表（简化状态制）
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_schedules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL COMMENT '被排班人员',
  schedule_date DATE NOT NULL COMMENT '排班日期',
  status ENUM('work','rest','biz_trip','leave') NOT NULL DEFAULT 'work' COMMENT '考勤状态: work=上班 rest=休息 biz_trip=出差 leave=请假',
  note VARCHAR(200) DEFAULT NULL COMMENT '备注',
  created_by INT UNSIGNED NOT NULL COMMENT '排班操作人(管理员)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  UNIQUE KEY uk_user_date (user_id, schedule_date),
  INDEX idx_schedule_date (schedule_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='排班日历表';

-- ============================================
-- 2. 请假申请+出差打卡表
--    leave: 日期范围申请，提交即生效
--    biz_trip: 两次独立打卡（开始/结束），不预设结束日期
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_leave_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  applicant_id INT UNSIGNED NOT NULL COMMENT '申请人',
  request_type ENUM('biz_trip','leave') NOT NULL COMMENT '申请类型: biz_trip=出差 leave=请假',

  -- 请假专用字段（biz_trip 时为 NULL）
  leave_subtype VARCHAR(20) DEFAULT NULL COMMENT '请假子类型: annual/sick/personal/marriage/other',
  start_date DATE DEFAULT NULL COMMENT '请假起始日期（仅 leave）',
  end_date DATE DEFAULT NULL COMMENT '请假结束日期（仅 leave）',
  days DECIMAL(5,1) DEFAULT NULL COMMENT '请假时长(天)，含半天（仅 leave）',

  -- 出差专用字段（leave 时为 NULL）
  trip_started_at DATETIME DEFAULT NULL COMMENT '出差开始时间（仅 biz_trip）',
  trip_ended_at DATETIME DEFAULT NULL COMMENT '出差结束时间（仅 biz_trip，NULL=出差中）',

  reason TEXT DEFAULT NULL COMMENT '申请事由/出差备注',
  status ENUM('active','cancelled','in_progress','ended') NOT NULL COMMENT '状态: active=请假生效 cancelled=已撤销 in_progress=出差中 ended=出差已结束',
  source ENUM('admin','self') NOT NULL DEFAULT 'self' COMMENT '来源: admin=管理员代录 self=员工自助',
  cancelled_at DATETIME DEFAULT NULL COMMENT '撤销时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (applicant_id) REFERENCES users(id),
  INDEX idx_applicant_status (applicant_id, status),
  INDEX idx_request_type (request_type),
  INDEX idx_date_range (start_date, end_date),
  INDEX idx_trip_status (status, trip_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='请假申请+出差打卡表';

-- ============================================
-- 迁移完成验证
-- ============================================
SELECT 'v2.1 考勤模块迁移完成!' AS message;

SELECT TABLE_NAME, TABLE_COMMENT
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('attendance_schedules','attendance_leave_requests')
ORDER BY TABLE_NAME;
```

### 2.3 现有表扩展说明

**不修改任何现有表。** 仅在 `backend/src/common/utils/constants.js` 新增错误码分区：

```javascript
// ──── 考勤 (2800-2899) ────
ATTENDANCE_SCHEDULE_CONFLICT: 2801,    // 排班冲突（同一人同一天重复排班）
ATTENDANCE_LEAVE_NOT_FOUND: 2802,      // 申请单不存在
ATTENDANCE_CANNOT_CANCEL: 2805,        // 申请已撤销不可重复撤销
ATTENDANCE_DATE_INVALID: 2806,         // 起止日期非法（结束早于开始）
ATTENDANCE_LEAVE_SUBTYPE_REQUIRED: 2810,// 请假必须指定子类型
ATTENDANCE_TRIP_ALREADY_ACTIVE: 2811,   // 已有进行中的出差
ATTENDANCE_TRIP_NOT_ACTIVE: 2812,       // 没有进行中的出差
ATTENDANCE_TRIP_CANNOT_CANCEL: 2813,    // 出差不可撤销，请使用结束打卡
```

---

## 三、后端接口设计

### 3.1 接口规范

- **请求方式**：全部 `POST` + JSON body
- **认证**：Bearer Token（`authenticate` 中间件），管理员接口追加 `requireRole('admin','superadmin')`
- **响应格式**：`{ code: 0, message: "success", data: {...} }`，HTTP 状态码始终 200
- **分页响应**：`data: { list, total, page, pageSize, totalPages }`
- **错误码**：考勤模块使用 2800-2899 分区

### 3.2 排班管理接口

#### 3.2.1 查询排班（按日/周/月）

`POST /api/attendance/schedule/list` ｜ 管理员权限

```json
// 请求
{
  "startDate": "2026-06-01",
  "endDate": "2026-06-30",
  "departmentId": 5,           // 可选，不传=全部部门
  "userId": null,              // 可选，指定人员
  "page": 1,
  "pageSize": 100
}

// 响应
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "userId": 12,
        "userName": "张三",
        "departmentName": "技术部",
        "scheduleDate": "2026-06-01",
        "status": "work",
        "note": null,
        "createdBy": 1,
        "createdAt": "2026-05-28T10:00:00.000Z"
      }
    ],
    "total": 30,
    "page": 1,
    "pageSize": 100,
    "totalPages": 1
  }
}
```

#### 3.2.2 单日排班编辑（upsert）

`POST /api/attendance/schedule/upsert` ｜ 管理员权限

```json
// 请求
{
  "userId": 12,
  "scheduleDate": "2026-06-15",
  "status": "leave",
  "note": "事假"
}

// 响应（成功）
{
  "code": 0,
  "message": "success",
  "data": { "id": 45, "updated": true }
}

// 响应（失败 - 日期冲突已由 UNIQUE KEY 拦截，service 层捕获后 upsert）
// service 层逻辑：INSERT 失败则 UPDATE
```

#### 3.2.3 批量排班

`POST /api/attendance/schedule/batch` ｜ 管理员权限

```json
// 请求
{
  "userIds": [12, 13, 14],
  "startDate": "2026-06-01",
  "endDate": "2026-06-07",
  "status": "work",
  "note": "全员上班周",
  "weekdaysOnly": true    // true=仅工作日(周一至周五)
}

// 响应
{
  "code": 0,
  "message": "success",
  "data": { "inserted": 15, "updated": 6, "total": 21 }
}
```

### 3.3 请假申请接口（免审批，提交即生效）

> 请假保留日期范围申请模式：设置起始/结束日期，提交即生效，覆盖排班状态。

#### 3.3.1 提交请假申请

`POST /api/attendance/leave/apply` ｜ 登录用户

```json
// 请求
{
  "requestType": "leave",
  "leaveSubtype": "annual",       // 必填: annual/sick/personal/marriage/other
  "startDate": "2026-07-01",
  "endDate": "2026-07-03",
  "reason": "年假出游"
}

// 响应（成功）
{ "code": 0, "message": "success", "data": { "requestId": 78, "days": 3.0, "status": "active" } }
// 响应（失败）
{ "code": 2806, "message": "结束日期不能早于起始日期", "data": null }
{ "code": 2810, "message": "请假必须指定子类型", "data": null }
```

### 3.4 出差打卡接口（两次独立操作）

> 出差拆为两次独立打卡：**出差开始**和**出差结束**，不预设结束日期。
> 出差开始后状态变为「出差中」（`in_progress`），出差结束后记录结束时间（`ended`）。
> 出差期间每日检测：无公出日志且无请假 → 标记「未提交」。

#### 3.4.1 出差开始

`POST /api/attendance/biz-trip/start` ｜ 登录用户

```json
// 请求
{
  "reason": "前往广州项目现场"       // 可选，出差备注
}

// 响应（成功）
{
  "code": 0,
  "message": "success",
  "data": {
    "requestId": 82,
    "tripStartedAt": "2026-07-01T08:00:00.000Z",
    "status": "in_progress"
  }
}

// 响应（失败 - 已有进行中的出差）
{ "code": 2811, "message": "已有进行中的出差，请先结束当前出差", "data": null }
```

#### 3.4.2 出差结束

`POST /api/attendance/biz-trip/end` ｜ 登录用户

```json
// 请求
{
  "requestId": 82,                // 可选，不传则自动结束当前进行中的出差
  "reason": "项目完成返回"         // 可选
}

// 响应（成功）
{
  "code": 0,
  "message": "success",
  "data": {
    "requestId": 82,
    "tripStartedAt": "2026-07-01T08:00:00.000Z",
    "tripEndedAt": "2026-07-05T18:00:00.000Z",
    "tripDays": 5,
    "missingDays": 1,             // 出差期间未提交公出日志的天数
    "status": "ended"
  }
}

// 响应（失败 - 无进行中的出差）
{ "code": 2812, "message": "没有进行中的出差", "data": null }
```

#### 3.4.3 出差未提交检测

> 在汇总查询和前端展示时实时计算。某日判定为「未提交」的条件：
> 1. 该日处于出差期间（`trip_started_at ≤ date ≤ trip_ended_at` 或 `trip_ended_at IS NULL`）
> 2. 该日无 `daily_reports` 记录（`status = 'approved' AND report_type != 'office'`）
> 3. 该日无 `attendance_leave_requests` 请假记录（`request_type = 'leave' AND status = 'active'`）

```sql
-- 出差未提交检测伪 SQL
SELECT d.date AS missing_date
FROM date_series(:tripStart, COALESCE(:tripEnd, CURDATE())) d
WHERE NOT EXISTS (
  SELECT 1 FROM daily_reports dr
  WHERE dr.user_id = :userId AND dr.report_date = d.date
    AND dr.status = 'approved' AND dr.report_type != 'office'
)
AND NOT EXISTS (
  SELECT 1 FROM attendance_leave_requests lr
  WHERE lr.applicant_id = :userId AND lr.request_type = 'leave'
    AND lr.status = 'active' AND d.date BETWEEN lr.start_date AND lr.end_date
)
```

### 3.5 我的申请/出差列表

`POST /api/attendance/leave/my-list` ｜ 登录用户

```json
// 请求
{
  "requestType": null,        // 可选: biz_trip/leave，不传=全部
  "status": null,             // 可选: active/cancelled/in_progress/ended
  "page": 1,
  "pageSize": 10
}

// 响应
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 82,
        "requestType": "biz_trip",
        "tripStartedAt": "2026-07-01T08:00:00.000Z",
        "tripEndedAt": null,                 // null = 出差中
        "status": "in_progress",
        "createdAt": "2026-07-01T08:00:00.000Z"
      },
      {
        "id": 78,
        "requestType": "leave",
        "leaveSubtype": "annual",
        "startDate": "2026-07-01",
        "endDate": "2026-07-03",
        "days": 3.0,
        "status": "active",
        "createdAt": "2026-06-29T09:00:00.000Z"
      }
    ],
    "total": 5, "page": 1, "pageSize": 10, "totalPages": 1
  }
}
```

### 3.6 申请/出差详情

`POST /api/attendance/leave/detail` ｜ 登录用户

```json
// 请求
{ "requestId": 82 }

// 响应（出差）
{
  "code": 0, "message": "success",
  "data": {
    "id": 82,
    "applicantId": 12,
    "applicantName": "张三",
    "departmentName": "技术部",
    "requestType": "biz_trip",
    "tripStartedAt": "2026-07-01T08:00:00.000Z",
    "tripEndedAt": null,
    "status": "in_progress",
    "missingDates": ["2026-07-03", "2026-07-04"],  // 出差期间未提交的日期
    "createdAt": "2026-07-01T08:00:00.000Z"
  }
}

// 响应（请假）
{
  "code": 0, "message": "success",
  "data": {
    "id": 78,
    "applicantId": 12,
    "applicantName": "张三",
    "departmentName": "技术部",
    "requestType": "leave",
    "leaveSubtype": "annual",
    "startDate": "2026-07-01",
    "endDate": "2026-07-03",
    "days": 3.0,
    "reason": "年假出游",
    "status": "active",
    "source": "self",
    "createdAt": "2026-06-29T09:00:00.000Z"
  }
}
```

### 3.7 撤销申请

`POST /api/attendance/leave/cancel` ｜ 申请人本人（仅请假可用，出差用结束打卡）

```json
// 请求
{ "requestId": 78 }
// 响应（成功）
{ "code": 0, "message": "success", "data": { "cancelledAt": "2026-06-29T10:00:00.000Z" } }
// 响应（失败）
{ "code": 2805, "message": "申请已撤销不可重复撤销", "data": null }
{ "code": 2813, "message": "出差请使用结束打卡，不可撤销", "data": null }
```

### 3.5 考勤汇总接口

#### 3.5.1 汇总查询

`POST /api/attendance/summary/list` ｜ 管理员权限

```json
// 请求
{
  "startDate": "2026-06-01",
  "endDate": "2026-06-30",
  "departmentId": null,    // 可选
  "userId": null,          // 可选，指定人员
  "page": 1,
  "pageSize": 50
}

// 响应
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "userId": 12,
        "userName": "张三",
        "departmentName": "技术部",
        "workDays": 18,        // 排班上班天数
        "restDays": 4,         // 排班休息天数
        "bizTripDays": 3.0,    // 出差天数（公出日志已通过 + 排班出差）
        "leaveDays": 2.0,      // 请假天数（公出日志请假 + 排班请假）
        "missingDays": 1       // 出差期间未提交天数
      }
    ],
    "total": 30, "page": 1, "pageSize": 50, "totalPages": 1
  }
}
```

#### 3.5.2 导出（参照 `需求/work/2026年5月技术工程中心公出加班统计表.xlsx` 模板）

`POST /api/attendance/summary/export` ｜ 管理员权限

**请求**（同 3.5.1，不含分页）：

```json
{
  "startDate": "2026-05-01",
  "endDate": "2026-05-31",
  "departmentId": null,
  "userId": null,
  "format": "xlsx"
}
```

**响应**：返回文件流，文件名格式 `{年}年{月}月技术工程中心公出加班统计表.xlsx`（按 `startDate` 所在年月生成）

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="2026年5月技术工程中心公出加班统计表.xlsx"
```

**导出文件结构（双 Sheet，严格参照模板）**：

##### Sheet 1：公出原始记录

| 元素 | 规格 |
|------|------|
| 总列数 | 人员数 × 4（每人 3 数据列 + 1 空分隔列） |
| 列宽 | 循环 `[12, 25, 10, 1]`（出差时间/出差地/状态/分隔） |
| R1 标题 | 合并整行，文本 `{year}年{month}月技术工程中心公出加班统计表`，白字 14px 加粗，蓝底 `#2B579A` |
| R2 姓名行 | 每人合并 3 列（第 4 列留空），姓名加粗，淡蓝底 `#D6E4F0`，居中 |
| R3 表头 | 每人循环 `出差时间`/`出差地`/`状态`/`（空）`，白字加粗，深蓝底 `#4472C4`，居中 |
| R4+ 记录 | 每人按日期向下排，最大行数 = 选中范围内天数；空值留空；thin 边框 `#D0D0D0` |
| 状态取值 | `现场（陆）` / `在途` / `休息` / `请假`（见 4.8 状态映射） |

##### Sheet 2：加班记录统计表

| 元素 | 规格 |
|------|------|
| 列数 | 3 列（序号 / 姓名 / 加班天数） |
| 列宽 | `[6, 18, 16]` |
| R1 标题 | 合并 A1:C1，文本同 Sheet1 标题，白字蓝底 |
| R2 表头 | `序号` / `姓名` / `加班天数`，白字深蓝底 |
| R3+ 数据 | 每人 1 行，加班天数 = 当月「现场（陆）」+「在途」天数之和（排除「休息」「请假」） |

> ⚠️ **样式强制要求**：边框统一 thin `#D0D0D0`；标题行高约 22px；表头居中加粗；记录单元格居中。生成库推荐 `exceljs`（Node.js，与前端 `需求/work/技术工程中心人员公出考勤统计表生成工具.html` 同源），后端用 `exceljs` 直接产出。

**生成伪代码（service 层）**：

```javascript
const ExcelJS = require('exceljs');
const pool = require('../../common/config/database');

async function exportSummary({ startDate, endDate, departmentId, userId }) {
  const persons = await filterUsers(departmentId, userId);          // 排序后人员
  const schedules = await querySchedules(persons, startDate, endDate); // 每人每日排班状态
  const month = parseMonth(startDate);                              // "2026年5月"

  // 【关键】跨表只读引用公出日志 daily_reports，获取项目区域/工作类型/工作内容
  // 仅取已通过、未删除、非办公室类型（report_type != 'office'）的公出日志
  // 注意：status = 'approved' 与现有 report.service.js:890 导出逻辑一致
  const userIds = persons.map(p => p.id);
  const [dailyRows] = await pool.query(
    `SELECT user_id, report_date, area, today_work_type, work_content, status
       FROM daily_reports
      WHERE user_id IN (?)
        AND report_date BETWEEN ? AND ?
        AND status = 'approved'
        AND deleted_at IS NULL
        AND report_type != 'office'
      ORDER BY user_id, report_date`,
    [userIds, startDate, endDate]
  );
  // 构建 { userId_date: { area, todayWorkType, workContent } } 索引
  // 注意：area 字段含义为"项目区域"（省-市-区格式），导出"出差地"列取自此字段
  const dailyMap = {};
  dailyRows.forEach(r => {
    dailyMap[`${r.user_id}_${formatDateStr(r.report_date)}`] = {
      area: r.area,
      todayWorkType: r.today_work_type,
      workContent: r.work_content
    };
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = '技术工程中心';

  // ===== Sheet 1: 公出原始记录 =====
  const ws1 = wb.addWorksheet('公出原始记录');
  const totalCols = persons.length * 4;
  persons.forEach((_, i) => {
    [12, 25, 10, 1].forEach((w, k) => ws1.getColumn(i * 4 + k + 1).width = w);
  });

  // R1 标题
  const titleRow = ws1.addRow([`${month.monthStr}技术工程中心公出加班统计表`]);
  ws1.mergeCells(1, 1, 1, totalCols);
  applyTitleStyle(titleRow);  // 白字14px加粗 + 蓝底 #2B579A + 居中

  // R2 姓名
  const nameRowData = [];
  persons.forEach(p => nameRowData.push(p.name, '', '', ''));
  const nameRow = ws1.addRow(nameRowData);
  persons.forEach((_, idx) => ws1.mergeCells(2, idx*4+1, 2, idx*4+3));
  applyNameStyle(nameRow);    // 加粗 + 淡蓝底 #D6E4F0 + 居中

  // R3 表头
  const headerRowData = [];
  persons.forEach(() => headerRowData.push('出差时间', '出差地', '状态', ''));
  const headerRow = ws1.addRow(headerRowData);
  applyHeaderStyle(headerRow); // 白字加粗 + 深蓝底 #4472C4 + 居中

  // R4+ 记录 —— 公出日志优先，排班状态兜底
  const days = enumerateDates(startDate, endDate);
  const overtimeCounter = {};  // { userId: count } 用于 Sheet2
  persons.forEach(p => overtimeCounter[p.id] = 0);

  days.forEach(date => {
    const rowData = [];
    persons.forEach(p => {
      const dailyKey = `${p.id}_${formatDateStr(date)}`;
      const daily = dailyMap[dailyKey];                    // 公出日志记录（可能为空）
      const schedule = schedules[p.id]?.find(s => s.scheduleDate === date); // 排班记录

      // 优先级：公出日志 > 排班状态
      let displayTime = '', displayLocation = '', displayStatus = '';
      if (daily) {
        // 公出日志有记录：取 area / today_work_type / report_date
        displayTime = formatDate(date);
        displayLocation = daily.area || '';
        displayStatus = mapWorkTypeToStatus(daily.todayWorkType); // 工作（陆）→现场（陆）等
      } else if (schedule) {
        // 无公出日志：回落到排班状态
        displayTime = formatDate(date);
        displayLocation = schedule.note || '';
        displayStatus = mapScheduleStatus(schedule.status); // work→现场（陆）等
      }

      // 累计加班天数（现场（陆）+ 在途 计入）
      if (displayStatus === '现场（陆）' || displayStatus === '在途') {
        overtimeCounter[p.id]++;
      }

      rowData.push(displayTime, displayLocation, displayStatus, '');
    });
    const r = ws1.addRow(rowData);
    applyRecordStyle(r);      // thin 边框 #D0D0D0 + 居中
  });

  // ===== Sheet 2: 加班记录统计表 =====
  const ws2 = wb.addWorksheet('加班记录统计表');
  [6, 18, 16].forEach((w, i) => ws2.getColumn(i + 1).width = w);
  const sTitle = ws2.addRow([`${month.monthStr}技术工程中心公出加班统计表`]);
  ws2.mergeCells(1, 1, 1, 3); applyTitleStyle(sTitle);
  const sHeader = ws2.addRow(['序号', '姓名', '加班天数']); applyHeaderStyle(sHeader);
  persons.forEach((p, idx) => {
    const r = ws2.addRow([idx + 1, p.name, overtimeCounter[p.id]]);
    applyRecordStyle(r);
  });

  // 输出
  const buffer = await wb.xlsx.writeBuffer();
  return { buffer, filename: `${month.monthStr}技术工程中心公出加班统计表.xlsx` };
}

// 公出日志 today_work_type → 导出状态映射
function mapWorkTypeToStatus(workType) {
  switch (workType) {
    case '工作（陆）': return '现场（陆）';
    case '工作（海）': return '现场（海）';   // 海上作业独立标记（查漏修正）
    case '在途':       return '在途';
    case '待工':       return '休息';
    case '请假':       return '请假';
    default:           return workType || '';
  }
}

// 排班状态 → 导出状态映射（无公出日志时兜底）
function mapScheduleStatus(scheduleStatus) {
  switch (scheduleStatus) {
    case 'work':          return '现场（陆）';
    case 'biz_trip':      return '在途';
    case 'rest':          return '休息';
    case 'leave':         return '请假';
    default:              return '';
  }
}
```

---

## 四、业务逻辑规则

### 4.1 排班规则

```
// 伪代码：batch 排班
function batchSchedule(userIds, startDate, endDate, status, weekdaysOnly):
  dates = expandDateRange(startDate, endDate, weekdaysOnly)  // weekdaysOnly 过滤周六日
  inserted = 0; updated = 0
  for userId in userIds:
    for date in dates:
      try:
        INSERT attendance_schedules (user_id, schedule_date, status, created_by)
        inserted++
      catch DUPLICATE_KEY:   // uk_user_date 冲突
        UPDATE attendance_schedules SET status=? WHERE user_id=? AND schedule_date=?
        updated++
  return { inserted, updated, total: inserted + updated }
```

**状态枚举**：`work`(上班) / `rest`(休息) / `biz_trip`(出差) / `leave`(请假)

### 4.2 请假申请规则（免审批，提交即生效）

```
// 伪代码：提交请假申请——提交即生效，事务内覆盖排班状态
function applyLeave(applicantId, leaveSubtype, startDate, endDate, reason):
  if endDate < startDate: throw ATTENDANCE_DATE_INVALID
  if !leaveSubtype: throw ATTENDANCE_LEAVE_SUBTYPE_REQUIRED

  days = calcDays(startDate, endDate)

  BEGIN TRANSACTION
    requestId = INSERT attendance_leave_requests
      (applicant_id, request_type='leave', leave_subtype, start_date, end_date, days, reason, status='active')
    // 遍历日期范围，逐日覆盖排班状态为 leave
    for date in [startDate, endDate]:
      UPSERT attendance_schedules SET status='leave'
        WHERE user_id=applicantId AND schedule_date=date
  COMMIT

  return { requestId, days, status: 'active' }
```

### 4.3 出差打卡规则（两次独立操作）

#### 4.3.1 出差开始

```
function startBizTrip(applicantId, reason):
  // 检查是否有进行中的出差
  active = SELECT FROM attendance_leave_requests
    WHERE applicant_id=applicantId AND request_type='biz_trip' AND status='in_progress'
  if active: throw ATTENDANCE_TRIP_ALREADY_ACTIVE

  // 创建出差记录（不预设结束日期）
  INSERT attendance_leave_requests
    (applicant_id, request_type='biz_trip', trip_started_at=NOW(), status='in_progress', reason)

  return { requestId, tripStartedAt, status: 'in_progress' }
```

#### 4.3.2 出差结束 + 未提交检测

```
function endBizTrip(applicantId, requestId, reason):
  request = requestId ? getRequest(requestId) : getActiveTrip(applicantId)
  if !request || request.status != 'in_progress': throw ATTENDANCE_TRIP_NOT_ACTIVE

  // 计算未提交天数：出差期间每日查公出日志 + 请假
  missingDays = 0
  for date in [request.trip_started_at, today]:
    hasReport = queryDailyReport(applicantId, date)  // status='approved', report_type!='office'
    hasLeave = queryLeaveRequest(applicantId, date)   // status='active', date BETWEEN start/end
    if !hasReport && !hasLeave:
      missingDays++

  UPDATE attendance_leave_requests
    SET trip_ended_at=NOW(), status='ended'
    WHERE id=request.id

  return { requestId, tripEndedAt, missingDays, status: 'ended' }
```

### 4.4 撤销规则（仅请假）

```
// 出差不可撤销，使用结束打卡代替
function cancel(requestId, applicantId):
  request = getRequest(requestId)
  if request.request_type == 'biz_trip': throw ATTENDANCE_TRIP_CANNOT_CANCEL
  if request.applicant_id != applicantId: throw FORBIDDEN
  if request.status != 'active': throw ATTENDANCE_CANNOT_CANCEL

  BEGIN TRANSACTION
    UPDATE attendance_leave_requests SET status='cancelled', cancelled_at=NOW() WHERE id=requestId
    for date in [request.start_date, request.end_date]:
      UPDATE attendance_schedules SET status='work' WHERE user_id=applicantId AND schedule_date=date
  COMMIT
```

### 4.5 汇总规则（公出日志 > 排班 + 未提交检测）

```
function summary(startDate, endDate, departmentId, userId):
  users = filterUsers(departmentId, userId)
  for user in users:
    workDays = 0; restDays = 0; bizTripDays = 0; leaveDays = 0; missingDays = 0

    for date in [startDate, endDate]:
      dailyReport = queryDailyReport(user.id, date)  // 公出日志（status='approved'）
      schedule = querySchedule(user.id, date)          // 排班
      activeTrip = queryActiveTrip(user.id, date)       // 出差期间（trip_started ≤ date ≤ trip_ended/NOW）
      activeLeave = queryActiveLeave(user.id, date)     // 请假期间（date BETWEEN start/end, status='active'）

      // 优先级：公出日志 > 排班
      if dailyReport:
        status = mapWorkTypeToStatus(dailyReport.today_work_type)
      else if schedule:
        status = mapScheduleStatus(schedule.status)
      else:
        continue

      // 累计统计
      switch status:
        case '现场（陆）': workDays++
        case '在途':       bizTripDays++
        case '休息':       restDays++
        case '请假':       leaveDays++

      // 出差未提交检测：处于出差中 + 无公出日志 + 无请假
      if activeTrip && !dailyReport && !activeLeave:
        missingDays++

    result.push({ userId, workDays, restDays, bizTripDays, leaveDays })
  return result
```

> ⚠️ 汇总统计基于全局覆盖逻辑：公出日志（`daily_reports`，`status='approved'`）优先于排班状态。导出/汇总/前端展示三处统一此优先级。无审批流程，无"审批中"天数。

### 4.5 考勤状态判定逻辑（全局统一）

考勤状态判定在**导出 Excel、汇总查询、前端展示**三处统一按以下优先级：

**数据源优先级**：
1. **公出日志 `daily_reports`**（`status='approved'`，最高优先级）—— 取 `area`（项目区域）、`today_work_type`（状态映射源）、`work_content`（工作内容）
2. **排班 `attendance_schedules`**（兜底）—— 已含出差/请假申请覆盖
3. **空值** —— 既无公出日志也无排班，留空

**公出日志字段说明**：

| `daily_reports` 字段 | 含义 | 导出/展示映射 |
|---------------------|------|-------------|
| `report_date` | 报告日期 | → 出差时间 |
| `area` | **项目区域**（省-市-区格式，如"广东省-深圳市-南山区"） | → 导出"出差地"列 |
| `today_work_type` | 工作类型 | → 状态（经映射） |
| `work_content` | 工作内容 | → 可选扩展列 |

> ⚠️ `area` 字段含义为"项目区域"（员工填报公出日志时选择的省-市-区），**非"出差地"**。系统无独立"出差地"字段，导出"出差地"列实际取自 `area`（项目区域）。

**`today_work_type` → 状态映射**（当前 5 项，无调休）：

| `daily_reports.today_work_type` | 导出展示状态 | 计入加班天数 |
|-------------------------------|-------------|------------|
| `工作（陆）` | `现场（陆）` | ✅ 计入 |
| `工作（海）` | `现场（海）` | ✅ 计入（海上作业独立标记） |
| `在途` | `在途` | ✅ 计入 |
| `待工` | `休息` | ❌ 不计入 |
| `请假` | `请假` | ❌ 不计入 |

**排班状态兜底映射**（无公出日志时）：

| `attendance_schedules.status` | 导出展示状态 | 计入加班天数 |
|------------------------------|-------------|------------|
| `work` | `现场（陆）` | ✅ 计入 |
| `biz_trip` | `在途` | ✅ 计入 |
| `rest` | `休息` | ❌ 不计入 |
| `leave` | `请假` | ❌ 不计入 |

**出差未提交标识**：处于出差期间 + 该日无公出日志 + 无请假 → 状态列显示 `未提交`（红色高亮），不计入任何统计。

**加班天数计算公式**：`overtimeDays = count(现场（陆）) + count(现场（海）) + count(在途)`

**公出日志查询 SQL**（参数化，跨表只读，`status = 'approved'` 与现有 `report.service.js:890` 一致）：

```sql
SELECT user_id, report_date, area, today_work_type, work_content, status
  FROM daily_reports
 WHERE user_id IN (?, ?, ...)
   AND report_date BETWEEN ? AND ?
   AND status = 'approved'
   AND deleted_at IS NULL
   AND report_type != 'office'
 ORDER BY user_id, report_date
```

> ⚠️ **只读约束**：考勤模块仅 `SELECT` 读取 `daily_reports`，禁止 `INSERT`/`UPDATE`/`DELETE`，不修改日报系统任何数据。公出日志记录优先于排班状态，确保导出/汇总/展示反映员工实际填报的公出情况。

---

## 五、代码归属与目录结构

### 5.1 后端目录

```
backend/src/features/attendance/          ← 新建，data-agent 主管
├── routes/
│   └── attendance.routes.js              ← 路由层（仅分发+中间件）
├── controllers/
│   ├── schedule.controller.js            ← 排班
│   ├── leave.controller.js               ← 出差/请假申请（免审批）
│   └── summary.controller.js             ← 汇总
└── services/
    ├── schedule.service.js
    ├── leave.service.js                  ← 含申请覆盖排班 + 撤销恢复逻辑
    └── summary.service.js
```

### 5.2 路由挂载

`backend/src/app.js` 增加一行：

```javascript
const attendanceRoutes = require('./features/attendance/routes/attendance.routes');
// ...
app.use('/api/attendance', attendanceRoutes);
```

### 5.3 错误码分区

`backend/src/common/utils/constants.js` 在消息分区后新增：

```javascript
// ──── 考勤 (2800-2899) ────
ATTENDANCE_SCHEDULE_CONFLICT: 2801,
ATTENDANCE_LEAVE_NOT_FOUND: 2802,
ATTENDANCE_CANNOT_CANCEL: 2805,
ATTENDANCE_DATE_INVALID: 2806,
ATTENDANCE_LEAVE_SUBTYPE_REQUIRED: 2810,
```

### 5.4 前端 webapp

```
webapp/src/api/attendance.ts              ← 新建，API 定义
webapp/src/views/attendance/              ← 新建
├── index.vue                             ← 考勤管理入口
├── Schedule.vue                          ← 排班日历管理（日/周/月+批量）
└── Summary.vue                           ← 考勤汇总与导出
```

### 5.5 前端 miniapp

```
miniapp/src/pages/attendance/             ← 新建
├── my-schedule/index.vue                 ← 我的排班（日历视图）
├── leave-apply/index.vue                 ← 出差/请假申请（提交即生效）
├── leave-list/index.vue                  ← 我的申请列表
├── leave-detail/index.vue                ← 申请详情
└── leave-summary/index.vue               ← 个人考勤汇总

miniapp/src/services/modules/attendance.js  ← 新建，API 封装
```

### 5.6 Agent 归属

| 代码范围 | 归属 Agent | 说明 |
|---------|-----------|------|
| `backend/src/features/attendance/**` | data-agent | 考勤模块全部后端代码 |
| `webapp/src/views/attendance/**` + `api/attendance.ts` | webapp-core-agent | Web 考勤页面 |
| `miniapp/src/pages/attendance/**` + `services/modules/attendance.js` | miniapp-core-agent | 小程序考勤页面 |
| `backend/src/common/utils/constants.js` | common-agent | 错误码分区新增 |

> ⚠️ 跨 Agent 修改由 orchestrator 协调，遵循 R40 Agent 边界铁律。

---

## 六、验收标准

### 6.1 排班管理

- [ ] 管理员可在 Web 后台按日/周/月查看排班日历
- [ ] 单日排班编辑支持 4 种状态（work/rest/biz_trip/leave）
- [ ] 批量排班支持人员范围 + 日期范围 + 仅工作日选项
- [ ] 同一人同一天重复排班执行 upsert（INSERT 失败转 UPDATE）
- [ ] 非管理员调用排班接口返回 403

### 6.2 出差/请假申请（免审批）

- [ ] 起始日期和结束日期必填，结束日期早于起始日期返回 2806
- [ ] 请假类型必须指定子类型（annual/sick/personal/marriage/other）
- [ ] 自动计算天数（含半天精度）
- [ ] 提交即生效（status='active'），事务内同步覆盖 attendance_schedules 排班状态
- [ ] 小程序可查看我的申请列表和详情
- [ ] 申请人可撤销 active 状态的申请，撤销后恢复排班状态
- [ ] 已撤销的申请不可重复撤销（返回 2805）

### 6.3 考勤汇总

- [ ] 支持按时间段、部门、人员筛选
- [ ] 统计排班（work/rest）+ 出差 + 请假天数
- [ ] **汇总/导出/前端展示均按公出日志 > 排班优先级判定**（全局统一覆盖逻辑）
- [ ] 支持 xlsx 导出
- [ ] **导出文件双 Sheet 结构**：Sheet1 公出原始记录（每人员 4 列：日期/地点/状态/分隔）+ Sheet2 加班记录统计表（序号/姓名/加班天数）
- [ ] 导出文件名格式：`{年}年{月}月技术工程中心公出加班统计表.xlsx`
- [ ] Sheet1 R1 标题合并整行（白字蓝底 `#2B579A`），R2 姓名合并 3 列（淡蓝底 `#D6E4F0`），R3 表头（白字深蓝底 `#4472C4`）
- [ ] 列宽循环 `[12, 25, 10, 1]`，边框 thin `#D0D0D0`
- [ ] 状态映射正确：`work→现场（陆）`、`biz_trip→在途`、`rest→休息`、`leave→请假`
- [ ] **公出日志 today_work_type 映射正确**：`工作（陆）→现场（陆）`、`工作（海）→现场（海）`、`在途→在途`、`待工→休息`、`请假→请假`（无调休）
- [ ] **导出时跨表只读引用 `daily_reports` 公出日志**，获取项目区域（`area`）、工作类型（`today_work_type`）、工作内容（`work_content`）
- [ ] 公出日志记录优先于排班状态——某日有公出日志则取其 area/today_work_type，无则回落到排班状态映射
- [ ] 公出日志查询条件：`status = 'approved' AND deleted_at IS NULL AND report_type != 'office'`（与现有 report.service.js:890 一致）
- [ ] 公出日志仅 SELECT 读取，禁止 INSERT/UPDATE/DELETE（不修改日报系统）
- [ ] **area 字段为"项目区域"（省-市-区格式），导出"出差地"列取自此字段**（非独立出差地字段）
- [ ] 加班天数 = `现场（陆）` + `现场（海）` + `在途` 天数之和
- [ ] 导出格式严格参照 `需求/work/2026年5月技术工程中心公出加班统计表.xlsx` 模板

### 6.4 通用约束

- [ ] SQL 全部参数化查询（`pool.execute()` / `pool.query()`）
- [ ] 接口统一响应 `{code,message,data}`
- [ ] 无 `console.log` / `debugger` 残留
- [ ] webapp 提交前 `npm run type-check` 通过
- [ ] 小程序使用 rpx 单位，主题色 `#2B6DE8`
- [ ] 不修改任何现有表结构
- [ ] 不修改 `daily_reports` 日报系统

---

## 七、实施里程碑

| 阶段 | 内容 | 依赖 | 归属 Agent |
|------|------|------|-----------|
| P1 基础 | 执行 DDL 迁移脚本（2 张表） + constants.js 新增 2800-2899 | 无 | common-agent / data-agent |
| P2 排班 | schedule 接口（list/upsert/batch） + webapp 排班日历管理页 + miniapp 我的排班页 | P1 | data-agent / webapp-core-agent / miniapp-core-agent |
| P3 申请 | leave.service（apply/my-list/detail/cancel，免审批+覆盖排班） + miniapp 申请/撤销流程 | P1 | data-agent / miniapp-core-agent |
| P4 汇总 | summary.service（list/export，导出格式参照 `需求/work/2026年5月技术工程中心公出加班统计表.xlsx` 模板，双 Sheet + exceljs 生成 + 公出日志全局覆盖） + webapp 汇总页 + 导出 | P2 + P3 | data-agent / webapp-core-agent |

> P2 与 P3 可并行开发（均仅依赖 P1）。P4 依赖 P2+P3 完成。

---

## 八、对照现有模块查漏（2026-06-29 v2.0 已修正）

### ✅ 已修正

**1. 调休已从系统删除（已同步 PRD）**

git 提交 `be4b230`（"删除日报(office)+调休"）已完成核心删除：
- 前端 `report-edit/index.vue:489`：workTypes 现为 `['工作（陆）','工作（海）','待工','在途','请假']`（无调休）
- 后端 `report.service.js:382`：不再按请假处理调休

**PRD 已同步修正**：
- `attendance_schedules.status` ENUM 删除 `compensatory`（仅 4 项：work/rest/biz_trip/leave）
- 所有映射表删除"调休"行
- today_work_type 映射仅 5 项（无调休）

**2. 独立审批引擎重复造轮子（已彻底移除审批）**

v2.0 已彻底移除审批流程——删除 `attendance_approval_nodes`、`attendance_approval_transfers`、`dept_approval_config` 三张表及全部审批接口/逻辑。出差/请假改为"提交即生效"，不再有任何审批引擎。

**3. 导出 SQL status 过滤（已修正）**

原 PRD 用 `status != 'draft'`，现有系统 `report.service.js:890` 导出用 `status = 'approved'`。

**已修正**：PRD 导出 SQL 统一改为 `status = 'approved'`（与现有系统一致），避免审核中/驳回日志污染导出。

**4. 工作海映射（已修正）**

**已修正**：`工作（海）` 映射为独立的 `现场（海）`，而非并入 `现场（陆）`。海上和陆上是不同工作环境，应区分展示。

**5. area 字段语义（已澄清）**

`daily_reports.area` 含义为"项目区域"（省-市-区格式，如"广东省-深圳市-南山区"），**非"出差地"**。系统无独立"出差地"字段。

**已修正**：PRD 4.5 节明确说明导出"出差地"列实际取自 `area`（项目区域字段），并在字段映射表中标注语义。

### 🟡 建议（未改）

**6. 排班粒度**：`user_id × date` 对固定排班冗余，未来可加一张默认规则表 + 当前表仅存例外。当前简化状态制已足够满足需求。
