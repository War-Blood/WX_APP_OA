'use strict';

/**
 * 错误码枚举
 * @readonly
 * @enum {number}
 */
const ErrorCode = {
  SUCCESS: 0,
  AUTH_ERROR: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 1001,
  NOT_FOUND: 1002,
  BUSINESS_ERROR: 2001,
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
