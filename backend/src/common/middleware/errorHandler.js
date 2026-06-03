'use strict';

const logger = require('../utils/logger');
const { fail } = require('../utils/response');
const { AppError } = require('../utils/errors');
const config = require('../config/env');

/**
 * 全局错误处理中间件
 * 所有错误统一返回 HTTP 200，通过 body.code 区分成功/失败
 */
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    if (err.httpStatus >= 500) {
      logger.error('服务器内部错误', { module: 'APP', error: err.message, stack: err.stack, url: req.originalUrl, method: req.method, code: err.code });
    } else {
      logger.warn(`请求错误 [${err.code}] ${err.message}`, { module: 'APP', url: req.originalUrl, method: req.method, code: err.code });
    }
    res.status(200).json(fail(err.code, err.message, err.data || null));
  } else {
    logger.error('未捕获的服务器错误', { module: 'APP', error: err.message, stack: err.stack, url: req.originalUrl, method: req.method });
    const message = config.isProd ? '服务器内部错误' : err.message || '服务器内部错误';
    res.status(200).json(fail(500, message, null));
  }
}

module.exports = errorHandler;
