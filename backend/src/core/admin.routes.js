'use strict';

const router = require('express').Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, requireRole } = require('../../common/middleware/auth');

/**
 * 管理员路由
 * POST /api/admin/users        - 用户列表（需 admin/superadmin）
 * POST /api/admin/setAdmin     - 设置管理员角色
 * POST /api/admin/toggleUser   - 启用/禁用用户
 * POST /api/admin/createUser   - 预注册用户（openid + 基本信息）
 * POST /api/admin/approveUser  - 审核通过 pending 用户
 * POST /api/admin/setPassword  - 为用户设置密码
 */
router.post('/admin/users', authenticate, requireRole('admin', 'superadmin'), adminController.userList);
router.post('/admin/setAdmin', authenticate, requireRole('admin', 'superadmin'), adminController.setAdmin);
router.post('/admin/toggleUser', authenticate, requireRole('admin', 'superadmin'), adminController.toggleUser);
router.post('/admin/createUser', authenticate, requireRole('admin', 'superadmin'), adminController.createUser);
router.post('/admin/approveUser', authenticate, requireRole('admin', 'superadmin'), adminController.approveUser);
router.post('/admin/inviteUser', authenticate, requireRole('admin', 'superadmin'), adminController.inviteUser);
router.post('/admin/setPassword', authenticate, requireRole('admin', 'superadmin'), adminController.setPassword);
router.post('/admin/deleteUser', authenticate, requireRole('admin', 'superadmin'), adminController.deleteUser);

module.exports = router;
