'use strict';

const db = require('../config/database');
const redis = require('../config/redis');
const { success } = require('../utils/response');
const config = require('../config/env');

/**
 * 健康检查控制器
 * 检查 DB + Redis 连接状态
 * GET /api/health
 */
async function check(req, res, next) {
  try {
    const checks = {};

    // 检查 OA 数据库连接
    const dbStart = Date.now();
    const dbOk = await db.ping();
    checks.database = {
      status: dbOk ? 'ok' : 'error',
      responseTime: `${Date.now() - dbStart}ms`,
    };

    // 检查 Redis 连接
    const redisStart = Date.now();
    const redisOk = await redis.ping();
    checks.redis = {
      status: redisOk ? 'ok' : 'error',
      responseTime: `${Date.now() - redisStart}ms`,
    };

    const allOk = dbOk && redisOk;

    const result = {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      checks,
    };

    // 如果服务降级，返回 503
    if (!allOk) {
      res.status(503);
    }

    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

module.exports = { check };
