'use strict';

const db = require('../config/database');
const logger = require('./logger');

/**
 * 工号生成工具
 * 格式: ADM001 (管理员) / BL001 (普通员工)
 */

/**
 * 为指定角色生成下一个工号
 * @param {string} role - 用户角色 ('admin' | 'superadmin' | 'employee')
 * @returns {Promise<string>} 新工号，如 'BL042'
 */
async function nextWorkerCode(role) {
  const isAdmin = role === 'admin' || role === 'superadmin';
  const prefix = isAdmin ? 'ADM' : 'BL';

  const rows = await db.query(
    `SELECT worker_code FROM users
     WHERE worker_code LIKE ? AND deleted_at IS NULL
     ORDER BY worker_code DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let nextNum = 1;
  if (rows.length > 0) {
    const match = rows[0].worker_code.match(new RegExp(`^${prefix}(\\d+)$`));
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  const code = prefix + String(nextNum).padStart(3, '0');
  logger.debug('生成工号', { module: 'WORKER-CODE', role, code });
  return code;
}

module.exports = { nextWorkerCode };
