'use strict';

const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate, requireRole } = require('../../common/middleware/auth');

/**
 * 认证路由
 *   POST /api/auth/login         — 微信 code 登录
 *   POST /api/auth/qywx-login    — 企业微信 code 登录
 *   POST /api/auth/admin/login   — Web 管理员登录
 *   POST /api/auth/link-qywx     — 管理员关联微信和企微账号
 *   GET  /api/user/profile       — 获取用户资料（需认证）
 *   PUT  /api/user/profile       — 更新用户资料（需认证）
 */

router.post('/auth/login', authController.login);
router.post('/auth/qywx-login', authController.qywxLogin);
router.post('/auth/admin/login', authController.adminLogin);
router.post('/auth/account-login', authController.accountLogin);
router.post('/auth/redeem', authController.redeemInviteCode);
router.post('/auth/refresh-token', authenticate, authController.refreshToken);
router.post('/auth/link-qywx', authenticate, requireRole('admin', 'superadmin'), authController.linkQywx);

// 滑动验证（公开接口）
router.get('/auth/captcha', authController.getCaptcha);
router.post('/auth/captcha/verify', authController.verifyCaptcha);

// TOTP 二次验证管理（需已登录 admin）
router.post('/auth/totp-setup', authenticate, requireRole('admin', 'superadmin'), authController.totpSetup);
router.post('/auth/totp-enable', authenticate, requireRole('admin', 'superadmin'), authController.totpEnable);
router.post('/auth/totp-disable', authenticate, requireRole('admin', 'superadmin'), authController.totpDisable);

// GET /api/user/profile — 获取用户资料（需认证）
router.get('/user/profile', authenticate, authController.getProfile);

// PUT /api/user/profile — 更新用户资料（需认证）
router.put('/user/profile', authenticate, authController.updateProfile);

module.exports = router;
