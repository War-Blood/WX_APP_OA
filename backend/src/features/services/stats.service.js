'use strict';

const db = require('../../common/config/database');
const messageService = require('../../core/services/message.service');

/**
 * 数据统计服务
 * @module statsService
 */

/**
 * 获取首页统计数据
 * 并行查询待审批数、已处理数、未读消息数，admin 额外待审核数
 * @param {number} userId - 当前用户 ID
 * @param {string} role - 用户角色：employee / admin / superadmin
 * @returns {Promise<Object>} 统计数据
 * @returns {number} return.pendingCount - 待审批数
 * @returns {number} [return.reviewCount] - 待审核日报数（admin 专有）
 * @returns {number} [return.submitCount] - 待提交日报数（employee 专有）
 * @returns {number} return.processedCount - 已处理数
 * @returns {number} return.unreadCount - 未读消息数
 */
async function getHomeStats(userId, role) {
  const isAdmin = role === 'admin' || role === 'superadmin';

  // 并行查询基础统计
  const tasks = [
    // 待审批数：查询当前用户作为审批人且状态为 pending 的审批
    db.query(`
      SELECT COUNT(*) AS count FROM approval_instances ai
      JOIN approval_flow_nodes afn ON ai.current_node_id = afn.id
      WHERE afn.approver_id = ? AND ai.status = 'pending'
    `, [userId]),

    // 已处理数：当前用户已操作的审批节点
    db.query(`
      SELECT COUNT(*) AS count FROM approval_flow_nodes
      WHERE approver_id = ? AND action IS NOT NULL
    `, [userId]),

    // 未读消息数
    messageService.unreadCount(userId),
  ];

  // admin 额外查待审核日报数
  if (isAdmin) {
    tasks.push(
      db.query(`
        SELECT COUNT(*) AS count FROM daily_reports
        WHERE status = 'pending'
      `)
    );
  }

  const results = await Promise.all(tasks);

  const pendingCount = results[0][0]?.count ?? 0;
  const processedCount = results[1][0]?.count ?? 0;
  const unreadCount = results[2] ?? 0;

  const stats = {
    pendingCount,
    processedCount,
    unreadCount,
  };

  if (isAdmin) {
    // admin 角色：返回待审核日报数
    stats.reviewCount = results[3][0]?.count ?? 0;
  } else {
    // employee 角色：返回待提交日报数（当天未提交日报）
    const today = new Date().toISOString().slice(0, 10);
    const submitRows = await db.query(`
      SELECT COUNT(*) AS count FROM daily_reports
      WHERE user_id = ? AND report_date = ? AND status = 'submitted'
    `, [userId, today]);
    // 如果今天没有已提交的记录，则待提交
    stats.submitCount = (submitRows[0]?.count ?? 0) > 0 ? 0 : 1;
  }

  return stats;
}

/**
 * 获取最近动态列表（分页）
 * 从审批操作日志、日报提交、系统消息中聚合动态
 * @param {number} userId - 当前用户 ID
 * @param {number} page - 当前页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<{list: Array, total: number, page: number, pageSize: number}>}
 */
async function getActivities(userId, page, pageSize) {
  const offset = (page - 1) * pageSize;

  // 先查总条数
  const countSql = `
    SELECT COUNT(*) AS total FROM (
      (SELECT 'approval' AS source_type FROM approval_flow_nodes WHERE approver_id = ?)
      UNION ALL
      (SELECT 'report' AS source_type FROM daily_reports WHERE user_id = ?)
      UNION ALL
      (SELECT 'system' AS source_type FROM messages WHERE receiver_id = ?)
    ) AS combined
  `;
  const countParams = [userId, userId, userId];
  let total = 0;
  try {
    const countRows = await db.query(countSql, countParams);
    total = countRows[0]?.total ?? 0;
  } catch (err) {
    // 旧库可能不可用，忽略错误
    total = 0;
  }

  // 使用 UNION ALL 合并不同来源的动态，按时间排序
  const listSql = `
    SELECT id, type, text, time, date, icon_src AS iconSrc, icon_bg AS iconBg
    FROM (
      (SELECT
        afn.id,
        'approval' AS type,
        CONCAT(IFNULL(afn.action, '处理'), '审批') AS text,
        DATE_FORMAT(afn.updated_at, '%H:%i') AS time,
        CASE
          WHEN DATE(afn.updated_at) = CURDATE() THEN '今天'
          WHEN DATE(afn.updated_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN '昨天'
          ELSE DATE_FORMAT(afn.updated_at, '%m/%d')
        END AS date,
        '/static/images/home/icon_daily_green.png' AS icon_src,
        '#F0FDF4' AS icon_bg,
        afn.updated_at AS sort_time
      FROM approval_flow_nodes afn
      WHERE afn.approver_id = ? AND afn.action IS NOT NULL)

      UNION ALL

      (SELECT
        dr.id,
        'report' AS type,
        CONCAT('提交了', IFNULL(dr.project, '日报')) AS text,
        DATE_FORMAT(dr.created_at, '%H:%i') AS time,
        CASE
          WHEN DATE(dr.created_at) = CURDATE() THEN '今天'
          WHEN DATE(dr.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN '昨天'
          ELSE DATE_FORMAT(dr.created_at, '%m/%d')
        END AS date,
        '/static/images/home/icon_daily_green.png' AS icon_src,
        '#F0FDF4' AS icon_bg,
        dr.created_at AS sort_time
      FROM daily_reports dr
      WHERE dr.user_id = ?)

      UNION ALL

      (SELECT
        msg.id,
        msg.type AS type,
        msg.title AS text,
        DATE_FORMAT(msg.created_at, '%H:%i') AS time,
        CASE
          WHEN DATE(msg.created_at) = CURDATE() THEN '今天'
          WHEN DATE(msg.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN '昨天'
          ELSE DATE_FORMAT(msg.created_at, '%m/%d')
        END AS date,
        CASE msg.type
          WHEN 'approval' THEN '/static/images/home/icon_daily_green.png'
          WHEN 'report' THEN '/static/images/home/icon_daily_green.png'
          WHEN 'task' THEN '/static/images/home/icon_daily_green.png'
          ELSE '/static/images/home/icon_daily_green.png'
        END AS icon_src,
        CASE msg.type
          WHEN 'approval' THEN '#EDF2FF'
          WHEN 'report' THEN '#F0FDF4'
          WHEN 'task' THEN '#F3E8FF'
          ELSE '#F5F5F5'
        END AS icon_bg,
        msg.created_at AS sort_time
      FROM messages msg
      WHERE msg.receiver_id = ?)
    ) AS activities
    ORDER BY sort_time DESC
    LIMIT ? OFFSET ?
  `;
  const listParams = [userId, userId, userId, pageSize, offset];

  let list = [];
  try {
    list = await db.query(listSql, listParams);
  } catch (err) {
    // 旧库可能不可用，返回空列表
    list = [];
  }

  return { list, total, page, pageSize };
}

/**
 * 获取个人中心统计 (P1)
 * @param {number} userId - 当前用户 ID
 * @returns {Promise<Object>} 个人统计数据
 * @returns {number} return.reportCount - 累计日报数
 * @returns {number} return.approvalCount - 累计审批数
 * @returns {number} return.pendingApprovalCount - 待审批数
 * @returns {number} return.continuousDays - 连续提交天数
 */
async function getProfileStats(userId) {
  // 并行查询
  const [reportRows, approvalRows, pendingRows] = await Promise.all([
    // 累计日报数
    db.query(
      'SELECT COUNT(*) AS count FROM daily_reports WHERE user_id = ?',
      [userId]
    ),
    // 累计审批数（作为发起人）
    db.query(
      'SELECT COUNT(*) AS count FROM approval_instances WHERE applicant_id = ?',
      [userId]
    ),
    // 待审批数
    db.query(`
      SELECT COUNT(*) AS count FROM approval_instances ai
      JOIN approval_flow_nodes afn ON ai.current_node_id = afn.id
      WHERE afn.approver_id = ? AND ai.status = 'pending'
    `, [userId]),
  ]);

  const reportCount = reportRows[0]?.count ?? 0;
  const approvalCount = approvalRows[0]?.count ?? 0;
  const pendingApprovalCount = pendingRows[0]?.count ?? 0;

  // 计算连续提交天数（从最新提交日报往前推算）
  let continuousDays = 0;
  try {
    const dateRows = await db.query(
      `SELECT DISTINCT report_date FROM daily_reports
       WHERE user_id = ? AND status = 'submitted'
       ORDER BY report_date DESC`,
      [userId]
    );

    if (dateRows.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < dateRows.length; i++) {
        const reportDate = new Date(dateRows[i].report_date);
        reportDate.setHours(0, 0, 0, 0);
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);
        expectedDate.setHours(0, 0, 0, 0);

        if (reportDate.getTime() === expectedDate.getTime()) {
          continuousDays++;
        } else {
          break;
        }
      }
    }
  } catch (err) {
    // 旧库可能不可用，连续天数返回 0
    continuousDays = 0;
  }

  return {
    reportCount,
    approvalCount,
    pendingApprovalCount,
    continuousDays,
  };
}

/**
 * 日报统计看板
 * 总数/本月/待审/通过 + 近30天趋势
 */
async function getReportStats() {
  const [totalRow] = await db.query('SELECT COUNT(*) AS count FROM daily_reports');
  const [monthRow] = await db.query("SELECT COUNT(*) AS count FROM daily_reports WHERE MONTH(report_date)=MONTH(CURDATE()) AND YEAR(report_date)=YEAR(CURDATE())");
  const [pendingRow] = await db.query("SELECT COUNT(*) AS count FROM daily_reports WHERE status='pending'");
  const [approvedRow] = await db.query("SELECT COUNT(*) AS count FROM daily_reports WHERE status='approved'");

  // 近30天趋势
  const trendRows = await db.query(`
    SELECT DATE(report_date) AS date, COUNT(*) AS count
    FROM daily_reports
    WHERE report_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY DATE(report_date) ORDER BY date ASC
  `);

  const total = totalRow?.count ?? 0;
  const approved = approvedRow?.count ?? 0;

  return {
    total,
    monthCount: monthRow?.count ?? 0,
    pendingCount: pendingRow?.count ?? 0,
    approvedCount: approved,
    approvalRate: total > 0 ? Math.round((approved / total) * 100) + '%' : '0%',
    trend: trendRows.map(r => ({ date: r.date, count: r.count })),
  };
}

module.exports = {
  getHomeStats,
  getActivities,
  getProfileStats,
  getReportStats,
};
