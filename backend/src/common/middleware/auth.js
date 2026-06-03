'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../config/database');
const { AuthError, ForbiddenError } = require('../utils/errors');

/**
 * JWT 认证中间件
 * 从 Authorization 头提取并验证 Token
 * 验证通过后将 payload 挂载到 req.user
 * 同时校验用户是否仍然活跃，角色是否变更
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('未提供有效的认证令牌');
    }

    const token = authHeader.replace('Bearer ', '');

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AuthError('Token 已过期，请重新登录');
      }
      throw new AuthError('无效的 Token');
    }

    // DB 校验：检查用户状态是否仍然 active
    const rows = await db.query(
      'SELECT status, role FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!rows || rows.length === 0 || rows[0].status !== 'active') {
      throw new AuthError('账号已被禁用或不存在');
    }

    // 将 payload 挂载到 req.user
    req.user = decoded;

    // 如果 DB 中 role 与 token 中不一致，使用 DB 中的最新 role
    if (rows[0].role !== decoded.role) {
      req.user.role = rows[0].role;
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * 角色鉴权中间件工厂
 * 验证当前用户是否拥有指定角色之一
 * @param  {...string} roles - 允许的角色列表，如 'admin', 'superadmin'
 * @returns {Function} Express 中间件
 */
function requireRole(...roles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthError('未认证，请先登录');
      }

      if (!roles.includes(req.user.role)) {
        throw new ForbiddenError('无权限执行此操作');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { authenticate, requireRole };
