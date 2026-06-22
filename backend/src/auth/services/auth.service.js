'use strict';

const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../../common/config/env');
const db = require('../../common/config/database');
const { BusinessError } = require('../../common/utils/errors');
const logger = require('../../common/utils/logger');

/**
 * 认证服务
 * 处理用户登录、Token 签发、用户资料查询与更新等业务逻辑
 */

/**
 * 微信登录
 * 用 code 换取 openid，查找或创建用户，返回 JWT + 用户信息
 * @param {string} code - 微信小程序登录凭证
 * @returns {Promise<{token: string, user: Object}>}
 */
async function login(code) {
  // 1. 调用微信 API 换取 openid
  logger.info('微信登录 - 调用 code2session', { module: 'AUTH' });

  const wxResponse = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
    params: {
      appid: config.wx.appId,
      secret: config.wx.secret,
      js_code: code,
      grant_type: 'authorization_code',
    },
    timeout: 5000,
  });

  const { openid, session_key, errcode, errmsg } = wxResponse.data;

  if (!openid) {
    logger.error('微信登录失败', { module: 'AUTH', errcode, errmsg });
    throw new BusinessError('微信登录失败: ' + (errmsg || '获取 openid 失败'));
  }

  // 2. 在 users 表中查找用户
  const users = await db.query('SELECT * FROM users WHERE openid = ? AND deleted_at IS NULL', [openid]);

  // 3. 未注册 → 自动创建 pending 用户（需管理员审核）
  if (users.length === 0) {
    // 检查是否被软删除（防止自动重新注册）
    const deletedCheck = await db.query('SELECT id FROM users WHERE openid = ? AND deleted_at IS NOT NULL', [openid]);
    if (deletedCheck.length > 0) {
      throw new BusinessError('您的账号已被管理员删除，请联系管理员重新邀请后再登录');
    }

    logger.info('微信登录 - 新用户待审核', { module: 'AUTH', openid });

    const result = await db.execute(
      `INSERT INTO users (openid, user_name, role, status, created_at) VALUES (?, '待审核', 'employee', 'pending', NOW())`,
      [openid]
    );

    const newUser = {
      id: result[0].insertId,
      openid,
      role: 'employee',
      nickname: null,
      avatar_url: null,
      department: null,
      status: 'pending',
    };

    await db.execute(
      `INSERT INTO operation_logs (user_id, action, module, detail, created_at) VALUES (?, 'auto_register', 'AUTH', '新用户注册待审核', NOW())`,
      [newUser.id]
    );

    logger.info('新用户已注册待审核', { module: 'AUTH', userId: newUser.id });
    // pending 用户也返回 JWT，但前端应拦截并显示审核中
    return finalizeLogin(newUser);
  }

  const user = users[0];

  // 4. 检查账号状态
  if (user.status === 'pending') {
    logger.info('用户登录 - 账号审核中', { module: 'AUTH', userId: user.id });
    // pending 也允许登录拿 token，但前端拦截显示审核中
    return finalizeLogin(user);
  }
  if (user.status === 'disabled') {
    throw new BusinessError('您的账号已被禁用，请联系管理员');
  }

  // 5. active → 完成登录
  return finalizeLogin(user);
}

/**
 * 企业微信登录
 * 通过 wx.qy.login 获取的 code 换取 userid，查找或创建用户
 * 如果用户已通过微信注册（同 unionid），自动关联企业微信 userid
 */
async function qywxLogin(code, corpId, corpSecret) {
  if (!corpId || !corpSecret) {
    // 如果未配置企业微信参数，尝试从 config 读取
    corpId = config.qywx?.corpId;
    corpSecret = config.qywx?.secret;
    if (!corpId || !corpSecret) {
      throw new BusinessError('企业微信登录未配置，请使用微信登录');
    }
  }

  // 1. 获取企业微信 access_token
  const tokenRes = await axios.get('https://qyapi.weixin.qq.com/cgi-bin/gettoken', {
    params: { corpid: corpId, corpsecret: corpSecret },
    timeout: 5000,
  });

  if (tokenRes.data.errcode !== 0) {
    logger.error('企业微信获取 token 失败', { module: 'AUTH', errcode: tokenRes.data.errcode });
    throw new BusinessError('企业微信认证失败');
  }

  const accessToken = tokenRes.data.access_token;

  // 2. 用 code 换取 userid
  const jscodeRes = await axios.get('https://qyapi.weixin.qq.com/cgi-bin/miniprogram/jscode2session', {
    params: { access_token: accessToken, js_code: code },
    timeout: 5000,
  });

  const { userid, errcode, errmsg } = jscodeRes.data;

  if (errcode !== 0 || !userid) {
    logger.error('企业微信 code2session 失败', { module: 'AUTH', errcode, errmsg });
    throw new BusinessError('企业微信登录失败: ' + (errmsg || '无法获取用户信息'));
  }

  // 3. 查找是否已有企业微信绑定
  let users = await db.query('SELECT * FROM users WHERE qywx_userid = ? AND deleted_at IS NULL', [userid]);
  if (users.length > 0) {
    const user = users[0];
    // 非 active 用户自动激活（企微登录即信任）
    if (user.status !== 'active') {
      await db.execute("UPDATE users SET status='active' WHERE id=?", [user.id]);
      user.status = 'active';
    }
    // 白名单内自动升 admin
    if (config.qywx.adminUserIds.includes(userid) && user.role !== 'admin' && user.role !== 'superadmin') {
      await db.execute("UPDATE users SET role='admin' WHERE id=?", [user.id]);
      user.role = 'admin';
    }
    return finalizeLogin(user);
  }

  // 4. 新企业微信用户 → 自动注册 active（企微已认证身份）
  const isAdmin = config.qywx.adminUserIds.includes(userid);
  const role = isAdmin ? 'admin' : 'employee';
  logger.info('企业微信登录 - 新用户', { module: 'AUTH', userid, role });
  const result = await db.execute(
    `INSERT INTO users (openid, qywx_userid, role, status, created_at) VALUES (?, ?, ?, 'active', NOW())`,
    [userid, userid, role]
  );

  const newUser = { id: result[0].insertId, openid: userid, qywx_userid: userid, role, status: 'active' };

  await db.execute(
    `INSERT INTO operation_logs (user_id, action, module, detail, created_at) VALUES (?, 'qywx_auto_register', 'AUTH', ?, NOW())`,
    [newUser.id, isAdmin ? '企业微信新管理员自动注册' : '企业微信新用户自动注册']
  );

  return finalizeLogin(newUser);
}

async function finalizeLogin(user) {
  // 生成 JWT
  const token = jwt.sign(
    { userId: user.id, openid: user.openid, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  // 更新最后登录时间
  await db.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

  // 记录登录日志
  await db.execute(
    `INSERT INTO operation_logs (user_id, action, module, target_type, target_id, detail, created_at) 
     VALUES (?, 'login', 'AUTH', 'user', ?, '微信登录成功', NOW())`,
    [user.id, String(user.id)]
  );

  logger.info('微信登录成功', { module: 'AUTH', userId: user.id });

  return {
    token,
    user: {
      id: user.id,
      nickname: user.nickname || null,
      avatar_url: user.avatar_url || null,
      role: user.role,
      department: user.department || null,
      status: user.status,
    },
  };
}

/**
 * 获取用户资料
 * @param {number} userId - 用户 ID
 * @returns {Promise<Object>} 用户资料（排除敏感字段）
 */
async function getProfile(userId) {
  const users = await db.query('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);

  if (users.length === 0) {
    throw new BusinessError('用户不存在');
  }

  // 排除 openid 等敏感字段
  const { openid, ...profile } = users[0];
  return profile;
}

/**
 * 更新用户资料
 * 只允许更新 nickname, avatar_url, phone, email, department, position
 * @param {number} userId - 用户 ID
 * @param {Object} data - 要更新的字段
 * @returns {Promise<Object>} 更新后的用户资料
 */
async function updateProfile(userId, data) {
  const allowedFields = ['nickname', 'user_name', 'avatar_url', 'phone', 'email', 'department', 'position'];

  // 过滤出允许更新的字段
  const updates = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }
  // nickname 同步更新 user_name
  if (data.nickname && !data.user_name) {
    updates.user_name = data.nickname
  }

  if (Object.keys(updates).length === 0) {
    throw new BusinessError('没有提供要更新的字段');
  }

  // 构建动态 SET 子句
  const setClauses = Object.keys(updates).map((field) => `${field} = ?`);
  const values = Object.values(updates);

  const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`;
  values.push(userId);

  const result = await db.execute(sql, values);

  if (result[0].affectedRows === 0) {
    throw new BusinessError('用户不存在');
  }

  logger.info('用户资料已更新', { module: 'AUTH', userId, fields: Object.keys(updates) });

  // 返回更新后的完整资料
  return getProfile(userId);
}

/**
 * Web 管理员登录
 * 支持通过 用户名/邮箱 + 密码 验证身份，仅允许 admin/superadmin 角色登录
 * @param {string} account - 用户名或邮箱
 * @param {string} password - 明文密码
 * @returns {Promise<{token: string, user: Object}>}
 */
async function adminLogin(account, password, totp) {
  logger.info('Web 管理员登录', { module: 'AUTH', account });

  // 1. 查找用户（按 user_name 或 email 匹配）
  const users = await db.query(
    'SELECT * FROM users WHERE (user_name = ? OR email = ?) AND deleted_at IS NULL',
    [account, account]
  );

  if (users.length === 0) {
    logger.warn('管理员登录 - 账户不存在', { module: 'AUTH', account });
    throw new BusinessError('账户或密码错误');
  }

  const user = users[0];

  // 2. 检查角色权限（仅 admin / superadmin 可登录管理后台）
  if (!['admin', 'superadmin'].includes(user.role)) {
    logger.warn('管理员登录 - 非管理员角色', { module: 'AUTH', userId: user.id, role: user.role });
    throw new BusinessError('无管理后台访问权限');
  }

  // 3. 检查账号状态
  if (user.status !== 'active') {
    logger.warn('管理员登录 - 账号状态异常', { module: 'AUTH', userId: user.id, status: user.status });
    throw new BusinessError(user.status === 'pending' ? '账号审核中' : '账号已被禁用，请联系系统管理员');
  }

  // 4. 检查登录失败次数（最近15分钟）
  const attemptRows = await db.query(
    `SELECT COUNT(*) as cnt FROM operation_logs WHERE user_id = ? AND action = 'login_failed' AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
    [user.id]
  );
  if (attemptRows[0].cnt >= 5) {
    logger.warn('管理员登录 - 频繁失败被锁', { module: 'AUTH', userId: user.id });
    throw new BusinessError('登录失败次数过多，请15分钟后再试');
  }

  // 5. 验证密码
  if (!user.password_hash) {
    logger.warn('管理员登录 - 未设置密码', { module: 'AUTH', userId: user.id });
    throw new BusinessError('该账号未设置密码，请先通过微信小程序登录后设置');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    logger.warn('管理员登录 - 密码错误', { module: 'AUTH', userId: user.id });
    await db.execute(
      `INSERT INTO operation_logs (user_id, action, module, detail, created_at) VALUES (?, 'login_failed', 'AUTH', 'Web管理员密码错误', NOW())`,
      [user.id]
    );
    throw new BusinessError('账户或密码错误');
  }

  // 5. 如果开启了TOTP，验证6位数字码
  if (user.totp_secret) {
    const { verifySync } = require('otplib');
    if (!totp) throw new BusinessError('该账户已开启二次验证，请输入6位动态码');
    const valid = verifySync({ token: totp, secret: user.totp_secret });
    if (!valid) {
      logger.warn('管理员登录 - TOTP验证失败', { module: 'AUTH', userId: user.id });
      throw new BusinessError('动态验证码错误');
    }
  }

  // 6. 更新最后登录时间
  await db.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

  // 7. 记录操作日志
  await db.execute(
    `INSERT INTO operation_logs (user_id, action, module, detail, created_at) VALUES (?, 'login', 'AUTH', 'Web管理员登录成功', NOW())`,
    [user.id]
  );

  // 8. 生成 JWT
  const token = jwt.sign(
    { userId: user.id, openid: user.openid, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  logger.info('管理员登录成功', { module: 'AUTH', userId: user.id, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      nickname: user.nickname,
      userName: user.user_name,
      email: user.email,
      avatar_url: user.avatar_url,
      role: user.role,
      department: user.department,
      position: user.position,
    },
  };
}

/**
 * 关联微信和企业微信账号
 * 管理员将用户的微信 openid 与企业微信 userid 绑定
 */
async function linkQywxAccount(openid, qywxUserId) {
  const users = await db.query('SELECT id FROM users WHERE openid = ? AND deleted_at IS NULL', [openid]);
  if (users.length === 0) throw new BusinessError('微信用户不存在');

  // 检查企业微信 userid 是否已被绑定
  const qywxUsers = await db.query('SELECT id FROM users WHERE qywx_userid = ? AND id != ?', [qywxUserId, users[0].id]);
  if (qywxUsers.length > 0) throw new BusinessError('该企业微信账号已被其他用户绑定');

  await db.execute('UPDATE users SET qywx_userid = ? WHERE id = ?', [qywxUserId, users[0].id]);
  logger.info('企业微信账号关联成功', { module: 'AUTH', userId: users[0].id, qywxUserId });

  return { userId: String(users[0].id), qywxUserId   };
}

/**
 * 生成TOTP密钥和绑定二维码URL
 */
async function setupTOTP(userId) {
  const { generateSecret, generateURI } = require('otplib');
  const secret = generateSecret();
  const user = (await db.query('SELECT user_name,email FROM users WHERE id = ?', [userId]))[0];
  const label = user?.user_name || 'admin';
  const otpauth = generateURI({ type: 'totp', label, issuer: '智慧办公助手', secret });
  const qrUrl = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpauth)}`;
  return { secret, otpauth, qrUrl };
}

async function enableTOTP(userId, secret, token) {
  const { verifySync } = require('otplib');
  if (!verifySync({ token, secret })) {
    throw new BusinessError('动态验证码错误');
  }
  await db.execute('UPDATE users SET totp_secret = ? WHERE id = ?', [secret, userId]);
  return { enabled: true };
}

/**
 * 关闭TOTP
 */
async function disableTOTP(userId) {
  await db.execute('UPDATE users SET totp_secret = NULL WHERE id = ?', [userId]);
  return { enabled: false };
}

module.exports = { login, qywxLogin, adminLogin, getProfile, updateProfile, linkQywxAccount, setupTOTP, enableTOTP, disableTOTP };
