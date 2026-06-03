'use strict';

const authService = require('../services/auth.service');
const { success } = require('../../common/utils/response');
const { ValidationError } = require('../../common/utils/errors');

/**
 * 认证控制器
 * 处理登录、用户资料查询与更新的 HTTP 请求
 */

/**
 * POST /api/auth/login
 * 微信 code 登录
 */
async function login(req, res, next) {
  try {
    const { code } = req.body;

    if (!code) {
      throw new ValidationError('微信登录凭证 code 不能为空');
    }

    const result = await authService.login(code);
    res.json(success(result, '登录成功'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/user/profile
 * 获取当前用户资料
 */
async function getProfile(req, res, next) {
  try {
    const { userId } = req.user;
    const profile = await authService.getProfile(userId);
    res.json(success(profile));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/user/profile
 * 更新当前用户资料
 */
async function updateProfile(req, res, next) {
  try {
    const { userId } = req.user;
    const data = req.body;
    const profile = await authService.updateProfile(userId, data);
    res.json(success(profile, '资料更新成功'));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/admin/login
 * Web 管理员账号密码登录
 */
async function adminLogin(req, res, next) {
  try {
    const { account, password, totp } = req.body;

    if (!account) { throw new ValidationError('请输入账号'); }
    if (!password) { throw new ValidationError('请输入密码'); }

    const result = await authService.adminLogin(account, password, totp);
    res.json(success(result, '登录成功'));
  } catch (err) { next(err); }
}

/**
 * POST /api/auth/qywx-login
 * 企业微信 code 登录
 */
async function qywxLogin(req, res, next) {
  try {
    const { code } = req.body;
    if (!code) throw new ValidationError('登录凭证不能为空');

    const result = await authService.qywxLogin(code);
    res.json(success(result, '登录成功'));
  } catch (err) { next(err); }
}

/**
 * POST /api/auth/link-qywx
 * 管理员关联微信和企业微信账号
 */
async function linkQywx(req, res, next) {
  try {
    const { openid, qywxUserId } = req.body;
    if (!openid || !qywxUserId) throw new ValidationError('参数不完整');

    const result = await authService.linkQywxAccount(openid, qywxUserId);
    res.json(success(result, '关联成功'));
  } catch (err) { next(err); }
}

/**
 * POST /api/auth/totp-setup — 生成 TOTP 密钥和二维码
 */
async function totpSetup(req, res, next) {
  try {
    const result = await authService.setupTOTP(req.user.userId);
    res.json(success(result));
  } catch (err) { next(err); }
}

/**
 * POST /api/auth/totp-enable — 验证码确认后启用 TOTP
 */
async function totpEnable(req, res, next) {
  try {
    const { secret, token } = req.body;
    if (!secret || !token) throw new ValidationError('缺少密钥或验证码');
    const result = await authService.enableTOTP(req.user.userId, secret, token);
    res.json(success(result, '二次验证已开启'));
  } catch (err) { next(err); }
}

/**
 * POST /api/auth/totp-disable — 关闭 TOTP
 */
async function totpDisable(req, res, next) {
  try {
    const result = await authService.disableTOTP(req.user.userId);
    res.json(success(result, '二次验证已关闭'));
  } catch (err) { next(err); }
}

/**
 * GET /api/auth/qywx-config — 前端获取企微 corpid
 */
async function getQywxConfig(req, res, next) {
  try {
    const config = require('../../common/config/env');
    if (!config.qywx.corpId) throw new BusinessError('企业微信未配置');
    res.json(success({ corpId: config.qywx.corpId }));
  } catch (err) { next(err); }
}

/**
 * GET /api/auth/qywx-callback — 企业微信 OAuth 回调
 */
async function qywxCallback(req, res, next) {
  try {
    const { code } = req.query;
    if (!code) throw new ValidationError('缺少授权码');
    const result = await authService.qywxLogin(code);
    res.redirect(`/?token=${result.token}`); // 前端自动存入 localStorage
  } catch (err) {
    res.redirect(`/?error=${encodeURIComponent(err.message || '登录失败')}`);
  }
}

module.exports = { login, getProfile, updateProfile, adminLogin, qywxLogin, linkQywx, totpSetup, totpEnable, totpDisable, getQywxConfig, qywxCallback };
