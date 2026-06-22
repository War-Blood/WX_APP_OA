'use strict';

const db = require('../../common/config/database');
const { BusinessError } = require('../../common/utils/errors');

/**
 * 统计服务 — 三种 scope 统计 + 月度占比 + 当日全员状态
 */

/**
 * 统计看板（统一入口，按 scope 分发）
 * @param {string} scope - 'user' | 'all' | 'project'
 * @param {Object} params - 额外参数
 * @param {number} [params.userId] - scope=user 时必填
 * @returns {Promise<Object>}
 */
async function getStats(scope, params = {}) {
  switch (scope) {
    case 'user':
      return getUserStats(params.userId);
    case 'all':
      return getAllStats();
    case 'project':
      return getProjectStats();
    default:
      throw new BusinessError('无效的统计范围，仅支持 user/all/project');
  }
}

/**
 * 单人统计
 * @param {number} userId - 用户 ID
 * @returns {Promise<Object>}
 */
async function getUserStats(userId) {
  if (!userId) {
    throw new BusinessError('scope=user 时 userId 必填');
  }

  // 获取用户信息和入场日期
  const users = await db.query(
    'SELECT entry_date FROM users WHERE id = ? AND deleted_at IS NULL',
    [userId]
  );
  if (users.length === 0) {
    throw new BusinessError('用户不存在');
  }
  const entryDate = users[0].entry_date;

  // 累计日志条数（含代填+补录，仅统计审核通过的）
  const totalRows = await db.query(
    `SELECT COUNT(*) AS cnt FROM daily_reports
     WHERE report_type != 'office'
       AND status = 'approved'
       AND (user_id = ? OR id IN (SELECT report_id FROM daily_report_workers WHERE worker_uid = ?))`,
    [userId, userId]
  );
  const totalCount = totalRows[0].cnt;

  // 当月条数（仅统计审核通过的）
  const monthRows = await db.query(
    `SELECT COUNT(*) AS cnt FROM daily_reports
     WHERE report_type != 'office'
       AND status = 'approved'
       AND (user_id = ? OR id IN (SELECT report_id FROM daily_report_workers WHERE worker_uid = ?))
       AND MONTH(report_date) = MONTH(CURDATE()) AND YEAR(report_date) = YEAR(CURDATE())`,
    [userId, userId]
  );
  const monthCount = monthRows[0].cnt;

  // 延迟条数（仅统计审核通过的）
  const delayedRows = await db.query(
    `SELECT COUNT(*) AS cnt FROM daily_reports
     WHERE report_type != 'office'
       AND status = 'approved'
       AND (user_id = ? OR id IN (SELECT report_id FROM daily_report_workers WHERE worker_uid = ?))
       AND timeliness = 'delayed'`,
    [userId, userId]
  );
  const delayedCount = delayedRows[0].cnt;

  // 缺失天数与缺失日期列表
  let missingDays = 0;
  let missingDates = [];

  if (entryDate) {
    // 已提交的所有日期（仅统计审核通过的）
    const submittedRows = await db.query(
      `SELECT DISTINCT report_date FROM daily_reports
       WHERE report_type != 'office'
         AND status = 'approved'
         AND (user_id = ? OR id IN (SELECT report_id FROM daily_report_workers WHERE worker_uid = ?))
       ORDER BY report_date`,
      [userId, userId]
    );
    const submittedDates = new Set(submittedRows.map(r => formatDate(r.report_date)));

    // 计算入场日期至昨日期间应填但未填的日期
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const startDate = new Date(entryDate);

    const missingDateList = [];
    const cur = new Date(startDate);
    while (cur <= yesterday) {
      const dateStr = formatDate(cur);
      if (!submittedDates.has(dateStr)) {
        missingDateList.push(dateStr);
      }
      cur.setDate(cur.getDate() + 1);
    }

    missingDays = missingDateList.length;
    // 取最近30条缺失日期
    missingDates = missingDateList.sort((a, b) => b.localeCompare(a)).slice(0, 30);
  }

  return {
    scope: 'user',
    totalCount,
    monthCount,
    missingDays,
    missingDates,
    delayedCount,
    entryDate: entryDate ? formatDate(entryDate) : '',
  };
}

/**
 * 全员汇总统计
 * @returns {Promise<Object>}
 */
async function getAllStats() {
  // 全系统日志总条数（排除公司日报，仅统计审核通过的）
  const totalRows = await db.query(
    "SELECT COUNT(*) AS cnt FROM daily_reports WHERE report_type != 'office' AND status = 'approved'"
  );
  const totalLogs = totalRows[0].cnt;

  // 本月新增条数（仅统计审核通过的）
  const monthRows = await db.query(
    `SELECT COUNT(*) AS cnt FROM daily_reports
     WHERE report_type != 'office'
       AND status = 'approved'
       AND MONTH(report_date) = MONTH(CURDATE()) AND YEAR(report_date) = YEAR(CURDATE())`
  );
  const monthNew = monthRows[0].cnt;

  // 延迟总条数（仅统计审核通过的）
  const delayedRows = await db.query(
    "SELECT COUNT(*) AS cnt FROM daily_reports WHERE timeliness = 'delayed' AND status = 'approved'"
  );
  const delayedTotal = delayedRows[0].cnt;

  // 当天有缺失的在职人员数（有 worker_status='active'，但今天没有提交审核通过的日志）
  const today = formatDate(new Date());
  const missingRows = await db.query(
    `SELECT COUNT(*) AS cnt FROM users u
     WHERE u.worker_status = 'active'
       AND u.deleted_at IS NULL
       AND u.id NOT IN (
         SELECT dr.user_id FROM daily_reports dr WHERE dr.report_date = ? AND dr.status = 'approved'
         UNION
         SELECT drw.worker_uid FROM daily_report_workers drw
         JOIN daily_reports dr ON drw.report_id = dr.id
         WHERE dr.report_date = ? AND dr.status = 'approved'
       )`,
    [today, today]
  );
  const missingPersonCount = missingRows[0].cnt;

  return {
    scope: 'all',
    totalLogs,
    monthNew,
    delayedTotal,
    missingPersonCount,
  };
}

/**
 * 按项目聚合统计
 * @returns {Promise<Object>}
 */
async function getProjectStats() {
  const rows = await db.query(
    `SELECT
       project,
       COUNT(*) AS total,
       SUM(CASE WHEN MONTH(report_date) = MONTH(CURDATE()) AND YEAR(report_date) = YEAR(CURDATE()) THEN 1 ELSE 0 END) AS month,
       0 AS missing
     FROM daily_reports
     WHERE report_type != 'office'
       AND status = 'approved'
       AND project IS NOT NULL AND project != ''
     GROUP BY project
     ORDER BY total DESC`
  );

  const projects = rows.map(r => ({
    project: r.project,
    total: Number(r.total),
    month: Number(r.month),
    missing: Number(r.missing),
  }));

  return { scope: 'project', projects };
}

/**
 * 月度工作占比
 * @param {number} userId - 用户 ID
 * @param {string} month - 月份 (YYYY-MM)
 * @returns {Promise<Object>}
 */
async function getMonthlySummary(userId, month) {
  if (!userId) {
    throw new BusinessError('userId 必填');
  }
  if (!month) {
    throw new BusinessError('month 必填，格式 YYYY-MM');
  }

  // 获取用户信息
  const users = await db.query(
    'SELECT id, user_name AS userName, nickname, entry_date FROM users WHERE id = ? AND deleted_at IS NULL',
    [userId]
  );
  if (users.length === 0) {
    throw new BusinessError('用户不存在');
  }
  const user = users[0];
  const userName = user.nickname || user.userName || '';

  // 本月已填报天数（排除公司日报，仅统计审核通过的）
  const submittedRows = await db.query(
    `SELECT COUNT(*) AS cnt FROM daily_reports
     WHERE user_id = ? AND report_type != 'office'
       AND status = 'approved'
       AND DATE_FORMAT(report_date, '%Y-%m') = ?`,
    [userId, month]
  );
  const totalSubmitted = submittedRows[0].cnt;

  // 应出勤天数（入场日→月底的自然日数）
  let workDays = 0;
  if (user.entry_date) {
    const [year, mon] = month.split('-').map(Number);
    const entryDate = new Date(user.entry_date);
    const monthStart = new Date(year, mon - 1, 1);
    const monthEnd = new Date(year, mon, 0); // 当月最后一天

    // 如果入场日期在该月之后，则该月应出勤为0
    if (entryDate <= monthEnd) {
      const start = entryDate > monthStart ? entryDate : monthStart;
      const diffTime = monthEnd.getTime() - start.getTime();
      workDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
  }

  // 按 today_work_type 分组统计（仅统计审核通过的）
  const breakdownRows = await db.query(
    `SELECT today_work_type, COUNT(*) AS cnt
     FROM daily_reports
     WHERE user_id = ? AND report_type != 'office'
       AND status = 'approved'
       AND DATE_FORMAT(report_date, '%Y-%m') = ?
     GROUP BY today_work_type`,
    [userId, month]
  );

  const workTypes = ['工作（陆）', '工作（海）', '待工', '在途', '请假', '调休'];
  const breakdown = {};
  workTypes.forEach(wt => { breakdown[wt] = 0; });
  breakdownRows.forEach(r => {
    if (r.today_work_type && breakdown.hasOwnProperty(r.today_work_type)) {
      breakdown[r.today_work_type] = Number(r.cnt);
    }
  });

  // 比例
  const ratio = {};
  const denominator = totalSubmitted || 1;
  workTypes.forEach(wt => {
    ratio[wt] = ((breakdown[wt] / denominator) * 100).toFixed(1) + '%';
  });

  return {
    userId,
    userName,
    month,
    totalSubmitted,
    workDays,
    breakdown,
    ratio,
  };
}

/**
 * 全员当日状态（管理层看板）
 * @param {string} dateStr - 日期 (YYYY-MM-DD)，默认今天
 * @returns {Promise<Object>}
 */
async function getDailyStatus(dateStr) {
  const date = dateStr || formatDate(new Date());

  // 所有在职外场人员
  const workers = await db.query(
    `SELECT id, nickname, user_name, worker_code, worker_status
     FROM users
     WHERE worker_status = 'active' AND deleted_at IS NULL
     ORDER BY id ASC`
  );

  // 当日所有审核通过的日报（含提交人和被代填人）
  const reports = await db.query(
    `SELECT
       dr.id AS reportId,
       dr.user_id AS submitterId,
       dr.report_type,
       dr.today_work_type,
       dr.project,
       dr.area,
       dr.status,
       dr.timeliness,
       dr.created_at,
       u.nickname AS submitterName
     FROM daily_reports dr
     LEFT JOIN users u ON dr.user_id = u.id
     WHERE dr.report_date = ? AND dr.status = 'approved'`,
    [date]
  );

  // 当日代填关系（仅审核通过的日报）
  const substitutions = await db.query(
    `SELECT drw.report_id, drw.worker_uid, dr.user_id AS submitterId
     FROM daily_report_workers drw
     JOIN daily_reports dr ON drw.report_id = dr.id
     WHERE dr.report_date = ? AND dr.status = 'approved'`,
    [date]
  );

  // v2.0 预留: 代填详情映射（subMap 暂未使用，保留供后续扩展）
  // const subMap = {};
  // substitutions.forEach(s => {
  //   if (!subMap[s.worker_uid]) {
  //     subMap[s.worker_uid] = [];
  //   }
  //   subMap[s.worker_uid].push(s.submitterId);
  // });

  // 构建 report map: user_id -> report
  const reportMapByUser = {};
  reports.forEach(r => {
    reportMapByUser[r.submitterId] = r;
  });

  // 找到每个被代填人的报告（通过 daily_report_workers）
  const subReportMap = {};
  substitutions.forEach(s => {
    const report = reports.find(r => r.reportId === s.report_id);
    if (report && !subReportMap[s.worker_uid]) {
      subReportMap[s.worker_uid] = report;
    }
  });

  // 为每个在职人员确定状态
  const workerList = [];
  const summary = {
    submitted: 0,
    supplement: 0,
    office: 0,
    substituted: 0,
    leave: 0,
    rest: 0,
    missing: 0,
  };

  for (const w of workers) {
    const ownReport = reportMapByUser[w.id];
    const subReport = subReportMap[w.id];
    const isSubstituted = !!subReport;

    let status = 'missing';
    let area = null;
    let project = null;
    let workType = '';
    let submittedAt = null;
    let substituteBy = null;
    let reportType = null;

    if (ownReport) {
      // 自己提交了日报
      reportType = ownReport.report_type;
      project = ownReport.project;
      area = ownReport.area ? ownReport.area.split('-')[0] : null;
      workType = ownReport.today_work_type || '';
      submittedAt = ownReport.created_at;

      if (ownReport.today_work_type === '请假') {
        status = 'leave';
      } else if (ownReport.today_work_type === '调休') {
        status = 'rest';
      } else if (ownReport.report_type === 'biz_trip_supplement') {
        status = 'supplement';
      } else if (ownReport.report_type === 'office') {
        status = 'office';
      } else {
        status = 'submitted';
      }
    } else if (isSubstituted) {
      // 被他人代填
      status = 'substituted';
      project = subReport.project;
      area = subReport.area ? subReport.area.split('-')[0] : null;
      workType = subReport.today_work_type || '';
      submittedAt = subReport.created_at;
      reportType = subReport.report_type;

      // 查找代填人姓名
      const submitterId = subReport.submitterId;
      const submitterUser = workers.find(u => u.id === submitterId);
      substituteBy = submitterUser ? (submitterUser.nickname || submitterUser.user_name) : '';
    } else {
      status = 'missing';
    }

    summary[status] = (summary[status] || 0) + 1;

    workerList.push({
      userId: w.id,
      userName: w.nickname || w.user_name || '',
      workerCode: w.worker_code || '',
      project,
      area,
      workType,
      status,
      submittedAt: submittedAt ? formatDateTime(submittedAt) : null,
      substituteBy,
    });
  }

  return {
    date,
    totalWorkers: workers.length,
    summary,
    workers: workerList,
  };
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss
 */
function formatDateTime(d) {
  if (!d) return null;
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

module.exports = { getStats, getUserStats, getAllStats, getProjectStats, getMonthlySummary, getDailyStatus };
