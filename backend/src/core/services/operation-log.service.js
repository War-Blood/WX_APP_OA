'use strict';

const db = require('../../common/config/database');

/**
 * 操作日志查询服务
 */
async function list({ page = 1, pageSize = 20, keyword, module: moduleFilter, action, startDate, endDate }) {
  const conditions = [];
  const params = [];

  if (keyword) {
    conditions.push('(u.nickname LIKE ? OR u.user_name LIKE ? OR ol.detail LIKE ? OR ol.module LIKE ? OR ol.action LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw, kw);
  }
  if (moduleFilter) {
    conditions.push('ol.module = ?');
    params.push(moduleFilter);
  }
  if (action) {
    conditions.push('ol.action = ?');
    params.push(action);
  }
  if (startDate) {
    conditions.push('ol.created_at >= ?');
    params.push(`${startDate} 00:00:00`);
  }
  if (endDate) {
    conditions.push('ol.created_at <= ?');
    params.push(`${endDate} 23:59:59`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  const countRows = await db.query(
    `SELECT COUNT(*) AS total
     FROM operation_logs ol
     LEFT JOIN users u ON ol.user_id = u.id
     ${where}`,
    params
  );
  const rows = await db.query(
    `SELECT ol.id, ol.user_id, ol.action, ol.module, ol.target_id, ol.target_type,
            ol.detail, ol.ip_address, ol.user_agent, ol.created_at,
            u.user_name AS userName, u.nickname AS nickName
     FROM operation_logs ol
     LEFT JOIN users u ON ol.user_id = u.id
     ${where}
     ORDER BY ol.created_at DESC, ol.id DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(pageSize), offset]
  );

  const list = rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    userName: row.nickName || row.userName || '',
    action: row.action || '',
    module: row.module || '',
    targetId: row.target_id,
    targetType: row.target_type || '',
    detail: row.detail || '',
    ipAddress: row.ip_address || '',
    userAgent: row.user_agent || '',
    createdAt: row.created_at,
  }));

  return {
    list,
    total: countRows[0].total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    totalPages: Math.ceil(countRows[0].total / parseInt(pageSize)) || 0,
  };
}

module.exports = { list };
