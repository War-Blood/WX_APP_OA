'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { AuthError, ForbiddenError } = require('../utils/errors');

/**
 * JWT 认证中间件
 * 从 Authorization 头提取并验证 Token
 * 验证通过后将 payload 挂载到 req.user
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('未提供有效的认证令牌');
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AuthError('Token 已过期，请重新登录');
      }
      throw new AuthError('无效的 Token');
    }
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
