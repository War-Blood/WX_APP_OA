'use strict';

const db = require('../../common/config/database');
const { NotFoundError, BusinessError } = require('../../common/utils/errors');

/**
 * 审核服务
 * @module reviewService
 */

/**
 * 状态文本映射
 */
const STATUS_TEXT_MAP = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

/**
 * 审核列表（分页+多条件筛选）
 * 从 daily_reports 表查询，JOIN users 表获取用户名和部门
 *
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页条数
 * @param {string} [params.status] - 状态筛选: pending / approved / rejected
 * @param {string} [params.keyword] - 搜索关键词（项目名/用户名）
 * @param {string} [params.startDate] - 开始日期 (YYYY-MM-DD)
 * @param {string} [params.endDate] - 结束日期 (YYYY-MM-DD)
 * @returns {Promise<{list: Array, total: number, stats: {pending: number, todayReviewed: number, avgTime: string}}>}
 */
async function reviewList({ page, pageSize, status, keyword, startDate, endDate }) {
  const conditions = [];
  const params = [];

  // 筛选条件构建
  if (status) {
    conditions.push('dr.status = ?');
    params.push(status);
  }
  if (keyword) {
    conditions.push('(dr.project LIKE ? OR u.nickname LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (startDate) {
    conditions.push('dr.report_date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    conditions.push('dr.report_date <= ?');
    params.push(endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 查询总记录数
  const countSql = `
    SELECT COUNT(*) AS total
    FROM daily_reports dr
    LEFT JOIN users u ON dr.user_id = u.id
    ${whereClause}
  `;
  const countRows = await db.query(countSql, params);
  const total = countRows[0]?.total ?? 0;

  // 查询分页数据
  const offset = (page - 1) * pageSize;
  const dataSql = `
    SELECT
      dr.id,
      dr.user_id AS userId,
      u.nickname AS userName,
      u.department,
      dr.project,
      dr.report_date AS reportDate,
      dr.status,
      dr.created_at AS submitTime
    FROM daily_reports dr
    LEFT JOIN users u ON dr.user_id = u.id
    ${whereClause}
    ORDER BY dr.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const rows = await db.query(dataSql, [...params, pageSize, offset]);

  // 格式化列表项
  const list = rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    user: row.userName || '未知',       // 映射 userName → user（前端模板使用）
    userName: row.userName || '未知',   // 保留原名兼容
    department: row.department || '',
    project: row.project || '',
    reportDate: row.reportDate,
    status: row.status,
    statusText: STATUS_TEXT_MAP[row.status] || row.status,
    time: row.submitTime,              // 映射 submitTime → time（前端模板使用）
    submitTime: row.submitTime,        // 保留原名兼容
  }));

  // 统计信息
  const stats = await _getReviewStats();

  return { list, total, stats };
}

/**
 * 获取审核统计信息
 * @returns {Promise<{pending: number, todayReviewed: number, avgTime: string}>}
 * @private
 */
async function _getReviewStats() {
  // 待审核数
  const [pendingRow] = await db.query(
    "SELECT COUNT(*) AS count FROM daily_reports WHERE status = 'pending'"
  );
  const pending = pendingRow?.count ?? 0;

  // 今日已审核数
  const [todayRows] = await db.query(
    "SELECT COUNT(*) AS count FROM review_records WHERE DATE(created_at) = CURDATE()"
  );
  const todayReviewed = todayRows?.count ?? 0;

  // 平均审核耗时（从提交到审核的时间差，取已审核的记录）
  const [avgRows] = await db.query(`
    SELECT AVG(TIMESTAMPDIFF(HOUR, dr.created_at, rr.created_at)) AS avgHours
    FROM review_records rr
    INNER JOIN daily_reports dr ON rr.report_id = dr.id
    WHERE rr.action IS NOT NULL
  `);
  const avgHours = avgRows?.avgHours;
  const avgTime = avgHours != null ? `${Math.round(avgHours)}h` : '0h';

  return { pending, todayReviewed, avgTime };
}

/**
 * 审核详情
 * 查询 daily_reports 完整信息，JOIN users 获取 userName/department，
 * 并查询 review_records 获取审核记录
 *
 * @param {number} id - 日报 ID
 * @returns {Promise<Object>}
 * @throws {NotFoundError} 日报不存在
 */
async function reviewDetail(id) {
  // 查询日报基本信息 + 用户信息
  const rows = await db.query(
    `
    SELECT
      dr.*,
      u.nickname AS userName,
      u.department
    FROM daily_reports dr
    LEFT JOIN users u ON dr.user_id = u.id
    WHERE dr.id = ?
    `,
    [id]
  );

  if (rows.length === 0) {
    throw new NotFoundError('日报不存在');
  }

  const report = rows[0];

  // 查询审核记录
  const reviewRecords = await db.query(
    `
    SELECT rr.*, u.nickname AS reviewerName
    FROM review_records rr
    LEFT JOIN users u ON rr.reviewer_id = u.id
    WHERE rr.report_id = ?
    ORDER BY rr.created_at DESC
    `,
    [id]
  );

  // 组装审核记录信息
  const record = reviewRecords.length > 0 ? {
    id: reviewRecords[0].id,
    reviewerId: reviewRecords[0].reviewer_id,
    reviewerName: reviewRecords[0].reviewerName || '未知',
    action: reviewRecords[0].action,
    opinion: reviewRecords[0].opinion || '',
    reviewTime: reviewRecords[0].created_at,
  } : null;

  // 格式化返回（与 API 文档 4.2 节一致）
  return {
    id: report.id,
    date: report.report_date,
    weekday: report.weekday || '',
    entryDate: report.entry_date || '',
    initialBizTripDate: report.initial_biz_trip_date || '',
    project: report.project || '',
    area: report.area || '',
    relatedParty: report.related_party || '',
    workers: report.workers || '',
    machineModel: report.machine_model || '',
    workerCount: report.worker_count || '',
    workContent: report.work_content || '',
    todayWorkType: report.today_work_type || '',
    todayWork: report.today_work || '',
    requiredQty: report.required_qty ?? null,
    completedQty: report.completed_qty ?? null,
    tomorrowWorkType: report.tomorrow_work_type || '',
    tomorrowPlan: report.tomorrow_plan || '',
    issues: report.issues || '',
    remark: report.remark || '',
    bizTripDays: report.biz_trip_days ?? null,
    personalBizTripDays: report.personal_biz_trip_days ?? null,
    images: report.images ? (typeof report.images === 'string' ? JSON.parse(report.images) : report.images) : [],
    status: report.status,
    statusText: STATUS_TEXT_MAP[report.status] || report.status,
    reviewer: record?.reviewerName || '',
    reviewOpinion: record?.opinion || '',
    reviewTime: record?.reviewTime || '',
    createTime: report.created_at,
    updateTime: report.updated_at,
    // 额外字段
    userId: report.user_id,
    user: report.userName || '未知',     // 映射 userName → user（前端对齐）
    userName: report.userName || '未知',  // 保留原名兼容
    department: report.department || '',
    reviewRecord: record,
  };
}

/**
 * 审核操作（通过/驳回）
 *
 * @param {Object} data - 审核操作数据
 * @param {number} data.reportId - 日报 ID
 * @param {number} data.reviewerId - 审核人 ID
 * @param {string} data.action - 审核操作: approve / reject
 * @param {string} [data.opinion] - 审核意见（驳回时必填）
 * @returns {Promise<{success: boolean, id: number, status: string}>}
 * @throws {BusinessError} 参数校验失败或状态错误
 * @throws {NotFoundError} 日报不存在
 */
async function reviewAction({ reportId, reviewerId, action, opinion }) {
  // 1. 校验 action 参数
  if (!['approve', 'reject'].includes(action)) {
    throw new BusinessError('审核操作无效，仅支持 approve 或 reject');
  }

  // 2. 校验驳回时必须填写意见
  if (action === 'reject' && !opinion) {
    throw new BusinessError('驳回时必须填写审核意见');
  }

  // 使用事务处理
  const result = await db.transaction(async (conn) => {
    // 查询日报
    const [reports] = await conn.query(
      'SELECT * FROM daily_reports WHERE id = ?',
      [reportId]
    );

    if (reports.length === 0) {
      throw new NotFoundError('日报不存在');
    }

    const report = reports[0];

    // 3. 校验日报状态必须是 pending
    if (report.status !== 'pending') {
      throw new BusinessError('日报已审核，请勿重复操作');
    }

    const now = new Date();
    const targetStatus = action === 'approve' ? 'approved' : 'rejected';

    // 4. 更新 daily_reports.status
    await conn.execute(
      'UPDATE daily_reports SET status = ?, updated_at = NOW() WHERE id = ?',
      [targetStatus, reportId]
    );

    // 5. 写入 review_records 表
    const [recordResult] = await conn.execute(
      `INSERT INTO review_records (report_id, reviewer_id, action, opinion, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [reportId, reviewerId, action, opinion || null, now]
    );

    // 6. 创建消息通知（通知日报提交人审核结果）
    const actionText = action === 'approve' ? '通过' : '驳回';
    const messageTitle = '日报审核通知';
    const messageDesc = `您的日报「${report.project || '未知项目'}」已被${actionText}`;
    const messageContent = opinion
      ? `${actionText}原因：${opinion}\n\n日报日期：${report.report_date}\n项目：${report.project || '未知'}\n作业人员：${report.workers || '-'}`
      : `日报「${report.project || '未知项目'}」审核${actionText}\n\n日报日期：${report.report_date}\n作业人员：${report.workers || '-'}`;

    await conn.execute(
      `INSERT INTO messages (receiver_id, type, title, description, content, is_read, created_at)
       VALUES (?, 'report', ?, ?, ?, 0, NOW())`,
      [report.user_id, messageTitle, messageDesc, messageContent]
    );

    return {
      success: true,
      id: report.id,
      status: targetStatus,
      reviewOpinion: opinion || '',
      reviewTime: now.toISOString().replace('T', ' ').substring(0, 19),
    };
  });

  return result;
}

/**
 * 审核统计
 *
 * @param {string} [period='week'] - 统计周期: week / month / quarter
 * @returns {Promise<{totalPending: number, todayReviewed: number, avgReviewTime: string, approvalRate: string, trendList: Array}>}
 */
async function reviewStats(period = 'week') {
  // 待审核总数
  const [pendingRow] = await db.query(
    "SELECT COUNT(*) AS count FROM daily_reports WHERE status = 'pending'"
  );
  const totalPending = pendingRow?.count ?? 0;

  // 今日审核数
  const [todayRows] = await db.query(
    "SELECT COUNT(*) AS count FROM review_records WHERE DATE(created_at) = CURDATE()"
  );
  const todayReviewed = todayRows?.count ?? 0;

  // 平均审核耗时
  const [avgRows] = await db.query(`
    SELECT AVG(TIMESTAMPDIFF(HOUR, dr.created_at, rr.created_at)) AS avgHours
    FROM review_records rr
    INNER JOIN daily_reports dr ON rr.report_id = dr.id
    WHERE rr.action IS NOT NULL
  `);
  const avgHours = avgRows?.avgHours;
  const avgReviewTime = avgHours != null ? `${Math.round(avgHours)}h` : '0h';

  // 通过率
  const [totalReviewedRow] = await db.query(
    'SELECT COUNT(*) AS count FROM review_records'
  );
  const [approvedRow] = await db.query(
    "SELECT COUNT(*) AS count FROM review_records WHERE action = 'approve'"
  );
  const totalReviewed = totalReviewedRow?.count ?? 0;
  const approvedCount = approvedRow?.count ?? 0;
  const approvalRate = totalReviewed > 0
    ? `${Math.round((approvedCount / totalReviewed) * 100)}%`
    : '0%';

  // 趋势数据
  const trendList = await _getTrendData(period);

  return {
    totalPending,
    todayReviewed,
    avgReviewTime,
    approvalRate,
    trendList,
  };
}

/**
 * 获取审核趋势数据
 * @param {string} period - 统计周期
 * @returns {Promise<Array<{date: string, count: number}>>}
 * @private
 */
async function _getTrendData(period) {
  let dateFormat;
  let intervalDays;

  switch (period) {
    case 'month':
      dateFormat = '%Y-%m-%d';
      intervalDays = 30;
      break;
    case 'quarter':
      dateFormat = '%Y-%m-%d';
      intervalDays = 90;
      break;
    case 'week':
    default:
      dateFormat = '%Y-%m-%d';
      intervalDays = 7;
      break;
  }

  const rows = await db.query(
    `
    SELECT
      DATE(created_at) AS date,
      COUNT(*) AS count
    FROM review_records
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY DATE(created_at)
    ORDER BY date ASC
    `,
    [intervalDays]
  );

  return rows.map((row) => ({
    date: row.date,
    count: row.count,
  }));
}

module.exports = {
  reviewList,
  reviewDetail,
  reviewAction,
  reviewStats,
};
