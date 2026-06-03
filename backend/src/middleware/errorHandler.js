'use strict';

const logger = require('../utils/logger');
const { fail } = require('../utils/response');
const { AppError } = require('../utils/errors');
const config = require('../config/env');

/**
 * 全局错误处理中间件
 * 必须包含 4 个参数以被 Express 识别为错误处理中间件
 */
function errorHandler(err, req, res, next) {
  // 1. 区分自定义错误 vs 未知错误
  if (err instanceof AppError) {
    // 服务器端错误（5xx 类）记录完整堆栈
    if (err.httpStatus >= 500) {
      logger.error('服务器内部错误', {
        module: 'APP',
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        code: err.code,
      });
    } else {
      // 客户端错误（4xx 类）记录简要信息
      logger.warn(`请求错误 [${err.code}] ${err.message}`, {
        module: 'APP',
        url: req.originalUrl,
        method: req.method,
        code: err.code,
      });
    }

    // 返回标准错误响应
    res.status(err.httpStatus).json(fail(err.code, err.message, err.data || null));
  } else {
    // 2. 未知错误 — 生产环境不暴露详情
    logger.error('未捕获的服务器错误', {
      module: 'APP',
      error: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });

    const message = config.isProd
      ? '服务器内部错误，请稍后重试'
      : err.message || '服务器内部错误，请稍后重试';

    res.status(500).json(fail(500, message, null));
  }
}

module.exports = errorHandler;
