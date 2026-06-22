'use strict';

const { ErrorCode } = require('./constants');

/**
 * 应用错误基类
 * 所有自定义错误继承此类
 */
class AppError extends Error {
  /**
   * @param {number} httpStatus - HTTP 状态码
   * @param {number} code - 业务错误码
   * @param {string} message - 错误描述
   * @param {*} [data=null] - 附加数据
   */
  constructor(httpStatus, code, message, data = null) {
    super(message);
    this.name = this.constructor.name;
    this.httpStatus = httpStatus;
    this.code = code;
    this.data = data;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 参数校验错误（400）
 */
class ValidationError extends AppError {
  /**
   * @param {string} [message='请求参数校验失败'] - 错误描述
   * @param {*} [data=null] - 附加数据
   */
  constructor(message = '请求参数校验失败', data = null) {
    super(400, ErrorCode.VALIDATION_ERROR, message, data);
  }
}

/**
 * 认证错误（401）
 */
class AuthError extends AppError {
  /**
   * @param {string} [message='未授权访问'] - 错误描述
   * @param {*} [data=null] - 附加数据
   */
  constructor(message = '未授权访问', data = null) {
    super(401, ErrorCode.AUTH_ERROR, message, data);
  }
}

/**
 * 权限错误（403）
 */
class ForbiddenError extends AppError {
  /**
   * @param {string} [message='无权限访问'] - 错误描述
   * @param {*} [data=null] - 附加数据
   */
  constructor(message = '无权限访问', data = null) {
    super(403, ErrorCode.FORBIDDEN, message, data);
  }
}

/**
 * 资源不存在错误（404）
 */
class NotFoundError extends AppError {
  /**
   * @param {string} [message='资源不存在'] - 错误描述
   * @param {*} [data=null] - 附加数据
   */
  constructor(message = '资源不存在', data = null) {
    super(404, ErrorCode.NOT_FOUND, message, data);
  }
}

/**
 * 业务逻辑错误（200）
 */
class BusinessError extends AppError {
  /**
   * @param {string} [message='业务逻辑错误'] - 错误描述
   * @param {*} [data=null] - 附加数据
   * @param {number|null} [code=null] - 自定义错误码（不传则用 BUSINESS_ERROR 兜底码 9001）
   */
  constructor(message = '业务逻辑错误', data = null, code = null) {
    super(200, code || ErrorCode.BUSINESS_ERROR, message, data);
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  BusinessError,
};
