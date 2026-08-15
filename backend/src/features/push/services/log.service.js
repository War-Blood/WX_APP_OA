'use strict';

const db = require('../../../common/config/database');

/**
 * 推送执行日志读写
 * 幂等：UNIQUE(script_id, schedule_key) + INSERT IGNORE
 */

/** 可更新字段白名单 */
const UPDATABLE = [
  'condition_result',
  'condition_detail',
  'rendered_content',
  'mention_detail',
  'send_status',
  'attempts',
  'error_message',
  'duration_ms',
];

/**
 * 创建日志（幂等）
 * @param {number} scriptId - 脚本 ID
 * @param {string} scheduleKey - yyyyMMddHHmm
 * @returns {Promise<{id: number, inserted: boolean}>}
 */
async function createLog(scriptId, scheduleKey) {
  const [result] = await db.execute(
    `INSERT IGNORE INTO push_task_logs (script_id, schedule_key)
     VALUES (?, ?)`,
    [scriptId, scheduleKey]
  );
  if (result && result.affectedRows > 0) {
    return { id: result.insertId, inserted: true };
  }
  const rows = await db.query(
    'SELECT id FROM push_task_logs WHERE script_id = ? AND schedule_key = ?',
    [scriptId, scheduleKey]
  );
  return { id: rows[0] ? rows[0].id : null, inserted: false };
}

/**
 * 更新日志
 * @param {number} id - 日志 ID
 * @param {Object} fields - 白名单字段（JSON 字段自动序列化）
 * @returns {Promise<void>}
 */
async function updateLog(id, fields) {
  if (!id || !fields) return;
  const updates = [];
  const params = [];
  Object.keys(fields).forEach((k) => {
    if (!UPDATABLE.includes(k)) return;
    updates.push(`${k} = ?`);
    const v = fields[k];
    params.push(typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
  });
  if (updates.length === 0) return;
  params.push(id);
  await db.execute(`UPDATE push_task_logs SET ${updates.join(', ')} WHERE id = ?`, params);
}

/**
 * 分页查询日志
 * @param {Object} params - {page, pageSize, scriptId, status, startDate, endDate}
 * @returns {Promise<{list: Array, total: number}>}
 */
async function listLogs({ page = 1, pageSize = 20, scriptId, status, startDate, endDate } = {}) {
  const conditions = [];
  const params = [];
  if (scriptId) {
    conditions.push('l.script_id = ?');
    params.push(scriptId);
  }
  if (status) {
    conditions.push('l.send_status = ?');
    params.push(status);
  }
  if (startDate) {
    conditions.push('l.created_at >= ?');
    params.push(`${startDate} 00:00:00`);
  }
  if (endDate) {
    conditions.push('l.created_at <= ?');
    params.push(`${endDate} 23:59:59`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRows = await db.query(
    `SELECT COUNT(*) AS total FROM push_task_logs l ${where}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;

  const offset = (Number(page) - 1) * Number(pageSize);
  const rows = await db.query(
    `SELECT l.id, l.script_id, s.name AS script_name, l.schedule_key, l.condition_result,
            l.send_status, l.error_message, l.duration_ms, l.created_at
     FROM push_task_logs l
     LEFT JOIN push_scripts s ON s.id = l.script_id
     ${where}
     ORDER BY l.id DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(pageSize), offset]
  );

  const listData = rows.map((r) => ({
    id: r.id,
    scriptId: r.script_id,
    scriptName: r.script_name || '',
    scheduleKey: r.schedule_key,
    conditionResult: r.condition_result,
    sendStatus: r.send_status,
    errorMessage: r.error_message || '',
    durationMs: r.duration_ms,
    createdAt: r.created_at,
  }));
  return { list: listData, total };
}

/**
 * 兼容 JSON 列解析（mysql2 对 JSON 列自动反序列化为对象；旧数据可能是字符串）
 * @param {*} v - 字段值
 * @returns {*} 解析后的对象或 null
 */
function parseJsonField(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
}

/**
 * 日志详情（含 JSON 明细）
 * @param {number} id - 日志 ID
 * @returns {Promise<Object|null>}
 */
async function getLog(id) {
  const rows = await db.query(
    `SELECT l.*, s.name AS script_name
     FROM push_task_logs l
     LEFT JOIN push_scripts s ON s.id = l.script_id
     WHERE l.id = ?`,
    [id]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  r.condition_detail = parseJsonField(r.condition_detail);
  r.mention_detail = parseJsonField(r.mention_detail);
  r.attempts = parseJsonField(r.attempts);
  return r;
}

module.exports = { createLog, updateLog, listLogs, getLog };
