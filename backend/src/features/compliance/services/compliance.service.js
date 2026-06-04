'use strict';

const db = require('../../../common/config/database');

/**
 * 检查日报及时性
 * @param {string} reportDate - 报告日期 (YYYY-MM-DD)
 * @param {string} submitTime - 提交时间 (ISO string)
 * @returns {string} 'on_time' | 'delayed' | 'missing'
 */
function checkTimeliness(reportDate, submitTime) {
  const reportDateObj = new Date(reportDate);
  const submitDateObj = new Date(submitTime);

  // 计算天数差(向下取整)
  const diffDays = Math.floor((submitDateObj - reportDateObj) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'on_time';
  if (diffDays === 1) return 'delayed';
  return 'missing';
}

/**
 * 创建合规记录
 * @param {Object} params - 参数对象
 * @param {number} params.reportId - 报告ID
 * @param {number} params.userId - 用户ID
 * @param {string} params.reportDate - 报告日期
 * @param {string} params.timeliness - 及时性类型
 * @param {string} params.submitTime - 提交时间
 * @returns {Promise<Object>} 合规记录信息
 */
async function createComplianceRecord({ reportId, userId, reportDate, timeliness, submitTime }) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. 插入 report_compliance 表
    const expectedDeadline = new Date(new Date(reportDate).getTime() + 24 * 60 * 60 * 1000); // 当日24:00
    const isAutoApproved = timeliness !== 'missing' ? 1 : 0;

    const [complianceResult] = await connection.execute(
      `INSERT INTO report_compliance 
       (report_id, user_id, report_date, timeliness, submit_time, expected_deadline, is_auto_approved)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [reportId, userId, reportDate, timeliness, submitTime, expectedDeadline, isAutoApproved]
    );

    const complianceId = complianceResult.insertId;

    // 2. 更新 daily_reports.timeliness 和 compliance_id
    await connection.execute(
      'UPDATE daily_reports SET timeliness = ?, compliance_id = ? WHERE id = ?',
      [timeliness, complianceId, reportId]
    );

    // 3. 如果是 missing,增加 user_compliance_stats.missing_count
    if (timeliness === 'missing') {
      const month = reportDate.substring(0, 7); // YYYY-MM

      // 先查询是否已有该月统计
      const [statsRows] = await connection.execute(
        'SELECT id, missing_count FROM user_compliance_stats WHERE user_id = ? AND stat_month = ?',
        [userId, month]
      );

      if (statsRows && statsRows.length > 0) {
        // 更新现有统计
        await connection.execute(
          'UPDATE user_compliance_stats SET missing_count = missing_count + 1 WHERE id = ?',
          [statsRows[0].id]
        );
      } else {
        // 创建新统计
        await connection.execute(
          `INSERT INTO user_compliance_stats (user_id, stat_month, total_reports, missing_count)
           VALUES (?, ?, 1, 1)`,
          [userId, month]
        );
      }
    }

    await connection.commit();
    return { complianceId, timeliness, isAutoApproved };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 获取待审核的缺失报告列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @param {string} params.startDate - 开始日期
 * @param {string} params.endDate - 结束日期
 * @returns {Promise<Object>} 分页结果
 */
async function getMissingReportsForReview({ page = 1, pageSize = 20, startDate, endDate }) {
  const offset = (page - 1) * pageSize;

  let sql = `
    SELECT rc.*, dr.content, dr.project, u.user_name as user_name, u.avatar
    FROM report_compliance rc
    JOIN daily_reports dr ON rc.report_id = dr.id
    JOIN users u ON rc.user_id = u.id
    WHERE rc.timeliness = 'missing' AND rc.reviewer_id IS NULL
  `;

  const params = [];

  if (startDate) {
    sql += ' AND rc.report_date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    sql += ' AND rc.report_date <= ?';
    params.push(endDate);
  }

  sql += ' ORDER BY rc.report_date DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const rows = await db.query(sql, params);

  // 查询总数
  let countSql = `
    SELECT COUNT(*) as total
    FROM report_compliance rc
    WHERE rc.timeliness = 'missing' AND rc.reviewer_id IS NULL
  `;
  const countParams = [];

  if (startDate) {
    countSql += ' AND rc.report_date >= ?';
    countParams.push(startDate);
  }

  if (endDate) {
    countSql += ' AND rc.report_date <= ?';
    countParams.push(endDate);
  }

  const [countRows] = await db.query(countSql, countParams);

  return {
    list: rows,
    total: countRows[0].total,
    page,
    pageSize
  };
}

/**
 * 审核缺失报告
 * @param {Object} params - 审核参数
 * @param {number} params.complianceId - 合规记录ID
 * @param {number} params.reviewerId - 审核人ID
 * @param {string} params.action - 操作 ('approve' | 'reject')
 * @param {string} params.comment - 审核意见
 * @returns {Promise<Object>} 审核结果
 */
async function reviewMissingReport({ complianceId, reviewerId, action, comment }) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. 查询合规记录
    const [complianceRows] = await connection.execute(
      'SELECT * FROM report_compliance WHERE id = ?',
      [complianceId]
    );

    if (!complianceRows || complianceRows.length === 0) {
      throw new Error('合规记录不存在');
    }

    const compliance = complianceRows[0];

    // 2. 更新 report_compliance
    await connection.execute(
      `UPDATE report_compliance 
       SET reviewer_id = ?, reviewed_at = NOW(), review_comment = ?, is_auto_approved = ?
       WHERE id = ?`,
      [reviewerId, comment, action === 'approve' ? 1 : 0, complianceId]
    );

    // 3. 更新 daily_reports.status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await connection.execute(
      'UPDATE daily_reports SET status = ? WHERE id = ?',
      [newStatus, compliance.report_id]
    );

    await connection.commit();

    return { success: true, message: action === 'approve' ? '审核通过' : '审核驳回' };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 手动修正及时性标记
 * @param {Object} params - 参数对象
 * @param {number} params.complianceId - 合规记录ID
 * @param {string} params.timeliness - 新的及时性类型
 * @param {number} params.operatorId - 操作人ID
 * @returns {Promise<Object>} 更新结果
 */
async function updateTimeliness({ complianceId, timeliness, operatorId }) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. 查询原合规记录
    const [complianceRows] = await connection.execute(
      'SELECT * FROM report_compliance WHERE id = ?',
      [complianceId]
    );

    if (!complianceRows || complianceRows.length === 0) {
      throw new Error('合规记录不存在');
    }

    const oldTimeliness = complianceRows[0].timeliness;
    const userId = complianceRows[0].user_id;
    const reportDate = complianceRows[0].report_date;

    // 2. 更新 report_compliance.timeliness
    await connection.execute(
      'UPDATE report_compliance SET timeliness = ? WHERE id = ?',
      [timeliness, complianceId]
    );

    // 3. 更新 daily_reports.timeliness
    await connection.execute(
      'UPDATE daily_reports SET timeliness = ? WHERE id = ?',
      [timeliness, complianceRows[0].report_id]
    );

    // 4. 如果从 missing 改为其他状态,需要减少 missing_count
    if (oldTimeliness === 'missing' && timeliness !== 'missing') {
      const month = reportDate.substring(0, 7);
      await connection.execute(
        'UPDATE user_compliance_stats SET missing_count = GREATEST(missing_count - 1, 0) WHERE user_id = ? AND stat_month = ?',
        [userId, month]
      );
    }

    // 5. 如果改为 missing,需要增加 missing_count
    if (oldTimeliness !== 'missing' && timeliness === 'missing') {
      const month = reportDate.substring(0, 7);
      await connection.execute(
        'UPDATE user_compliance_stats SET missing_count = missing_count + 1 WHERE user_id = ? AND stat_month = ?',
        [userId, month]
      );
    }

    await connection.commit();
    return { success: true, message: '及时性标记已更新' };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  checkTimeliness,
  createComplianceRecord,
  getMissingReportsForReview,
  reviewMissingReport,
  updateTimeliness
};
