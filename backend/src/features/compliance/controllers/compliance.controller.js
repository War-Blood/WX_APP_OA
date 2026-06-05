'use strict';

const complianceService = require('../services/compliance.service');
const reminderService = require('../services/reminder.service');
const statsService = require('../services/stats.service');
const db = require('../../../common/config/database');

/**
 * 设置出差状态
 */
async function setBizTripStatus(req, res, next) {
  try {
    const { userId, projectName, startDate } = req.body;
    const createdBy = req.user.userId;

    if (!userId || !startDate) {
      return res.status(400).json({ code: 1001, message: '缺少必要参数', data: null });
    }

    const result = await db.query(
      `INSERT INTO biz_trip_status (user_id, project_name, start_date, status, created_by)
       VALUES (?, ?, ?, 'active', ?)`,
      [userId, projectName || null, startDate, createdBy]
    );

    res.json({ code: 0, message: '出差状态设置成功', data: { id: result.insertId } });
  } catch (err) {
    next(err);
  }
}

/**
 * 结束出差
 */
async function endBizTrip(req, res, next) {
  try {
    const { id } = req.params;
    const { endDate } = req.body;

    if (!endDate) {
      return res.status(400).json({ code: 1001, message: '缺少结束日期', data: null });
    }

    await db.query(
      `UPDATE biz_trip_status SET end_date = ?, status = 'completed', updated_at = NOW() WHERE id = ?`,
      [endDate, id]
    );

    res.json({ code: 0, message: '出差已结束', data: null });
  } catch (err) {
    next(err);
  }
}

/**
 * 获取出差列表
 */
async function getBizTripList(req, res, next) {
  try {
    const { status = 'active', page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    const rows = await db.query(
      `SELECT bts.*, u.user_name as user_name, u.avatar
       FROM biz_trip_status bts
       JOIN users u ON bts.user_id = u.id
       WHERE bts.status = ?
       ORDER BY bts.start_date DESC
       LIMIT ? OFFSET ?`,
      [status, parseInt(pageSize), offset]
    );

    const [countRows] = await db.query(
      'SELECT COUNT(*) as total FROM biz_trip_status WHERE status = ?',
      [status]
    );

    res.json({
      code: 0,
      message: 'success',
      data: {
        list: rows,
        total: countRows[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 获取缺失报告列表
 */
async function getMissingReports(req, res, next) {
  try {
    const { page, pageSize, startDate, endDate } = req.query;

    const result = await complianceService.getMissingReportsForReview({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      startDate,
      endDate
    });

    res.json({ code: 0, message: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * 审核缺失报告
 */
async function reviewMissingReport(req, res, next) {
  try {
    const { id } = req.params;
    const { action, comment } = req.body;
    const reviewerId = req.user.userId;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ code: 1001, message: '无效的审核操作', data: null });
    }

    const result = await complianceService.reviewMissingReport({
      complianceId: parseInt(id),
      reviewerId,
      action,
      comment
    });

    res.json({ code: 0, message: result.message, data: null });
  } catch (err) {
    next(err);
  }
}

/**
 * 手动修正及时性
 */
async function updateTimeliness(req, res, next) {
  try {
    const { id } = req.params;
    const { timeliness } = req.body;
    const operatorId = req.user.userId;

    if (!timeliness || !['on_time', 'delayed', 'missing'].includes(timeliness)) {
      return res.status(400).json({ code: 1001, message: '无效的及时性类型', data: null });
    }

    const result = await complianceService.updateTimeliness({
      complianceId: parseInt(id),
      timeliness,
      operatorId
    });

    res.json({ code: 0, message: result.message, data: null });
  } catch (err) {
    next(err);
  }
}

/**
 * 获取合规统计看板
 */
async function getDashboard(req, res, next) {
  try {
    const { startDate, endDate } = req.query;

    const result = await statsService.getComplianceDashboard({
      startDate,
      endDate
    });

    res.json({ code: 0, message: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * 获取我的合规记录
 */
async function getMyCompliance(req, res, next) {
  try {
    const userId = req.user.userId;

    // 获取用户名
    const [userRows] = await db.query('SELECT user_name FROM users WHERE id = ?', [userId]);
    const userName = userRows && userRows.length > 0 ? userRows[0].user_name : '';

    // 获取本月统计
    const stats = await statsService.getUserComplianceStats(userId);

    // 通过 worker_compliance 找到用户参与的合规记录
    const rows = await db.query(
      `SELECT rc.*, dr.content, dr.project as dr_project
       FROM worker_compliance wc
       JOIN report_compliance rc ON wc.compliance_id = rc.id
       LEFT JOIN daily_reports dr ON rc.report_id = dr.id
       WHERE wc.worker_name = ?
       ORDER BY rc.report_date DESC
       LIMIT 50`,
      [userName]
    );

    res.json({
      code: 0,
      message: 'success',
      data: { stats, records: rows }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 检查我的出差状态
 */
async function checkMyBizTripStatus(req, res, next) {
  try {
    const userId = req.user.userId;

    const rows = await db.query(
      `SELECT * FROM biz_trip_status WHERE user_id = ? AND status = 'active' ORDER BY start_date DESC LIMIT 1`,
      [userId]
    );

    res.json({
      code: 0,
      message: 'success',
      data: {
        isOnTrip: rows && rows.length > 0,
        tripInfo: rows[0] || null
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 测试发送提醒(仅用于调试)
 */
async function testSendReminder(req, res, next) {
  try {
    const { timeSlot = '22:00' } = req.query;
    const result = await reminderService.sendTripReminders(timeSlot);

    res.json({
      code: 0,
      message: '提醒发送完成',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  setBizTripStatus,
  endBizTrip,
  getBizTripList,
  getMissingReports,
  reviewMissingReport,
  updateTimeliness,
  getDashboard,
  getMyCompliance,
  checkMyBizTripStatus,
  testSendReminder
};
