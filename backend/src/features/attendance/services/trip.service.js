'use strict';

const db = require('../../../common/config/database');
const { BusinessError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');
const { calcMissingDates } = require('./leave.service');
const { beijingDate, beijingToday, beijingNow } = require('../../../common/utils/date');

/**
 * 出差打卡服务 — start / end
 */

/**
 * 写入消息通知
 * @param {number} receiverId - 接收人 ID
 * @param {string} title - 标题
 * @param {string} description - 描述
 * @param {string} content - 内容
 */
async function sendMessage(receiverId, title, description, content) {
  try {
    await db.execute(
      'INSERT INTO messages (receiver_id, type, title, description, content, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())',
      [receiverId, 'attendance', title, description, content || '']
    );
  } catch (e) { /* 消息发送失败不影响主流程 */ }
}

async function startTrip({ applicantId, reason }) {
  // 检查是否有进行中的出差
  const active = await db.query(
    `SELECT id FROM attendance_leave_requests WHERE applicant_id = ? AND request_type = 'biz_trip' AND status = 'in_progress'`,
    [applicantId]
  );
  if (active.length > 0) {
    throw new BusinessError('已有进行中的出差，请先结束当前出差', null, ErrorCode.ATTENDANCE_TRIP_ALREADY_ACTIVE);
  }

  const result = await db.execute(
    `INSERT INTO attendance_leave_requests (applicant_id, request_type, trip_started_at, reason, status, source)
     VALUES (?, 'biz_trip', NOW(), ?, 'in_progress', 'self')`,
    [applicantId, reason || null]
  );

  const row = await db.query('SELECT trip_started_at FROM attendance_leave_requests WHERE id = ?', [result[0].insertId]);

  // 发送消息通知
  const startTime = row[0].trip_started_at;
  const startStr = startTime instanceof Date ? startTime.toISOString().slice(0, 16).replace('T', ' ') : '';
  await sendMessage(applicantId, '出差已开始', `开始时间：${startStr}`, reason || '');

  return { requestId: result[0].insertId, tripStartedAt: startTime, status: 'in_progress' };
}

async function endTrip({ applicantId, requestId, reason, endDate }) {
  let trip;
  if (requestId) {
    const rows = await db.query('SELECT * FROM attendance_leave_requests WHERE id = ? AND applicant_id = ?', [requestId, applicantId]);
    if (!rows.length) throw new BusinessError('申请单不存在', null, ErrorCode.ATTENDANCE_LEAVE_NOT_FOUND);
    trip = rows[0];
  } else {
    const rows = await db.query(
      `SELECT * FROM attendance_leave_requests WHERE applicant_id = ? AND request_type = 'biz_trip' AND status = 'in_progress' ORDER BY trip_started_at DESC LIMIT 1`,
      [applicantId]
    );
    if (!rows.length) throw new BusinessError('没有进行中的出差', null, ErrorCode.ATTENDANCE_TRIP_NOT_ACTIVE);
    trip = rows[0];
  }

  if (trip.status !== 'in_progress') throw new BusinessError('没有进行中的出差', null, ErrorCode.ATTENDANCE_TRIP_NOT_ACTIVE);

  // 统一将 Date 或字符串转 YYYY-MM-DD
  const toDateStr = (d) => {
    if (!d) return '';
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    return String(d).slice(0, 10);
  };
  // 优先用前端传来的 endDate，否则用北京当前时间
  const tripEnd = endDate ? beijingDate(endDate) : beijingNow();
  const tripStart = beijingDate(toDateStr(trip.trip_started_at));
  const missingDates = await calcMissingDates(applicantId, tripStart, tripEnd);
  // 日期粒度计算：忽略时分秒，只用北京时间的日历日期
  const startDay = beijingDate(toDateStr(tripStart));
  const endDay = beijingDate(toDateStr(tripEnd));
  const tripDays = Math.floor((endDay - startDay) / (1000 * 60 * 60 * 24)) + 1;

  // 写入 trip_ended_at：传了 endDate 则用当天 23:59:59，否则 NOW()
  const tripEndedAtSql = endDate ? `'${endDate} 23:59:59'` : 'NOW()';
  await db.execute(
    `UPDATE attendance_leave_requests SET trip_ended_at = ${tripEndedAtSql}, status = 'ended', reason = COALESCE(NULLIF(?, ''), reason) WHERE id = ?`,
    [reason || null, trip.id]
  );

  // 发送消息通知
  const missingText = missingDates.length > 0 ? `，未提交 ${missingDates.length} 天` : '';
  await sendMessage(applicantId, '出差已结束', `共 ${tripDays} 天${missingText}`, reason || '');

  return {
    requestId: trip.id,
    tripStartedAt: trip.trip_started_at,
    tripEndedAt: endDate ? `${endDate} 23:59:59` : new Date().toISOString(),
    tripDays,
    missingDays: missingDates.length,
    missingDates,
    status: 'ended',
  };
}

function isValidDateStr(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00+08:00`));
}

function toDateStr(value) {
  if (!value) return '';
  if (value instanceof Date) {
    const offset = value.getTimezoneOffset() + 480;
    const bj = new Date(value.getTime() + offset * 60000);
    return `${bj.getFullYear()}-${String(bj.getMonth() + 1).padStart(2, '0')}-${String(bj.getDate()).padStart(2, '0')}`;
  }
  return String(value).slice(0, 10);
}

function toDateTimeStr(value) {
  const dateStr = toDateStr(value);
  return dateStr ? `${dateStr} 00:00:00` : null;
}

/**
 * 管理员直接为任意员工开始出差，不依赖员工发起出差申请。
 * 以 attendance_leave_requests 为主数据，并同步 biz_trip_status。
 */
async function adminStartTrip({ operatorId, userId, projectName, reason, startDate }) {
  const userRows = await db.query(
    'SELECT id, nickname, user_name, status FROM users WHERE id = ? AND deleted_at IS NULL',
    [userId]
  );
  if (!userRows.length) {
    throw new BusinessError('员工不存在', null, ErrorCode.USER_NOT_FOUND);
  }
  if (userRows[0].status !== 'active') {
    throw new BusinessError('该员工账号不可用，不能开始出差');
  }

  const tripStart = startDate ? String(startDate).slice(0, 10) : beijingToday();
  if (!isValidDateStr(tripStart)) {
    throw new BusinessError('开始日期格式不正确', null, ErrorCode.ATTENDANCE_DATE_INVALID);
  }

  const activeTrip = await db.query(
    `SELECT id, trip_started_at FROM attendance_leave_requests
     WHERE applicant_id = ? AND request_type = 'biz_trip' AND status = 'in_progress'
     ORDER BY trip_started_at DESC LIMIT 1`,
    [userId]
  );
  if (activeTrip.length > 0) {
    throw new BusinessError('该员工已有进行中的出差，请先结束当前出差', null, ErrorCode.ATTENDANCE_TRIP_ALREADY_ACTIVE);
  }

  const activeCompliance = await db.query(
    `SELECT id, project_name, start_date FROM biz_trip_status
     WHERE user_id = ? AND status = 'active' ORDER BY start_date DESC, id DESC LIMIT 1`,
    [userId]
  );

  const { requestId } = await db.transaction(async (conn) => {
    const result = await conn.execute(
      `INSERT INTO attendance_leave_requests (applicant_id, request_type, trip_started_at, reason, status, source)
       VALUES (?, 'biz_trip', ?, ?, 'in_progress', 'admin')`,
      [userId, toDateTimeStr(tripStart), reason || projectName || null]
    );

    if (activeCompliance.length > 0) {
      if (projectName) {
        await conn.execute(
          'UPDATE biz_trip_status SET project_name = ?, updated_at = NOW() WHERE id = ?',
          [projectName, activeCompliance[0].id]
        );
      }
    } else {
      await conn.execute(
        `INSERT INTO biz_trip_status (user_id, project_name, start_date, status, created_by)
         VALUES (?, ?, ?, 'active', ?)`,
        [userId, projectName || null, tripStart, operatorId]
      );
    }

    return { requestId: result[0].insertId };
  });

  const user = userRows[0];
  const userName = user.nickname || user.user_name || '';
  await sendMessage(
    userId,
    '出差已开始（后台录入）',
    `${userName} · ${tripStart}${projectName ? ` · ${projectName}` : ''}`,
    reason || ''
  );

  return { requestId, userId, status: 'in_progress', startDate: tripStart, projectName: projectName || null };
}

/**
 * 管理员直接结束任意员工的出差。
 * 如果没有考勤出差记录但存在合规出差记录，也会补齐考勤记录并结束。
 */
async function adminEndTrip({ userId, reason, endDate }) {
  const userRows = await db.query(
    'SELECT id, nickname, user_name, status FROM users WHERE id = ? AND deleted_at IS NULL',
    [userId]
  );
  if (!userRows.length) {
    throw new BusinessError('员工不存在', null, ErrorCode.USER_NOT_FOUND);
  }

  const tripEnd = endDate ? String(endDate).slice(0, 10) : beijingToday();
  if (!isValidDateStr(tripEnd)) {
    throw new BusinessError('结束日期格式不正确', null, ErrorCode.ATTENDANCE_DATE_INVALID);
  }

  const activeTrip = await db.query(
    `SELECT id, applicant_id, trip_started_at FROM attendance_leave_requests
     WHERE applicant_id = ? AND request_type = 'biz_trip' AND status = 'in_progress'
     ORDER BY trip_started_at DESC LIMIT 1`,
    [userId]
  );
  const activeCompliance = await db.query(
    `SELECT id, user_id, project_name, start_date FROM biz_trip_status
     WHERE user_id = ? AND status = 'active' ORDER BY start_date DESC, id DESC LIMIT 1`,
    [userId]
  );

  if (activeTrip.length === 0 && activeCompliance.length === 0) {
    throw new BusinessError('该员工没有进行中的出差', null, ErrorCode.ATTENDANCE_TRIP_NOT_ACTIVE);
  }

  const trip = activeTrip[0] || {
    applicant_id: userId,
    trip_started_at: activeCompliance[0].start_date,
  };
  const tripStartStr = toDateStr(trip.trip_started_at);
  if (tripEnd < tripStartStr) {
    throw new BusinessError('结束日期不能早于开始日期', null, ErrorCode.ATTENDANCE_DATE_INVALID);
  }

  await db.transaction(async (conn) => {
    if (trip.id) {
      await conn.execute(
        `UPDATE attendance_leave_requests
         SET trip_ended_at = ?, status = 'ended', reason = COALESCE(NULLIF(?, ''), reason)
         WHERE id = ?`,
        [`${tripEnd} 23:59:59`, reason || null, trip.id]
      );
    } else {
      await conn.execute(
        `INSERT INTO attendance_leave_requests
           (applicant_id, request_type, trip_started_at, trip_ended_at, reason, status, source)
         VALUES (?, 'biz_trip', ?, ?, ?, 'ended', 'admin')`,
        [userId, toDateTimeStr(tripStartStr), `${tripEnd} 23:59:59`, reason || activeCompliance[0].project_name || null]
      );
    }

    if (activeCompliance.length > 0) {
      await conn.execute(
        `UPDATE biz_trip_status SET end_date = ?, status = 'completed', updated_at = NOW()
         WHERE user_id = ? AND status = 'active'`,
        [tripEnd, userId]
      );
    }
  });

  const missingDates = await calcMissingDates(userId, tripStartStr, tripEnd);
  const tripDays = Math.floor((beijingDate(tripEnd).getTime() - beijingDate(tripStartStr).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const missingText = missingDates.length > 0 ? `，未提交 ${missingDates.length} 天` : '';
  await sendMessage(userId, '出差已结束（后台录入）', `共 ${tripDays} 天${missingText}`, reason || '');

  return {
    requestId: trip.id || null,
    userId,
    status: 'ended',
    tripStartedAt: toDateTimeStr(tripStartStr),
    tripEndedAt: `${tripEnd} 23:59:59`,
    tripDays,
    missingDays: missingDates.length,
    missingDates,
  };
}

/**
 * 管理员查看全员出差状态。
 */
async function adminTripStatusList({ keyword, status, page = 1, pageSize = 20 }) {
  const conditions = ["u.status = 'active'", 'u.deleted_at IS NULL'];
  const params = [];

  if (keyword) {
    conditions.push('(u.nickname LIKE ? OR u.user_name LIKE ? OR u.worker_code LIKE ? OR d.name LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw);
  }

  if (status === 'in_progress') {
    conditions.push(`(
      EXISTS (SELECT 1 FROM attendance_leave_requests a
              WHERE a.applicant_id = u.id AND a.request_type = 'biz_trip' AND a.status = 'in_progress')
      OR EXISTS (SELECT 1 FROM biz_trip_status b
                 WHERE b.user_id = u.id AND b.status = 'active')
    )`);
  } else if (status === 'none') {
    conditions.push(`(
      NOT EXISTS (SELECT 1 FROM attendance_leave_requests a
                  WHERE a.applicant_id = u.id AND a.request_type = 'biz_trip' AND a.status = 'in_progress')
      AND NOT EXISTS (SELECT 1 FROM biz_trip_status b
                      WHERE b.user_id = u.id AND b.status = 'active')
    )`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * pageSize;
  const countRows = await db.query(
    `SELECT COUNT(*) AS total FROM users u
     LEFT JOIN departments d ON u.department_id = d.id ${where}`,
    params
  );
  const rows = await db.query(
    `SELECT u.id, u.nickname, u.user_name, u.worker_code, u.position, d.name AS departmentName
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     ${where} ORDER BY u.worker_code, u.id LIMIT ? OFFSET ?`,
    [...params, parseInt(pageSize), offset]
  );

  const ids = rows.map(r => r.id);
  const tripMap = {};
  const complianceMap = {};
  if (ids.length > 0) {
    const trips = await db.query(
      `SELECT id, applicant_id, trip_started_at, reason, source
       FROM attendance_leave_requests
       WHERE applicant_id IN (${ids.map(() => '?').join(',')})
         AND request_type = 'biz_trip' AND status = 'in_progress'`,
      ids
    );
    trips.forEach(t => { tripMap[t.applicant_id] = t; });

    const compliances = await db.query(
      `SELECT id, user_id, project_name, start_date
       FROM biz_trip_status
       WHERE user_id IN (${ids.map(() => '?').join(',')}) AND status = 'active'
       ORDER BY start_date DESC, id DESC`,
      ids
    );
    compliances.forEach(c => {
      if (!complianceMap[c.user_id]) complianceMap[c.user_id] = c;
    });
  }

  const list = rows.map(row => {
    const trip = tripMap[row.id];
    const compliance = complianceMap[row.id];
    const tripStatus = trip ? 'in_progress' : (compliance ? 'compliance_only' : 'none');
    return {
      userId: row.id,
      userName: row.nickname || row.user_name || '',
      workerCode: row.worker_code || '',
      departmentName: row.departmentName || '',
      position: row.position || '',
      tripStatus,
      attendanceRequestId: trip ? trip.id : null,
      complianceId: compliance ? compliance.id : null,
      projectName: trip?.reason || compliance?.project_name || null,
      tripStartedAt: trip ? toDateTimeStr(trip.trip_started_at) : (compliance ? toDateStr(compliance.start_date) : null),
      reason: trip ? trip.reason : null,
      source: trip ? trip.source : null,
    };
  });

  return {
    list,
    total: countRows[0].total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    totalPages: Math.ceil(countRows[0].total / parseInt(pageSize)) || 0,
  };
}

module.exports = { startTrip, endTrip, adminStartTrip, adminEndTrip, adminTripStatusList };
