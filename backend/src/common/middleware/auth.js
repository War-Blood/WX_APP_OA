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
      'SELECT status, role FROM users WHERE id = ? AND deleted_at IS NULL',
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

/**
 * 权限缓存（角色 code → Set<权限 code>）
 * TTL 5 分钟，权限变更后主动清除
 */
const permissionCache = new Map();

function clearPermissionCache(roleCode) {
  if (roleCode) {
    permissionCache.delete(roleCode);
  } else {
    permissionCache.clear();
  }
}

/**
 * 加载角色权限集合
 */
async function loadPermissions(roleCode) {
  if (permissionCache.has(roleCode)) {
    const { perms, expiry } = permissionCache.get(roleCode);
    if (Date.now() < expiry) return perms;
    permissionCache.delete(roleCode);
  }

  const rows = await db.query(
    `SELECT p.code
     FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN roles r ON r.id = rp.role_id
     WHERE r.code = ? AND r.status = 'active' AND r.deleted_at IS NULL`,
    [roleCode]
  );

  const perms = new Set(rows.map(r => r.code));
  permissionCache.set(roleCode, { perms, expiry: Date.now() + 5 * 60 * 1000 });
  return perms;
}

/**
 * 权限鉴权中间件
 * 验证当前用户是否拥有指定权限（通过角色-权限表查询）
 * @param  {...string} permissions - 需要的权限标识，如 'user:create'
 *
 * @example
 *   router.post('/admin/users', authenticate, requirePermission('user:create'), controller.create);
 */
function requirePermission(...permissions) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthError('未认证，请先登录');
      }

      if (req.user.role === 'superadmin') {
        return next();
      }

      const userPerms = await loadPermissions(req.user.role);

      const missing = permissions.filter(p => !userPerms.has(p));
      if (missing.length > 0) {
        throw new ForbiddenError(`无权限执行此操作 (需要: ${missing.join(', ')})`);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { authenticate, requireRole, requirePermission, clearPermissionCache };
