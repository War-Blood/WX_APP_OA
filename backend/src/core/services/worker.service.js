'use strict';

const db = require('../../common/config/database');
const { BusinessError, ValidationError } = require('../../common/utils/errors');
const logger = require('../../common/utils/logger');

/**
 * 花名册服务 — 外场人员 CRUD（统一 action 入口）
 * 所有操作通过统一入口 distribute() 分发，前端调用 POST /api/admin/workers
 */

/**
 * 分页查询花名册
 * @param {Object} params
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页条数
 * @param {string} [params.keyword] - 按姓名或工号模糊搜索
 * @returns {Promise<{total: number, list: Array}>}
 */
async function list({ page = 1, pageSize = 20, keyword, fieldWorkerOnly }) {
  // 只查询在职人员
  const conditions = ['u.deleted_at IS NULL', "u.worker_status = 'active'"];
  const params = [];

  // 小程序选人时只看作业人员
  if (fieldWorkerOnly) {
    conditions.push('u.is_field_worker = 1');
  }

  if (keyword) {
    conditions.push('(u.nickname LIKE ? OR u.user_name LIKE ? OR u.worker_code LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // 总数
  const countSql = `SELECT COUNT(*) AS total FROM users u ${whereClause}`;
  const countRows = await db.query(countSql, params);
  const total = countRows[0].total;

  // 分页数据：关联查询累计日志数
  const offset = (page - 1) * pageSize;
  const dataSql = `
    SELECT
      u.id AS userId,
      COALESCE(u.nickname, u.user_name, '') AS userName,
      u.worker_code AS workerCode,
      u.entry_date AS entryDate,
      u.worker_status AS workerStatus,
      u.is_field_worker AS isFieldWorker,
      (
        SELECT COUNT(*) FROM daily_reports dr
        WHERE dr.user_id = u.id
           OR dr.id IN (SELECT drw.report_id FROM daily_report_workers drw WHERE drw.worker_uid = u.id)
      ) AS totalLogs
    FROM users u
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const rows = await db.query(dataSql, [...params, pageSize, offset]);

  const list = rows.map(row => ({
    userId: row.userId,
    userName: row.userName,
    workerCode: row.workerCode || '',
    entryDate: row.entryDate ? formatDate(row.entryDate) : '',
    workerStatus: row.workerStatus || 'active',
    isFieldWorker: !!row.isFieldWorker,
    totalLogs: Number(row.totalLogs) || 0,
  }));

  return { total, list };
}

/**
 * 新增外场人员
 * @param {Object} params
 * @param {string} params.userName - 姓名
 * @param {string} params.workerCode - 工号
 * @param {string} params.entryDate - 入场日期 (YYYY-MM-DD)
 * @returns {Promise<{userId: number}>}
 */
async function create({ userName, workerCode, entryDate }) {
  if (!userName || !userName.trim()) {
    throw new ValidationError('姓名不能为空');
  }
  if (!workerCode || !workerCode.trim()) {
    throw new ValidationError('工号不能为空');
  }
  if (!entryDate) {
    throw new ValidationError('入场日期不能为空');
  }

  // 检查工号是否已存在
  const existing = await db.query(
    'SELECT id FROM users WHERE worker_code = ? AND deleted_at IS NULL',
    [workerCode.trim()]
  );
  if (existing.length > 0) {
    throw new BusinessError('工号已存在');
  }

  const result = await db.execute(
    `INSERT INTO users (user_name, nickname, worker_code, entry_date, worker_status, role, status, created_at)
     VALUES (?, ?, ?, ?, 'active', 'employee', 'active', NOW())`,
    [userName.trim(), userName.trim(), workerCode.trim(), entryDate]
  );

  const userId = result[0].insertId;
  logger.info('花名册新增人员', { module: 'WORKER', userId, userName, workerCode });

  return { userId };
}

/**
 * 编辑人员信息
 * @param {Object} params
 * @param {number} params.userId - 用户 ID
 * @param {string} [params.userName] - 姓名
 * @param {string} [params.entryDate] - 入场日期
 * @returns {Promise<Object>}
 */
async function update({ userId, userName, entryDate }) {
  if (!userId) {
    throw new ValidationError('userId 不能为空');
  }

  const users = await db.query(
    'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL',
    [userId]
  );
  if (users.length === 0) {
    throw new BusinessError('人员不存在');
  }

  const updates = [];
  const params = [];

  if (userName !== undefined && userName.trim()) {
    updates.push('user_name = ?, nickname = ?');
    params.push(userName.trim(), userName.trim());
  }
  if (entryDate !== undefined) {
    updates.push('entry_date = ?');
    params.push(entryDate);
  }

  if (updates.length === 0) {
    throw new BusinessError('没有需要更新的字段');
  }

  params.push(userId);
  await db.execute(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  logger.info('花名册更新人员', { module: 'WORKER', userId });
  return { userId };
}

/**
 * 切换人员状态（在职 / 离职）
 * @param {Object} params
 * @param {number} params.userId - 用户 ID
 * @param {string} params.status - 'active' | 'inactive'
 * @returns {Promise<Object>}
 */
async function toggle({ userId, status }) {
  if (!userId) {
    throw new ValidationError('userId 不能为空');
  }
  if (!['active', 'inactive'].includes(status)) {
    throw new ValidationError('状态值无效，仅支持 active 或 inactive');
  }

  const users = await db.query(
    'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL',
    [userId]
  );
  if (users.length === 0) {
    throw new BusinessError('人员不存在');
  }

  await db.execute(
    'UPDATE users SET worker_status = ? WHERE id = ?',
    [status, userId]
  );

  logger.info('花名册切换状态', { module: 'WORKER', userId, status });
  return { userId, workerStatus: status };
}

/**
 * 软删除人员
 * @param {Object} params
 * @param {number} params.userId - 用户 ID
 * @returns {Promise<Object>}
 */
async function deleteWorker({ userId }) {
  if (!userId) {
    throw new ValidationError('userId 不能为空');
  }

  const users = await db.query(
    'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL',
    [userId]
  );
  if (users.length === 0) {
    throw new BusinessError('人员不存在');
  }

  await db.execute(
    'UPDATE users SET deleted_at = NOW() WHERE id = ?',
    [userId]
  );

  logger.info('花名册删除人员', { module: 'WORKER', userId });
  return { userId, deleted: true };
}

/**
 * 统一入口分发
 * @param {string} action - 操作类型: list | create | update | toggle | delete
 * @param {Object} data - 操作参数
 * @returns {Promise<Object>}
 */
async function dispatch(action, data) {
  switch (action) {
    case 'list':
      return list(data);
    case 'create':
      return create(data);
    case 'update':
      return update(data);
    case 'toggle':
      return toggle(data);
    case 'toggleFieldWorker':
      return toggleFieldWorker(data);
    case 'generateCodes':
      return generateCodes();
    case 'delete':
      return deleteWorker(data);
    default:
      throw new ValidationError(`不支持的操作: ${action}`);
  }
}

/**
 * 切换作业人员标记
 */
async function toggleFieldWorker({ userId }) {
  const rows = await db.query('SELECT id, is_field_worker FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
  if (rows.length === 0) throw new BusinessError('人员不存在');

  const newVal = rows[0].is_field_worker ? 0 : 1;
  await db.execute('UPDATE users SET is_field_worker = ?, updated_at = NOW() WHERE id = ?', [newVal, userId]);
  return { isFieldWorker: !!newVal };
}

function formatDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/**
 * 自动生成工号（对所有无工号的在职用户）
 */
async function generateCodes() {
  const users = await db.query(
    "SELECT id, role FROM users WHERE (worker_code IS NULL OR worker_code = '') AND deleted_at IS NULL AND worker_status = 'active' ORDER BY role, id"
  );
  let adminIdx = 1, empIdx = 1;
  for (const u of users) {
    const prefix = u.role === 'admin' || u.role === 'superadmin' ? 'ADM' : 'BL';
    const idx = u.role === 'admin' || u.role === 'superadmin' ? adminIdx++ : empIdx++;
    const code = prefix + String(idx).padStart(3, '0');
    await db.execute('UPDATE users SET worker_code = ?, updated_at = NOW() WHERE id = ?', [code, u.id]);
  }
  return { generated: users.length };
}

module.exports = { dispatch, list, create, update, toggle, toggleFieldWorker, generateCodes, deleteWorker };
