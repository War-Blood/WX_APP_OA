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
  const diffDays = Math.floor((submitDateObj - reportDateObj) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'on_time';
  if (diffDays === 1) return 'delayed';
  return 'missing';
}

/**
 * 拆分作业人员列表字符串
 */
function splitWorkers(workers) {
  if (!workers || typeof workers !== 'string') return [];
  return workers.split(',').map(w => w.trim()).filter(Boolean);
}

/**
 * 创建合规记录(项目维度)
 * 同时展开 workers 到 worker_compliance 表
 */
async function createComplianceRecord({ reportId, project, workers, reportDate, timeliness, submitTime }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const expectedDeadline = new Date(new Date(reportDate).getTime() + 24 * 60 * 60 * 1000);
    const isAutoApproved = timeliness !== 'missing' ? 1 : 0;

    // 1. 插入 report_compliance
    const [result] = await connection.execute(
      `INSERT INTO report_compliance 
       (report_id, project, workers, report_date, timeliness, submit_time, expected_deadline, is_auto_approved)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [reportId || null, project, workers || '', reportDate, timeliness, submitTime || null, expectedDeadline, isAutoApproved]
    );
    const complianceId = result.insertId;

    // 2. 展开 workers 到 worker_compliance
    const workerList = splitWorkers(workers);
    if (workerList.length > 0) {
      const values = workerList.map(w => [complianceId, w, reportDate, timeliness]);
      await connection.query(
        'INSERT INTO worker_compliance (compliance_id, worker_name, report_date, timeliness) VALUES ?',
        [values]
      );
    }

    // 3. 如果有关联日报, 更新 daily_reports
    if (reportId) {
      await connection.execute(
        'UPDATE daily_reports SET timeliness = ?, compliance_id = ? WHERE id = ?',
        [timeliness, complianceId, reportId]
      );
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
 */
async function getMissingReportsForReview({ page = 1, pageSize = 20, startDate, endDate }) {
  const offset = (page - 1) * pageSize;

  let sql = `
    SELECT rc.*, dr.content, dr.project as dr_project
    FROM report_compliance rc
    LEFT JOIN daily_reports dr ON rc.report_id = dr.id
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
    total: countRows.total,
    page,
    pageSize
  };
}

/**
 * 审核缺失报告
 * 缺失报告的 report_id 可能为 NULL,不能更新 daily_reports
 */
async function reviewMissingReport({ complianceId, reviewerId, action, comment }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [complianceRows] = await connection.execute(
      'SELECT * FROM report_compliance WHERE id = ?',
      [complianceId]
    );
    if (!complianceRows || complianceRows.length === 0) {
      throw new Error('合规记录不存在');
    }

    const compliance = complianceRows[0];

    await connection.execute(
      `UPDATE report_compliance 
       SET reviewer_id = ?, reviewed_at = NOW(), review_comment = ?, is_auto_approved = ?
       WHERE id = ?`,
      [reviewerId, comment, action === 'approve' ? 1 : 0, complianceId]
    );

    // 如果有关联日报且审批通过,更新日报状态
    if (action === 'approve' && compliance.report_id) {
      await connection.execute(
        'UPDATE daily_reports SET status = ? WHERE id = ?',
        ['approved', compliance.report_id]
      );
    }

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
 */
async function updateTimeliness({ complianceId, timeliness, operatorId }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [complianceRows] = await connection.execute(
      'SELECT * FROM report_compliance WHERE id = ?',
      [complianceId]
    );
    if (!complianceRows || complianceRows.length === 0) {
      throw new Error('合规记录不存在');
    }

    const compliance = complianceRows[0];

    // 更新 report_compliance
    await connection.execute(
      'UPDATE report_compliance SET timeliness = ? WHERE id = ?',
      [timeliness, complianceId]
    );

    // 同步更新 worker_compliance
    await connection.execute(
      'UPDATE worker_compliance SET timeliness = ? WHERE compliance_id = ?',
      [timeliness, complianceId]
    );

    // 同步更新 daily_reports (如果有)
    if (compliance.report_id) {
      await connection.execute(
        'UPDATE daily_reports SET timeliness = ? WHERE id = ?',
        [timeliness, compliance.report_id]
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
