'use strict';

const db = require('../../../common/config/database');
const { BusinessError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');
const { beijingToday, beijingDate, beijingNow } = require('../../../common/utils/date');

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

    return { requestId, days, status: 'active' };
  }).then(async (result) => {
    // 非事务：自动生成请假公出日志，避免每日标记为"未提交"
    try {
      await generateLeaveReports(applicantId, startDate, endDate);
    } catch (e) { /* 公出日志生成失败不影响主流程 */ }
    // 发送消息通知
    await sendMessage(applicantId, '请假申请已生效', `${leaveSubtype} · ${startDate} → ${endDate}（${days}天）`, reason || '');
    return result;
  });
}

/**
 * 自动生成请假期间的公出日志（today_work_type='请假', report_type='office'）
 * 避免请假人员在公出统计中被标记为"未提交"
 */
async function generateLeaveReports(userId, startDate, endDate) {
  const cur = new Date(startDate + 'T00:00:00+08:00');
  const end = new Date(endDate + 'T00:00:00+08:00');
  const inserts = [];
  while (cur <= end) {
    const ds = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
    // 使用 ON DUPLICATE KEY 避免重复创建
    inserts.push([userId, ds]);
    cur.setDate(cur.getDate() + 1);
  }
  if (inserts.length === 0) return;
  const placeholders = inserts.map(() => '(?,?)').join(',');
  await db.execute(
    `INSERT INTO daily_reports (user_id, report_date, report_type, today_work_type, project, status)
     VALUES ${inserts.map(() => "(?,?,'office','请假','请假','approved')").join(',')}
     ON DUPLICATE KEY UPDATE today_work_type='请假', report_type='office'`,
    inserts.flatMap(([uid, ds]) => [uid, ds])
  );
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
    const d = new Date(req.end_date);
    const endStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (endStr < beijingToday()) throw new BusinessError('请假已结束，不可撤销', null, ErrorCode.ATTENDANCE_CANNOT_CANCEL);
  }

  return db.transaction(async (conn) => {
    await conn.execute(
      `UPDATE attendance_leave_requests SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?`, [requestId]
    );
    return { cancelledAt: new Date().toISOString() };
  }).then(async (result) => {
    // 清除自动生成的请假公出日志
    try {
      if (req.start_date && req.end_date) {
        const s = new Date(req.start_date);
        const e = new Date(req.end_date);
        const startStr = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
        const endStr = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
        await db.execute(
          `DELETE FROM daily_reports WHERE user_id = ? AND report_date BETWEEN ? AND ? AND today_work_type = '请假' AND report_type = 'office'`,
          [applicantId, startStr, endStr]
        );
      }
    } catch (e) { /* 清理失败不影响主流程 */ }
    const ds = new Date(req.start_date);
    const de = new Date(req.end_date);
    const startDateStr = `${ds.getFullYear()}-${String(ds.getMonth() + 1).padStart(2, '0')}-${String(ds.getDate()).padStart(2, '0')}`;
    const endDateStr = `${de.getFullYear()}-${String(de.getMonth() + 1).padStart(2, '0')}-${String(de.getDate()).padStart(2, '0')}`;
    const dateRange = `${startDateStr} → ${endDateStr}`;
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

/**
 * 管理员查询全员请假/出差记录
 */
async function adminList({ requestType, status, keyword, page = 1, pageSize = 20 }) {
  const conditions = [];
  const params = [];
  if (requestType) { conditions.push('lr.request_type = ?'); params.push(requestType); }
  if (status) { conditions.push('lr.status = ?'); params.push(status); }
  if (keyword) {
    conditions.push('(u.nickname LIKE ? OR u.user_name LIKE ?)');
    const kw = `%${keyword}%`; params.push(kw, kw);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const offset = (page - 1) * pageSize;

  const countRows = await db.query(
    `SELECT COUNT(*) AS total FROM attendance_leave_requests lr JOIN users u ON lr.applicant_id = u.id ${where}`, params
  );
  const list = await db.query(
    `SELECT lr.*, u.nickname AS applicantName FROM attendance_leave_requests lr
     JOIN users u ON lr.applicant_id = u.id
     ${where} ORDER BY lr.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    list: list.map(r => ({ ...formatRequest(r), applicantName: r.applicantName })),
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
    result.missingDates = await calcMissingDates(req.applicant_id, req.trip_started_at, beijingNow());
  } else if (req.request_type === 'biz_trip' && req.status === 'ended') {
    result.missingDates = await calcMissingDates(req.applicant_id, req.trip_started_at, req.trip_ended_at);
  }

  return result;
}

// ---- 工具函数 ----

function calcDays(start, end) {
  const diff = new Date(end) - new Date(start);
  return Math.round((diff / (1000 * 60 * 60 * 24) + 1) * 10) / 10;
}

/**
 * 将 MySQL Date 对象格式化为北京时间 YYYY-MM-DD 字符串
 */
function fmtDate(d) {
  if (!d) return null;
  // 统一用北京时间避免服务器 UTC 偏移
  const offset = new Date(d).getTimezoneOffset() + 480;
  const bj = new Date(new Date(d).getTime() + offset * 60000);
  return `${bj.getFullYear()}-${String(bj.getMonth() + 1).padStart(2, '0')}-${String(bj.getDate()).padStart(2, '0')}`;
}

function formatRequest(r) {
  // 请假已过期（end_date 已过且 status 仍为 active）→ 视为已结束
  let status = r.status;
  if (r.request_type === 'leave' && r.status === 'active' && r.end_date) {
    const todayStr = beijingToday();
    const endStr = fmtDate(r.end_date);
    if (endStr && endStr < todayStr) status = 'ended';
  }
  return {
    id: r.id,
    applicantId: r.applicant_id,
    requestType: r.request_type,
    leaveSubtype: r.leave_subtype,
    startDate: fmtDate(r.start_date),
    endDate: fmtDate(r.end_date),
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
  const startStr = fmtDate(start);
  const endStr = fmtDate(end);
  const reports = await db.query(
    `SELECT report_date FROM daily_reports
     WHERE user_id = ? AND report_date BETWEEN ? AND ?
       AND status != 'draft' AND deleted_at IS NULL AND report_type != 'office'`,
    [userId, startStr, endStr]
  );
  const reportDates = new Set(reports.map(r => fmtDate(r.report_date)));

  const leaves = await db.query(
    `SELECT start_date, end_date FROM attendance_leave_requests
     WHERE applicant_id = ? AND request_type = 'leave' AND status = 'active'`,
    [userId]
  );

  // 统一用北京时间的日期边界
  const cur = beijingDate(startStr);
  const finish = beijingDate(endStr);
  while (cur <= finish) {
    const ds = fmtDate(cur);
    const hasReport = reportDates.has(ds);
    const hasLeave = leaves.some(l => {
      const ls = fmtDate(l.start_date);
      const le = fmtDate(l.end_date);
      return ds >= ls && ds <= le;
    });
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
    // 创建新申请
    const result = await conn.execute(
      `INSERT INTO attendance_leave_requests (applicant_id, request_type, leave_subtype, start_date, end_date, days, reason, status, source)
       VALUES (?, 'leave', ?, ?, ?, ?, ?, 'active', 'self')`,
      [applicantId, leaveSubtype, startDate, endDate, days, reason]
    );
    const newRequestId = result[0].insertId;
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
    await conn.execute('DELETE FROM attendance_leave_requests WHERE id = ?', [requestId]);
    return { deleted: true };
  });
}

module.exports = { apply, cancel, myList, adminList, detail, calcMissingDates, updateRequest, deleteRequest };