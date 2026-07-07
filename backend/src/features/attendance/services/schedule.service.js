'use strict';

const db = require('../../../common/config/database');
const { BusinessError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 公司级统一排班服务 — company_schedules（工作日/休息日）
 */

/**
 * 获取月度排班预览（复用日报 schedulePreview 逻辑）
 */
async function preview(month) {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0));
  const daysInMonth = lastDay.getUTCDate();

  const rows = await db.query(
    'SELECT schedule_date, status FROM company_schedules WHERE schedule_date BETWEEN ? AND ?',
    [`${month}-01`, `${month}-${String(daysInMonth).padStart(2, '0')}`]
  );
  const map = {};
  rows.forEach(r => {
    const d = new Date(r.schedule_date);
    map[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`] = r.status;
  });

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    const date = new Date(y, m - 1, d);
    const dayOfWeek = date.getDay();
    const status = map[dateStr] || (dayOfWeek === 0 || dayOfWeek === 6 ? 'rest' : 'work');
    days.push({ date: dateStr, dayOfWeek, status });
  }

  return { month, days, workDays: days.filter(d => d.status === 'work').length, restDays: days.filter(d => d.status === 'rest').length };
}

/**
 * 保存月度排班（全量覆盖）
 * @param {string} month - YYYY-MM
 * @param {string[]} workDays - 工作日列表
 */
async function saveMonth(month, workDays) {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0));
  const daysInMonth = lastDay.getUTCDate();

  const workSet = new Set(workDays);

  // DELETE + INSERT within the month range
  await db.execute('DELETE FROM company_schedules WHERE schedule_date BETWEEN ? AND ?',
    [`${month}-01`, `${month}-${String(daysInMonth).padStart(2, '0')}`]);

  const inserts = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    const status = workSet.has(dateStr) ? 'work' : 'rest';
    inserts.push([dateStr, status]);
  }

  if (inserts.length > 0) {
    const placeholders = inserts.map(() => '(?,?)').join(',');
    await db.execute(
      `INSERT INTO company_schedules (schedule_date, status) VALUES ${placeholders}`,
      inserts.flat()
    );
  }

  return { saved: inserts.length };
}

/**
 * 获取排班规则列表
 */
async function getRules() {
  return await db.query(
    `SELECT r.id, r.name, r.week_config AS weekConfig, r.alt_week_config AS altWeekConfig,
            r.alternating, r.is_default AS isDefault, r.created_at AS createdAt
     FROM attendance_schedule_rules r ORDER BY r.is_default DESC, r.id ASC`
  );
}

/**
 * 保存排班规则
 */
async function saveRule({ id, name, weekConfig, altWeekConfig, alternating, isDefault, createdBy }) {
  if (isDefault) {
    await db.execute('UPDATE attendance_schedule_rules SET is_default = 0 WHERE is_default = 1');
  }
  if (id) {
    await db.execute(
      'UPDATE attendance_schedule_rules SET name=?, week_config=?, alt_week_config=?, alternating=?, is_default=?, updated_at=NOW() WHERE id=?',
      [name, JSON.stringify(weekConfig), altWeekConfig ? JSON.stringify(altWeekConfig) : null, alternating ? 1 : 0, isDefault ? 1 : 0, id]
    );
    return { id, updated: true };
  } else {
    const result = await db.execute(
      'INSERT INTO attendance_schedule_rules (name, week_config, alt_week_config, alternating, is_default, created_by) VALUES (?,?,?,?,?,?)',
      [name, JSON.stringify(weekConfig), altWeekConfig ? JSON.stringify(altWeekConfig) : null, alternating ? 1 : 0, isDefault ? 1 : 0, createdBy]
    );
    return { id: result[0].insertId, created: true };
  }
}

/**
 * 应用规则 — 公司级（非按人）
 */
async function applyRule({ ruleId, startDate, endDate }) {
  const rules = await db.query('SELECT * FROM attendance_schedule_rules WHERE id = ?', [ruleId]);
  if (!rules.length) throw new BusinessError('规则不存在', null, ErrorCode.ATTENDANCE_LEAVE_NOT_FOUND);
  const rule = rules[0];
  const weekConfig = typeof rule.week_config === 'string' ? JSON.parse(rule.week_config) : rule.week_config;
  const altWeekConfig = rule.alt_week_config
    ? (typeof rule.alt_week_config === 'string' ? JSON.parse(rule.alt_week_config) : rule.alt_week_config)
    : null;
  const alternating = !!rule.alternating;

  const cur = new Date(startDate + 'T00:00:00+08:00');
  const end = new Date(endDate + 'T00:00:00+08:00');
  let inserted = 0;

  while (cur <= end) {
    const dow = cur.getDay() === 0 ? 7 : cur.getDay();
    let config = weekConfig;
    if (alternating && altWeekConfig) {
      const weekNum = getISOWeek(cur);
      if (weekNum % 2 === 0) config = altWeekConfig;
    }
    const status = config[String(dow)] || 'work';
    // 公司级: status 只能是 work 或 rest
    const finalStatus = status === 'biz_trip' || status === 'leave' ? 'work' : status;
    const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;

    await db.execute(
      'INSERT INTO company_schedules (schedule_date, status) VALUES (?,?) ON DUPLICATE KEY UPDATE status=VALUES(status)',
      [dateStr, finalStatus]
    );
    inserted++;
    cur.setDate(cur.getDate() + 1);
  }

  return { inserted, skipped: 0, total: inserted };
}

function getISOWeek(d) {
  const date = new Date(d);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

/**
 * 个人排班查询（公司级数据，不区分用户）
 */
async function mySchedule({ startDate, endDate }) {
  const rows = await db.query(
    'SELECT schedule_date AS scheduleDate, status FROM company_schedules WHERE schedule_date BETWEEN ? AND ? ORDER BY schedule_date',
    [startDate, endDate]
  );
  const dbMap = {};
  rows.forEach(r => {
    const d = new Date(r.scheduleDate);
    dbMap[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`] = r.status;
  });

  // 生成全量日期，无 DB 记录时用周末回退规则
  const result = [];
  const cur = new Date(startDate + 'T00:00:00+08:00');
  const end = new Date(endDate + 'T00:00:00+08:00');
  while (cur <= end) {
    const ds = cur.toISOString().slice(0, 10);
    const dow = cur.getDay();
    result.push({
      scheduleDate: ds,
      status: dbMap[ds] || (dow === 0 || dow === 6 ? 'rest' : 'work')
    });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

/**
 * 清除排班数据
 */
async function clearSchedules(startDate, endDate) {
  const result = await db.execute(
    'DELETE FROM company_schedules WHERE schedule_date BETWEEN ? AND ?',
    [startDate, endDate]
  );
  return { deleted: result[0].affectedRows };
}

module.exports = { preview, saveMonth, mySchedule, getRules, saveRule, applyRule, clearSchedules };
