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

/**
 * 查询当前用户的个人排班（不限制角色）
 */
async function mySchedule({ userId, startDate, endDate }) {
  const rows = await db.query(
    `SELECT id, user_id AS userId, schedule_date AS scheduleDate, status, note
     FROM attendance_schedules
     WHERE user_id = ? AND schedule_date BETWEEN ? AND ?
     ORDER BY schedule_date`,
    [userId, startDate, endDate]
  );
  return rows;
}

/**
 * 删除排班记录（管理员）
 * @param {number} id - 排班记录 ID
 */
async function deleteSchedule(id) {
  const rows = await db.query('SELECT id FROM attendance_schedules WHERE id = ?', [id]);
  if (!rows.length) throw new BusinessError('排班记录不存在', null, ErrorCode.ATTENDANCE_LEAVE_NOT_FOUND);
  await db.execute('DELETE FROM attendance_schedules WHERE id = ?', [id]);
  return { deleted: true };
}

/**
 * 获取全部排班规则
 */
async function getRules() {
  return await db.query(
    `SELECT r.id, r.name, r.week_config AS weekConfig, r.is_default AS isDefault, r.created_at AS createdAt
     FROM attendance_schedule_rules r ORDER BY r.is_default DESC, r.id ASC`
  );
}

/**
 * 保存排班规则（新增/更新）
 * @param {object} param0
 */
async function saveRule({ id, name, weekConfig, isDefault, createdBy }) {
  if (isDefault) {
    // 唯一默认：取消其他默认
    await db.execute('UPDATE attendance_schedule_rules SET is_default = 0 WHERE is_default = 1');
  }
  if (id) {
    await db.execute(
      'UPDATE attendance_schedule_rules SET name = ?, week_config = ?, is_default = ?, updated_at = NOW() WHERE id = ?',
      [name, JSON.stringify(weekConfig), isDefault ? 1 : 0, id]
    );
    return { id, updated: true };
  } else {
    const result = await db.execute(
      'INSERT INTO attendance_schedule_rules (name, week_config, is_default, created_by) VALUES (?, ?, ?, ?)',
      [name, JSON.stringify(weekConfig), isDefault ? 1 : 0, createdBy]
    );
    return { id: result[0].insertId, created: true };
  }
}

/**
 * 应用规则到全员排班
 * @param {object} param0
 * @returns {{ inserted:number, skipped:number }}
 */
async function applyRule({ ruleId, startDate, endDate }) {
  // 获取规则
  const rules = await db.query('SELECT * FROM attendance_schedule_rules WHERE id = ?', [ruleId]);
  if (!rules.length) throw new BusinessError('规则不存在', null, ErrorCode.ATTENDANCE_LEAVE_NOT_FOUND);
  const weekConfig = typeof rules[0].week_config === 'string' ? JSON.parse(rules[0].week_config) : rules[0].week_config;

  // 获取所有在职用户
  const users = await db.query("SELECT id FROM users WHERE status = 'active' AND deleted_at IS NULL");

  // 逐日逐人生成
  let inserted = 0, skipped = 0;
  const cur = new Date(startDate);
  const end = new Date(endDate);

  for (const user of users) {
    cur.setTime(new Date(startDate).getTime());
    while (cur <= end) {
      // 星期几 → ISO (周一=1..周日=7)
      const dow = cur.getDay() === 0 ? 7 : cur.getDay();
      const status = weekConfig[String(dow)] || 'work';
      const dateStr = cur.toISOString().slice(0, 10);

      try {
        await db.execute(
          `INSERT INTO attendance_schedules (user_id, schedule_date, status, created_by)
           VALUES (?, ?, ?, ?)`,
          [user.id, dateStr, status, 1]
        );
        inserted++;
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
          skipped++; // 已有手动排班，不覆盖
        } else { throw e; }
      }
      cur.setDate(cur.getDate() + 1);
    }
  }
  return { inserted, skipped, total: inserted + skipped };
}

module.exports = { list, upsert, batch, mySchedule, deleteSchedule, getRules, saveRule, applyRule };