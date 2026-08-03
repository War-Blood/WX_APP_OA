'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../../common/config/database');
const config = require('../../common/config/env');
const { BusinessError, ValidationError } = require('../../common/utils/errors');
const logger = require('../../common/utils/logger');
const { code2session } = require('../../common/utils/wx-api');
const { nextWorkerCode } = require('../../common/utils/worker-code');

/**
 * CDK 邀请码服务
 * 处理邀请码生成与兑换
 */

/**
 * 生成随机8位字母数字码
 * @returns {string}
 */
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * 批量生成邀请码
 * @param {number} count - 生成数量（1-100）
 * @param {number} createdBy - 创建者 userId
 * @returns {Promise<{codes: string[]}>}
 */
async function generateInviteCodes(count, createdBy) {
  if (!count || count < 1) count = 1;
  if (count > 100) throw new ValidationError('单次最多生成100个邀请码');

  const codes = [];
  // 去重循环生成
  while (codes.length < count) {
    const code = generateCode();
    const existing = await db.query('SELECT id FROM invite_codes WHERE code = ?', [code]);
    if (existing.length === 0) {
      codes.push(code);
    }
  }

  // 批量 INSERT
  const placeholders = codes.map(() => '(?, ?, NOW())').join(', ');
  const values = [];
  for (const code of codes) {
    values.push(code, createdBy);
  }
  await db.execute(
    `INSERT INTO invite_codes (code, created_by, created_at) VALUES ${placeholders}`,
    values
  );

  logger.info('邀请码批量生成', { module: 'INVITE', count, createdBy });

  return { codes };
}

/**
 * 兑换邀请码
 * @param {string} code - 邀请码
 * @param {string} name - 用户昵称
 * @param {string} [wxCode] - 微信 uni.login 登录凭证（可选，用于绑定真实 openid）
 * @returns {Promise<{token: string, user: Object}>}
 */
async function redeemInviteCode(code, name, wxCode) {
  if (!code || !code.trim()) throw new ValidationError('邀请码不能为空');
  if (!name || !name.trim()) throw new ValidationError('昵称不能为空');

  const trimmedCode = code.trim().toUpperCase();
  const trimmedName = name.trim();

  // 1. 查找邀请码
  const codes = await db.query(
    'SELECT * FROM invite_codes WHERE code = ?',
    [trimmedCode]
  );

  if (codes.length === 0) {
    throw new BusinessError('邀请码无效');
  }

  const inviteCode = codes[0];

  if (inviteCode.used_by !== null) {
    throw new BusinessError('该邀请码已被使用');
  }

  // 2. 生成 openid：优先用 wxCode 换取真实微信 openid，失败时兜底用 cdk_ 前缀
  let openid = 'cdk_' + trimmedCode;
  if (wxCode) {
    try {
      openid = await code2session(wxCode);
      // 校验该真实 openid 是否已被其他账号使用（uk_openid 唯一约束兜底）
      const occupied = await db.query(
        'SELECT id FROM users WHERE openid = ? AND deleted_at IS NULL',
        [openid]
      );
      if (occupied.length > 0) {
        throw new BusinessError('该微信已注册，请直接登录');
      }
    } catch (err) {
      // 业务校验错误（微信已注册等）直接抛出；接口/网络异常则回退 cdk_ 前缀
      if (err instanceof BusinessError && err.message === '该微信已注册，请直接登录') {
        throw err;
      }
      logger.warn('邀请码兑换绑定微信 openid 失败，回退 cdk_ 前缀', { module: 'INVITE', error: err.message });
    }
  }

  // 3. 生成工号并插入新用户
  const workerCode = await nextWorkerCode('employee');
  const result = await db.execute(
    `INSERT INTO users (openid, user_name, nickname, role, worker_code, status, created_at)
     VALUES (?, ?, ?, 'employee', ?, 'active', NOW())`,
    [openid, trimmedName, trimmedName, workerCode]
  );

  const userId = result[0].insertId;

  // 4. 标记邀请码已使用
  await db.execute(
    'UPDATE invite_codes SET used_by = ?, used_at = NOW() WHERE id = ?',
    [userId, inviteCode.id]
  );

  // 5. 生成 JWT
  const token = jwt.sign(
    { userId, openid, role: 'employee' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  // 更新最后登录时间
  await db.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [userId]);

  // 记录操作日志
  await db.execute(
    `INSERT INTO operation_logs (user_id, action, module, target_type, target_id, detail, created_at)
     VALUES (?, 'redeem', 'AUTH', 'invite_code', ?, 'CDK邀请码兑换注册', NOW())`,
    [userId, String(inviteCode.id)]
  );

  logger.info('CDK 兑换成功', { module: 'INVITE', userId, code: trimmedCode });

  return {
    token,
    user: {
      id: userId,
      nickname: trimmedName,
      avatar_url: null,
      role: 'employee',
      department: null,
      status: 'active',
      needsWechatBind: openid.startsWith('cdk_'),
    },
  };
}

module.exports = { generateInviteCodes, redeemInviteCode };
