'use strict';

const db = require('../../common/config/database');
const { NotFoundError } = require('../../common/utils/errors');

/**
 * 项目服务
 * 基于 daily_reports 表按 project 列聚合
 */

const STATUS_TEXT_MAP = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  draft: '草稿',
  submitted: '已提交',
};

/**
 * 项目列表（分页+搜索）
 * 从 daily_reports 按 project 列 DISTINCT + GROUP BY 聚合
 *
 * @param {Object} params
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页条数
 * @param {string} [params.keyword] - 搜索关键词（项目名模糊匹配）
 * @returns {Promise<{list: Array, total: number}>}
 */
async function projectList({ page, pageSize, keyword }) {
  const conditions = ['dr.project IS NOT NULL', "dr.project != ''"];
  const params = [];

  if (keyword) {
    conditions.push('dr.project LIKE ?');
    params.push(`%${keyword}%`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // 查询去重项目总数
  const countSql = `
    SELECT COUNT(DISTINCT dr.project) AS total
    FROM daily_reports dr
    ${whereClause}
  `;
  const countRows = await db.query(countSql, params);
  const total = countRows[0]?.total ?? 0;

  // 查询分页项目列表：按 project 分组聚合
  const offset = (page - 1) * pageSize;
  const dataSql = `
    SELECT
      dr.project AS name,
      dr.area,
      COUNT(*) AS reportCount,
      COUNT(DISTINCT dr.user_id) AS memberCount,
      MAX(dr.report_date) AS lastReportDate
    FROM daily_reports dr
    ${whereClause}
    GROUP BY dr.project, dr.area
    ORDER BY lastReportDate DESC
    LIMIT ? OFFSET ?
  `;
  const rows = await db.query(dataSql, [...params, pageSize, offset]);

  const list = rows.map((row) => ({
    id: row.name,                          // project 列名作为 id
    name: row.name,
    area: row.area || '',
    memberCount: row.memberCount ?? 0,
    reportCount: row.reportCount ?? 0,
    lastReportDate: row.lastReportDate || '',
  }));

  return { list, total };
}

/**
 * 项目详情
 * 查该项目下所有日报 + 参与人员列表 + 统计
 *
 * @param {string} id - 项目名称（project 列值）
 * @returns {Promise<Object>}
 * @throws {NotFoundError} 项目不存在
 */
async function projectDetail({ id }) {
  // 查询该项目下所有日报 + 关联用户信息
  const reports = await db.query(
    `SELECT
      dr.*,
      u.nickname AS userName,
      u.department
    FROM daily_reports dr
    LEFT JOIN users u ON dr.user_id = u.id
    WHERE dr.project = ?
    ORDER BY dr.report_date DESC`,
    [id]
  );

  if (reports.length === 0) {
    throw new NotFoundError('项目不存在或无日报记录');
  }

  // 参与人员去重
  const memberMap = new Map();
  for (const r of reports) {
    if (r.user_id && !memberMap.has(String(r.user_id))) {
      memberMap.set(String(r.user_id), {
        userId: String(r.user_id),
        nickName: r.userName || '未知',
        role: r.role || 'employee',
      });
    }
  }
  const members = Array.from(memberMap.values());

  // 项目名称和区域取第一条
  const projectName = reports[0].project || '';
  const area = reports[0].area || '';

  // 日报列表格式化
  const reportList = reports.map((r) => ({
    id: r.id,
    date: r.report_date,
    workers: r.workers || '',
    workContent: r.work_content || '',
    todayWork: r.today_work || '',
    status: r.status,
    statusText: STATUS_TEXT_MAP[r.status] || r.status,
    submitter: r.userName || '未知',
  }));

  // 统计
  const totalReports = reports.length;
  const approvedCount = reports.filter((r) => r.status === 'approved').length;
  const approvalRate = totalReports > 0
    ? `${Math.round((approvedCount / totalReports) * 100)}%`
    : '0%';

  // 计算平均工作天数（去重日期）
  const uniqueDates = new Set(reports.map((r) => r.report_date));
  const avgWorkDays = uniqueDates.size;

  return {
    id: projectName,
    name: projectName,
    area,
    memberCount: members.length,
    members,
    reports: reportList,
    stats: {
      totalReports,
      approvalRate,
      avgWorkDays,
    },
  };
}

/**
 * 项目统计
 * 通过率、审批数、趋势等
 *
 * @param {Object} params
 * @param {string} [params.projectId] - 项目名称（可选，不传则全量统计）
 * @param {string} [params.period='week'] - 统计周期: week / month / quarter
 * @returns {Promise<Object>}
 */
async function projectStats({ projectId, period = 'week' }) {
  const projectCondition = projectId ? 'WHERE project = ?' : '';
  const projectParams = projectId ? [projectId] : [];

  // 各状态数量
  const [totalRow] = await db.query(
    `SELECT COUNT(*) AS count FROM daily_reports ${projectCondition}`,
    projectParams
  );
  const totalReports = totalRow?.count ?? 0;

  const [approvedRow] = await db.query(
    `SELECT COUNT(*) AS count FROM daily_reports ${projectCondition} AND status = 'approved'`,
    projectParams
  );
  const approvedCount = approvedRow?.count ?? 0;

  const [pendingRow] = await db.query(
    `SELECT COUNT(*) AS count FROM daily_reports ${projectCondition} AND status = 'pending'`,
    projectParams
  );
  const pendingCount = pendingRow?.count ?? 0;

  const [rejectedRow] = await db.query(
    `SELECT COUNT(*) AS count FROM daily_reports ${projectCondition} AND status = 'rejected'`,
    projectParams
  );
  const rejectedCount = rejectedRow?.count ?? 0;

  // 通过率
  const reviewedTotal = approvedCount + rejectedCount;
  const approvalRate = reviewedTotal > 0
    ? `${Math.round((approvedCount / reviewedTotal) * 100)}%`
    : '0%';

  // 趋势数据
  const trendList = await _getProjectTrendData(period, projectId);

  return {
    totalReports,
    approvedCount,
    pendingCount,
    rejectedCount,
    approvalRate,
    trendList,
  };
}

/**
 * 获取项目日报趋势数据
 * @param {string} period - 统计周期
 * @param {string} [projectId] - 项目名称
 * @returns {Promise<Array<{date: string, count: number}>>}
 * @private
 */
async function _getProjectTrendData(period, projectId) {
  let intervalDays;
  switch (period) {
    case 'month':  intervalDays = 30; break;
    case 'quarter': intervalDays = 90; break;
    case 'week':
    default:       intervalDays = 7;  break;
  }

  const projectCondition = projectId ? 'AND project = ?' : '';
  const params = [intervalDays];
  if (projectId) params.push(projectId);

  const rows = await db.query(
    `SELECT
      report_date AS date,
      COUNT(*) AS count
    FROM daily_reports
    WHERE report_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ${projectCondition}
    GROUP BY report_date
    ORDER BY date ASC`,
    params
  );

  return rows.map((row) => ({
    date: row.date,
    count: row.count,
  }));
}

module.exports = { projectList, projectDetail, projectStats };
