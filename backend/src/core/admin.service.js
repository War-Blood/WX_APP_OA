'use strict';

const bcrypt = require('bcryptjs');
const db = require('../../common/config/database');
const { BusinessError } = require('../../common/utils/errors');
const logger = require('../../common/utils/logger');

/**
 * 管理员服务 — 用户管理
 */

/**
 * 获取用户列表（带分页和筛选）
 */
async function getUserList({ page = 1, pageSize = 20, keyword, role, department, status }) {
  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (keyword) {
    conditions.push('(nickname LIKE ? OR user_name LIKE ? OR department LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (role) {
    conditions.push('role = ?');
    params.push(role);
  }
  if (department) {
    conditions.push('department = ?');
    params.push(department);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // 总数
  const countSql = `SELECT COUNT(*) AS total FROM users ${whereClause}`;
  const countRows = await db.query(countSql, params);
  const total = countRows[0].total;

  // 分页数据
  const offset = (page - 1) * pageSize;
  const dataSql = `SELECT id, openid, nickname, user_name, email, phone,
    avatar_url, role, department, position, status, last_login_at, created_at
    FROM users ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?`;

  const listParams = [...params, pageSize, offset];
  const rows = await db.query(dataSql, listParams);

  // 格式化输出
  const list = rows.map(row => ({
    userId: String(row.id),
    nickName: row.nickname || row.user_name || '未知',
    userName: row.user_name,
    avatarUrl: row.avatar_url || '',
    role: row.role,
    department: row.department || '',
    position: row.position || '',
    phone: row.phone || '',
    email: row.email || '',
    status: row.status,
    lastLoginTime: row.last_login_at ? formatDate(row.last_login_at) : '',
    createdAt: row.created_at ? formatDate(row.created_at) : ''
  }));

  return { total, page, pageSize, list };
}

/**
 * 设置用户角色
 */
async function setAdminRole(userId, role) {
  // 检查用户是否存在
  const users = await db.query('SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
  if (users.length === 0) {
    throw new BusinessError('用户不存在');
  }

  if (users[0].role === 'superadmin') {
    throw new BusinessError('不能修改超级管理员角色');
  }

  await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

  logger.info('管理员角色变更', { module: 'ADMIN', userId, newRole: role });
  return { userId: String(userId), role };
}

/**
 * 启用/禁用用户
 */
async function toggleUserStatus(userId, status) {
  const users = await db.query('SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
  if (users.length === 0) {
    throw new BusinessError('用户不存在');
  }

  if (users[0].role === 'superadmin') {
    throw new BusinessError('不能禁用超级管理员');
  }

  await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, userId]);

  logger.info('用户状态变更', { module: 'ADMIN', userId, status });
  return { userId: String(userId), status };
}

/**
 * 管理员预注册用户（通过 openid）
 * 创建 pending 状态用户，需管理员审核通过后才能登录
 */
async function createUser({ openid, userName, department, role }) {
  if (!openid || !openid.trim()) {
    throw new BusinessError('微信 OpenID 不能为空');
  }

  // 检查 openid 是否已存在
  const existing = await db.query('SELECT id FROM users WHERE openid = ?', [openid]);
  if (existing.length > 0) {
    throw new BusinessError('该微信账号已注册，请勿重复添加');
  }

  const result = await db.execute(
    `INSERT INTO users (openid, user_name, nickname, department, role, status, created_at) 
     VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
    [openid.trim(), userName || null, userName || null, department || null, role || 'employee']
  );

  logger.info('管理员预注册用户', { module: 'ADMIN', openid, userId: result[0].insertId });

  return {
    userId: String(result[0].insertId),
    openid,
    userName: userName || null,
    status: 'pending',
  };
}

/**
 * 管理员审核通过用户（pending → active）
 */
async function approveUser(userId) {
  const users = await db.query(
    'SELECT id, status, openid FROM users WHERE id = ? AND deleted_at IS NULL',
    [userId]
  );
  if (users.length === 0) throw new BusinessError('用户不存在');
  if (users[0].status !== 'pending') throw new BusinessError('该用户无需审核');

  // 检查是否设置了密码（可选：管理员可设密码）
  await db.execute(
    'UPDATE users SET status = ? WHERE id = ?',
    ['active', userId]
  );

  logger.info('管理员审核通过用户', { module: 'ADMIN', userId });

  return { userId: String(userId), status: 'active' };
}

/**
 * 管理员直接邀请用户（跳过审核）
 * openid → 创建 active 状态用户
 */
async function inviteUser({ openid, userName, department, role }) {
  if (!openid) throw new ValidationError('微信 ID 不能为空');
  const finalName = userName || '已邀请用户';
  const finalRole = role || 'employee';
  const finalDept = department || '';

  // 查重
  const existing = await db.query('SELECT id, status FROM users WHERE openid = ?', [openid]);
  if (existing.length > 0) {
    const u = existing[0];
    if (u.status === 'active') throw new BusinessError('该用户已是活跃状态，无需重复邀请');
    // 已存在但 disabled/pending → 直接激活
    await db.execute("UPDATE users SET status='active', role=?, department=?, user_name=? WHERE id=?",
      [finalRole, finalDept, finalName, u.id]);
    return { userId: String(u.id), status: 'active', reactivated: true };
  }

  const result = await db.execute(
    "INSERT INTO users (openid, user_name, role, department, status, created_at) VALUES (?, ?, ?, ?, 'active', NOW())",
    [openid, finalName, finalRole, finalDept]
  );

  return { userId: String(result[0].insertId), status: 'active', created: true };
}

/**
 * 管理员为用户设置密码
 */
async function setUserPassword(userId, password) {
  if (!password || password.length < 8) {
    throw new BusinessError('密码长度不能少于8位');
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new BusinessError('密码必须包含字母和数字');
  }

  const users = await db.query('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
  if (users.length === 0) throw new BusinessError('用户不存在');

  const hash = await bcrypt.hash(password, 10);
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);

  logger.info('管理员设置用户密码', { module: 'ADMIN', userId });
  return { userId: String(userId) };
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 管理员删除用户（软删除：设 deleted_at）
 * 不允许删除自己
 */
async function deleteUser(userId) {
  const users = await db.query('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
  if (users.length === 0) throw new BusinessError('用户不存在');
  await db.execute('UPDATE users SET deleted_at = NOW() WHERE id = ?', [userId]);
  logger.info('管理员删除用户', { module: 'ADMIN', userId: String(userId) });
  return { userId: String(userId), deleted: true };
}

module.exports = { getUserList, setAdminRole, toggleUserStatus, createUser, approveUser, setUserPassword, inviteUser, deleteUser };
