'use strict';

/**
 * 错误码枚举
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │  编码分区规范（新增错误码前必须查阅，禁止与已有编码重复）   │
 * │──────────────────────────────────────────────────────────│
 * │  0:          SUCCESS (统一成功)                           │
 * │  1000-1099:  系统级 — 参数校验/资源/内部错误               │
 * │  1100-1199:  认证 — 登录/JWT/TOTP/QYWX                   │
 * │  1200-1299:  用户 — 账号状态/个人信息                      │
 * │  2000-2099:  日报 — 提交/代填/草稿/审核/删除               │
 * │  2100-2199:  审批 — 审批操作/状态流转                      │
 * │  2200-2299:  审核 — 项目审核/合规审核                      │
 * │  2300-2399:  管理 — 人员/部门/角色/花名册/密码             │
 * │  2400-2499:  邀请码 — CDK 生成/核销                        │
 * │  2500-2599:  统计 — 统计查询/参数                          │
 * │  2600-2699:  WPS — 外部对接                                │
 * │  2700-2799:  消息 — 通知/推送                              │
 * │  9001:       BUSINESS_ERROR (通用兜底，逐步废弃)           │
 * └──────────────────────────────────────────────────────────┘
 *
 * 使用方式：
 *   1. 服务层抛错:
 *      throw new BusinessError('xxx', null, ErrorCode.REPORT_ALREADY_SUBMITTED)
 *   2. 控制器直接返回:
 *      res.json({ code: ErrorCode.REPORT_SUBSTITUTED, message: '...' })
 *   3. 新增编码前先 grep/阅读本文件确认不重复，然后追加到对应分区末尾
 *
 * @readonly
 * @enum {number}
 */
const ErrorCode = {
  // ──── 通用 ────
  SUCCESS: 0,

  // ──── 系统级 (1000-1099) ────
  VALIDATION_ERROR: 1001,
  NOT_FOUND: 1002,
  AUTH_ERROR: 1003,                 // Token 无效/过期/未提供

  // ──── 认证 (1100-1199) ────
  AUTH_WECHAT_FAILED: 1101,
  AUTH_ACCOUNT_DELETED: 1102,
  AUTH_ACCOUNT_NOT_REGISTERED: 1103,
  AUTH_ACCOUNT_DISABLED: 1104,
  AUTH_ACCOUNT_PENDING: 1105,
  AUTH_LOGIN_LOCKED: 1106,
  AUTH_INVALID_CREDENTIALS: 1107,
  AUTH_NO_ADMIN_ACCESS: 1108,
  AUTH_NO_PASSWORD: 1109,
  AUTH_TOTP_REQUIRED: 1110,
  AUTH_TOTP_INVALID: 1111,
  AUTH_QYWX_NOT_CONFIGURED: 1112,
  AUTH_QYWX_FAILED: 1113,
  AUTH_QYWX_NOT_REGISTERED: 1114,
  AUTH_QYWX_ALREADY_BOUND: 1115,

  // ──── 用户 (1200-1299) ────
  USER_NOT_FOUND: 1201,
  USER_CANNOT_MODIFY_SUPERADMIN: 1202,
  USER_CANNOT_DISABLE_SUPERADMIN: 1203,
  USER_OPENID_REQUIRED: 1204,
  USER_ALREADY_REGISTERED: 1205,
  USER_NOT_PENDING: 1206,
  USER_ALREADY_ACTIVE: 1207,

  // ──── 日报 (2000-2099) ────
  REPORT_SUBSTITUTED: 2001,         // 已被他人代填（前端据此切换UI）
  REPORT_ALREADY_SUBMITTED: 2002,   // 当日已提交，禁止重复提交
  REPORT_ALREADY_REVIEWED: 2003,    // 日报已审核，禁止重复操作
  REPORT_NOT_SUPPLEMENT: 2004,      // 非补公出日志类型
  REPORT_DELETE_FORBIDDEN: 2005,    // 无权删除他人日报

  // ──── 审批 (2100-2199) ────
  APPROVAL_INVALID_ACTION: 2101,
  APPROVAL_ALREADY_PROCESSED: 2102,

  // ──── 审核 (2200-2299) ────
  REVIEW_INVALID_ACTION: 2201,
  REVIEW_REJECT_NEEDS_COMMENT: 2202,
  REVIEW_ALREADY_DONE: 2203,

  // ──── 人员管理 (2300-2399) ────
  WORKER_CODE_EXISTS: 2301,
  WORKER_NOT_FOUND: 2302,
  WORKER_NO_FIELDS: 2303,
  IMPORT_EMPTY: 2304,
  IMPORT_TOO_LARGE: 2305,
  DEPT_NOT_FOUND: 2306,
  DEPT_PARENT_NOT_FOUND: 2307,
  DEPT_SELF_PARENT: 2308,
  DEPT_HAS_CHILDREN: 2309,
  DEPT_HAS_USERS: 2310,
  ROLE_NOT_FOUND: 2311,
  ROLE_CODE_EXISTS: 2312,
  ROLE_IS_SYSTEM: 2313,
  ROLE_HAS_USERS: 2314,
  APPROVAL_TYPE_NOT_FOUND: 2315,
  PASSWORD_TOO_SHORT: 2316,
  PASSWORD_NO_ALPHANUMERIC: 2317,

  // ──── 邀请码 (2400-2499) ────
  INVITE_CODE_INVALID: 2401,
  INVITE_CODE_USED: 2402,

  // ──── 统计 (2500-2599) ────
  STATS_INVALID_SCOPE: 2501,
  STATS_USER_ID_REQUIRED: 2502,
  STATS_USER_NOT_FOUND: 2503,
  STATS_MONTH_REQUIRED: 2504,

  // ──── WPS (2600-2699) — 暂未使用 ────

  // ──── 消息推送 (2700-2799) ────
  PUSH_SCRIPT_NOT_FOUND: 2701,          // 推送脚本不存在
  PUSH_WEBHOOK_NOT_FOUND: 2702,         // 群机器人不存在
  PUSH_WEBHOOK_DISABLED: 2703,          // 群机器人已停用
  PUSH_INVALID_CRON: 2704,              // cron 表达式非法
  PUSH_INVALID_TEMPLATE: 2705,          // 模板非法（空/变量非法）
  PUSH_CONDITION_ERROR: 2706,           // 条件配置非法（空规则/未知字段）
  PUSH_SEND_FAILED: 2707,               // 发送失败（测试发送时）
  PUSH_SCRIPT_DISABLED: 2708,           // 脚本已停用（不可测试）
  PUSH_WEBHOOK_NOT_CONFIGURED: 2709,    // env 凭证缺失（未配置 .env）

  // ──── 考勤 (2800-2899) ────
  ATTENDANCE_SCHEDULE_CONFLICT: 2801,
  ATTENDANCE_LEAVE_NOT_FOUND: 2802,
  ATTENDANCE_CANNOT_CANCEL: 2805,
  ATTENDANCE_DATE_INVALID: 2806,
  ATTENDANCE_LEAVE_SUBTYPE_REQUIRED: 2810,
  ATTENDANCE_TRIP_ALREADY_ACTIVE: 2811,
  ATTENDANCE_TRIP_NOT_ACTIVE: 2812,
  ATTENDANCE_TRIP_CANNOT_CANCEL: 2813,

  // ──── 答题模块 (3000-3099) ────
  ANSWER_CATEGORY_NOT_FOUND: 3001,     // 分类不存在
  ANSWER_CATEGORY_HAS_QUESTIONS: 3002, // 分类下仍有题目/子分类, 不可删除
  ANSWER_QUESTION_NOT_FOUND: 3003,     // 题目不存在
  ANSWER_RECORD_NOT_FOUND: 3004,       // 答题记录不存在
  ANSWER_TIME_UP: 3005,                // 答题已超时
  ANSWER_SETTING_INVALID: 3006,        // 答题设置参数非法
  ANSWER_BATCH_IMPORT_ERROR: 3007,     // 批量导入数据格式错误
  ANSWER_PAPER_NOT_FOUND: 3008,        // 试卷不存在
  ANSWER_PAPER_NOT_PUBLISHED: 3009,    // 试卷未发布
  ANSWER_SCOPE_DENIED: 3010,           // 不在发放范围
  ANSWER_MAX_ATTEMPTS: 3011,           // 已达最大考试次数
  ANSWER_NOT_IN_WINDOW: 3012,          // 不在考试窗口内

  // ──── 通用兜底（逐步废弃，新代码禁止使用）────
  /** @deprecated 请使用具体模块错误码，仅用于尚未迁移的旧代码 */
  BUSINESS_ERROR: 9001,
};

/**
 * 用户角色枚举
 * @readonly
 * @enum {string}
 */
const Role = {
  EMPLOYEE: 'employee',
  ADMIN: 'admin',
  SUPER_ADMIN: 'superadmin',
};

/**
 * 用户状态枚举
 * @readonly
 * @enum {string}
 */
const UserStatus = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
};

/**
 * 审批类型（占位）
 * @readonly
 * @enum {string}
 */
const ApprovalType = {
  LEAVE: 'leave',
  EXPENSE: 'expense',
  SEAL: 'seal',
  TRAVEL: 'travel',
  PURCHASE: 'purchase',
  GENERAL: 'general',
};

/**
 * 审批状态
 * @readonly
 * @enum {string}
 */
const ApprovalStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

/**
 * 消息类型
 * @readonly
 * @enum {string}
 */
const MessageType = {
  APPROVAL: 'approval',
  SYSTEM: 'system',
  ANNOUNCEMENT: 'announcement',
};

/**
 * 分页默认值
 * @readonly
 * @enum {number}
 */
const Pagination = {
  PAGE_SIZE_DEFAULT: 10,
  PAGE_SIZE_MAX: 100,
  PAGE_DEFAULT: 1,
};

/**
 * 业务常量
 * @readonly
 */
const Business = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCK_DURATION: 30 * 60 * 1000, // 30 分钟
  CAPTCHA_EXPIRES: 5 * 60 * 1000,      // 5 分钟
};

module.exports = {
  ErrorCode,
  Role,
  UserStatus,
  ApprovalType,
  ApprovalStatus,
  MessageType,
  Pagination,
  Business,
};
