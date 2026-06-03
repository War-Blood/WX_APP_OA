'use strict';

const { ErrorCode } = require('./constants');

/**
 * 成功响应
 * @param {*} [data=null] - 响应数据
 * @param {string} [message='success'] - 成功消息
 * @returns {Object} 统一成功响应格式
 */
function success(data = null, message = 'success') {
  return { code: ErrorCode.SUCCESS, message, data };
}

/**
 * 失败/错误响应
 * @param {number} code - 业务状态码
 * @param {string} message - 错误描述
 * @param {*} [data=null] - 附加数据
 * @returns {Object} 统一失败响应格式
 */
function fail(code, message, data = null) {
  return { code, message, data };
}

/**
 * 分页响应
 * @param {Array} list - 数据列表
 * @param {number} total - 总记录数
 * @param {number} page - 当前页码
 * @param {number} pageSize - 每页条数
 * @returns {Object} 统一分页响应格式
 */
function paginated(list, total, page, pageSize) {
  return {
    code: ErrorCode.SUCCESS,
    message: 'success',
    data: {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 0,
    },
  };
}

module.exports = { success, fail, paginated };
