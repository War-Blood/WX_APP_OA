'use strict';

const db = require('../../../common/config/database');
const { BusinessError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 排班服务
 */

async function list({ startDate, endDate, departmentId, userId, page = 1, pageSize = 100 }) {
  const conditions = [];
  const params = [startDate, endDate];

  if (departmentId) { conditions.push('u.department_id = ?'); params.push(departmentId); }
  if (userId) { conditions.push('s.user_id = ?'); params.push(userId); }

  const where = conditions.length ? 'AND ' + conditions.join(' AND ') : '';
  const offset = (page - 1) * pageSize;

  const countRows = await db.query(
    `SELECT COUNT(*) AS total FROM attendance_schedules s
     JOIN users u ON s.user_id = u.id
     WHERE s.schedule_date BETWEEN ? AND ? ${where}`, params
  );
  const list = await db.query(
    `SELECT s.id, s.user_id AS userId, u.nickname AS userName, d.name AS departmentName,
            s.schedule_date AS scheduleDate, s.status, s.note, s.created_by AS createdBy, s.created_at AS createdAt
     FROM attendance_schedules s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE s.schedule_date BETWEEN ? AND ? ${where}
     ORDER BY s.schedule_date, u.worker_code
     LIMIT ? OFFSET ?`, [...params, pageSize, offset]
  );

  return { list, total: countRows[0].total, page, pageSize, totalPages: Math.ceil(countRows[0].total / pageSize) };
}

async function upsert({ userId, scheduleDate, status, note, createdBy }) {
  await db.execute(
    `INSERT INTO attendance_schedules (user_id, schedule_date, status, note, created_by)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), note = VALUES(note), updated_at = NOW()`,
    [userId, scheduleDate, status, note || null, createdBy]
  );

  const rows = await db.query(
    'SELECT id FROM attendance_schedules WHERE user_id = ? AND schedule_date = ?', [userId, scheduleDate]
  );
  return { id: rows[0].id, updated: true };
}

async function batch({ userIds, startDate, endDate, status, note, weekdaysOnly, createdBy }) {
  let inserted = 0, updated = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (const userId of userIds) {
    const cur = new Date(start);
    while (cur <= end) {
      if (weekdaysOnly && (cur.getDay() === 0 || cur.getDay() === 6)) { cur.setDate(cur.getDate() + 1); continue; }
      const dateStr = cur.toISOString().slice(0, 10);
      try {
        await db.execute(
          `INSERT INTO attendance_schedules (user_id, schedule_date, status, note, created_by) VALUES (?,?,?,?,?)`,
          [userId, dateStr, status, note || null, createdBy]
        );
        inserted++;
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
          await db.execute(
            'UPDATE attendance_schedules SET status=?, note=?, updated_at=NOW() WHERE user_id=? AND schedule_date=?',
            [status, note || null, userId, dateStr]
          );
          updated++;
        } else { throw e; }
      }
      cur.setDate(cur.getDate() + 1);
    }
  }
  return { inserted, updated, total: inserted + updated };
}

module.exports = { list, upsert, batch };