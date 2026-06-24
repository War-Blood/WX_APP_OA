'use strict';

const authService = require('../services/auth.service');
const captchaService = require('../services/captcha.service');
const inviteService = require('../../core/services/invite.service');
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
 * Web 管理员账号密码登录（v2.1: 需滑动验证 token）
 */
async function adminLogin(req, res, next) {
  try {
    const { account, password, totp, captchaToken } = req.body;

    if (!account) { throw new ValidationError('请输入账号'); }
    if (!password) { throw new ValidationError('请输入密码'); }

    // 滑动验证校验
    if (!captchaService.consumeToken(captchaToken)) {
      throw new ValidationError('请先完成滑动验证');
    }

    const result = await authService.adminLogin(account, password, totp);
    res.json(success(result, '登录成功'));
  } catch (err) { next(err); }
}

/**
 * POST /api/auth/account-login — 账号密码登录（小程序端）
 */
async function accountLogin(req, res, next) {
  try {
    const { account, password } = req.body;
    if (!account) throw new ValidationError('请输入账号');
    if (!password) throw new ValidationError('请输入密码');
    const result = await authService.accountLogin(account, password);
    res.json(success(result, '登录成功'));
  } catch (err) { next(err); }
}

/**
 * GET /api/auth/captcha — 获取滑动验证
 */
async function getCaptcha(req, res, next) {
  try {
    const data = captchaService.generateCaptcha();
    res.json(success(data));
  } catch (err) { next(err); }
}

/**
 * POST /api/auth/captcha/verify — 验证滑块轨迹
 */
async function verifyCaptcha(req, res, next) {
  try {
    const { captchaId, track } = req.body;
    if (!captchaId) throw new ValidationError('缺少验证ID');
    if (!Array.isArray(track)) throw new ValidationError('缺少轨迹数据');

    const result = captchaService.verifyCaptcha(captchaId, track);
    if (!result.success) {
      throw new ValidationError(result.error);
    }
    res.json(success({ token: result.token }, '验证通过'));
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
 * POST /api/auth/redeem
 * CDK 邀请码兑换注册（公开接口）
 */
async function redeemInviteCode(req, res, next) {
  try {
    const { name, code } = req.body;
    if (!code) throw new ValidationError('邀请码不能为空');
    if (!name) throw new ValidationError('昵称不能为空');

    const result = await inviteService.redeemInviteCode(code, name);
    res.json(success(result, '注册成功'));
  } catch (err) {
    next(err);
  }
}

module.exports = { login, getProfile, updateProfile, adminLogin, accountLogin, qywxLogin, linkQywx, totpSetup, totpEnable, totpDisable, getCaptcha, verifyCaptcha, redeemInviteCode };
