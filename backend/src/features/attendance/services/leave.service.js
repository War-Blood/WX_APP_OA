'use strict';

const db = require('../../../common/config/database');
const { BusinessError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');
const { beijingToday } = require('../../../common/utils/date');

/**
 * 请假服务 — apply / cancel / list / detail
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

async function apply({ applicantId, leaveSubtype, startDate, endDate, reason }) {
  if (!leaveSubtype) throw new BusinessError('请假必须指定子类型', null, ErrorCode.ATTENDANCE_LEAVE_SUBTYPE_REQUIRED);
  const VALID_TYPES = ['annual', 'sick', 'personal', 'marriage', 'funeral', 'other'];
  if (!VALID_TYPES.includes(leaveSubtype)) throw new BusinessError('无效的请假类型', null, ErrorCode.ATTENDANCE_LEAVE_SUBTYPE_REQUIRED);
  if (endDate < startDate) throw new BusinessError('结束日期不能早于起始日期', null, ErrorCode.ATTENDANCE_DATE_INVALID);

  const days = calcDays(startDate, endDate);

  return db.transaction(async (conn) => {
    const result = await conn.execute(
      `INSERT INTO attendance_leave_requests (applicant_id, request_type, leave_subtype, start_date, end_date, days, reason, status, source)
       VALUES (?, 'leave', ?, ?, ?, ?, ?, 'active', 'self')`,
      [applicantId, leaveSubtype, startDate, endDate, days, reason]
    );
    const requestId = result[0].insertId;

    // 逐日覆盖排班
    const cur = new Date(startDate);
    const end = new Date(endDate);
    while (cur <= end) {
      const dateStr = cur.toISOString().slice(0, 10);
      await conn.execute(
        `INSERT INTO attendance_schedules (user_id, schedule_date, status, created_by)
         VALUES (?, ?, 'leave', ?)
         ON DUPLICATE KEY UPDATE status = 'leave', updated_at = NOW()`,
        [applicantId, dateStr, applicantId]
      );
      cur.setDate(cur.getDate() + 1);
    }

    return { requestId, days, status: 'active' };
  }).then(async (result) => {
    // 非事务：发送消息通知
    await sendMessage(applicantId, '请假申请已生效', `${leaveSubtype} · ${startDate} → ${endDate}（${days}天）`, reason || '');
    return result;
  });
}

async function cancel(requestId, applicantId) {
  const rows = await db.query('SELECT * FROM attendance_leave_requests WHERE id = ?', [requestId]);
  if (!rows.length) throw new BusinessError('申请单不存在', null, ErrorCode.ATTENDANCE_LEAVE_NOT_FOUND);

  const req = rows[0];
  if (req.request_type === 'biz_trip') throw new BusinessError('出差不可撤销，请使用结束打卡', null, ErrorCode.ATTENDANCE_TRIP_CANNOT_CANCEL);
  if (req.applicant_id !== applicantId) throw new BusinessError('无权操作', null, 1001);
  if (req.status !== 'active') throw new BusinessError('申请已撤销不可重复撤销', null, ErrorCode.ATTENDANCE_CANNOT_CANCEL);

  // 请假已结束（end_date 已过）不可撤销
  if (req.request_type === 'leave' && req.end_date) {
    const endStr = req.end_date.toISOString ? req.end_date.toISOString().slice(0, 10) : String(req.end_date).slice(0, 10);
    if (endStr < beijingToday()) throw new BusinessError('请假已结束，不可撤销', null, ErrorCode.ATTENDANCE_CANNOT_CANCEL);
  }

  return db.transaction(async (conn) => {
    await conn.execute(
      `UPDATE attendance_leave_requests SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?`, [requestId]
    );
    // 恢复排班
    const cur = new Date(req.start_date);
    const end = new Date(req.end_date);
    while (cur <= end) {
      const dateStr = cur.toISOString().slice(0, 10);
      await conn.execute(
        `UPDATE attendance_schedules SET status = 'work', updated_at = NOW() WHERE user_id = ? AND schedule_date = ?`,
        [applicantId, dateStr]
      );
      cur.setDate(cur.getDate() + 1);
    }
    return { cancelledAt: new Date().toISOString() };
  }).then(async (result) => {
    const dateRange = `${req.start_date.toISOString().slice(0, 10)} → ${req.end_date.toISOString().slice(0, 10)}`;
    await sendMessage(applicantId, '请假申请已撤销', dateRange, '');
    return result;
  });
}

async function myList({ applicantId, requestType, status, page = 1, pageSize = 10 }) {
  const conditions = ['lr.applicant_id = ?'];
  const params = [applicantId];
  if (requestType) { conditions.push('lr.request_type = ?'); params.push(requestType); }
  if (status) { conditions.push('lr.status = ?'); params.push(status); }

  const where = conditions.join(' AND ');
  const offset = (page - 1) * pageSize;

  const countRows = await db.query(`SELECT COUNT(*) AS total FROM attendance_leave_requests lr WHERE ${where}`, params);
  const list = await db.query(`SELECT * FROM attendance_leave_requests lr WHERE ${where} ORDER BY lr.created_at DESC LIMIT ? OFFSET ?`, [...params, pageSize, offset]);

  return {
    list: list.map(formatRequest),
    total: countRows[0].total, page, pageSize, totalPages: Math.ceil(countRows[0].total / pageSize),
  };
}

async function detail(requestId) {
  const rows = await db.query(
    `SELECT lr.*, u.nickname AS applicantName, d.name AS departmentName
     FROM attendance_leave_requests lr
     JOIN users u ON lr.applicant_id = u.id
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE lr.id = ?`, [requestId]
  );
  if (!rows.length) throw new BusinessError('申请单不存在', null, ErrorCode.ATTENDANCE_LEAVE_NOT_FOUND);

  const req = rows[0];
  const result = formatRequest(req);
  result.applicantName = req.applicantName;
  result.departmentName = req.departmentName;

  // 出差进行中 → 计算未提交日期
  if (req.request_type === 'biz_trip' && req.status === 'in_progress') {
    result.missingDates = await calcMissingDates(req.applicant_id, new Date(req.trip_started_at), new Date());
  } else if (req.request_type === 'biz_trip' && req.status === 'ended') {
    result.missingDates = await calcMissingDates(req.applicant_id, new Date(req.trip_started_at), new Date(req.trip_ended_at));
  }

  return result;
}

// ---- 工具函数 ----

function calcDays(start, end) {
  const diff = new Date(end) - new Date(start);
  return Math.round((diff / (1000 * 60 * 60 * 24) + 1) * 10) / 10;
}

function formatRequest(r) {
  // 请假已过期（end_date 已过且 status 仍为 active）→ 视为已结束
  let status = r.status;
  if (r.request_type === 'leave' && r.status === 'active' && r.end_date) {
    const todayStr = beijingToday();
    const endStr = r.end_date.toISOString ? r.end_date.toISOString().slice(0, 10) : String(r.end_date).slice(0, 10);
    if (endStr < todayStr) status = 'ended';
  }
  return {
    id: r.id,
    applicantId: r.applicant_id,
    requestType: r.request_type,
    leaveSubtype: r.leave_subtype,
    startDate: r.start_date ? r.start_date.toISOString().slice(0, 10) : null,
    endDate: r.end_date ? r.end_date.toISOString().slice(0, 10) : null,
    days: r.days,
    tripStartedAt: r.trip_started_at,
    tripEndedAt: r.trip_ended_at,
    reason: r.reason,
    status,
    source: r.source,
    createdAt: r.created_at,
  };
}

async function calcMissingDates(userId, start, end) {
  const dates = [];
  const reports = await db.query(
    `SELECT report_date FROM daily_reports
     WHERE user_id = ? AND report_date BETWEEN ? AND ?
       AND status = 'approved' AND report_type != 'office'`,
    [userId, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
  );
  const reportDates = new Set(reports.map(r => r.report_date.toISOString().slice(0, 10)));

  const leaves = await db.query(
    `SELECT start_date, end_date FROM attendance_leave_requests
     WHERE applicant_id = ? AND request_type = 'leave' AND status = 'active'`,
    [userId]
  );

  const cur = new Date(start);
  while (cur <= end) {
    const ds = cur.toISOString().slice(0, 10);
    const hasReport = reportDates.has(ds);
    const hasLeave = leaves.some(l => ds >= l.start_date.toISOString().slice(0, 10) && ds <= l.end_date.toISOString().slice(0, 10));
    if (!hasReport && !hasLeave) dates.push(ds);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/**
 * 修改请假申请 — 事务内：取消旧申请 → 创建新申请 → 覆盖排班
 */
async function updateRequest(requestId, applicantId, { leaveSubtype, startDate, endDate, reason }) {
  if (!leaveSubtype) throw new BusinessError('请假必须指定子类型', null, ErrorCode.ATTENDANCE_LEAVE_SUBTYPE_REQUIRED);
  if (endDate < startDate) throw new BusinessError('结束日期不能早于起始日期', null, ErrorCode.ATTENDANCE_DATE_INVALID);

  const rows = await db.query('SELECT * FROM attendance_leave_requests WHERE id = ?', [requestId]);
  if (!rows.length) throw new BusinessError('申请单不存在', null, ErrorCode.ATTENDANCE_LEAVE_NOT_FOUND);

  const req = rows[0];
  if (req.request_type !== 'leave') throw new BusinessError('仅请假可修改');
  if (req.applicant_id !== applicantId) throw new BusinessError('无权操作', null, 1001);
  if (req.status !== 'active') throw new BusinessError('仅生效中的申请可修改');

  const days = calcDays(startDate, endDate);

  return db.transaction(async (conn) => {
    // 1. 取消旧申请
    await conn.execute(
      'UPDATE attendance_leave_requests SET status = ?, cancelled_at = NOW() WHERE id = ?',
      ['cancelled', requestId]
    );
    // 2. 恢复旧排班
    const oldCur = new Date(req.start_date);
    const oldEnd = new Date(req.end_date);
    while (oldCur <= oldEnd) {
      const ds = oldCur.toISOString().slice(0, 10);
      await conn.execute(
        'UPDATE attendance_schedules SET status = ?, updated_at = NOW() WHERE user_id = ? AND schedule_date = ?',
        ['work', applicantId, ds]
      );
      oldCur.setDate(oldCur.getDate() + 1);
    }
    // 3. 创建新申请
    const result = await conn.execute(
      `INSERT INTO attendance_leave_requests (applicant_id, request_type, leave_subtype, start_date, end_date, days, reason, status, source)
       VALUES (?, 'leave', ?, ?, ?, ?, ?, 'active', 'self')`,
      [applicantId, leaveSubtype, startDate, endDate, days, reason]
    );
    const newRequestId = result[0].insertId;
    // 4. 新排班覆盖
    const newCur = new Date(startDate);
    const newEnd = new Date(endDate);
    while (newCur <= newEnd) {
      const ds = newCur.toISOString().slice(0, 10);
      await conn.execute(
        `INSERT INTO attendance_schedules (user_id, schedule_date, status, created_by)
         VALUES (?, ?, 'leave', ?)
         ON DUPLICATE KEY UPDATE status = 'leave', updated_at = NOW()`,
        [applicantId, ds, applicantId]
      );
      newCur.setDate(newCur.getDate() + 1);
    }
    return { requestId: newRequestId, days, status: 'active' };
  });
}

/**
 * 删除请假/出差记录（管理员）— 仅已撤销/已结束的可删，恢复排班
 * @param {number} requestId
 */
async function deleteRequest(requestId) {
  const rows = await db.query('SELECT * FROM attendance_leave_requests WHERE id = ?', [requestId]);
  if (!rows.length) throw new BusinessError('申请单不存在', null, ErrorCode.ATTENDANCE_LEAVE_NOT_FOUND);

  const req = rows[0];
  if (req.status !== 'cancelled' && req.status !== 'ended') {
    throw new BusinessError('仅已撤销/已结束的记录可删除');
  }

  return db.transaction(async (conn) => {
    // 若是请假，恢复排班
    if (req.request_type === 'leave' && req.start_date && req.end_date) {
      const cur = new Date(req.start_date);
      const end = new Date(req.end_date);
      while (cur <= end) {
        const dateStr = cur.toISOString().slice(0, 10);
        await conn.execute(
          'UPDATE attendance_schedules SET status = ?, updated_at = NOW() WHERE user_id = ? AND schedule_date = ?',
          ['work', req.applicant_id, dateStr]
        );
        cur.setDate(cur.getDate() + 1);
      }
    }
    await conn.execute('DELETE FROM attendance_leave_requests WHERE id = ?', [requestId]);
    return { deleted: true };
  });
}

module.exports = { apply, cancel, myList, detail, calcMissingDates, updateRequest, deleteRequest };