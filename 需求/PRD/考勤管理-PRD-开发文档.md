# 考勤管理 PRD — 开发文档

> 版本: v1.0 | 日期: 2026-06-29 | 状态: 设计中
>
> 关联模块: 考勤 `attendance_schedules`、`attendance_leave_requests`、`attendance_approval_nodes`、`attendance_approval_transfers`、`dept_approval_config`
>
> 导出模板参照: `需求/work/2026年5月技术工程中心公出加班统计表.xlsx`（双 Sheet 结构）+ `需求/work/技术工程中心人员公出考勤统计表生成工具.html`（exceljs 生成逻辑源）

---

## 一、产品概述

### 1.1 功能定位

考勤功能模块为「智慧办公助手 OA 系统」新增排班、出差请假审批、考勤汇总三大能力，覆盖小程序端（员工/审批人）与 Web 后台端（管理员）。

| 角色 | 端 | 核心能力 |
|------|----|---------|
| 员工 `employee` | 小程序 `miniapp` | 查看个人排班、提交出差/请假申请、查看审批进度、查看个人考勤汇总 |
| 部门领导 / 审批人 | 小程序 `miniapp` | 审核下属出差/请假、转交审核权、查看待办 |
| 管理员 `admin` / `superadmin` | Web 后台 `webapp` | 排班日历管理（日/周/月+批量）、部门审核人配置、全公司考勤汇总与导出 |
| 管理员 | 小程序 `miniapp` | 移动端排班查看、审批代办 |

### 1.2 数据来源

**新增表（5 张，零侵入现有系统）**：

| 表名 | 用途 |
|------|------|
| `attendance_schedules` | 排班日历（简化状态制：user × date × status） |
| `attendance_leave_requests` | 出差/请假申请单 |
| `attendance_approval_nodes` | 考勤审核流节点（多级串行 + 意见 + 时间戳） |
| `attendance_approval_transfers` | 审核转交记录 |
| `dept_approval_config` | 部门默认审核人配置 |

**复用现有表**：`users`（人员）、`departments`（部门树）、`messages`（通知推送）、`daily_reports`（**只读引用**——导出/汇总时读取公出日志的出差地、工作类型、工作内容）

> ⚠️ 本模块**不修改任何现有表结构**，不修改 `approval_*` 审批引擎。考勤模块自建独立审批流，与现有审批引擎并行运作。
>
> ⚠️ 关于 `daily_reports`：考勤模块**只读取不写入**——审批通过后不回写日报（保持日报系统独立），但导出考勤汇总时**读取公出日志**获取出差地（`area`）、工作类型（`today_work_type`）、工作内容（`work_content`），作为 Sheet1「出差地」「状态」列的数据源。

### 1.3 设计原则

1. **独立审批表**：考勤出差/请假审批使用自建 `attendance_approval_nodes`，采用多级串行审核（审批链终点为部门经理，部门经理通过即整单通过），支持转交，不依赖现有 `approval_instances`
2. **不回写日报**：审批通过后不修改 `daily_reports`，模块边界清晰、零风险
3. **只读引用公出日志**：导出/汇总时跨表读取 `daily_reports`（只 SELECT 不 UPDATE），获取出差地与工作类型，公出日志记录优先于排班状态
4. **零侵入**：仅新增表、新增 `features/attendance/` 目录、新增错误码分区，不动现有代码
5. **双端覆盖**：Web 后台提供完整管理能力，小程序提供员工/审批人移动端能力

---

## 二、数据库设计

### 2.1 新增表 ER 关系

```
departments ──< dept_approval_config >── users
                                              │
users ──< attendance_schedules                │
                                              │
users ──< attendance_leave_requests >── attendance_approval_nodes ──< attendance_approval_transfers
                                              │
                                              └── users (approver_id)

【只读引用】daily_reports (user_id + report_date) → 导出/汇总时跨表读取 area/today_work_type/work_content
```

### 2.2 完整建表 SQL DDL

> 迁移脚本路径建议：`sql/v2.1_attendance_migration.sql`，参照 `sql/v2.0_migration.sql` 的 `IF NOT EXISTS` 幂等风格。

```sql
-- ============================================
-- 考勤功能模块 v2.1 - 数据库迁移脚本
-- 执行时间: 2026-06-29
-- 变更内容: 新增 5 张考勤相关表
-- ============================================

SET NAMES utf8mb4;

-- ============================================
-- 1. 排班日历表（简化状态制）
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_schedules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL COMMENT '被排班人员',
  schedule_date DATE NOT NULL COMMENT '排班日期',
  status ENUM('work','rest','biz_trip','leave','compensatory') NOT NULL DEFAULT 'work' COMMENT '考勤状态: work=上班 rest=休息 biz_trip=出差 leave=请假 compensatory=调休',
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
-- 2. 出差/请假申请单表
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_leave_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  applicant_id INT UNSIGNED NOT NULL COMMENT '申请人',
  request_type ENUM('biz_trip','leave') NOT NULL COMMENT '申请类型: biz_trip=出差 leave=请假',
  leave_subtype VARCHAR(20) DEFAULT NULL COMMENT '请假子类型: annual/sick/personal/marriage/other（仅 leave 类型使用）',
  start_date DATE NOT NULL COMMENT '起始日期',
  end_date DATE NOT NULL COMMENT '结束日期',
  days DECIMAL(5,1) NOT NULL COMMENT '时长(天)，含半天',
  reason TEXT NOT NULL COMMENT '申请事由',
  status ENUM('pending','reviewing','approved','rejected','cancelled') NOT NULL DEFAULT 'pending' COMMENT '审核状态',
  current_node_order INT UNSIGNED DEFAULT 1 COMMENT '当前审核节点序号',
  cancelled_at DATETIME DEFAULT NULL COMMENT '撤销时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (applicant_id) REFERENCES users(id),
  INDEX idx_applicant_status (applicant_id, status),
  INDEX idx_request_type (request_type),
  INDEX idx_date_range (start_date, end_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出差/请假申请单';

-- ============================================
-- 3. 考勤审核流节点表（独立审批，多级串行 + 转交）
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_approval_nodes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id INT UNSIGNED NOT NULL COMMENT '关联申请单',
  node_order INT UNSIGNED NOT NULL COMMENT '审核顺序(1=第一级)，末级通常为部门经理',
  approver_id INT UNSIGNED NOT NULL COMMENT '审核人',
  action ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' COMMENT '审核动作',
  comment TEXT DEFAULT NULL COMMENT '审核意见',
  acted_at DATETIME DEFAULT NULL COMMENT '审核时间戳',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES attendance_leave_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES users(id),
  INDEX idx_request_order (request_id, node_order),
  INDEX idx_approver_action (approver_id, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考勤审核流节点';

-- ============================================
-- 4. 审核转交记录表
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_approval_transfers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  node_id INT UNSIGNED NOT NULL COMMENT '被转交的审核节点',
  from_user_id INT UNSIGNED NOT NULL COMMENT '原审核人',
  to_user_id INT UNSIGNED NOT NULL COMMENT '新审核人',
  reason VARCHAR(200) NOT NULL COMMENT '转交原因',
  transferred_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '转交时间',
  FOREIGN KEY (node_id) REFERENCES attendance_approval_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id),
  INDEX idx_node (node_id),
  INDEX idx_from_user (from_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审核转交记录';

-- ============================================
-- 5. 部门默认审核人配置表
-- ============================================
CREATE TABLE IF NOT EXISTS dept_approval_config (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dept_id INT UNSIGNED NOT NULL COMMENT '部门',
  approval_type ENUM('biz_trip','leave') NOT NULL COMMENT '申请类型',
  approver_id INT UNSIGNED NOT NULL COMMENT '审核人',
  node_order INT UNSIGNED NOT NULL COMMENT '审核顺序(1=第一级)，末级应为部门经理',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (dept_id) REFERENCES departments(id),
  FOREIGN KEY (approver_id) REFERENCES users(id),
  UNIQUE KEY uk_dept_type_order_approver (dept_id, approval_type, node_order, approver_id),
  INDEX idx_dept_type (dept_id, approval_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='部门默认审核人配置';

-- ============================================
-- 迁移完成验证
-- ============================================
SELECT 'v2.1 考勤模块迁移完成!' AS message;

SELECT TABLE_NAME, TABLE_COMMENT
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('attendance_schedules','attendance_leave_requests','attendance_approval_nodes','attendance_approval_transfers','dept_approval_config')
ORDER BY TABLE_NAME;
```

### 2.3 现有表扩展说明

**不修改任何现有表。** 仅在 `backend/src/common/utils/constants.js` 新增错误码分区：

```javascript
// ──── 考勤 (2800-2899) ────
ATTENDANCE_SCHEDULE_CONFLICT: 2801,    // 排班冲突（同一人同一天重复排班）
ATTENDANCE_LEAVE_NOT_FOUND: 2802,      // 申请单不存在
ATTENDANCE_NOT_APPROVER: 2803,         // 当前用户无审核权限
ATTENDANCE_ALREADY_PROCESSED: 2804,    // 该节点已审核
ATTENDANCE_CANNOT_CANCEL: 2805,        // 申请单不可撤销（已通过/已驳回）
ATTENDANCE_DATE_INVALID: 2806,         // 起止日期非法（结束早于开始）
ATTENDANCE_NO_DEPT_CONFIG: 2807,       // 部门未配置审核人
ATTENDANCE_TRANSFER_SELF: 2808,        // 不可转交给自己
ATTENDANCE_TRANSFER_NOT_APPROVER: 2809,// 转交人无当前节点审核权
ATTENDANCE_LEAVE_SUBTYPE_REQUIRED: 2810,// 请假必须指定子类型
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

### 3.3 出差/请假申请接口

#### 3.3.1 提交申请

`POST /api/attendance/leave/apply` ｜ 登录用户

```json
// 请求
{
  "requestType": "leave",         // biz_trip=出差 leave=请假
  "leaveSubtype": "annual",       // 仅 leave 必填: annual/sick/personal/marriage/other
  "startDate": "2026-07-01",
  "endDate": "2026-07-03",
  "reason": "年假出游"
}

// 响应（成功）
{
  "code": 0,
  "message": "success",
  "data": {
    "requestId": 78,
    "days": 3.0,
    "status": "reviewing",
    "approvalNodes": [
      { "nodeOrder": 1, "approverId": 5, "approverName": "李经理" },
      { "nodeOrder": 2, "approverId": 8, "approverName": "王总监（部门经理）" }
    ]
  }
}

// 响应（失败 - 部门未配置审核人）
{ "code": 2807, "message": "您的部门未配置出差审核人，请联系管理员", "data": null }
```

#### 3.3.2 我的申请列表

`POST /api/attendance/leave/my-list` ｜ 登录用户

```json
// 请求
{
  "status": null,          // 可选筛选: pending/reviewing/approved/rejected/cancelled
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
        "id": 78,
        "requestType": "leave",
        "leaveSubtype": "annual",
        "startDate": "2026-07-01",
        "endDate": "2026-07-03",
        "days": 3.0,
        "status": "reviewing",
        "currentNodeOrder": 1,
        "currentApproverName": "李经理",
        "createdAt": "2026-06-29T09:00:00.000Z"
      }
    ],
    "total": 5, "page": 1, "pageSize": 10, "totalPages": 1
  }
}
```

#### 3.3.3 申请详情（含完整审核流转）

`POST /api/attendance/leave/detail` ｜ 登录用户

```json
// 请求
{ "requestId": 78 }

// 响应
{
  "code": 0,
  "message": "success",
  "data": {
    "request": {
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
      "status": "reviewing",
      "currentNodeOrder": 1,
      "createdAt": "2026-06-29T09:00:00.000Z"
    },
    "approvalNodes": [
      {
        "id": 201,
        "nodeOrder": 1,
        "approverId": 5,
        "approverName": "李经理",
        "action": "pending",
        "comment": null,
        "actedAt": null
      },
      {
        "id": 202,
        "nodeOrder": 2,
        "approverId": 8,
        "approverName": "王总监（部门经理）",
        "action": "pending",
        "comment": null,
        "actedAt": null
      }
    ],
    "transfers": []
  }
}
```

#### 3.3.4 撤销申请

`POST /api/attendance/leave/cancel` ｜ 申请人本人

```json
// 请求
{ "requestId": 78 }

// 响应（成功）
{ "code": 0, "message": "success", "data": { "cancelledAt": "2026-06-29T10:00:00.000Z" } }

// 响应（失败 - 已通过不可撤）
{ "code": 2805, "message": "已通过的申请不可撤销", "data": null }
```

#### 3.3.5 审核（通过/驳回）

`POST /api/attendance/leave/approve` ｜ 当前节点审核人

```json
// 请求
{
  "requestId": 78,
  "action": "approved",     // approved=通过 rejected=驳回
  "comment": "同意"
}

// 响应（通过 - 推进到下一级）
{
  "code": 0,
  "message": "success",
  "data": {
    "requestStatus": "reviewing",
    "nextNodeOrder": 2,
    "nextApproverName": "王总监"
  }
}

// 响应（通过 - 末级，申请单最终通过）
{
  "code": 0,
  "message": "success",
  "data": { "requestStatus": "approved", "nextNodeOrder": null }
}

// 响应（驳回 - 整单 rejected）
{
  "code": 0,
  "message": "success",
  "data": { "requestStatus": "rejected", "nextNodeOrder": null }
}

// 响应（失败 - 无审核权）
{ "code": 2803, "message": "您不是当前节点的审核人", "data": null }
```

#### 3.3.6 转交审核权

`POST /api/attendance/leave/transfer` ｜ 当前节点审核人

```json
// 请求
{
  "requestId": 78,
  "toUserId": 15,
  "reason": "出差无法及时处理"
}

// 响应（成功）
{
  "code": 0,
  "message": "success",
  "data": {
    "newApproverName": "赵主管",
    "transferredAt": "2026-06-29T11:00:00.000Z"
  }
}

// 响应（失败 - 转交给自己）
{ "code": 2808, "message": "不可转交给自己", "data": null }
```

#### 3.3.7 待我审核列表

`POST /api/attendance/leave/pending-list` ｜ 登录用户（审核人）

```json
// 请求
{
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
        "requestId": 78,
        "applicantName": "张三",
        "departmentName": "技术部",
        "requestType": "leave",
        "startDate": "2026-07-01",
        "endDate": "2026-07-03",
        "days": 3.0,
        "nodeOrder": 1,
        "submittedAt": "2026-06-29T09:00:00.000Z"
      }
    ],
    "total": 3, "page": 1, "pageSize": 10, "totalPages": 1
  }
}
```

### 3.4 部门审核人配置接口

> 归属 `core-agent`，挂载于 admin 路由。

#### 3.4.1 查询部门审核人配置

`POST /api/admin/dept-approval-config/list` ｜ 管理员权限

```json
// 请求
{
  "departmentId": 5,
  "approvalType": "leave"    // biz_trip/leave，不传=全部
}

// 响应
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "departmentId": 5,
      "departmentName": "技术部",
      "approvalType": "leave",
      "approverId": 5,
      "approverName": "李经理",
      "nodeOrder": 1
    },
    {
      "id": 2,
      "departmentId": 5,
      "departmentName": "技术部",
      "approvalType": "leave",
      "approverId": 8,
      "approverName": "王总监（部门经理）",
      "nodeOrder": 2
    }
  ]
}
```

#### 3.4.2 保存部门审核人配置

`POST /api/admin/dept-approval-config/save` ｜ 管理员权限

```json
// 请求（整体覆盖某部门某类型的配置）
{
  "departmentId": 5,
  "approvalType": "leave",
  "config": [
    { "approverId": 5, "nodeOrder": 1 },
    { "approverId": 8, "nodeOrder": 2 }
  ]
}

// 响应
{ "code": 0, "message": "success", "data": { "saved": 2 } }
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
        "bizTripDays": 3.0,    // 出差天数（已审批通过）
        "leaveDays": 2.0,      // 请假天数（已审批通过）
        "compensatoryDays": 1.0, // 调休天数
        "pendingLeaveDays": 1.0 // 审批中的请假天数
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

  // 【关键】跨表只读引用公出日志 daily_reports，获取出差地/工作类型/工作内容
  // 仅取非草稿、未删除、非办公室类型（report_type != 'office'）的公出日志
  const userIds = persons.map(p => p.id);
  const [dailyRows] = await pool.query(
    `SELECT user_id, report_date, area, today_work_type, work_content, status
       FROM daily_reports
      WHERE user_id IN (?)
        AND report_date BETWEEN ? AND ?
        AND status != 'draft'
        AND deleted_at IS NULL
        AND report_type != 'office'
      ORDER BY user_id, report_date`,
    [userIds, startDate, endDate]
  );
  // 构建 { userId_date: { area, todayWorkType, workContent } } 索引
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
    case '工作（海）': return '现场（陆）';   // 海上作业归入现场
    case '在途':       return '在途';
    case '待工':       return '休息';
    case '请假':       return '请假';
    case '调休':       return '调休';
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
    case 'compensatory':  return '调休';
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

**状态枚举**：`work`(上班) / `rest`(休息) / `biz_trip`(出差) / `leave`(请假) / `compensatory`(调休)

### 4.2 申请提交规则

```
// 伪代码：提交申请
function applyLeave(applicantId, requestType, leaveSubtype, startDate, endDate, reason):
  // 1. 校验日期
  if endDate < startDate: throw ATTENDANCE_DATE_INVALID
  if requestType == 'leave' && !leaveSubtype: throw ATTENDANCE_LEAVE_SUBTYPE_REQUIRED

  // 2. 计算天数（含半天，按自然日）
  days = calcDays(startDate, endDate)

  // 3. 查申请人部门
  deptId = getUserDept(applicantId)

  // 4. 查部门审核人配置
  configs = queryDeptApprovalConfig(deptId, requestType)
  if configs.isEmpty: throw ATTENDANCE_NO_DEPT_CONFIG

  // 5. 事务：建申请单 + 生成审核节点（多级串行）
  BEGIN TRANSACTION
    requestId = INSERT attendance_leave_requests (..., status='reviewing', current_node_order=1)
    for config in configs:
      INSERT attendance_approval_nodes (request_id, node_order, approver_id, action='pending')
  COMMIT

  // 6. 推送消息给第一级审核人（node_order 最小者）
  firstApprover = configs.filter(node_order == min(node_order)).first()
  sendMessage(firstApprover.approver_id, '您有新的考勤申请待审核', requestId)

  return { requestId, days, status: 'reviewing', approvalNodes }
```

### 4.3 审核流转状态机

```
// 状态流转
// pending(待提交) → reviewing(审核中) → approved(通过) / rejected(驳回) / cancelled(撤销)
//
// 注意：申请提交后直接进入 reviewing（首级节点已激活）
// pending 状态保留给未来"草稿"功能，当前不使用
//
// 审批链约定：末级节点为部门经理，部门经理通过 = 整单通过（无需更高级别审批）

// 伪代码：审核动作（多级串行）
function approve(requestId, approverId, action, comment):
  request = getRequest(requestId)
  if request.status != 'reviewing': throw ATTENDANCE_ALREADY_PROCESSED

  // 找到当前层级节点（current_node_order，串行模式下每级仅 1 个节点）
  currentNode = getNodeByOrder(requestId, request.current_node_order)

  // 校验当前用户是否有权审核
  if currentNode.approver_id != approverId || currentNode.action != 'pending':
    throw ATTENDANCE_NOT_APPROVER

  // 记录审核结果
  UPDATE attendance_approval_nodes SET action=?, comment=?, acted_at=NOW() WHERE id=currentNode.id

  if action == 'rejected':
    // 驳回 → 整单 rejected
    UPDATE attendance_leave_requests SET status='rejected' WHERE id=requestId
    notifyApplicant(requestId, 'rejected')
    return { requestStatus: 'rejected', nextNodeOrder: null }

  if action == 'approved':
    // 推进到下一级
    nextOrder = request.current_node_order + 1
    nextNode = getNodeByOrder(requestId, nextOrder)
    if nextNode == null:
      // 已是末级（部门经理），整单通过
      UPDATE attendance_leave_requests SET status='approved' WHERE id=requestId
      notifyApplicant(requestId, 'approved')
      return { requestStatus: 'approved', nextNodeOrder: null }
    else:
      UPDATE attendance_leave_requests SET current_node_order=nextOrder WHERE id=requestId
      sendMessage(nextNode.approver_id, '您有新的考勤申请待审核', requestId)
      return { requestStatus: 'reviewing', nextNodeOrder: nextOrder }
```

### 4.4 审核规则

- **多级串行**：按 `node_order` 从小到大逐级激活，当前级审核完成（通过）后 `current_node_order + 1`
- **审批终点**：审批链末级配置为部门经理，部门经理审核通过即整单 `approved`，无需更高级别审批
- **驳回即终止**：任一级驳回，整单立即转为 `rejected`，不再推进
- **无竞争审核**：每级仅 1 名审核人，不存在多人同时审核同一级的场景

### 4.5 转交规则

```
// 伪代码：转交
function transfer(requestId, fromUserId, toUserId, reason):
  if fromUserId == toUserId: throw ATTENDANCE_TRANSFER_SELF

  request = getRequest(requestId)
  if request.status != 'reviewing': throw ATTENDANCE_ALREADY_PROCESSED

  // 找到当前层级中 fromUserId 的待审节点
  currentNode = getNodeByOrder(requestId, request.current_node_order)
  if currentNode.approver_id != fromUserId || currentNode.action != 'pending':
    throw ATTENDANCE_TRANSFER_NOT_APPROVER

  BEGIN TRANSACTION
    // 记录转交
    INSERT attendance_approval_transfers (node_id, from_user_id, to_user_id, reason)
    // 更新节点审核人
    UPDATE attendance_approval_nodes SET approver_id=toUserId WHERE id=currentNode.id
  COMMIT

  sendMessage(toUserId, '您有转交来的考勤申请待审核', requestId)
  return { newApproverName: getUserName(toUserId), transferredAt: now() }
```

### 4.6 撤销规则

```
function cancel(requestId, applicantId):
  request = getRequest(requestId)
  if request.applicant_id != applicantId: throw FORBIDDEN
  if request.status not in ['pending','reviewing']: throw ATTENDANCE_CANNOT_CANCEL
  UPDATE attendance_leave_requests SET status='cancelled', cancelled_at=NOW() WHERE id=requestId
  // 通知当前待审人申请已撤销
  notifyCurrentApprovers(requestId, '申请已撤销')
```

### 4.7 汇总规则

```
// 伪代码：汇总统计
function summary(startDate, endDate, departmentId, userId):
  users = filterUsers(departmentId, userId)
  result = []
  for user in users:
    // 1. 排班统计：从 attendance_schedules 按 date 范围
    schedule = querySchedules(user.id, startDate, endDate)
    workDays = schedule.filter(status=='work').count
    restDays = schedule.filter(status=='rest').count

    // 2. 出差/请假统计：从 attendance_leave_requests 按 date 范围，仅 status='approved'
    approved = queryRequests(user.id, startDate, endDate, status='approved')
    bizTripDays = approved.filter(type=='biz_trip').sum(days)
    leaveDays = approved.filter(type=='leave').sum(days)

    // 3. 调休：排班 status='compensatory' 的天数
    compensatoryDays = schedule.filter(status=='compensatory').count

    // 4. 审批中：status in ['reviewing'] 的天数
    pending = queryRequests(user.id, startDate, endDate, status='reviewing')
    pendingLeaveDays = pending.filter(type=='leave').sum(days)

    result.push({ userId, workDays, restDays, bizTripDays, leaveDays, compensatoryDays, pendingLeaveDays })
  return result
```

> ⚠️ 汇总仅统计 `status='approved'` 的出差/请假记录，`reviewing` 状态单独展示为"审批中"。

### 4.8 导出状态映射（公出日志优先 + 排班兜底）

导出 Sheet1 的「出差地」「状态」列数据按以下优先级取值：

**数据源优先级**：
1. **公出日志 `daily_reports`**（最高优先级）—— 某人某天有公出日志记录时，取其 `area`（出差地）、`today_work_type`（状态映射源）、`work_content`（工作内容）
2. **排班 `attendance_schedules`**（兜底）—— 无公出日志时，按排班状态映射
3. **空值** —— 既无公出日志也无排班记录，三列均留空

**公出日志字段映射**：

| `daily_reports` 字段 | 导出列 | 说明 |
|---------------------|--------|------|
| `report_date` | 出差时间 | 格式化为日期 |
| `area` | 出差地 | 项目区域，如"广东省-广州市-天河区" |
| `today_work_type` | 状态（经映射） | 见下表映射 |
| `work_content` | （可选扩展列） | 从事工作内容 |

**`today_work_type` → 导出状态映射**：

| `daily_reports.today_work_type` | 导出展示状态 | 计入加班天数 |
|-------------------------------|-------------|------------|
| `工作（陆）` | `现场（陆）` | ✅ 计入 |
| `工作（海）` | `现场（陆）` | ✅ 计入（海上作业归入现场） |
| `在途` | `在途` | ✅ 计入 |
| `待工` | `休息` | ❌ 不计入 |
| `请假` | `请假` | ❌ 不计入 |
| `调休` | `调休` | ❌ 不计入 |

**排班状态兜底映射**（无公出日志时）：

| `attendance_schedules.status` | 导出展示状态 | 计入加班天数 |
|------------------------------|-------------|------------|
| `work` | `现场（陆）` | ✅ 计入 |
| `biz_trip` | `在途` | ✅ 计入 |
| `rest` | `休息` | ❌ 不计入 |
| `leave` | `请假` | ❌ 不计入 |
| `compensatory` | `调休` | ❌ 不计入 |

**加班天数计算公式**：`overtimeDays = count(现场（陆）) + count(在途)`

**公出日志查询 SQL**（参数化，跨表只读）：

```sql
SELECT user_id, report_date, area, today_work_type, work_content, status
  FROM daily_reports
 WHERE user_id IN (?, ?, ...)
   AND report_date BETWEEN ? AND ?
   AND status != 'draft'
   AND deleted_at IS NULL
   AND report_type != 'office'
 ORDER BY user_id, report_date
```

> ⚠️ **只读约束**：考勤模块仅 `SELECT` 读取 `daily_reports`，禁止 `INSERT`/`UPDATE`/`DELETE`，不修改日报系统任何数据。公出日志记录优先于排班状态，确保导出的出差地和工作类型反映员工实际填报的公出情况。

---

## 五、代码归属与目录结构

### 5.1 后端目录

```
backend/src/features/attendance/          ← 新建，data-agent 主管
├── routes/
│   └── attendance.routes.js              ← 路由层（仅分发+中间件）
├── controllers/
│   ├── schedule.controller.js            ← 排班
│   ├── leave.controller.js               ← 出差/请假申请
│   └── summary.controller.js             ← 汇总
└── services/
    ├── schedule.service.js
    ├── leave.service.js                  ← 含审核+转交逻辑
    └── summary.service.js
```

> `dept_approval_config` 的 CRUD 归属 `core-agent`，在 `backend/src/core/services/admin.service.js` 扩展 + `core/routes/admin.routes.js` 增加路由。

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
ATTENDANCE_NOT_APPROVER: 2803,
ATTENDANCE_ALREADY_PROCESSED: 2804,
ATTENDANCE_CANNOT_CANCEL: 2805,
ATTENDANCE_DATE_INVALID: 2806,
ATTENDANCE_NO_DEPT_CONFIG: 2807,
ATTENDANCE_TRANSFER_SELF: 2808,
ATTENDANCE_TRANSFER_NOT_APPROVER: 2809,
ATTENDANCE_LEAVE_SUBTYPE_REQUIRED: 2810,
```

### 5.4 前端 webapp

```
webapp/src/api/attendance.ts              ← 新建，API 定义
webapp/src/views/attendance/              ← 新建
├── index.vue                             ← 考勤管理入口
├── Schedule.vue                          ← 排班日历管理（日/周/月+批量）
├── Approval.vue                          ← 出差/请假审批列表
├── Summary.vue                           ← 考勤汇总与导出
└── DeptApprovalConfig.vue                ← 部门审核人配置
```

### 5.5 前端 miniapp

```
miniapp/src/pages/attendance/             ← 新建
├── my-schedule/index.vue                 ← 我的排班（日历视图）
├── leave-apply/index.vue                 ← 出差/请假申请
├── leave-list/index.vue                  ← 我的申请列表
├── leave-detail/index.vue                ← 申请详情（含审核流转）
├── leave-approve/index.vue               ← 待我审核
└── leave-summary/index.vue               ← 个人考勤汇总

miniapp/src/services/modules/attendance.js  ← 新建，API 封装
```

### 5.6 Agent 归属

| 代码范围 | 归属 Agent | 说明 |
|---------|-----------|------|
| `backend/src/features/attendance/**` | data-agent | 考勤模块全部后端代码 |
| `backend/src/core/**`（dept_approval_config） | core-agent | 部门审核人配置扩展 |
| `webapp/src/views/attendance/**` + `api/attendance.ts` | webapp-core-agent | Web 考勤页面 |
| `miniapp/src/pages/attendance/**` + `services/modules/attendance.js` | miniapp-core-agent | 小程序考勤页面 |
| `backend/src/common/utils/constants.js` | common-agent | 错误码分区新增 |

> ⚠️ 跨 Agent 修改由 orchestrator 协调，遵循 R40 Agent 边界铁律。

---

## 六、验收标准

### 6.1 排班管理

- [ ] 管理员可在 Web 后台按日/周/月查看排班日历
- [ ] 单日排班编辑支持 5 种状态（work/rest/biz_trip/leave/compensatory）
- [ ] 批量排班支持人员范围 + 日期范围 + 仅工作日选项
- [ ] 同一人同一天重复排班执行 upsert（INSERT 失败转 UPDATE）
- [ ] 非管理员调用排班接口返回 403

### 6.2 出差/请假申请

- [ ] 起始日期和结束日期必填，结束日期早于起始日期返回 2806
- [ ] 请假类型必须指定子类型（annual/sick/personal/marriage/other）
- [ ] 自动计算天数（含半天精度）
- [ ] 提交时按申请人部门配置自动生成审核节点
- [ ] 部门未配置审核人返回 2807
- [ ] 小程序可查看我的申请列表和详情

### 6.3 审核流转

- [ ] 多级串行审核按 node_order 逐级激活
- [ ] 审批链末级为部门经理，部门经理通过即整单 approved
- [ ] 任一级驳回整单 rejected，不再推进
- [ ] 每级仅 1 名审核人，无竞争/并行审核
- [ ] 审核记录含审核人、动作、意见、时间戳
- [ ] 申请详情返回完整审核流转记录
- [ ] 无审核权用户调用审核返回 2803

### 6.4 转交审核

- [ ] 当前节点审核人可转交给他人
- [ ] 转交后节点 approver_id 更新
- [ ] 转交记录写入 attendance_approval_transfers
- [ ] 新审核人收到消息通知
- [ ] 不可转交给自己（返回 2808）

### 6.5 撤销申请

- [ ] 申请人可撤销 pending/reviewing 状态的申请
- [ ] 已 approved/rejected 的申请不可撤销（返回 2805）
- [ ] 撤销后通知当前待审人

### 6.6 考勤汇总

- [ ] 支持按时间段、部门、人员筛选
- [ ] 统计排班（work/rest/compensatory）+ 出差 + 请假天数
- [ ] 出差/请假仅统计 approved，reviewing 单独展示
- [ ] 支持 xlsx 导出
- [ ] **导出文件双 Sheet 结构**：Sheet1 公出原始记录（每人员 4 列：日期/地点/状态/分隔）+ Sheet2 加班记录统计表（序号/姓名/加班天数）
- [ ] 导出文件名格式：`{年}年{月}月技术工程中心公出加班统计表.xlsx`
- [ ] Sheet1 R1 标题合并整行（白字蓝底 `#2B579A`），R2 姓名合并 3 列（淡蓝底 `#D6E4F0`），R3 表头（白字深蓝底 `#4472C4`）
- [ ] 列宽循环 `[12, 25, 10, 1]`，边框 thin `#D0D0D0`
- [ ] 状态映射正确：`work→现场（陆）`、`biz_trip→在途`、`rest→休息`、`leave→请假`、`compensatory→调休`
- [ ] 已通过的请假/出差申请覆盖当日排班状态（请假申请优先于排班）
- [ ] 加班天数 = `现场（陆）` + `在途` 天数之和
- [ ] 导出格式严格参照 `需求/work/2026年5月技术工程中心公出加班统计表.xlsx` 模板
- [ ] **导出时跨表只读引用 `daily_reports` 公出日志**，获取出差地（`area`）、工作类型（`today_work_type`）、工作内容（`work_content`）
- [ ] 公出日志记录优先于排班状态——某日有公出日志则取其 area/today_work_type，无则回落到排班状态映射
- [ ] 公出日志查询条件：`status != 'draft' AND deleted_at IS NULL AND report_type != 'office'`
- [ ] 公出日志仅 SELECT 读取，禁止 INSERT/UPDATE/DELETE（不修改日报系统）
- [ ] `today_work_type` 映射正确：`工作（陆）→现场（陆）`、`工作（海）→现场（陆）`、`在途→在途`、`待工→休息`、`请假→请假`、`调休→调休`

### 6.7 部门审核人配置

- [ ] 管理员可按部门 × 类型查询审核人配置
- [ ] 支持多级审核人 + 顺序配置
- [ ] 末级审核人应配置为部门经理
- [ ] 保存时整体覆盖该部门该类型的配置

### 6.8 通用约束

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
| P1 基础 | 执行 DDL 迁移脚本（5 张表） + constants.js 新增 2800-2899 + dept_approval_config 接口 + admin 配置页 | 无 | common-agent / core-agent / webapp-admin-agent |
| P2 排班 | schedule 接口（list/upsert/batch） + webapp 排班日历管理页 + miniapp 我的排班页 | P1 | data-agent / webapp-core-agent / miniapp-core-agent |
| P3 申请 | leave.service（apply/my-list/detail/cancel/approve/transfer/pending-list） + miniapp 申请/审核全流程 | P1 | data-agent / miniapp-core-agent |
| P4 汇总 | summary.service（list/export，导出格式参照 `需求/work/2026年5月技术工程中心公出加班统计表.xlsx` 模板，双 Sheet + exceljs 生成） + webapp 汇总页 + 导出 | P2 + P3 | data-agent / webapp-core-agent |

> P2 与 P3 可并行开发（均仅依赖 P1）。P4 依赖 P2+P3 完成。

---

## 八、对照现有模块查漏（2026-06-29）

### 🔴 必须修正

**1. 调休已从系统删除**

项目刚完成"前后端全删调休"（`be4b230`），`todayWorkType` 枚举已不含调休。PRD 以下位置需同步：

| 行 | 原内容 | 建议 |
|:--:|------|------|
| DDL 86 | `ENUM(...,'compensatory')` | 删除 `compensatory` |
| 823 | `case '调休': return '调休'` | 删除该分支 |
| 834 | `case 'compensatory': return '调休'` | 删除该分支 |

**2. 独立审批引擎重复造轮子**

PRD 设计了 3 张新审批表，但现有 `approval_instances` + `approval_flow_nodes` + `approval.service.js` 已完整实现多级串行审批（逐级流转、驳回终止、事务、抄送）。两套审批系统功能重叠。

建议：复用现有 `approval_*` 体系。
- 在 `approval_types` 插入 `leave`/`travel` 记录即可
- 申请调 `approval.service.create()`，审核调 `approval.service.approve()`
- 仅保留 `dept_approval_config` 表（现有系统无部门默认审核人配置）
- P3 阶段后端代码量可降低约 60%

### 🟡 建议

**3. 导出 SQL 漏 status 过滤**（行 718）：`AND status != 'draft'` 应为 `AND status = 'approved'`，避免审核中/驳回日志污染导出。

**4. 排班粒度**：`user_id × date` 对固定排班冗余，可加一张默认规则表 + 当前表仅存例外。

**5. 映射 `工作（海）→现场（陆）`**：建议独立为 `现场（海）`，海上和陆上是不同工作环境。

### 🟢 OK

- 错误码 2800-2899 未占用 ✅
- 目录 `features/attendance/` 与现有 `features/compliance/` 一致 ✅
- Agent 归属 data-agent 合理 ✅
