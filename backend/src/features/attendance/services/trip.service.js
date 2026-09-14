'use strict';

const db = require('../../../common/config/database');
const { BusinessError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');
const { calcMissingDates, expandDepartmentIds } = require('./leave.service');
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

  // 同步结束合规出差记录（biz_trip_status），保持两表一致，防止「合规记录出差中」残留
  await db.execute(
    `UPDATE biz_trip_status SET end_date = ?, status = 'completed', updated_at = NOW()
     WHERE user_id = ? AND status = 'active'`,
    [toDateStr(tripEnd), applicantId]
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
 * 取 DateTime 值的时分秒部分（按北京时间）
 * @param {Date|string} value - DateTime 值
 * @returns {string} HH:mm:ss
 */
function timePart(value) {
  if (!value) return '00:00:00';
  if (value instanceof Date) {
    const offset = value.getTimezoneOffset() + 480;
    const bj = new Date(value.getTime() + offset * 60000);
    return `${String(bj.getHours()).padStart(2, '0')}:${String(bj.getMinutes()).padStart(2, '0')}:${String(bj.getSeconds()).padStart(2, '0')}`;
  }
  const parts = String(value).split(' ');
  return parts[1] || '00:00:00';
}

/**
 * 计算出差天数（含首尾两天）
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {number}
 */
function calcTripDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  return Math.floor((beijingDate(endDate).getTime() - beijingDate(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
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
 * 出差记录合并列表。
 * 以考勤出差记录为准，合并合规出差记录；与考勤记录已配对的合规记录（同日开始且状态一致）不重复展示。
 * @param {Object} params - 查询参数
 * @param {string} [params.status] - in_progress / ended，空为全部
 * @param {string} [params.keyword] - 姓名/工号/部门/项目/备注关键字
 * @param {string} [params.startDate] - 开始日期范围（起）
 * @param {string} [params.endDate] - 开始日期范围（止）
 * @param {number} [params.departmentId] - 部门（含子部门）
 * @param {string} [params.sortBy] - startDate（默认）/ days / workerCode
 * @param {string} [params.sortOrder] - asc / desc（默认 desc）
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.pageSize=20] - 每页条数
 * @returns {Promise<Object>} { list, total, page, pageSize }
 */
async function adminTripRecords({ status, keyword, startDate, endDate, departmentId, sortBy, sortOrder, page = 1, pageSize = 20 }) {
  const conditions = [];
  const params = [];

  if (status === 'in_progress' || status === 'ended') {
    conditions.push('t.tripStatus = ?');
    params.push(status);
  }
  if (keyword) {
    conditions.push('(t.nickname LIKE ? OR t.userName LIKE ? OR t.workerCode LIKE ? OR t.departmentName LIKE ? OR t.projectName LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw, kw);
  }
  if (startDate) { conditions.push('DATE(t.startAt) >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('DATE(t.startAt) <= ?'); params.push(endDate); }
  if (departmentId) {
    const deptIds = await expandDepartmentIds(departmentId);
    conditions.push(`t.userId IN (${deptIds.map(() => '?').join(',')})`);
    params.push(...deptIds);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const currentPage = parseInt(page) || 1;
  const size = parseInt(pageSize) || 20;
  const offset = (currentPage - 1) * size;

  // 考勤出差记录 + 未配对的合规出差记录
  const unionSql = `
    SELECT a.id AS recordId, 'attendance' AS recordType, a.applicant_id AS userId,
           u.nickname AS nickname, u.user_name AS userName, u.worker_code AS workerCode,
           d.name AS departmentName, a.trip_started_at AS startAt, a.trip_ended_at AS endAt,
           a.reason AS projectName,
           CASE WHEN a.status = 'in_progress' THEN 'in_progress' ELSE 'ended' END AS tripStatus,
           a.source AS source, 0 AS inconsistent
    FROM attendance_leave_requests a
    JOIN users u ON u.id = a.applicant_id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE a.request_type = 'biz_trip' AND a.status <> 'cancelled'
    UNION ALL
    SELECT b.id, 'compliance', b.user_id,
           u.nickname, u.user_name, u.worker_code, d.name,
           b.start_date, b.end_date, b.project_name,
           CASE WHEN b.status = 'active' THEN 'in_progress' ELSE 'ended' END,
           'compliance',
           CASE WHEN b.status = 'active' AND EXISTS (
             SELECT 1 FROM attendance_leave_requests a2
             WHERE a2.applicant_id = b.user_id AND a2.request_type = 'biz_trip' AND a2.status = 'ended'
               AND b.start_date BETWEEN DATE(a2.trip_started_at) AND COALESCE(DATE(a2.trip_ended_at), CURDATE())
           ) THEN 1 ELSE 0 END
    FROM biz_trip_status b
    JOIN users u ON u.id = b.user_id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE b.status <> 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM attendance_leave_requests a3
        WHERE a3.applicant_id = b.user_id AND a3.request_type = 'biz_trip'
          AND DATE(a3.trip_started_at) = b.start_date
          AND a3.status = CASE WHEN b.status = 'active' THEN 'in_progress' ELSE 'ended' END
      )
  `;

  const order = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  let orderBy = `t.startAt ${order}, t.recordId DESC`;
  if (sortBy === 'days') {
    orderBy = `DATEDIFF(COALESCE(DATE(t.endAt), CURDATE()), DATE(t.startAt)) ${order}, t.startAt DESC`;
  } else if (sortBy === 'workerCode') {
    orderBy = 't.workerCode IS NULL, t.workerCode, t.recordId DESC';
  }

  const countRows = await db.query(`SELECT COUNT(*) AS total FROM (${unionSql}) t ${where}`, params);
  const rows = await db.query(
    `SELECT * FROM (${unionSql}) t ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, size, offset]
  );

  const list = rows.map(row => {
    const startDateStr = toDateStr(row.startAt);
    const endDateStr = row.endAt ? toDateStr(row.endAt) : null;
    return {
      recordId: row.recordId,
      recordType: row.recordType,
      userId: row.userId,
      userName: row.nickname || row.userName || '',
      workerCode: row.workerCode || '',
      departmentName: row.departmentName || '',
      startDate: startDateStr,
      endDate: endDateStr,
      tripDays: row.tripStatus === 'in_progress'
        ? calcTripDays(startDateStr, beijingToday())
        : calcTripDays(startDateStr, endDateStr),
      tripStatus: row.tripStatus,
      projectName: row.projectName || null,
      source: row.source,
      inconsistent: !!row.inconsistent,
    };
  });

  return { list, total: countRows[0].total, page: currentPage, pageSize: size };
}

/**
 * 管理员修正出差记录的起止日期与项目/备注，并同步配对记录。
 * 结束日期留空表示仍在出差中；填写结束日期即结束该次出差。
 * @param {Object} params - 修正参数
 * @param {string} params.recordType - attendance（考勤记录）/ compliance（合规记录）
 * @param {number} params.recordId - 记录 ID
 * @param {string} params.startDate - 开始日期 YYYY-MM-DD
 * @param {string} [params.endDate] - 结束日期 YYYY-MM-DD，留空表示出差中
 * @param {string} [params.remark] - 项目名称/备注
 * @returns {Promise<Object>} 修正后的记录摘要
 */
async function adminUpdateTripRecord({ recordType, recordId, startDate, endDate, remark }) {
  if (!['attendance', 'compliance'].includes(recordType)) {
    throw new BusinessError('记录类型不正确');
  }
  if (!isValidDateStr(startDate)) {
    throw new BusinessError('开始日期格式不正确', null, ErrorCode.ATTENDANCE_DATE_INVALID);
  }
  if (endDate && !isValidDateStr(endDate)) {
    throw new BusinessError('结束日期格式不正确', null, ErrorCode.ATTENDANCE_DATE_INVALID);
  }
  if (endDate && endDate < startDate) {
    throw new BusinessError('结束日期不能早于开始日期', null, ErrorCode.ATTENDANCE_DATE_INVALID);
  }

  const hasRemark = remark !== undefined && remark !== null;
  const remarkValue = hasRemark ? (String(remark).trim() || null) : null;
  const newStatus = endDate ? 'ended' : 'in_progress';
  const endedAt = endDate ? `${endDate} 23:59:59` : null;

  if (recordType === 'attendance') {
    const rows = await db.query(
      `SELECT id, applicant_id, trip_started_at FROM attendance_leave_requests
       WHERE id = ? AND request_type = 'biz_trip'`,
      [recordId]
    );
    if (!rows.length) throw new BusinessError('出差记录不存在', null, ErrorCode.ATTENDANCE_LEAVE_NOT_FOUND);
    const record = rows[0];
    const oldStart = toDateStr(record.trip_started_at);

    if (!endDate) {
      const conflict = await db.query(
        `SELECT id FROM attendance_leave_requests
         WHERE applicant_id = ? AND request_type = 'biz_trip' AND status = 'in_progress' AND id <> ? LIMIT 1`,
        [record.applicant_id, recordId]
      );
      if (conflict.length > 0) {
        throw new BusinessError('该员工已有其他进行中的出差，请先结束', null, ErrorCode.ATTENDANCE_TRIP_ALREADY_ACTIVE);
      }
    }

    await db.transaction(async (conn) => {
      await conn.execute(
        `UPDATE attendance_leave_requests
         SET trip_started_at = ?, trip_ended_at = ?, status = ?, reason = ${hasRemark ? '?' : 'reason'}
         WHERE id = ?`,
        [`${startDate} ${timePart(record.trip_started_at)}`, endedAt, newStatus, ...(hasRemark ? [remarkValue] : []), recordId]
      );

      const pairedResult = await conn.execute(
        `SELECT id FROM biz_trip_status
         WHERE user_id = ? AND start_date = ? AND status <> 'cancelled' LIMIT 1`,
        [record.applicant_id, oldStart]
      );
      const paired = pairedResult[0];
      if (paired.length > 0) {
        await conn.execute(
          `UPDATE biz_trip_status
           SET start_date = ?, end_date = ?, status = ?, project_name = ${hasRemark ? '?' : 'project_name'}, updated_at = NOW()
           WHERE id = ?`,
          [startDate, endDate || null, endDate ? 'completed' : 'active', ...(hasRemark ? [remarkValue] : []), paired[0].id]
        );
      }
    });

    return { recordType, recordId, startDate, endDate: endDate || null, status: newStatus };
  }

  const rows = await db.query(
    'SELECT id, user_id, start_date FROM biz_trip_status WHERE id = ?',
    [recordId]
  );
  if (!rows.length) throw new BusinessError('出差记录不存在', null, ErrorCode.ATTENDANCE_LEAVE_NOT_FOUND);
  const record = rows[0];
  const oldStart = toDateStr(record.start_date);

  const pairedRows = await db.query(
    `SELECT id, trip_started_at FROM attendance_leave_requests
     WHERE applicant_id = ? AND request_type = 'biz_trip' AND DATE(trip_started_at) = ? AND status <> 'cancelled'
     LIMIT 1`,
    [record.user_id, oldStart]
  );
  const paired = pairedRows.length ? pairedRows[0] : null;

  if (!endDate) {
    const conflict = await db.query(
      `SELECT id FROM attendance_leave_requests
       WHERE applicant_id = ? AND request_type = 'biz_trip' AND status = 'in_progress' AND id <> ? LIMIT 1`,
      [record.user_id, paired ? paired.id : 0]
    );
    if (conflict.length > 0) {
      throw new BusinessError('该员工已有其他进行中的出差，请先结束', null, ErrorCode.ATTENDANCE_TRIP_ALREADY_ACTIVE);
    }
  }

  await db.transaction(async (conn) => {
    await conn.execute(
      `UPDATE biz_trip_status
       SET start_date = ?, end_date = ?, status = ?, project_name = ${hasRemark ? '?' : 'project_name'}, updated_at = NOW()
       WHERE id = ?`,
      [startDate, endDate || null, endDate ? 'completed' : 'active', ...(hasRemark ? [remarkValue] : []), recordId]
    );

    if (paired) {
      await conn.execute(
        `UPDATE attendance_leave_requests
         SET trip_started_at = ?, trip_ended_at = ?, status = ?, reason = ${hasRemark ? '?' : 'reason'}
         WHERE id = ?`,
        [`${startDate} ${timePart(paired.trip_started_at)}`, endedAt, newStatus, ...(hasRemark ? [remarkValue] : []), paired.id]
      );
    }
  });

  return { recordType, recordId, startDate, endDate: endDate || null, status: newStatus };
}

/**
 * 管理员查看全员出差状态。
 * @param {Object} params - 查询参数
 * @param {string} [params.keyword] - 姓名/工号/部门关键字
 * @param {string} [params.status] - in_progress / none
 * @param {number} [params.departmentId] - 部门（含子部门）
 * @param {string} [params.sortBy] - default（工号）/ startDate / days
 * @param {string} [params.sortOrder] - asc / desc（默认 desc）
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.pageSize=20] - 每页条数
 * @returns {Promise<Object>} { list, total, page, pageSize, summary }
 */
async function adminTripStatusList({ keyword, status, departmentId, sortBy, sortOrder, page = 1, pageSize = 20 }) {
  const conditions = ["u.status = 'active'", 'u.deleted_at IS NULL'];
  const params = [];

  if (keyword) {
    conditions.push('(u.nickname LIKE ? OR u.user_name LIKE ? OR u.worker_code LIKE ? OR d.name LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw);
  }
  if (departmentId) {
    const deptIds = await expandDepartmentIds(departmentId);
    conditions.push(`u.department_id IN (${deptIds.map(() => '?').join(',')})`);
    params.push(...deptIds);
  }

  // 有效出差条件与列表 tripStatus 计算口径一致：
  // 出差中 = 进行中的考勤出差，或未被已结束考勤出差覆盖的有效合规出差（排除残留）
  const activeAttendanceSql = `EXISTS (SELECT 1 FROM attendance_leave_requests a
    WHERE a.applicant_id = u.id AND a.request_type = 'biz_trip' AND a.status = 'in_progress')`;
  const activeComplianceSql = `EXISTS (SELECT 1 FROM biz_trip_status b
    WHERE b.user_id = u.id AND b.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM attendance_leave_requests a2
                      WHERE a2.applicant_id = u.id AND a2.request_type = 'biz_trip'
                        AND a2.status = 'ended'
                        AND b.start_date BETWEEN DATE(a2.trip_started_at) AND COALESCE(DATE(a2.trip_ended_at), CURDATE())))`;

  if (status === 'in_progress') {
    conditions.push(`(${activeAttendanceSql} OR ${activeComplianceSql})`);
  } else if (status === 'none') {
    conditions.push(`(NOT ${activeAttendanceSql} AND NOT ${activeComplianceSql})`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * pageSize;
  const countRows = await db.query(
    `SELECT COUNT(*) AS total FROM users u
     LEFT JOIN departments d ON u.department_id = d.id ${where}`,
    params
  );

  // 汇总（不受筛选影响）：实时掌握出差中 / 未出差人数
  const summaryRows = await db.query(
    `SELECT
       SUM(CASE WHEN (${activeAttendanceSql} OR ${activeComplianceSql}) THEN 1 ELSE 0 END) AS inProgress,
       SUM(CASE WHEN (NOT ${activeAttendanceSql} AND NOT ${activeComplianceSql}) THEN 1 ELSE 0 END) AS none
     FROM users u
     WHERE u.status = 'active' AND u.deleted_at IS NULL`
  );
  // 排序：默认工号；可按出差开始日期 / 已持续天数（口径与列表展示一致）
  const order = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const tripStartExpr = `COALESCE(
    (SELECT MAX(a.trip_started_at) FROM attendance_leave_requests a
     WHERE a.applicant_id = u.id AND a.request_type = 'biz_trip' AND a.status = 'in_progress'),
    (SELECT MAX(b.start_date) FROM biz_trip_status b
     WHERE b.user_id = u.id AND b.status = 'active'
       AND NOT EXISTS (SELECT 1 FROM attendance_leave_requests a2
                       WHERE a2.applicant_id = u.id AND a2.request_type = 'biz_trip'
                         AND a2.status = 'ended'
                         AND b.start_date BETWEEN DATE(a2.trip_started_at) AND COALESCE(DATE(a2.trip_ended_at), CURDATE())))
  )`;
  let orderBy = 'u.worker_code IS NULL, u.worker_code, u.id';
  if (sortBy === 'startDate') {
    orderBy = `(${tripStartExpr}) IS NULL, (${tripStartExpr}) ${order}, u.id`;
  } else if (sortBy === 'days') {
    orderBy = `(${tripStartExpr}) IS NULL, DATEDIFF(CURDATE(), (${tripStartExpr})) ${order}, u.id`;
  }

  const rows = await db.query(
    `SELECT u.id, u.nickname, u.user_name, u.worker_code, u.position, d.name AS departmentName
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, parseInt(pageSize), offset]
  );

  const ids = rows.map(r => r.id);
  const tripMap = {};
  const complianceMap = {};
  const endedTripMap = {}; // 用户已结束的考勤出差列表（用于残留判定）
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

    const endedTrips = await db.query(
      `SELECT applicant_id, trip_started_at, trip_ended_at
       FROM attendance_leave_requests
       WHERE applicant_id IN (${ids.map(() => '?').join(',')})
         AND request_type = 'biz_trip' AND status = 'ended'
       ORDER BY trip_started_at DESC`,
      ids
    );
    endedTrips.forEach(t => {
      if (!endedTripMap[t.applicant_id]) endedTripMap[t.applicant_id] = [];
      endedTripMap[t.applicant_id].push(t);
    });
  }

  const list = rows.map(row => {
    const trip = tripMap[row.id];
    const compliance = complianceMap[row.id];
    let tripStatus = trip ? 'in_progress' : (compliance ? 'compliance_only' : 'none');
    // 残留守卫：无进行中考勤出差，但合规记录的开始日期被已结束考勤出差覆盖 → 合规记录为残留，不显示「出差中」
    if (!trip && compliance) {
      const endedTrips = endedTripMap[row.id] || [];
      const cs = toDateStr(compliance.start_date);
      const isResidual = cs && endedTrips.some(t => {
        const es = toDateStr(t.trip_started_at);
        const ee = toDateStr(t.trip_ended_at) || beijingToday();
        return es && cs >= es && cs <= ee;
      });
      if (isResidual) tripStatus = 'none';
    }
    const tripStartDate = trip
      ? toDateStr(trip.trip_started_at)
      : (compliance ? toDateStr(compliance.start_date) : null);
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
      tripDays: tripStartDate && tripStatus !== 'none' ? calcTripDays(tripStartDate, beijingToday()) : null,
      reason: trip ? trip.reason : null,
      source: trip ? trip.source : (compliance ? 'compliance' : null),
    };
  });

  return {
    list,
    total: countRows[0].total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    totalPages: Math.ceil(countRows[0].total / parseInt(pageSize)) || 0,
    summary: {
      inProgress: Number(summaryRows[0].inProgress) || 0,
      none: Number(summaryRows[0].none) || 0,
    },
  };
}

module.exports = {
  startTrip,
  endTrip,
  adminStartTrip,
  adminEndTrip,
  adminTripStatusList,
  adminTripRecords,
  adminUpdateTripRecord,
};
