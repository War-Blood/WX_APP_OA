'use strict';

const db = require('../../common/config/database');
const { NotFoundError } = require('../../common/utils/errors');

/**
 * 时间格式化 — 将 created_at 转为友好显示
 * @param {string|Date} dateStr - 数据库时间
 * @returns {string} "刚刚" / "3分钟前" / "10:30" / "05-27 14:30"
 */
function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24 && date.getDate() === now.getDate()) return `${diffHour}小时前`;

  // 今天内但超过24h的显示时间，非今天显示日期+时间
  const pad = (n) => String(n).padStart(2, '0');
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  if (date.getDate() === now.getDate()) {
    return `${hh}:${mm}`;
  }
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${hh}:${mm}`;
}

/**
 * 消息列表字段映射 — 数据库行 → API 响应格式
 * @param {Object} row - 数据库查询结果行
 * @returns {Object} 格式化后的消息对象
 */
function formatMessage(row) {
  const iconMap = {
    approval: { icon: 'approval', iconBg: '#EDF2FF' },
    report: { icon: 'report', iconBg: '#F0FDF4' },
    task: { icon: 'task', iconBg: '#F3E8FF' },
    system: { icon: 'system', iconBg: '#F5F5F5' },
  };

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    desc: row.content,                    // 数据库字段 → API 字段映射
    time: formatTimeAgo(row.created_at),  // 时间友好化
    isRead: !!row.is_read,               // 布尔化
    icon: iconMap[row.type]?.icon || 'notification',
    iconBg: iconMap[row.type]?.iconBg || '#F5F5F5',
  };
}

/**
 * 消息详情字段映射 — 继承 formatMessage 并追加详情字段
 * @param {Object} row - 数据库查询结果行
 * @returns {Object} 格式化后的消息详情对象
 */
function formatMessageDetail(row) {
  return {
    ...formatMessage(row),
    body: row.body,
    actionText: row.action_text,
    actionRoute: row.action_route,
    relatedId: row.related_id,
  };
}

/**
 * 消息列表（分页）
 * @param {number} userId - 当前用户 ID
 * @param {Object} options - 查询选项
 * @param {number} options.page - 当前页码
 * @param {number} options.pageSize - 每页条数
 * @param {string} [options.type] - 消息类型筛选
 * @returns {Promise<{list: Array, total: number, page: number, pageSize: number}>}
 */
async function list(userId, { page = 1, pageSize = 20, type } = {}) {
  const offset = (page - 1) * pageSize;
  const params = [userId];
  const whereClauses = ['receiver_id = ?'];

  // 可选按 type 筛选
  if (type) {
    whereClauses.push('type = ?');
    params.push(type);
  }

  const whereSQL = whereClauses.join(' AND ');

  // 查询总数
  const countSQL = `SELECT COUNT(*) AS total FROM messages WHERE ${whereSQL}`;
  const countRows = await db.query(countSQL, params);
  const total = countRows[0]?.total ?? 0;

  // 查询列表
  const listSQL = `SELECT * FROM messages WHERE ${whereSQL} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const listParams = [...params, pageSize, offset];
  const rows = await db.query(listSQL, listParams);

  return { list: rows.map(formatMessage), total, page, pageSize };
}

/**
 * 消息详情
 * @param {number} id - 消息 ID
 * @param {number} userId - 当前用户 ID
 * @returns {Promise<Object>} 消息对象
 * @throws {NotFoundError} 消息不存在
 */
async function detail(id, userId) {
  const rows = await db.query(
    'SELECT * FROM messages WHERE id = ? AND receiver_id = ?',
    [id, userId]
  );

  if (!rows || rows.length === 0) {
    throw new NotFoundError('消息不存在');
  }

  return formatMessageDetail(rows[0]);
}

/**
 * 未读消息数
 * @param {number} userId - 当前用户 ID
 * @returns {Promise<number>} 未读消息数量
 */
async function unreadCount(userId) {
  const rows = await db.query(
    'SELECT COUNT(*) AS count FROM messages WHERE receiver_id = ? AND is_read = 0',
    [userId]
  );
  return rows[0]?.count ?? 0;
}

/**
 * 标记已读
 * @param {number} id - 消息 ID
 * @param {number} userId - 当前用户 ID
 * @returns {Promise<void>}
 */
async function markRead(id, userId) {
  await db.execute(
    'UPDATE messages SET is_read = 1, read_at = NOW() WHERE id = ? AND receiver_id = ?',
    [id, userId]
  );
}

/**
 * 删除消息
 */
async function del(userId, id) {
  await db.execute(
    'DELETE FROM messages WHERE id = ? AND receiver_id = ?',
    [id, userId]
  );
}

module.exports = { list, detail, unreadCount, markRead, delete: del };
