'use strict';

const winston = require('winston');
const path = require('path');
const config = require('../config/env');

/**
 * 自定义日志格式：时间戳 + 级别 + 模块名 + 消息
 */
const logFormat = winston.format.printf(({ timestamp, level, message, module, ...meta }) => {
  const moduleStr = module ? `[${module}]` : '[APP]';
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}] ${moduleStr} ${message}${metaStr}`;
});

/**
 * Winston 日志实例
 * - 控制台输出（开发环境带颜色）
 * - 错误日志文件（error.log）
 * - 综合日志文件（combined.log）
 */
const isSilent = config.logLevel === 'silent';
const logger = winston.createLogger({
  silent: isSilent,
  level: isSilent ? 'silent' : (config.logLevel || 'info'),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // 控制台输出 — 开发环境带颜色
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(config.logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        logFormat
      ),
    }),
    // 综合日志文件
    new winston.transports.File({
      filename: path.join(config.logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 30,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        logFormat
      ),
    }),
  ],
});

/**
 * 请求日志中间件
 * 在每个请求上挂载 req.logger（带请求追踪信息）
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  // 为当前请求创建带上下文的日志器
  req.logger = {
    info: (msg, meta = {}) => logger.info(msg, { ...meta, requestId: req.id, url: req.originalUrl, method: req.method }),
    warn: (msg, meta = {}) => logger.warn(msg, { ...meta, requestId: req.id, url: req.originalUrl, method: req.method }),
    error: (msg, meta = {}) => logger.error(msg, { ...meta, requestId: req.id, url: req.originalUrl, method: req.method }),
    debug: (msg, meta = {}) => logger.debug(msg, { ...meta, requestId: req.id, url: req.originalUrl, method: req.method }),
  };

  // 请求进入日志
  logger.info(`${req.method} ${req.originalUrl}`, {
    module: 'HTTP',
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // 响应完成日志
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      module: 'HTTP',
      duration: `${duration}ms`,
      statusCode: res.statusCode,
    });
  });

  next();
}

module.exports = logger;
module.exports.requestLogger = requestLogger;
