'use strict';

const db = require('../../../common/config/database');
const logger = require('../../../common/utils/logger');

/**
 * 更新月度合规统计
 * @param {number} userId - 用户ID
 * @param {string} month - 月份 (YYYY-MM)
 */
async function updateMonthlyStats(userId, month) {
  try {
    // 聚合计算该月的统计数据
    const rows = await db.query(
      `SELECT 
         COUNT(*) as total_reports,
         SUM(CASE WHEN timeliness = 'on_time' THEN 1 ELSE 0 END) as on_time_count,
         SUM(CASE WHEN timeliness = 'delayed' THEN 1 ELSE 0 END) as delayed_count,
         SUM(CASE WHEN timeliness = 'missing' THEN 1 ELSE 0 END) as missing_count
       FROM report_compliance
       WHERE user_id = ? AND DATE_FORMAT(report_date, '%Y-%m') = ?`,
      [userId, month]
    );

    if (!rows || rows.length === 0) {
      return;
    }

    const stats = rows[0];
    const onTimeRate = stats.total_reports > 0 
      ? ((stats.on_time_count / stats.total_reports) * 100).toFixed(2)
      : 0;

    // 插入或更新统计
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

    console.log(`[Stats] 用户${userId}的${month}统计已更新`);
  } catch (err) {
    console.error('[Stats] 更新月度统计失败:', err);
    throw err;
  }
}

/**
 * 获取合规统计看板
 * @param {Object} params - 查询参数
 * @param {string} params.startDate - 开始日期
 * @param {string} params.endDate - 结束日期
 * @returns {Promise<Object>} 看板数据
 */
async function getComplianceDashboard({ startDate, endDate }) {
  try {
    // 1. 整体及时率
    const overallRows = await db.query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN timeliness = 'on_time' THEN 1 ELSE 0 END) as on_time_count
       FROM report_compliance
       WHERE report_date BETWEEN ? AND ?`,
      [startDate || '2026-01-01', endDate || new Date().toISOString().split('T')[0]]
    );

    const overall = overallRows[0];
    const overallRate = overall.total > 0 
      ? ((overall.on_time_count / overall.total) * 100).toFixed(2)
      : 0;

    // 2. 部门排名
    const departmentRanking = await db.query(
      `SELECT 
         u.department,
         COUNT(*) as total,
         SUM(CASE WHEN rc.timeliness = 'on_time' THEN 1 ELSE 0 END) as on_time_count,
         ROUND(SUM(CASE WHEN rc.timeliness = 'on_time' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as rate
       FROM report_compliance rc
       JOIN users u ON rc.user_id = u.id
       WHERE rc.report_date BETWEEN ? AND ?
       GROUP BY u.department
       ORDER BY rate DESC`,
      [startDate || '2026-01-01', endDate || new Date().toISOString().split('T')[0]]
    );

    // 3. 缺失报告TOP10
    const missingTop10 = await db.query(
      `SELECT 
         u.id as user_id,
         u.user_name as user_name,
         u.department,
         COUNT(*) as missing_count
       FROM report_compliance rc
       JOIN users u ON rc.user_id = u.id
       WHERE rc.timeliness = 'missing' AND rc.report_date BETWEEN ? AND ?
       GROUP BY u.id, u.user_name, u.department
       ORDER BY missing_count DESC
       LIMIT 10`,
      [startDate || '2026-01-01', endDate || new Date().toISOString().split('T')[0]]
    );

    // 4. 近6个月趋势数据
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
      departmentRanking,
      missingTop10,
      trendData
    };
  } catch (err) {
    console.error('[Stats] 获取合规统计看板失败:', err);
    throw err;
  }
}

/**
 * 获取个人合规统计
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} 个人统计数据
 */
async function getUserComplianceStats(userId) {
  try {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

    const rows = await db.query(
      'SELECT * FROM user_compliance_stats WHERE user_id = ? AND stat_month = ?',
      [userId, currentMonth]
    );

    if (!rows || rows.length === 0) {
      return {
        month: currentMonth,
        totalReports: 0,
        onTimeCount: 0,
        delayedCount: 0,
        missingCount: 0,
        onTimeRate: 0
      };
    }

    const stats = rows[0];
    return {
      month: stats.stat_month,
      totalReports: stats.total_reports,
      onTimeCount: stats.on_time_count,
      delayedCount: stats.delayed_count,
      missingCount: stats.missing_count,
      onTimeRate: stats.on_time_rate
    };
  } catch (err) {
    console.error('[Stats] 获取个人合规统计失败:', err);
    throw err;
  }
}

/**
 * 更新上个月的统计数据(每月1日执行)
 */
async function updateLastMonthStats() {
  try {
    // 计算上个月
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const monthStr = lastMonth.toISOString().substring(0, 7); // YYYY-MM
    
    logger.info(`[Stats] 开始更新${monthStr}的统计数据`);
    
    // 获取所有有合规记录的用户
    const rows = await db.query(
      'SELECT DISTINCT user_id FROM report_compliance WHERE DATE_FORMAT(report_date, "%Y-%m") = ?',
      [monthStr]
    );
    
    let updatedCount = 0;
    for (const row of rows) {
      await updateMonthlyStats(row.user_id, monthStr);
      updatedCount++;
    }
    
    logger.info(`[Stats] ${monthStr}统计更新完成,共${updatedCount}个用户`);
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
