'use strict';

const db = require('../../../common/config/database');
const { BusinessError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');
const { calcMissingDates } = require('./leave.service');

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

async function endTrip({ applicantId, requestId, reason }) {
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

  const tripStart = new Date(trip.trip_started_at);
  const tripEnd = new Date();
  const missingDates = await calcMissingDates(applicantId, tripStart, tripEnd);
  const tripDays = Math.ceil((tripEnd - tripStart) / (1000 * 60 * 60 * 24)) + 1;

  await db.execute(
    `UPDATE attendance_leave_requests SET trip_ended_at = NOW(), status = 'ended', reason = COALESCE(NULLIF(?, ''), reason) WHERE id = ?`,
    [reason || null, trip.id]
  );

  // 发送消息通知
  const missingText = missingDates.length > 0 ? `，未提交 ${missingDates.length} 天` : '';
  await sendMessage(applicantId, '出差已结束', `共 ${tripDays} 天${missingText}`, reason || '');

  return {
    requestId: trip.id,
    tripStartedAt: trip.trip_started_at,
    tripEndedAt: new Date().toISOString(),
    tripDays,
    missingDays: missingDates.length,
    missingDates,
    status: 'ended',
  };
}

module.exports = { startTrip, endTrip };