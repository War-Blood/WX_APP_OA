'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../../common/utils/logger');

const ERROR_LOG_DIR = path.resolve(__dirname, '../../../logs/client-errors');
const MAX_LOG_FILES = 7;

/**
 * 客户端错误上报服务
 * 将小程序/前端的错误写入日志文件，同时通过 logger 输出
 */
exports.report = async ({ message, stack, url, component, userId, extra, ip, userAgent }) => {
  // 1. 通过 logger 输出
  logger.warn('[CLIENT-ERROR]', {
    message,
    url,
    component,
    userId,
    ip,
    userAgent,
  });

  // 2. 写入错误日志文件
  if (!fs.existsSync(ERROR_LOG_DIR)) {
    fs.mkdirSync(ERROR_LOG_DIR, { recursive: true });
  }

  const date = new Date().toISOString().slice(0, 10);
  const logFile = path.join(ERROR_LOG_DIR, `${date}.log`);
  const timestamp = new Date().toISOString();

  const logEntry = [
    `--- ${timestamp} ---`,
    `Message: ${message || '(no message)'}`,
    `URL: ${url || '(unknown)'}`,
    `Component: ${component || '(unknown)'}`,
    `UserID: ${userId || '(anonymous)'}`,
    `IP: ${ip || '(unknown)'}`,
    `UA: ${userAgent || '(unknown)'}`,
  ];

  if (stack) logEntry.push(`Stack:\n${stack}`);
  if (extra) logEntry.push(`Extra: ${JSON.stringify(extra)}`);
  logEntry.push('');

  fs.appendFileSync(logFile, logEntry.join('\n'), 'utf-8');
};
