'use strict';

const db = require('../../common/config/database');
const { NotFoundError, BusinessError } = require('../../common/utils/errors');
const { ErrorCode } = require('../../common/utils/constants');

/**
 * 日报服务 v2.0
 * 支持公出日志（biz_trip）、补公出日志（biz_trip_supplement）、公司日报（office）
 */

const STATUS_TEXT_MAP = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  draft: '草稿',
  submitted: '已提交',
  pending_review: '待审核',
};

/**
 * 将 DB 行（snake_case）映射为前端 camelCase 格式
 * @param {Object} row - 数据库原始行
 * @returns {Object} 格式化后的日报对象
 */
function formatDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  const dt = new Date(d);
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}

function formatDateTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

function formatReportRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    date: formatDate(row.report_date),
    reportDate: formatDate(row.report_date),
    reportType: row.report_type || 'biz_trip',
    project: row.project || '',
    area: row.area || '',
    workContent: row.work_content || '',
    todayWorkType: row.today_work_type || '',
    todayWork: row.today_work || '',
    tomorrowWorkType: row.tomorrow_work_type || '',
    tomorrowPlan: row.tomorrow_plan || '',
    workers: row.workers || '',
    machineModel: row.machine_model || '',
    workerCount: row.worker_count != null ? Number(row.worker_count) : 0,
    requiredQty: row.required_qty != null ? Number(row.required_qty) : 0,
    completedQty: row.completed_qty != null ? Number(row.completed_qty) : 0,
    progressPercent: (() => {
      const v = row.progress_percent;
      if (v == null) return '0%';
      return Math.round(Number(v) * 100) + '%';
    })(),
    issues: row.issues || '',
    remark: row.remark || '',
    entryDate: formatDate(row.entry_date),
    initialBizTripDate: formatDate(row.initial_biz_trip_date),
    relatedParty: row.related_party || '',
    personalBizTripDays: row.personal_biz_trip_days != null ? Number(row.personal_biz_trip_days) : 0,
    content: row.content || '',
    files: row.files ? (typeof row.files === 'string' ? tryParseJSON(row.files) : row.files) : [],
    status: row.status,
    statusText: STATUS_TEXT_MAP[row.status] || row.status,
    progressText: row.progress_percent != null ? `${row.progress_percent}%` : '0%',
    submitter: extractFirstName(row.workers),
    summary: row.today_work || '',
    userName: row.userName || '',
    department: row.department || '',
    supplementDate: formatDate(row.supplement_date),
    supplementReason: row.supplement_reason || '',
    timeliness: row.timeliness || '',
    createTime: formatDate(row.created_at),
    updateTime: formatDate(row.updated_at),
  };
}

/**
 * 从 workers 字段提取第一个名字
 * @param {string} workers - workers 字段值
 * @returns {string} 第一个工人名字
 */
function extractFirstName(workers) {
  if (!workers || typeof workers !== 'string') return '';
  const name = workers.split(/[,，、\s]+/)[0];
  return name || '';
}

/**
 * 尝试 JSON 解析，失败则返回原值
 */
function tryParseJSON(str) {
  try { return JSON.parse(str); } catch { return str; }
}

// ==============================
// 基础 CRUD
// ==============================

/**
 * 日报列表（分页+筛选）
 * @param {number} userId - 用户 ID
 * @param {Object} params - 查询参数
 * @returns {Promise<{list: Array, total: number}>}
 */
async function list(userId, { page, pageSize, status, startDate, endDate, keyword }) {
  const conditions = [];
  const params = [];

  // userId：传 0 或不传 = 管理员看全部
  if (userId && userId !== 0) {
    conditions.push('dr.user_id = ?');
    params.push(userId);
  }

  if (status) {
    conditions.push('dr.status = ?');
    params.push(status);
  }
  if (startDate) {
    conditions.push('dr.report_date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    conditions.push('dr.report_date <= ?');
    params.push(endDate);
  }
  if (keyword) {
    conditions.push('(dr.project LIKE ? OR dr.workers LIKE ? OR dr.work_content LIKE ? OR dr.today_work LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countSql = `SELECT COUNT(*) AS total FROM daily_reports dr ${whereClause}`;
  const countRows = await db.query(countSql, params);
  const total = countRows[0].total;

  const offset = (page - 1) * pageSize;
  const dataSql = `
    SELECT dr.*, u.nickname AS userName, u.department
    FROM daily_reports dr
    LEFT JOIN users u ON dr.user_id = u.id
    ${whereClause}
    ORDER BY dr.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const rows = await db.query(dataSql, [...params, pageSize, offset]);

  const mappedList = rows.map((row) => formatReportRow(row));

  return { list: mappedList, total };
}

/**
 * 日报详情
 * @param {number} id - 日报 ID
 * @returns {Promise<Object>}
 */
async function detail(id) {
  const rows = await db.query(
    `SELECT dr.*, u.nickname AS userName, u.department
     FROM daily_reports dr LEFT JOIN users u ON dr.user_id = u.id
     WHERE dr.id = ?`, [id]);

  if (rows.length === 0) {
    throw new NotFoundError('日报不存在');
  }

  return formatReportRow(rows[0]);
}

/**
 * 获取草稿
 * @param {number} userId - 用户 ID
 * @param {string} reportDate - 日报日期 (YYYY-MM-DD)
 * @returns {Promise<Object|null>}
 */
async function getDraft(userId, reportDate) {
  const rows = await db.query(
    `SELECT dr.*, u.nickname AS userName, u.department
     FROM daily_reports dr
     LEFT JOIN users u ON dr.user_id = u.id
     WHERE dr.user_id = ? AND dr.report_date = ? AND dr.status = ?`,
    [userId, reportDate, 'draft']
  );
  return rows[0] ? formatReportRow(rows[0]) : null;
}

/**
 * 删除日报（仅允许删除草稿或已驳回的日报）
 * @param {number} id - 日报 ID
 * @param {number} userId - 用户 ID
 * @returns {Promise<void>}
 */
async function deleteReport(id, userId) {
  const rows = await db.query('SELECT id, user_id, status FROM daily_reports WHERE id = ?', [id]);

  if (rows.length === 0) {
    throw new NotFoundError('日报不存在');
  }

  // 普通用户只能删除自己的日报（管理员 userId=0 可删除任意）
  if (userId && userId !== 0 && rows[0].user_id !== userId) {
    throw new BusinessError('无权删除他人日报', null, ErrorCode.REPORT_DELETE_FORBIDDEN);
  }

  await db.execute('DELETE FROM daily_reports WHERE id = ?', [id]);
}

// ==============================
// 提交日报 v2.0（改造核心）
// ==============================

/**
 * 提交/保存日报（v2.0 改造）
 * 支持三种 reportType: biz_trip / biz_trip_supplement / office
 *
 * @param {Object} data - 请求数据（已由 controller 补充 entryDate/initialBizTripDate）
 * @param {number} data.reportType - 日志类型
 * @param {string} data.reportDate - 日报日期
 * @param {string} [data.project] - 项目名称
 * @param {string} [data.area] - 项目区域
 * @param {number[]} [data.workerIds] - 作业人员 UID 数组
 * @param {string} [data.machineModel] - 机型
 * @param {string} [data.workContent] - 工作内容
 * @param {number} [data.requiredQty] - 需要完成数量
 * @param {number} [data.completedQty] - 累计完成数量
 * @param {string} [data.remark] - 备注
 * @param {string} [data.todayWork] - 当日工作小结
 * @param {string} [data.todayWorkType] - 今日工作类型
 * @param {string} [data.tomorrowWorkType] - 明日工作类型
 * @param {string} [data.entryDate] - 入场日期
 * @param {string} [data.initialBizTripDate] - 初始出差日期
 * @param {string} [data.supplementDate] - 补录目标日期
 * @param {string} [data.supplementReason] - 补录原因
 * @param {string} [data.tomorrowPlan] - 明日计划
 * @param {string} [data.issues] - 存在问题
 * @param {string} [data.coordination] - 需要协调
 * @param {string} [data.relatedParty] - 相关方单位
 * @param {string} [data.status] - 前端指定状态（仅草稿时用 'draft'）
 * @param {number} userId - 当前登录用户 ID（由 controller 注入）
 * @returns {Promise<{reportId: number}>}
 */
async function submit(data, userId) {
  const {
    reportType = 'biz_trip',
    reportDate,
    project,
    area,
    workerIds,
    machineModel,
    workContent,
    requiredQty,
    completedQty,
    remark,
    todayWork,
    todayWorkType,
    tomorrowWorkType,
    entryDate,
    initialBizTripDate,
    supplementDate,
    supplementReason,
    tomorrowPlan,
    issues,
    coordination,
    relatedParty,
    personalBizTripDays,
    bizTripDays,
    status: requestStatus,
  } = data;

  const isDraft = requestStatus === 'draft';
  const isLeaveOrRest = todayWorkType === '请假' || todayWorkType === '调休';

  // 补公出日志：report_date 使用补录日期而非提交日期
  // 这样同一用户可以补录多个不同日期，且重复检测按补录日期判断
  const effectiveReportDate = (reportType === 'biz_trip_supplement' && supplementDate)
    ? supplementDate
    : reportDate;

  // 1. 检查是否已被代填（非草稿、非请假/调休时检查）
  if (!isDraft && !isLeaveOrRest) {
    const subCheck = await db.query(
      `SELECT dr.id AS reportId, u.nickname AS submitterName
       FROM daily_report_workers drw
       JOIN daily_reports dr ON drw.report_id = dr.id
       JOIN users u ON dr.user_id = u.id
       WHERE drw.worker_uid = ? AND dr.report_date = ?`,
      [userId, effectiveReportDate]
    );
    if (subCheck.length > 0) {
      throw new BusinessError(`当日公出日志已由 ${subCheck[0].submitterName} 代填`, null, ErrorCode.REPORT_SUBSTITUTED);
    }
  }

  // 2. 请假/调休时自动填充 work_content
  let finalWorkContent = workContent;
  if (isLeaveOrRest && !finalWorkContent) {
    finalWorkContent = todayWorkType;
  }

  // 3. 确定 status、timeliness
  let finalStatus;
  let timeliness = 'on_time';
  if (isDraft) {
    finalStatus = 'draft';
  } else if (reportType === 'biz_trip_supplement') {
    finalStatus = 'pending_review';
  } else {
    finalStatus = 'approved';
  }

  // 3b. 同步 workers 文本字段（向后兼容旧版 getWorkerList/getWorkerStats/exportCSV）
  let workersText = '';
  if (workerIds && workerIds.length > 0) {
    const wPlaceholders = workerIds.map(() => '?').join(', ');
    const userRows = await db.query(
      `SELECT id, nickname FROM users WHERE id IN (${wPlaceholders})`,
      workerIds
    );
    workersText = userRows.map(u => u.nickname).join('、');
  }

  // 4. 插入 daily_reports（使用事务包裹 + 代填关联表写入）
  const reportId = await db.transaction(async (conn) => {
    // 4a. 检查当日是否已有自己的日报
    // 🔍 临时调试 — 确认后删除
    const [existing] = await conn.query(
      'SELECT id, status FROM daily_reports WHERE user_id = ? AND report_date = ? AND deleted_at IS NULL',
      [userId, effectiveReportDate]
    );

    const fields = {
      user_id: userId,
      report_date: effectiveReportDate,
      report_type: reportType,
      project: project || null,
      area: area || null,
      today_work_type: todayWorkType || null,
      today_work: todayWork || null,
      tomorrow_work_type: tomorrowWorkType || null,
      tomorrow_plan: tomorrowPlan || null,
      work_content: finalWorkContent || null,
      machine_model: machineModel || null,
      required_qty: requiredQty != null ? Number(requiredQty) : 0,
      completed_qty: completedQty != null ? Number(completedQty) : 0,
      progress_percent: Number(requiredQty) > 0
        ? Math.round((Number(completedQty) / Number(requiredQty)) * 100) / 100
        : 0,
      workers: workersText || null,
      issues: issues || null,
      remark: remark || null,
      entry_date: entryDate || null,
      initial_biz_trip_date: initialBizTripDate || null,
      related_party: relatedParty || null,
      biz_trip_days: bizTripDays != null ? Number(bizTripDays) : (personalBizTripDays != null ? Number(personalBizTripDays) : 0),
      personal_biz_trip_days: personalBizTripDays != null ? Number(personalBizTripDays) : 0,
      supplement_date: supplementDate || null,
      supplement_reason: supplementReason || null,
      content: coordination || null,
      status: finalStatus,
      timeliness: timeliness,
      worker_count: (workerIds && workerIds.length > 0) ? workerIds.length : 0,
    };

    let resultReportId;

    if (existing.length > 0) {
      const existingStatus = existing[0].status;

      if (isDraft) {
        // 草稿模式：总是更新已有记录
        const columns = Object.keys(fields).map(key => `${key} = ?`).join(', ');
        const values = Object.values(fields);
        await conn.execute(
          `UPDATE daily_reports SET ${columns}, updated_at = NOW() WHERE id = ?`,
          [...values, existing[0].id]
        );
        resultReportId = existing[0].id;
      } else if (existingStatus === 'draft') {
        // 已有草稿，正式提交覆盖
        const columns = Object.keys(fields).map(key => `${key} = ?`).join(', ');
        const values = Object.values(fields);
        await conn.execute(
          `UPDATE daily_reports SET ${columns}, updated_at = NOW() WHERE id = ?`,
          [...values, existing[0].id]
        );
        resultReportId = existing[0].id;
      } else {
        // 已有已提交/已审核记录，禁止重复提交
        throw new BusinessError('该日期已提交日报，请勿重复提交', null, ErrorCode.REPORT_ALREADY_SUBMITTED);
      }
    } else {
      // INSERT 新记录
      fields.created_at = new Date();
      const keys = Object.keys(fields).join(', ');
      const placeholders = Object.keys(fields).map(() => '?').join(', ');
      const values = Object.values(fields);
      const result = await conn.execute(
        `INSERT INTO daily_reports (${keys}) VALUES (${placeholders})`,
        values
      );
      resultReportId = result[0].insertId;
    }

    // 4b. 写入代填关联表（非请假/调休且 workerIds 非空）
    if (!isLeaveOrRest && workerIds && workerIds.length > 0) {
      // 先清理旧的代填关联（如果更新已有记录）
      if (existing.length > 0) {
        await conn.execute(
          'DELETE FROM daily_report_workers WHERE report_id = ?',
          [resultReportId]
        );
      }
      // 批量插入
      for (const wuid of workerIds) {
        // 不把自己加为代填对象
        if (wuid === userId) continue;
        await conn.execute(
          'INSERT IGNORE INTO daily_report_workers (report_id, worker_uid) VALUES (?, ?)',
          [resultReportId, wuid]
        );
      }
    }

    return resultReportId;
  });

  return { reportId };
}

// ==============================
// 代填检测（新增）
// ==============================

/**
 * 检查某人当日是否已被代填
 * @param {number} userId - 被检查的用户 ID
 * @param {string} reportDate - 日报日期 (YYYY-MM-DD)
 * @returns {Promise<{canSubmit?: boolean, submittedBy?: string, reportId?: number}>}
 */
async function checkDuplicate(userId, reportDate) {
  const rows = await db.query(
    `SELECT dr.id AS reportId, u.nickname AS submitterName
     FROM daily_report_workers drw
     JOIN daily_reports dr ON drw.report_id = dr.id
     JOIN users u ON dr.user_id = u.id
     WHERE drw.worker_uid = ? AND dr.report_date = ?`,
    [userId, reportDate]
  );

  if (rows.length > 0) {
    return {
      canSubmit: false,
      submittedBy: rows[0].submitterName || '',
      reportId: rows[0].reportId,
    };
  }

  return { canSubmit: true };
}

/**
 * 查询用户当日日报状态（自己已提交 / 被代填 / 草稿 / 无）
 * @param {number} userId - 用户 ID
 * @param {string} reportDate - 日期 YYYY-MM-DD
 * @returns {Promise<{status: string, reportId?: number, submittedBy?: string}>}
 */
async function getTodayStatus(userId, reportDate) {
  // 1. 查自己是否已提交（非草稿、非删除）
  const selfRows = await db.query(
    `SELECT id, status FROM daily_reports
     WHERE user_id = ? AND report_date = ? AND deleted_at IS NULL`,
    [userId, reportDate]
  );

  if (selfRows.length > 0) {
    const rec = selfRows[0];
    if (rec.status === 'draft') {
      return { status: 'draft', reportId: rec.id };
    }
    // submitted / approved / rejected / pending_review 都视为已提交
    return { status: 'submitted', reportId: rec.id };
  }

  // 2. 查是否被代填（出现在他人日报的作业人员列表中）
  const subRows = await db.query(
    `SELECT dr.id AS reportId, u.nickname AS submitterName
     FROM daily_report_workers drw
     JOIN daily_reports dr ON drw.report_id = dr.id
     JOIN users u ON dr.user_id = u.id
     WHERE drw.worker_uid = ? AND dr.report_date = ? AND dr.deleted_at IS NULL`,
    [userId, reportDate]
  );

  if (subRows.length > 0) {
    return {
      status: 'substituted',
      reportId: subRows[0].reportId,
      submittedBy: subRows[0].submitterName || '',
    };
  }

  return { status: 'none' };
}

// ==============================
// 补公出日志审核（新增）
// ==============================

/**
 * 补公出日志待审核列表
 * @param {Object} params
 * @param {string} params.status - 'pending' | 'reviewed' | 'all'
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页条数
 * @returns {Promise<{list: Array, total: number}>}
 */
async function getPendingReviews({ status: reviewStatus, page = 1, pageSize = 20 }) {
  const conditions = ["dr.report_type = 'biz_trip_supplement'"];
  const params = [];

  if (reviewStatus === 'pending') {
    conditions.push("dr.status = 'pending_review'");
  } else if (reviewStatus === 'reviewed') {
    conditions.push("dr.status IN ('approved', 'rejected')");
  }
  // 'all' 不加状态限制

  const whereClause = 'WHERE ' + conditions.join(' AND ');

  // 总数
  const countSql = `SELECT COUNT(*) AS total FROM daily_reports dr ${whereClause}`;
  const countRows = await db.query(countSql, params);
  const total = countRows[0].total;

  // 分页数据
  const offset = (page - 1) * pageSize;
  const dataSql = `
    SELECT
      dr.id AS reportId,
      dr.report_date AS reportDate,
      dr.supplement_date AS supplementDate,
      dr.project,
      dr.supplement_reason AS supplementReason,
      dr.status,
      dr.created_at AS createdAt,
      u.nickname AS submitterName
    FROM daily_reports dr
    LEFT JOIN users u ON dr.user_id = u.id
    ${whereClause}
    ORDER BY dr.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const rows = await db.query(dataSql, [...params, pageSize, offset]);

  const list = rows.map(r => ({
    reportId: r.reportId,
    reportDate: formatDate(r.reportDate),
    supplementDate: formatDate(r.supplementDate),
    submitterName: r.submitterName || '',
    project: r.project || '',
    supplementReason: r.supplementReason || '',
    status: r.status,
    createdAt: formatDateTime(r.createdAt),
  }));

  return { list, total };
}

/**
 * 补公出日志审核判定
 * decision = 'special' → status='approved', timeliness='on_time'
 * decision = 'forget'  → status='approved', timeliness='delayed'
 *
 * @param {number} reportId - 日报 ID
 * @param {string} decision - 'special' | 'forget'
 * @param {string} [comment] - 审核意见
 * @returns {Promise<Object>}
 */
async function supplementReview(reportId, decision, comment, reviewerId) {
  // 验证日报存在且是补公出日志
  const reports = await db.query(
    'SELECT id, user_id, report_type, status, project FROM daily_reports WHERE id = ?',
    [reportId]
  );
  if (reports.length === 0) {
    throw new NotFoundError('日报不存在');
  }
  if (reports[0].report_type !== 'biz_trip_supplement') {
    throw new BusinessError('该日志不是补公出日志', null, ErrorCode.REPORT_NOT_SUPPLEMENT);
  }
  if (reports[0].status !== 'pending_review') {
    throw new BusinessError('该日志已审核，请勿重复操作', null, ErrorCode.REPORT_ALREADY_REVIEWED);
  }

  const report = reports[0];
  const timeliness = decision === 'special' ? 'on_time' : 'delayed';
  const action = decision === 'special' ? 'supplement_special' : 'supplement_delayed';
  const decisionText = decision === 'special' ? '特殊情况—正常' : '非特殊/忘记—延迟';
  const now = new Date();

  // 事务: 更新日报 + 写入审核记录 + 发送消息通知
  await db.transaction(async (conn) => {
    await conn.execute(
      'UPDATE daily_reports SET status = ?, timeliness = ?, remark = CONCAT(IFNULL(remark, ""), ?) WHERE id = ?',
      ['approved', timeliness, comment ? ` [审核意见: ${comment}]` : '', reportId]
    );

    await conn.execute(
      `INSERT INTO review_records (report_id, reviewer_id, action, opinion, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [reportId, reviewerId, action, comment || null, now]
    );

    const messageTitle = '补公出日志审核通知';
    const messageDesc = `您的补公出日志已被审核为「${decisionText}」`;
    const messageContent = comment
      ? `审核判定：${decisionText}\n审核意见：${comment}\n\n项目：${report.project || '未知'}\n补录日期：${report.report_date}`
      : `审核判定：${decisionText}\n\n项目：${report.project || '未知'}\n补录日期：${report.report_date}`;

    await conn.execute(
      `INSERT INTO messages (receiver_id, type, title, description, content, is_read, created_at)
       VALUES (?, 'report', ?, ?, ?, 0, ?)`,
      [report.user_id, messageTitle, messageDesc, messageContent, now]
    );
  });

  return { reportId, decision, timeliness };
}

// ==============================
// 同组日志列表（新增）
// ==============================

/**
 * 同组日志列表
 * "同组" = 同一 related_party + 最近30天同项目的其他用户
 *
 * @param {number} userId - 当前用户 ID
 * @param {number} [days=7] - 查询最近 N 天的日志
 * @returns {Promise<{teamMembers: Array, logs: Array}>}
 */
async function getTeamLogs(userId, days = 7) {
  // 获取当前用户的 related_party
  const userReports = await db.query(
    'SELECT related_party FROM daily_reports WHERE user_id = ? ORDER BY report_date DESC LIMIT 1',
    [userId]
  );
  if (userReports.length === 0) {
    return { teamMembers: [], logs: [] };
  }
  const relatedParty = userReports[0].related_party;
  if (!relatedParty) {
    return { teamMembers: [], logs: [] };
  }

  // 最近30天内 related_party 相同的项目
  const recentProjects = await db.query(
    `SELECT DISTINCT project FROM daily_reports
     WHERE related_party = ? AND report_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
    [relatedParty]
  );

  if (recentProjects.length === 0) {
    return { teamMembers: [], logs: [] };
  }

  // 构建项目名匹配条件（取前20个字符 LIKE 匹配）
  const projectConditions = recentProjects.map(() => 'dr.project LIKE CONCAT(LEFT(?, 20), "%")');
  const projectParams = recentProjects.map(p => p.project);

  // 同组成员（排除自己）
  const memberRows = await db.query(
    `SELECT DISTINCT u.id AS userId, u.nickname AS userName
     FROM users u
     JOIN daily_reports dr ON u.id = dr.user_id
     WHERE dr.related_party = ?
       AND (${projectConditions.join(' OR ')})
       AND u.id != ?
       AND u.deleted_at IS NULL`,
    [relatedParty, ...projectParams, userId]
  );

  const teamMembers = memberRows.map(r => ({
    userId: r.userId,
    userName: r.userName || '',
  }));

  // 同组日志（最近 N 天）
  const logRows = await db.query(
    `SELECT dr.*, u.nickname AS userName, u.department
     FROM daily_reports dr
     LEFT JOIN users u ON dr.user_id = u.id
     WHERE dr.related_party = ?
       AND (${projectConditions.join(' OR ')})
       AND dr.report_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       AND dr.status = 'approved'
     ORDER BY dr.report_date DESC`,
    [relatedParty, ...projectParams, days]
  );

  const logs = logRows.map(r => formatReportRow(r));

  return { teamMembers, logs };
}

// ==============================
// 旧版兼容方法（保留）
// ==============================

/**
 * 获取所有作业人员名单（从 workers 列去重）
 */
async function getWorkerList() {
  const rows = await db.query(
    "SELECT workers FROM daily_reports WHERE workers IS NOT NULL AND workers != ''"
  );

  const nameSet = new Set();
  for (const row of rows) {
    const names = row.workers.split(/[,，、\s]+/);
    for (const name of names) {
      const trimmed = name.trim();
      if (trimmed) nameSet.add(trimmed);
    }
  }

  return [...nameSet].sort();
}

/**
 * 人员统计看板（全量返回，前端不分页）
 */
async function getWorkerStats({ keyword }) {
  const rawRows = await db.query(
    "SELECT workers, report_date FROM daily_reports WHERE workers IS NOT NULL AND workers != '' AND status = 'approved'"
  );

  const personMap = {};
  for (const row of rawRows) {
    const names = row.workers.split(/[,，、\s]+/);
    for (const name of names) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      if (!personMap[trimmed]) personMap[trimmed] = { total: 0, monthCount: 0, lastDate: null };
      personMap[trimmed].total++;
      if (new Date(row.report_date).getMonth() === new Date().getMonth()) personMap[trimmed].monthCount++;
      const d = row.report_date instanceof Date ? row.report_date.toISOString().slice(0, 10) : String(row.report_date).slice(0, 10);
      if (!personMap[trimmed].lastDate || d > personMap[trimmed].lastDate) personMap[trimmed].lastDate = d;
    }
  }

  let list = Object.entries(personMap).map(([name, stats]) => ({ name, ...stats }));
  if (keyword) list = list.filter(p => p.name.includes(keyword));
  list.sort((a, b) => b.total - a.total);

  return { list, total: list.length };
}

/**
 * 导出 CSV（旧版兼容）
 */
async function exportCSV({ status, startDate, endDate, keyword, worker }) {
  const conditions = ['dr.status = ?'];
  const params = [status || 'approved'];
  if (startDate) { conditions.push('dr.report_date >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('dr.report_date <= ?'); params.push(endDate); }
  if (keyword) {
    conditions.push('(dr.project LIKE ? OR dr.workers LIKE ? OR dr.work_content LIKE ? OR dr.today_work LIKE ?)');
    const kw = `%${keyword}%`; params.push(kw, kw, kw, kw);
  }
  if (worker) { conditions.push('dr.workers LIKE ?'); params.push(`%${worker}%`); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT dr.* FROM daily_reports dr ${whereClause} ORDER BY dr.report_date DESC`;
  const rows = await db.query(sql, params);

  const headers = ['日报时间', '填写人', '入场时间', '初始出差时间', '项目名称', '项目所在区域', '相关方单位', '作业人员1', '作业人员2', '机型', '人数', '从事工作内容', '需要完成数量', '累计完成数量', '当前进度', '当日工作小结', '明天工作内容', '今日工作类型', '明日工作类型', '备注', '项目出差天数', '个人累计出差'];
  const csvRows = [headers.join(',')];
  for (const r of rows) {
    const names = (r.workers || '').split(/[,，、\s]+/).filter(Boolean);
    csvRows.push([
      formatDate(r.report_date), csvEscape(r.submitter_name || ''), formatDate(r.entry_date), formatDate(r.initial_biz_trip_date),
      csvEscape(r.project), csvEscape(r.area), csvEscape(r.related_party),
      csvEscape(names[0] || ''), csvEscape(names[1] || ''),
      csvEscape(r.machine_model), parseInt(r.worker_count) || 0, csvEscape(r.work_content),
      parseInt(r.required_qty) || 0, parseInt(r.completed_qty) || 0,
      (() => { const v = r.progress_percent; if (!v || v === '#DIV/0!') return '0%'; const n = parseFloat(String(v)); return isNaN(n) ? '0%' : Math.round(n * 100) + '%'; })(),
      csvEscape(r.today_work), csvEscape(r.tomorrow_plan),
      csvEscape(r.today_work_type), csvEscape(r.tomorrow_work_type),
      csvEscape(r.remark), parseInt(r.biz_trip_days) || 0, parseInt(r.personal_biz_trip_days) || 0
    ].join(','));
  }
  return csvRows.join('\n');
}

function csvEscape(v) { if (!v) return ''; return '"' + String(v).replace(/"/g, '""') + '"'; }

/**
 * 导出月度考勤矩阵 CSV（工人 × 日期矩阵）
 * @param {string} month - 月份 YYYY-MM
 * @returns {Promise<string>} CSV 字符串
 */
async function exportAttendanceCSV(month) {
  // 1. 获取所有在职人员
  const workers = await db.query(
    `SELECT id, user_name, worker_code FROM users
     WHERE worker_status = 'active' AND deleted_at IS NULL
     ORDER BY worker_code ASC`
  );

  // 2. 获取该月所有非草稿日报
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  const reports = await db.query(
    `SELECT dr.user_id, dr.report_date, dr.today_work_type
     FROM daily_reports dr
     WHERE dr.status != 'draft' AND dr.deleted_at IS NULL
       AND dr.report_type != 'office'
       AND DATE_FORMAT(dr.report_date, '%Y-%m') = ?
     ORDER BY dr.report_date`,
    [month]
  );

  // 3. 获取代填关系
  const subs = await db.query(
    `SELECT drw.worker_uid, dr.report_date, dr.today_work_type
     FROM daily_report_workers drw
     JOIN daily_reports dr ON drw.report_id = dr.id
     WHERE dr.status != 'draft' AND dr.deleted_at IS NULL
       AND dr.report_type != 'office'
       AND DATE_FORMAT(dr.report_date, '%Y-%m') = ?`,
    [month]
  );

  // 4. 构建查找 map: userId -> date -> workType
  const reportMap = {};
  reports.forEach(r => {
    const uid = r.user_id;
    if (!reportMap[uid]) reportMap[uid] = {};
    const d = String(r.report_date instanceof Date ? r.report_date.getDate() : new Date(r.report_date).getDate());
    reportMap[uid][d] = r.today_work_type || '';
  });
  // 代填：被代填人同样视为有提交
  subs.forEach(s => {
    const uid = s.worker_uid;
    if (!reportMap[uid]) reportMap[uid] = {};
    const d = String(s.report_date instanceof Date ? s.report_date.getDate() : new Date(s.report_date).getDate());
    if (!reportMap[uid][d]) reportMap[uid][d] = s.today_work_type || '';
  });

  // 5. 构建 CSV（姓名, 工号, 1, 2, ..., 31, 合计）
  const dayHeaders = [];
  for (let day = 1; day <= daysInMonth; day++) dayHeaders.push(String(day));
  const headers = ['姓名', '工号', ...dayHeaders, '合计'];
  const csvRows = [headers.join(',')];

  // 工作类型缩写
  const typeAbbr = {
    '工作（陆）': '陆', '工作（海）': '海', '待工': '待',
    '在途': '途', '请假': '假', '调休': '休'
  };

  workers.forEach(w => {
    const row = [csvEscape(w.user_name || ''), csvEscape(w.worker_code || '')];
    let total = 0;
    const map = reportMap[w.id] || {};
    for (let day = 1; day <= daysInMonth; day++) {
      const wt = map[String(day)] || '';
      // 转换: 提交人本人且有工作类型
      if (wt && wt !== '请假' && wt !== '调休') {
        row.push(typeAbbr[wt] || wt);
        total++;
      } else if (wt === '请假') {
        row.push('假');
        total++;
      } else if (wt === '调休') {
        row.push('休');
        total++;
      } else {
        row.push('');
      }
    }
    row.push(String(total > 0 ? total : ''));
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

module.exports = {
  list,
  detail,
  submit,
  getDraft,
  deleteReport,
  getWorkerList,
  getWorkerStats,
  exportCSV,
  exportAttendanceCSV,
  checkDuplicate,
  getTodayStatus,
  getPendingReviews,
  supplementReview,
  getTeamLogs,
};
