'use strict';

const db = require('../../../common/config/database');
const logger = require('../../../common/utils/logger');

/**
 * 更新月度合规统计(按人员维度,从 worker_compliance 聚合)
 * @param {string} workerName - 作业人员姓名
 * @param {string} month - 月份 (YYYY-MM)
 */
async function updateMonthlyStats(workerName, month) {
  try {
    const rows = await db.query(
      `SELECT 
         COUNT(*) as total_reports,
         SUM(CASE WHEN timeliness = 'on_time' THEN 1 ELSE 0 END) as on_time_count,
         SUM(CASE WHEN timeliness = 'delayed' THEN 1 ELSE 0 END) as delayed_count,
         SUM(CASE WHEN timeliness = 'missing' THEN 1 ELSE 0 END) as missing_count
       FROM worker_compliance
       WHERE worker_name = ? AND DATE_FORMAT(report_date, '%Y-%m') = ?`,
      [workerName, month]
    );

    if (!rows || rows.length === 0) return;

    const stats = rows[0];
    const onTimeRate = stats.total_reports > 0
      ? ((stats.on_time_count / stats.total_reports) * 100).toFixed(2)
      : 0;

    // 查找 user_id (by user_name)
    const [userRows] = await db.query(
      'SELECT id FROM users WHERE user_name = ?',
      [workerName]
    );
    const userId = userRows && userRows.length > 0 ? userRows[0].id : null;
    if (!userId) return;

    await db.query(
      `INSERT INTO user_compliance_stats 
       (user_id, stat_month, total_reports, on_time_count, delayed_count, missing_count, on_time_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_reports = VALUES(total_reports),
         on_time_count = VALUES(on_time_count),
         delayed_count = VALUES(delayed_count),
         missing_count = VALUES(missing_count),
         on_time_rate = VALUES(on_time_rate)`,
      [userId, month, stats.total_reports, stats.on_time_count, stats.delayed_count, stats.missing_count, onTimeRate]
    );

    logger.info(`[Stats] ${workerName} (userId=${userId}) ${month}统计已更新`);
  } catch (err) {
    logger.error('[Stats] 更新月度统计失败:', err);
    throw err;
  }
}

/**
 * 获取合规统计看板
 */
async function getComplianceDashboard({ startDate, endDate }) {
  try {
    const sd = startDate || '2026-01-01';
    const ed = endDate || new Date().toISOString().split('T')[0];

    // 1. 整体及时率
    const overallRows = await db.query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN timeliness = 'on_time' THEN 1 ELSE 0 END) as on_time_count,
         SUM(CASE WHEN timeliness = 'delayed' THEN 1 ELSE 0 END) as delayed_count,
         SUM(CASE WHEN timeliness = 'missing' THEN 1 ELSE 0 END) as missing_count
       FROM report_compliance
       WHERE report_date BETWEEN ? AND ?`,
      [sd, ed]
    );

    const overall = overallRows[0];
    const overallRate = overall.total > 0
      ? ((overall.on_time_count / overall.total) * 100).toFixed(2)
      : 0;

    // 2. 人员缺失TOP10 (从 worker_compliance 聚合)
    const missingTop10 = await db.query(
      `SELECT 
         worker_name,
         COUNT(*) as missing_count
       FROM worker_compliance
       WHERE timeliness = 'missing' AND report_date BETWEEN ? AND ?
       GROUP BY worker_name
       ORDER BY missing_count DESC
       LIMIT 10`,
      [sd, ed]
    );

    // 3. 近6个月趋势
    const trendData = await db.query(
      `SELECT 
         DATE_FORMAT(report_date, '%Y-%m') as month,
         COUNT(*) as total,
         SUM(CASE WHEN timeliness = 'on_time' THEN 1 ELSE 0 END) as on_time_count
       FROM report_compliance
       WHERE report_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(report_date, '%Y-%m')
       ORDER BY month ASC`
    );

    return {
      overallRate,
      totalReports: overall.total,
      onTimeCount: overall.on_time_count,
      delayedCount: overall.delayed_count,
      missingCount: overall.missing_count,
      missingTop10,
      trendData
    };
  } catch (err) {
    logger.error('[Stats] 获取合规统计看板失败:', err);
    throw err;
  }
}

/**
 * 获取个人合规统计
 * 通过 userId → user_name 匹配 worker_compliance
 */
async function getUserComplianceStats(userId) {
  try {
    // 1. 获取用户名
    const [userRows] = await db.query('SELECT user_name FROM users WHERE id = ?', [userId]);
    if (!userRows || userRows.length === 0) {
      return {
        totalReports: 0, onTimeCount: 0, delayedCount: 0, missingCount: 0, onTimeRate: 0
      };
    }
    const userName = userRows[0].user_name;

    const currentMonth = new Date().toISOString().substring(0, 7);
    const rows = await db.query(
      `SELECT 
         COUNT(*) as total_reports,
         SUM(CASE WHEN timeliness = 'on_time' THEN 1 ELSE 0 END) as on_time_count,
         SUM(CASE WHEN timeliness = 'delayed' THEN 1 ELSE 0 END) as delayed_count,
         SUM(CASE WHEN timeliness = 'missing' THEN 1 ELSE 0 END) as missing_count
       FROM worker_compliance
       WHERE worker_name = ? AND DATE_FORMAT(report_date, '%Y-%m') = ?`,
      [userName, currentMonth]
    );

    if (!rows || rows.length === 0 || !rows[0].total_reports) {
      return {
        month: currentMonth,
        totalReports: 0, onTimeCount: 0, delayedCount: 0, missingCount: 0, onTimeRate: 0
      };
    }

    const stats = rows[0];
    return {
      month: currentMonth,
      totalReports: stats.total_reports,
      onTimeCount: stats.on_time_count,
      delayedCount: stats.delayed_count,
      missingCount: stats.missing_count,
      onTimeRate: stats.total_reports > 0
        ? ((stats.on_time_count / stats.total_reports) * 100).toFixed(2)
        : 0
    };
  } catch (err) {
    logger.error('[Stats] 获取个人合规统计失败:', err);
    throw err;
  }
}

/**
 * 更新上个月的统计数据(每月1日执行)
 */
async function updateLastMonthStats() {
  try {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const monthStr = lastMonth.toISOString().substring(0, 7);

    logger.info(`[Stats] 开始更新${monthStr}的统计数据`);

    // 从 worker_compliance 获取所有有记录的人员
    const rows = await db.query(
      'SELECT DISTINCT worker_name FROM worker_compliance WHERE DATE_FORMAT(report_date, "%Y-%m") = ?',
      [monthStr]
    );

    let updatedCount = 0;
    for (const row of rows) {
      await updateMonthlyStats(row.worker_name, monthStr);
      updatedCount++;
    }

    logger.info(`[Stats] ${monthStr}统计更新完成,共${updatedCount}人`);
    return { updatedCount, month: monthStr };
  } catch (err) {
    logger.error('[Stats] 更新上月统计失败:', err);
    throw err;
  }
}

module.exports = {
  updateMonthlyStats,
  getComplianceDashboard,
  getUserComplianceStats,
  updateLastMonthStats
};
