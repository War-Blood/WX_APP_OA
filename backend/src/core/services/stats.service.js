'use strict';

const db = require('../../common/config/database');
const { BusinessError } = require('../../common/utils/errors');
const statsViewService = require('./stats-view.service');

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
/**
 * 获取用户参与的所有审核通过的公出日志 ID（本人提交 + 被代填 + workers 文本兜底）
 */
async function getUserReportIds(userId, userName) {
  const ids = new Set();

  // 1. 本人提交或正式关联表代填（含工作日报 office）
  const ownRows = await db.query(
    `SELECT DISTINCT dr.id FROM daily_reports dr
     LEFT JOIN daily_report_workers drw ON dr.id = drw.report_id
     WHERE dr.status = 'approved'
       AND (dr.user_id = ? OR drw.worker_uid = ?)`,
    [userId, userId]
  );
  ownRows.forEach(r => ids.add(r.id));

  // 2. workers 文本字段兜底（名字模糊匹配，含工作日报）
  if (userName && userName.length >= 2) {
    const textRows = await db.query(
      `SELECT id FROM daily_reports
       WHERE status = 'approved'
         AND user_id != ?
         AND workers IS NOT NULL AND workers != ''
         AND workers LIKE ?`,
      [userId, `%${userName}%`]
    );
    textRows.forEach(r => ids.add(r.id));
  }

  return [...ids];
}

async function getUserStats(userId) {
  if (!userId) {
    throw new BusinessError('scope=user 时 userId 必填');
  }

  // 获取用户信息
  const users = await db.query(
    'SELECT user_name, nickname, entry_date FROM users WHERE id = ? AND deleted_at IS NULL',
    [userId]
  );
  if (users.length === 0) {
    throw new BusinessError('用户不存在');
  }
  const user = users[0];
  const entryDate = user.entry_date;
  const userName = user.nickname || user.user_name || '';

  // 获取用户参与的全部日志 ID
  const allReportIds = await getUserReportIds(userId, userName);
  const hasReports = allReportIds.length > 0;
  const idPlaceholders = hasReports ? allReportIds.map(() => '?').join(',') : '0';
  const idParams = hasReports ? allReportIds : [0];

  // 累计日志条数
  const totalRows = await db.query(
    `SELECT COUNT(*) AS cnt FROM daily_reports
     WHERE id IN (${idPlaceholders})`,
    idParams
  );
  const totalCount = totalRows[0].cnt;

  // 当月条数
  const monthRows = await db.query(
    `SELECT COUNT(*) AS cnt FROM daily_reports
     WHERE id IN (${idPlaceholders})
       AND MONTH(report_date) = MONTH(CURDATE()) AND YEAR(report_date) = YEAR(CURDATE())`,
    idParams
  );
  const monthCount = monthRows[0].cnt;

  // 延迟条数
  const delayedRows = await db.query(
    `SELECT COUNT(*) AS cnt FROM daily_reports
     WHERE id IN (${idPlaceholders})
       AND timeliness = 'delayed'`,
    idParams
  );
  const delayedCount = delayedRows[0].cnt;

  // 缺失天数与缺失日期列表
  let missingDays = 0;
  let missingDates = [];

  if (entryDate) {
    // 已提交的所有日期
    const submittedRows = await db.query(
      `SELECT DISTINCT report_date FROM daily_reports
       WHERE id IN (${idPlaceholders})
       ORDER BY report_date`,
      idParams
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
  // 全系统日志总条数（排除公司日报/请假单，仅统计公出日志审核通过的）
  const totalRows = await db.query(
    "SELECT COUNT(*) AS cnt FROM daily_reports WHERE report_type NOT IN ('office','leave') AND status = 'approved'"
  );
  const totalLogs = totalRows[0].cnt;

  // 本月新增条数（仅统计审核通过的）
  const monthRows = await db.query(
    `SELECT COUNT(*) AS cnt FROM daily_reports
     WHERE report_type NOT IN ('office','leave')
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
       AND u.status = 'active'
       AND u.deleted_at IS NULL
       AND u.role NOT IN ('admin', 'superadmin')
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
     WHERE report_type NOT IN ('office','leave')
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

  // 本月已填报天数（含工作日报，仅统计审核通过的）
  const submittedRows = await db.query(
    `SELECT COUNT(*) AS cnt FROM daily_reports
     WHERE user_id = ? AND status = 'approved'
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

  // 按 today_work_type 分组统计（仅统计审核通过的，含工作日报）
  const breakdownRows = await db.query(
    `SELECT today_work_type, COUNT(*) AS cnt
     FROM daily_reports
     WHERE user_id = ? AND status = 'approved'
       AND DATE_FORMAT(report_date, '%Y-%m') = ?
     GROUP BY today_work_type`,
    [userId, month]
  );

  const workTypes = ['工作（陆）', '工作（海）', '待工', '在途', '请假'];
  const breakdown = {};
  workTypes.forEach(wt => { breakdown[wt] = 0; });
  breakdown['工作日报'] = 0;
  breakdownRows.forEach(r => {
    if (r.today_work_type && breakdown.hasOwnProperty(r.today_work_type)) {
      breakdown[r.today_work_type] = Number(r.cnt);
    } else if (!r.today_work_type) {
      // 无工作类型的工作日报（office）计入「工作日报」分组
      breakdown['工作日报'] += Number(r.cnt);
    }
  });

  // 比例（含工作日报分组）
  const ratio = {};
  const denominator = totalSubmitted || 1;
  workTypes.forEach(wt => {
    ratio[wt] = ((breakdown[wt] / denominator) * 100).toFixed(1) + '%';
  });
  ratio['工作日报'] = ((breakdown['工作日报'] / denominator) * 100).toFixed(1) + '%';

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

// ==============================
// 公出统计人员范围（system_config.stats_personnel_scope）
// ==============================

/**
 * 解析部门子树 id（含自身）
 * @param {number} rootId - 根部门 id
 * @returns {Promise<Array<number>|null>}
 */
async function resolveDeptSubtreeIds(rootId) {
  const all = await db.query('SELECT id, parent_id FROM departments WHERE deleted_at IS NULL');
  const childrenMap = new Map();
  for (const d of all) {
    if (!childrenMap.has(d.parent_id)) childrenMap.set(d.parent_id, []);
    childrenMap.get(d.parent_id).push(d.id);
  }

  const result = [];
  const stack = [rootId];
  const seen = new Set();
  while (stack.length > 0) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    for (const c of childrenMap.get(id) || []) stack.push(c);
  }
  return result.length > 0 ? result : null;
}

/**
 * 读取公出统计视图筛选配置（system_config.stats_filter_<view>，JSON）
 * @param {string} view - daily/worktypes/area/calendar/workers
 * @returns {Promise<{hasDept: boolean, deptIds: Array<number>|null, deptParams: Array<number>, fieldOnly: boolean, workType: string, province: string}>}
 */
async function getViewFilter(view) {
  const rows = await db.query(
    'SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1',
    [`stats_filter_${view}`]
  );
  let cfg = {};
  if (rows.length > 0) {
    try { cfg = JSON.parse(rows[0].config_value || '{}'); } catch { cfg = {}; }
  }

  // deptId 缺省：视图配置 > 旧全局 stats_personnel_scope > 23(浙江贝良)
  let deptIdRaw = cfg.deptId != null && cfg.deptId !== '' ? cfg.deptId : null;
  if (!deptIdRaw) {
    const legacy = await db.query(
      "SELECT config_value FROM system_config WHERE config_key = 'stats_personnel_scope' LIMIT 1"
    );
    deptIdRaw = legacy.length > 0 ? legacy[0].config_value : null;
  }
  const deptId = /^\d+$/.test(String(deptIdRaw || '')) ? Number(deptIdRaw) : null;
  const deptIds = deptId ? await resolveDeptSubtreeIds(deptId) : null;

  return {
    hasDept: !!deptIds,
    deptIds: deptIds || null,
    deptParams: deptIds || [],
    fieldOnly: !(cfg.fieldOnly === 0 || cfg.fieldOnly === false || cfg.fieldOnly === '0'),
    workType: String(cfg.workType || '').trim(),
    province: String(cfg.province || '').trim(),
  };
}

/**
 * 现场作业人员判定 SQL（通过出差状态识别，不依赖花名册 is_field_worker）：
 * 近30天有 approved 公出日志 OR 当前有进行中考勤出差 OR 有 active 合规出差
 * @param {string} alias - 用户表别名（无别名传表名 'users'）
 * @returns {string}
 */
function buildFieldWorkerSql(alias) {
  return `(
    EXISTS (SELECT 1 FROM daily_reports fw1
            WHERE fw1.user_id = ${alias}.id AND fw1.status = 'approved' AND fw1.report_type != 'office'
              AND fw1.report_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY))
    OR EXISTS (SELECT 1 FROM attendance_leave_requests fw2
               WHERE fw2.applicant_id = ${alias}.id AND fw2.request_type = 'biz_trip' AND fw2.status = 'in_progress')
    OR EXISTS (SELECT 1 FROM biz_trip_status fw3
               WHERE fw3.user_id = ${alias}.id AND fw3.status = 'active')
  )`;
}

/**
 * 构造统计查询的用户筛选（视图 or 全局配置 + 数据范围 RLS）
 * @param {string} view - 视图标识 daily/worktypes/area/calendar/workers
 * @param {Object} [viewParams] - { viewId, role, userId } 来自请求
 * @param {string} alias - 用户表别名（无别名传 'users'）
 * @returns {Promise<{clauses: string[], params: Array, workType: string, province: string, hasDept: boolean}>}
 */
async function buildUserFilter(view, viewParams, alias) {
  const clauses = [];
  const params = [];
  let filter = {};
  let scopeType = 'all';
  let userDeptId = null;
  let reqUserId = null;

  if (viewParams && viewParams.filter) {
    // 临时筛选覆盖（前端「应用」，不保存为视图）
    filter = viewParams.filter;
    scopeType = viewParams.scopeType || 'all';
    if (viewParams.userId) reqUserId = viewParams.userId;
  } else if (viewParams && viewParams.viewId) {
    const resolved = await statsViewService.resolveViewForRequest(viewParams.viewId, viewParams.role, viewParams.userId);
    filter = resolved.filter || {};
    scopeType = resolved.scopeType;
    userDeptId = resolved.userDeptId;
    reqUserId = resolved.userId;
  } else {
    const vf = await getViewFilter(view);
    filter = { deptId: vf.deptIds ? vf.deptIds[0] : null, fieldOnly: vf.fieldOnly, workType: vf.workType, province: vf.province };
    scopeType = 'all';
  }

  // 视图部门范围（子树）
  const viewDeptId = /^\d+$/.test(String(filter.deptId ?? '')) ? Number(filter.deptId) : null;
  const viewDeptIds = viewDeptId ? await resolveDeptSubtreeIds(viewDeptId) : null;

  // RLS 数据范围（硬约束，与视图筛选取交集）
  let rlsDeptIds = null;
  let rlsExact = null;
  let rlsSelf = false;
  if (scopeType === 'department' && userDeptId) rlsExact = userDeptId;
  if (scopeType === 'department_and_children' && userDeptId) rlsDeptIds = await resolveDeptSubtreeIds(userDeptId);
  if (scopeType === 'self') rlsSelf = true;

  // 合并部门条件（交集）
  const deptSets = [];
  if (viewDeptIds) deptSets.push(viewDeptIds);
  if (rlsDeptIds) deptSets.push(rlsDeptIds);
  if (rlsExact) deptSets.push([rlsExact]);
  if (deptSets.length > 0) {
    let intersection = deptSets[0];
    for (const s of deptSets.slice(1)) intersection = intersection.filter(d => s.includes(d));
    if (intersection.length > 0) {
      clauses.push(`${alias}.department_id IN (${intersection.map(() => '?').join(',')})`);
      params.push(...intersection);
    } else {
      clauses.push('1 = 0'); // 空交集：无结果
    }
  }
  if (rlsSelf) { clauses.push(`${alias}.id = ?`); params.push(reqUserId); }

  // 仅现场（出差状态识别）
  if (filter.fieldOnly !== 0 && filter.fieldOnly !== false && filter.fieldOnly !== '0') {
    clauses.push(buildFieldWorkerSql(alias));
  }

  return {
    clauses,
    params,
    workType: String(filter.workType || '').trim(),
    province: String(filter.province || '').trim(),
    hasDept: deptSets.length > 0,
  };
}

/**
 * 全员当日状态（管理层看板）
 * @param {string} dateStr - 日期 (YYYY-MM-DD)，默认今天
 * @returns {Promise<Object>}
 */
async function getDailyStatus(dateStr, viewParams) {
  const date = dateStr || formatDate(new Date());

  // 视图筛选（view=daily）+ 数据范围 RLS
  const vf = await buildUserFilter('daily', viewParams, 'u');
  const userScopeSql = vf.clauses.length ? ` AND ${vf.clauses.join(' AND ')}` : '';
  const workTypeSql = vf.workType ? ' AND dr.today_work_type = ?' : '';
  const deptParams = vf.params;
  const workType = vf.workType;

  // 从当日报告反查涉及的人员（排除管理员；按视图筛选展示范围）
  const today = formatDate(new Date());
  const allUserRows = await db.query(
    `SELECT DISTINCT u.id, u.nickname, u.user_name, u.worker_code, u.worker_status
     FROM users u
     INNER JOIN daily_reports dr ON u.id = dr.user_id
     WHERE dr.report_date = ? AND dr.status != 'draft' AND dr.deleted_at IS NULL
       AND u.deleted_at IS NULL AND u.role NOT IN ('admin', 'superadmin')${userScopeSql}${workTypeSql}
     UNION
     SELECT DISTINCT u.id, u.nickname, u.user_name, u.worker_code, u.worker_status
     FROM users u
     INNER JOIN daily_report_workers drw ON u.id = drw.worker_uid
     INNER JOIN daily_reports dr ON drw.report_id = dr.id
     WHERE dr.report_date = ? AND dr.status != 'draft' AND dr.deleted_at IS NULL
       AND u.deleted_at IS NULL AND u.role NOT IN ('admin', 'superadmin')${userScopeSql}${workTypeSql}
     ORDER BY id ASC`,
    [date, ...deptParams, ...(workType ? [workType] : []), date, ...deptParams, ...(workType ? [workType] : [])]
  );
  const workers = allUserRows;

  // "未提交"判定：当日有进行中出差且出差已开始的在职人员
  // 同时查请假记录用于覆盖
  const ds = String(date).slice(0, 10);
  const activeFieldWorkers = await db.query(
    `SELECT u.id, u.nickname, u.user_name, u.worker_code, u.worker_status
     FROM users u
     INNER JOIN attendance_leave_requests alr ON alr.applicant_id = u.id
       AND alr.request_type = 'biz_trip'
       AND DATE(alr.trip_started_at) <= ?
       AND (alr.trip_ended_at IS NULL OR alr.trip_ended_at >= ?)
     WHERE u.worker_status = 'active' AND u.deleted_at IS NULL
       AND u.status = 'active'${userScopeSql}
     ORDER BY u.id ASC`,
    [ds, ds, ...deptParams]
  );
  const activeWorkerIds = new Set(activeFieldWorkers.map(w => w.id));

  // 当日有请假记录的在职人员
  const leaveWorkers = await db.query(
    `SELECT u.id
     FROM users u
     INNER JOIN attendance_leave_requests alr ON alr.applicant_id = u.id
       AND alr.request_type = 'leave' AND alr.status = 'active'
       AND alr.start_date <= ? AND alr.end_date >= ?
     WHERE u.worker_status = 'active' AND u.deleted_at IS NULL${userScopeSql}
     ORDER BY u.id ASC`,
    [ds, ds, ...deptParams]
  );
  const leaveWorkerIds = new Set(leaveWorkers.map(w => w.id));

  // 合并：有报告的人 + 在职未交的人（完整的人员列表）
  const reportUserIds = new Set(workers.map(w => w.id));
  const allUserMap = new Map();
  workers.forEach(w => allUserMap.set(w.id, w));
  activeFieldWorkers.forEach(w => {
    if (!allUserMap.has(w.id)) allUserMap.set(w.id, w);
  });
  const mergedWorkers = [...allUserMap.values()].sort((a, b) => (a.id - b.id));

  // 当日所有已提交的日报（排除草稿和已删除，含审核中/已通过/已驳回）
  const reports = await db.query(
    `SELECT
       dr.id AS reportId,
       dr.user_id AS submitterId,
       dr.report_type,
       dr.today_work_type,
       dr.project,
       dr.area,
       dr.workers,
       dr.status,
       dr.timeliness,
       dr.created_at,
       u.nickname AS submitterName
     FROM daily_reports dr
     LEFT JOIN users u ON dr.user_id = u.id
     WHERE dr.report_date = ? AND dr.status != 'draft' AND dr.deleted_at IS NULL`,
    [date]
  );

  // 当日代填关系
  const substitutions = await db.query(
    `SELECT drw.report_id, drw.worker_uid, dr.user_id AS submitterId
     FROM daily_report_workers drw
     JOIN daily_reports dr ON drw.report_id = dr.id
     WHERE dr.report_date = ? AND dr.status != 'draft' AND dr.deleted_at IS NULL`,
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

  // 兜底：从 workers 文本字段解析被代填人（daily_report_workers 表为空时的后备方案）
  // 姓名映射从「范围内全部在职用户」构建（而非仅已有报告者），使 text-only 代填人员也能被恢复（修复数据缺失）
  const allScopeUsers = await db.query(
    `SELECT u.id, u.nickname, u.user_name FROM users u
     WHERE u.deleted_at IS NULL AND u.role NOT IN ('admin', 'superadmin')${userScopeSql}`,
    deptParams
  );
  const nameToUser = {};
  allScopeUsers.forEach(w => {
    if (w.nickname) nameToUser[w.nickname] = { id: w.id, nickname: w.nickname || w.user_name };
    if (w.user_name) nameToUser[w.user_name] = { id: w.id, nickname: w.nickname || w.user_name };
  });

  reports.forEach(r => {
    if (!r.workers || r.workers.trim() === '') return;
    const names = r.workers.split(/[,，、\s\/]+/).map(s => s.trim()).filter(Boolean);
    names.forEach(name => {
      const user = nameToUser[name];
      if (user && !subReportMap[user.id] && !reportMapByUser[user.id]) {
        // 该人员在 workers 文本中被列出，视为被代填
        subReportMap[user.id] = { ...r, submitterId: r.submitterId, submitterName: r.submitterName };
      }
    });
  });

  // 为所有涉及人员确定状态（含离职/非作业人员）
  const workerList = [];
  const summary = {
    submitted: 0,
    supplement: 0,
    office: 0,
    substituted: 0,
    leave: 0,
    missing: 0,
  };

  for (const w of mergedWorkers) {
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
      const submitterUser = mergedWorkers.find(u => u.id === submitterId);
      substituteBy = submitterUser ? (submitterUser.nickname || submitterUser.user_name) : '';
    } else if (leaveWorkerIds.has(w.id)) {
      // 当日请假
      status = 'leave';
    } else if (activeWorkerIds.has(w.id)) {
      // 仅在职外场人员标记为"未提交"，已离职或非作业人员无报告则跳过
      status = 'missing';
    } else {
      // 非在职外场人员且无报告 → 不展示
      continue;
    }

    summary[status] = (summary[status] || 0) + 1;

    workerList.push({
      userId: w.id,
      userName: w.nickname || w.user_name || '',
      workerCode: w.worker_code || '',
      reportId: ownReport ? ownReport.reportId : (subReport ? subReport.reportId : null),
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
 * 明日计划状态
 * 展示某一天（N 日）的明日工作安排：查 N-1 日日报里填写的 tomorrow_work_type，
 * 与今日视图结构对称，返回平铺 workers，前端按明日工作类型分组
 * @param {string} [date] - 目标日 N（YYYY-MM-DD），默认明日
 * @returns {Promise<Object>} { date, totalWorkers, summary, workers }
 */
async function getTomorrowStatus(date, viewParams) {
  // 目标日 N（明日视图选中日）
  const targetDate = date || (() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return formatDate(t);
  })();

  // 前一天 N-1：明日计划记录在 N-1 日的日报中
  const d = new Date(targetDate + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  const prevDate = formatDate(d);

  // 与今日状态保持同一人员口径：取 N-1 日“全员当日状态”展示的人员集合
  const dailyStatus = await getDailyStatus(prevDate, viewParams);
  const dailyWorkers = dailyStatus.workers || [];

  // N-1 日日报中填写的明日工作类型（本人提交，含工作日报）
  const ownRows = await db.query(
    `SELECT dr.id AS reportId, dr.user_id, dr.tomorrow_work_type, dr.project, dr.area
     FROM daily_reports dr
     WHERE dr.report_date = ? AND dr.status != 'draft' AND dr.deleted_at IS NULL`,
    [prevDate]
  );

  // N-1 日被代填的人的明日工作类型（daily_report_workers）
  const subRows = await db.query(
    `SELECT dr.id AS reportId, drw.worker_uid AS user_id, dr.tomorrow_work_type, dr.project, dr.area
     FROM daily_report_workers drw
     JOIN daily_reports dr ON drw.report_id = dr.id
     WHERE dr.report_date = ? AND dr.status != 'draft' AND dr.deleted_at IS NULL`,
    [prevDate]
  );

  // 构建 user_id → 明日计划信息（含本人提交与被代填）
  const tomorrowMap = {};
  ownRows.forEach(r => {
    tomorrowMap[r.user_id] = {
      reportId: r.reportId,
      tomorrowWorkType: r.tomorrow_work_type || '',
      project: r.project || null,
      area: r.area ? String(r.area).split('-')[0] : null,
    };
  });
  subRows.forEach(r => {
    if (!tomorrowMap[r.user_id]) {
      tomorrowMap[r.user_id] = {
        reportId: r.reportId,
        tomorrowWorkType: r.tomorrow_work_type || '',
        project: r.project || null,
        area: r.area ? String(r.area).split('-')[0] : null,
      };
    }
  });

  // 组装 workers：按今日状态人员集合输出，有明日计划的填类型，无计划则空
  const workers = [];
  const summary = {};
  dailyWorkers.forEach(u => {
    const info = tomorrowMap[u.userId];
    const wt = info ? (info.tomorrowWorkType || '') : '';
    workers.push({
      userId: u.userId,
      userName: u.userName || '',
      workerCode: u.workerCode || '',
      reportId: info ? info.reportId : null,
      tomorrowWorkType: wt,
      project: info ? info.project : null,
      area: info ? info.area : null,
    });
    if (wt) summary[wt] = (summary[wt] || 0) + 1;
  });

  return {
    date: targetDate,
    prevDate,
    totalWorkers: workers.length,
    summary,
    workers,
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

/**
 * 月度每日提交统计
 * 每格返回当天去重已提交人数 submitted 与当天在职人数 total，
 * 供日历展示「已提交/总人数」及全员提交淡绿背景
 * @param {string} month - 月份 (YYYY-MM)
 * @returns {Promise<Object>} { month, data: [{ date, submitted, total }] }
 */
async function getDailyCounts(month, viewParams) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new BusinessError('month 必填，格式 YYYY-MM');
  }

  // 当月所有在职作业人员（含入场日期，用于按日判断是否在岗；按视图筛选 + RLS）
  const vf = await buildUserFilter('calendar', viewParams, 'users');
  const activeUsers = await db.query(
    `SELECT id, entry_date, nickname, user_name FROM users
     WHERE worker_status = 'active' AND status = 'active'
       AND deleted_at IS NULL AND role NOT IN ('admin', 'superadmin')
       ${vf.clauses.length ? `AND ${vf.clauses.join(' AND ')}` : ''}`,
    vf.params
  );

  // 当月所有出差记录（用于判定每天在出差=公出的人员）
  const tripRows = await db.query(
    `SELECT applicant_id, trip_started_at, trip_ended_at
     FROM attendance_leave_requests
     WHERE request_type = 'biz_trip' AND status != 'cancelled'`,
    []
  );

  // 当月所有已提交（非草稿）日报，用于统计实际填写人
  const reportRows = await db.query(
    `SELECT report_date, user_id, report_type, today_work_type, workers
     FROM daily_reports
     WHERE status != 'draft'
       AND DATE_FORMAT(report_date, '%Y-%m') = ?
       AND deleted_at IS NULL`,
    [month]
  );

  // 当月非草稿日报中，当天被代填的人（daily_report_workers）
  const subWorkerRows = await db.query(
    `SELECT dr.report_date, drw.worker_uid AS user_id
     FROM daily_report_workers drw
     JOIN daily_reports dr ON drw.report_id = dr.id
     WHERE dr.status != 'draft' AND dr.report_type != 'office' AND dr.today_work_type != '请假'
       AND DATE_FORMAT(dr.report_date, '%Y-%m') = ?
       AND dr.deleted_at IS NULL`,
    [month]
  );

  const nameToUser = {};
  activeUsers.forEach(u => {
    const name = (u.nickname || u.user_name || '').trim();
    if (name) nameToUser[name] = u.id;
  });

  // 将出差记录解析为 用户id → [{start, end}],用于逐日判断是否在出差
  const tripMap = {};
  tripRows.forEach(r => {
    if (!r.applicant_id) return;
    const start = r.trip_started_at ? formatDate(r.trip_started_at) : '';
    const end = r.trip_ended_at ? formatDate(r.trip_ended_at) : '';
    if (!tripMap[r.applicant_id]) tripMap[r.applicant_id] = [];
    tripMap[r.applicant_id].push({ start, end });
  });

  const isOnTrip = (userId, dateStr) => {
    const trips = tripMap[userId];
    if (!trips) return false;
    return trips.some(t => (!t.start || t.start <= dateStr) && (!t.end || t.end >= dateStr));
  };

  // 按日期聚合：submittedSet[date] = Set(当天已提交去重人员,仅公出人员)
  const submittedSet = {};
  const leaveDateSet = {};
  // 工作日报（office）提交者：计入当日 submitted 与 total（本人可能不在出差中，不走 isOnTrip 路径）
  const officeDateSet = {};
  const isLeaveReport = (r) => r.today_work_type === '请假';
  const addSubmitted = (r) => {
    if (!r || !r.user_id) return;
    const d = formatDate(r.report_date);
    if (!isOnTrip(r.user_id, d)) return; // 仅统计公出人员
    if (!submittedSet[d]) submittedSet[d] = new Set();
    submittedSet[d].add(Number(r.user_id));
  };

  reportRows.forEach(r => {
    const d = formatDate(r.report_date);
    if (r.report_type === 'office') {
      // 工作日报：提交者直接计入当日已提交与在职人数
      if (!submittedSet[d]) submittedSet[d] = new Set();
      submittedSet[d].add(Number(r.user_id));
      if (!officeDateSet[d]) officeDateSet[d] = new Set();
      officeDateSet[d].add(Number(r.user_id));
      return;
    }
    if (isLeaveReport(r)) {
      if (!leaveDateSet[d]) leaveDateSet[d] = new Set();
      leaveDateSet[d].add(Number(r.user_id));
      return;
    }
    addSubmitted(r);

    // workers 文本兜底：被列名但未写入 daily_report_workers 的人员视为已代填
    if (r.workers) {
      const names = String(r.workers).split(/[,，、\s/]+/).map(s => s.trim()).filter(Boolean);
      names.forEach(name => {
        const uid = nameToUser[name];
        if (uid && isOnTrip(uid, d)) {
          if (!submittedSet[d]) submittedSet[d] = new Set();
          submittedSet[d].add(Number(uid));
        }
      });
    }
  });

  subWorkerRows.forEach(r => {
    const d = formatDate(r.report_date);
    if (isOnTrip(r.user_id, d)) addSubmitted(r);
  });

  // 生成当月每一天的数据
  const [y, m] = month.split('-').map(Number);
  const year = y;
  const monthIdx = m - 1;
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const data = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // total = 当天在出差的在职人员数(且已入场) + 当天填写了工作日报的提交者
    const totalSet = new Set(activeUsers.filter(u =>
      isOnTrip(u.id, dateStr) &&
      (!u.entry_date || formatDate(u.entry_date) <= dateStr) &&
      !(leaveDateSet[dateStr] && leaveDateSet[dateStr].has(Number(u.id)))
    ).map(u => u.id));
    if (officeDateSet[dateStr]) {
      officeDateSet[dateStr].forEach(uid => totalSet.add(uid));
    }
    const total = totalSet.size;
    const submitted = submittedSet[dateStr] ? submittedSet[dateStr].size : 0;
    data.push({ date: dateStr, submitted, total });
  }

  return { month, data };
}

/**
 * 项目进展看板（按项目聚合当月进展，取最新一条记录的完成/需求值）
 * @param {string} month - 月份 (YYYY-MM)
 * @returns {Promise<Object>} { month, projects: [...] }
 */
async function getProjectProgress(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new BusinessError('month 必填，格式 YYYY-MM');
  }

  // 子查询取每个项目最新一条记录的 id，再 JOIN 取完整数据
  const rows = await db.query(
    `SELECT
       dr.project,
       dr.area,
       dr.completed_qty,
       dr.required_qty,
       sub.log_count,
       sub.day_count
     FROM daily_reports dr
     JOIN (
       SELECT project,
         MAX(id) AS latest_id,
         COUNT(*) AS log_count,
         COUNT(DISTINCT report_date) AS day_count
       FROM daily_reports
       WHERE status = 'approved'
         AND report_type NOT IN ('office','leave')
         AND project IS NOT NULL AND project != ''
         AND DATE_FORMAT(report_date, '%Y-%m') = ?
       GROUP BY project
     ) sub ON dr.id = sub.latest_id`,
    [month]
  );

  // 获取每个项目的作业人员数（从 workers 文本字段和 daily_report_workers 去重）
  const projects = rows.map(r => {
    const required = Number(r.required_qty) || 0;
    const completed = Number(r.completed_qty) || 0;
    const progress = required > 0 ? Math.round((completed / required) * 100) : null;
    const area = r.area ? r.area.split('-')[0] : null;

    return {
      project: r.project,
      area,
      completedQty: completed,
      requiredQty: required,
      progress,
      logCount: Number(r.log_count),
      dayCount: Number(r.day_count),
    };
  });

  // 按进度升序（进度低的排前面）
  projects.sort((a, b) => {
    const pa = a.progress ?? -1;
    const pb = b.progress ?? -1;
    return pa - pb;
  });

  return { month, projects };
}

/**
 * 人员工作类型分布（当月 pivot 表）
 * @param {string} month - 月份 YYYY-MM
 * @returns {Promise<Object>} { month, workers: [{ userName, workerCode, workTypes, total, supplementCount, officeCount }] }
 */
async function getWorkerWorkTypes(month, viewParams) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new BusinessError('month 必填，格式 YYYY-MM');
  }

  // 视图筛选（view=worktypes）+ 数据范围 RLS
  const vf = await buildUserFilter('worktypes', viewParams, 'u');
  const userScopeSql = vf.clauses.length ? ` AND ${vf.clauses.join(' AND ')}` : '';
  const workTypeSql = vf.workType ? ' AND today_work_type = ?' : '';
  const deptParams = vf.params;
  const workType = vf.workType;
  const activeWorkers = await db.query(
    `SELECT DISTINCT u.id, u.nickname, u.user_name, u.worker_code
     FROM users u
     INNER JOIN daily_reports dr ON u.id = dr.user_id
     WHERE dr.status = 'approved'
       AND DATE_FORMAT(dr.report_date, '%Y-%m') = ?
       AND u.deleted_at IS NULL AND u.role NOT IN ('admin', 'superadmin')${userScopeSql}
     UNION
     SELECT DISTINCT u.id, u.nickname, u.user_name, u.worker_code
     FROM users u
     INNER JOIN daily_report_workers drw ON u.id = drw.worker_uid
     INNER JOIN daily_reports dr ON drw.report_id = dr.id
     WHERE dr.status = 'approved' AND dr.report_type != 'office'
       AND DATE_FORMAT(dr.report_date, '%Y-%m') = ?
       AND u.deleted_at IS NULL AND u.role NOT IN ('admin', 'superadmin')${userScopeSql}
     ORDER BY id ASC`,
    [month, ...deptParams, month, ...deptParams]
  );

  // 当月本人提交的工作类型分布（按日期去重，防同天公出+补公出双计）
  const ownReports = await db.query(
    `SELECT user_id, today_work_type, COUNT(DISTINCT report_date) AS cnt
     FROM daily_reports
     WHERE status = 'approved' AND report_type != 'office'
       AND DATE_FORMAT(report_date, '%Y-%m') = ?${workTypeSql}
     GROUP BY user_id, today_work_type`,
    [month, ...(workType ? [workType] : [])]
  );

  // 当月被代填的工作类型分布（正式关联表，按日期去重；排除该人当天已自行提交的日期，防双计）
  const subReports = await db.query(
    `SELECT drw.worker_uid AS user_id, dr.today_work_type, COUNT(DISTINCT dr.report_date) AS cnt
     FROM daily_report_workers drw
     JOIN daily_reports dr ON drw.report_id = dr.id
     WHERE dr.status = 'approved' AND dr.report_type != 'office'
       AND DATE_FORMAT(dr.report_date, '%Y-%m') = ?${workTypeSql}
       AND NOT EXISTS (
         SELECT 1 FROM daily_reports mine
         WHERE mine.user_id = drw.worker_uid AND mine.report_date = dr.report_date
           AND mine.status = 'approved' AND mine.report_type != 'office'
       )
     GROUP BY drw.worker_uid, dr.today_work_type`,
    [month, ...(workType ? [workType] : [])]
  );

  // 兜底：从 workers 文本字段解析（daily_report_workers 为空时）
  const textReports = await db.query(
    `SELECT dr.workers, dr.today_work_type, dr.user_id, dr.report_date
     FROM daily_reports dr
     WHERE dr.status = 'approved' AND dr.report_type != 'office'
       AND dr.workers IS NOT NULL AND dr.workers != ''
       AND dr.user_id != 0
       AND DATE_FORMAT(dr.report_date, '%Y-%m') = ?${workTypeSql}`,
    [month, ...(workType ? [workType] : [])]
  );

  // 当月补录（补公出）的去重天数统计：user_id → 去重天数
  const supplementRows = await db.query(
    `SELECT user_id, COUNT(DISTINCT report_date) AS cnt
     FROM daily_reports
     WHERE status = 'approved' AND report_type = 'biz_trip_supplement'
       AND DATE_FORMAT(report_date, '%Y-%m') = ?
       AND deleted_at IS NULL
     GROUP BY user_id`,
    [month]
  );
  const supplementMap = {};
  supplementRows.forEach(r => { supplementMap[r.user_id] = Number(r.cnt); });

  // 当月工作日报（office）的去重天数统计：user_id → 去重天数
  const officeRows = await db.query(
    `SELECT user_id, COUNT(DISTINCT report_date) AS cnt
     FROM daily_reports
     WHERE status = 'approved' AND report_type = 'office'
       AND DATE_FORMAT(report_date, '%Y-%m') = ?
       AND deleted_at IS NULL
     GROUP BY user_id`,
    [month]
  );
  const officeMap = {};
  officeRows.forEach(r => { officeMap[r.user_id] = Number(r.cnt); });

  // 名字→用户ID 查找表：从「范围内全部在职用户」构建（而非仅 activeWorkers），
  // 使只出现在 workers 文本列、无 daily_report_workers 行的代填人员也能被恢复（修复数据缺失）
  const scopeWhere = ['u.deleted_at IS NULL', "u.role NOT IN ('admin','superadmin')", ...vf.clauses];
  const allScopeUsers = await db.query(
    `SELECT u.id, u.nickname, u.user_name FROM users u WHERE ${scopeWhere.join(' AND ')}`,
    vf.params
  );
  const nameToUid = {};
  allScopeUsers.forEach(w => {
    if (w.nickname) nameToUid[w.nickname] = w.id;
    if (w.user_name) nameToUid[w.user_name] = w.id;
  });

  // 构建 map: user_id → { workType: count }
  const typeMap = {};
  // 旧数据兼容：部分历史记录的 today_work_type 存的是短名/自由文本
  const wtKnown = ['工作（陆）', '工作（海）', '待工', '在途', '请假'];
  const wtNormalize = (wt) => {
    if (wt === '工作' || wt === '作业') return '工作（陆）'; // 旧版"工作"/"作业"→"工作（陆）"
    if (!wt) return '工作（陆）'; // 空工作类型默认按"工作（陆）"计
    if (wtKnown.includes(wt)) return wt;
    return '工作（陆）'; // 非标准值兜底，避免 total=0 被过滤
  };

  const addCount = (uid, wt, n) => {
    const normalized = wtNormalize(wt);
    if (!uid || !normalized) return;
    if (!typeMap[uid]) typeMap[uid] = {};
    typeMap[uid][normalized] = (typeMap[uid][normalized] || 0) + Number(n);
  };
  ownReports.forEach(r => addCount(r.user_id, r.today_work_type, r.cnt));
  subReports.forEach(r => addCount(r.user_id, r.today_work_type, r.cnt));

  // 获取本人+被代填的日期列表，防止 workers 文本同日重复计数
  const ownDates = await db.query(
    `SELECT user_id, report_date FROM daily_reports
     WHERE status = 'approved' AND report_type != 'office'
       AND DATE_FORMAT(report_date, '%Y-%m') = ?`,
    [month]
  );
  const subDates = await db.query(
    `SELECT drw.worker_uid AS user_id, dr.report_date
     FROM daily_report_workers drw
     JOIN daily_reports dr ON drw.report_id = dr.id
     WHERE dr.status = 'approved' AND dr.report_type != 'office'
       AND DATE_FORMAT(dr.report_date, '%Y-%m') = ?`,
    [month]
  );
  const seen = new Set(); // "uid_date" — 已计入的(人,日期)
  const addSeen = (r) => {
    const d = r.report_date instanceof Date ? r.report_date.toISOString().slice(0,10) : String(r.report_date).slice(0,10);
    seen.add(r.user_id + '_' + d);
  };
  ownDates.forEach(addSeen);
  subDates.forEach(addSeen);

  // 解析 workers 文本中的每个名字，匹配用户ID（按日期去重，每人每天只算一次）
  textReports.forEach(r => {
    const reportDate = r.report_date instanceof Date
      ? r.report_date.toISOString().slice(0, 10) : String(r.report_date).slice(0, 10);
    const names = r.workers.split(/[、,，\s\/\n]+/).map(s => s.trim()).filter(Boolean);
    names.forEach(name => {
      const uid = nameToUid[name];
      if (!uid || uid === r.user_id) return;
      const key = uid + '_' + reportDate;
      if (seen.has(key)) return; // 同人同日已计（含本人提交）
      seen.add(key);
      addCount(uid, r.today_work_type, 1);
    });
  });

  const workTypes = ['工作（陆）', '工作（海）', '待工', '在途', '请假'];
  const workers = activeWorkers.map(w => {
    const map = typeMap[w.id] || {};
    const workTypesObj = {};
    let total = 0;
    workTypes.forEach(wt => {
      const c = map[wt] || 0;
      workTypesObj[wt] = c;
      total += c;
    });
    return {
      userId: w.id,
      userName: w.nickname || w.user_name || '',
      workerCode: w.worker_code || '',
      workTypes: workTypesObj,
      total,
      supplementCount: supplementMap[w.id] || 0,
      officeCount: officeMap[w.id] || 0,
    };
  });

  // 排除当月0记录（含无工作类型但填过工作日报的保留）
  const filtered = workers.filter(w => w.total > 0 || w.officeCount > 0);
  filtered.sort((a, b) => b.total - a.total);

  return { month, workers: filtered };
}

/**
 * 省名归一化映射（小程序 picker 标准输出 / 历史自由文本 → GeoJSON properties.name）
 * 覆盖中国 34 个省级行政区：23 省 + 5 自治区 + 4 直辖市 + 2 特别行政区。
 * - 键：picker 选出的省（全称/简称），以及历史自由文本（如“新疆省”“新疆乌鲁木齐市…”）
 * - 值：与 backend/data/geo/china.json 的 properties.name 完全一致的标准省级全称
 * 处理顺序：① 有 '-' 取第一段（省）；② 精确查表；③ 省份关键词子串兜底（长词优先）；④ 失败返回 null
 */
const PROVINCE_NAME_MAP = {
  // 直辖市
  '北京': '北京市', '北京市': '北京市',
  '天津': '天津市', '天津市': '天津市',
  '上海': '上海市', '上海市': '上海市',
  '重庆': '重庆市', '重庆市': '重庆市',
  // 23 省（简称 / 全称，全称即 GeoJSON 名）
  '河北': '河北省', '河北省': '河北省',
  '山西': '山西省', '山西省': '山西省',
  '辽宁': '辽宁省', '辽宁省': '辽宁省',
  '吉林': '吉林省', '吉林省': '吉林省',
  '黑龙江': '黑龙江省', '黑龙江省': '黑龙江省',
  '江苏': '江苏省', '江苏省': '江苏省',
  '浙江': '浙江省', '浙江省': '浙江省',
  '安徽': '安徽省', '安徽省': '安徽省',
  '福建': '福建省', '福建省': '福建省',
  '江西': '江西省', '江西省': '江西省',
  '山东': '山东省', '山东省': '山东省',
  '河南': '河南省', '河南省': '河南省',
  '湖北': '湖北省', '湖北省': '湖北省',
  '湖南': '湖南省', '湖南省': '湖南省',
  '广东': '广东省', '广东省': '广东省',
  '海南': '海南省', '海南省': '海南省',
  '四川': '四川省', '四川省': '四川省',
  '贵州': '贵州省', '贵州省': '贵州省',
  '云南': '云南省', '云南省': '云南省',
  '陕西': '陕西省', '陕西省': '陕西省',
  '甘肃': '甘肃省', '甘肃省': '甘肃省',
  '青海': '青海省', '青海省': '青海省',
  '台湾': '台湾省', '台湾省': '台湾省',
  // 5 自治区（简称 / 全称 / 常见“X省”自由文本）
  '内蒙古': '内蒙古自治区', '内蒙古自治区': '内蒙古自治区', '内蒙古省': '内蒙古自治区',
  '广西': '广西壮族自治区', '广西壮族自治区': '广西壮族自治区', '广西省': '广西壮族自治区',
  '西藏': '西藏自治区', '西藏自治区': '西藏自治区', '西藏省': '西藏自治区',
  '宁夏': '宁夏回族自治区', '宁夏回族自治区': '宁夏回族自治区', '宁夏省': '宁夏回族自治区',
  '新疆': '新疆维吾尔自治区', '新疆维吾尔自治区': '新疆维吾尔自治区', '新疆省': '新疆维吾尔自治区',
  // 特别行政区
  '香港': '香港特别行政区', '香港特别行政区': '香港特别行政区',
  '澳门': '澳门特别行政区', '澳门特别行政区': '澳门特别行政区'
};
// 关键字兜底：处理“新疆乌鲁木齐市达坂城区”这类无连字符、无“省”字的自由文本（长词优先）
const PROVINCE_KEYWORDS = [
  '内蒙古', '黑龙江', '新疆', '广西', '西藏', '宁夏', '香港', '澳门',
  '河北', '山西', '辽宁', '吉林', '江苏', '浙江', '安徽', '福建', '江西', '山东',
  '河南', '湖北', '湖南', '广东', '海南', '四川', '贵州', '云南', '陕西', '甘肃', '青海', '台湾',
  '北京', '天津', '上海', '重庆'
];

function normalizeProvinceName(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  if (s.includes('-')) s = s.split('-')[0].trim();   // 取 picker 第一段（省）
  if (PROVINCE_NAME_MAP[s]) return PROVINCE_NAME_MAP[s];
  for (const kw of PROVINCE_KEYWORDS) {
    if (s.includes(kw)) return PROVINCE_NAME_MAP[kw];
  }
  return null;
}

/**
 * 北京时间昨日（避免服务器时区非 UTC+8 导致跨日错位）
 */
function getYesterdayCST() {
  const now = new Date();
  const bj = new Date(now.getTime() + (480 + now.getTimezoneOffset()) * 60000);
  bj.setDate(bj.getDate() - 1);
  const p = n => String(n).padStart(2, '0');
  return `${bj.getFullYear()}-${p(bj.getMonth() + 1)}-${p(bj.getDate())}`;
}

/**
 * 省份人员分布（中国地图数据源）
 * @param {string} [date] - 可选日期 YYYY-MM-DD，默认北京时间昨日
 * @returns {Promise<Object>} { date, provinces: [{ name, count, projects, workers }] }
 */
async function getAreaDistribution(date, viewParams) {
  // 仅统计昨日数据（默认北京时间昨日，支持传 date 查看任意日）
  const targetDate = (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : getYesterdayCST();

  // 视图筛选（view=area）+ 数据范围 RLS + 区域/省份
  const vf = await buildUserFilter('area', viewParams, 'users');
  const userScopeSql = vf.clauses.length ? ` AND ${vf.clauses.join(' AND ')}` : '';
  const provinceSql = vf.province ? ' AND dr.area LIKE ?' : '';
  const deptParams = vf.params;
  const province = vf.province;

  // 1. 查昨日所有报告（含区域和 workers 文本）
  const reports = await db.query(
    `SELECT dr.id, dr.user_id, dr.report_date, dr.area, dr.project, dr.workers
     FROM daily_reports dr
     WHERE dr.status = 'approved' AND dr.report_type != 'office'
       AND dr.area IS NOT NULL AND dr.area != ''
       AND dr.report_date = ?${provinceSql}`,
    [targetDate, ...(province ? [`${province}%`] : [])]
  );

  // 2. 查昨日关联表代填关系
  const subs = await db.query(
    `SELECT drw.worker_uid AS user_id, dr.report_date, dr.area, dr.project
     FROM daily_report_workers drw
     JOIN daily_reports dr ON drw.report_id = dr.id
     WHERE dr.status = 'approved' AND dr.report_type != 'office'
       AND dr.area IS NOT NULL AND dr.area != ''
       AND dr.report_date = ?${provinceSql}`,
    [targetDate, ...(province ? [`${province}%`] : [])]
  );

  // 3. 收集所有涉及的 userId（提交人 + 代填人），构建 uid→info
  const allUids = new Set();
  reports.forEach(r => allUids.add(r.user_id));
  subs.forEach(s => allUids.add(s.user_id));

  const uidToInfo = {};
  // 4. 构建 name→uid 映射（同时注册 nickname 与 user_name，避免 workers 文本用 user_name 时匹配丢失）
  const nameToUid = {};
  if (allUids.size > 0) {
    const uidList = [...allUids];
    const userRows = await db.query(
      `SELECT id, nickname, user_name, worker_code FROM users
       WHERE id IN (${uidList.map(() => '?').join(',')})${userScopeSql}`,
      [...uidList, ...deptParams]
    );
    userRows.forEach(u => {
      uidToInfo[u.id] = { userName: u.nickname || u.user_name || '', workerCode: u.worker_code || '' };
      if (u.nickname) nameToUid[u.nickname] = u.id;
      if (u.user_name) nameToUid[u.user_name] = u.id;
    });
  }

  // 5. 预扫描 workers 文本，收集未匹配的名字批量查 users 表
  const unknownNames = new Set();
  reports.forEach(r => {
    if (!r.workers) return;
    const names = r.workers.split(/[、,，\s\/\n]+/).map(s => s.trim()).filter(Boolean);
    names.forEach(name => {
      if (name && !nameToUid[name]) unknownNames.add(name);
    });
  });

  if (unknownNames.size > 0) {
    const nameList = [...unknownNames];
    const extraRows = await db.query(
      `SELECT id, nickname, user_name, worker_code FROM users
       WHERE (nickname IN (${nameList.map(() => '?').join(',')})
              OR user_name IN (${nameList.map(() => '?').join(',')}))
         AND deleted_at IS NULL${userScopeSql}`,
      [...nameList, ...nameList, ...deptParams]
    );
    extraRows.forEach(u => {
      if (!uidToInfo[u.id]) {
        uidToInfo[u.id] = { userName: u.nickname || u.user_name || '', workerCode: u.worker_code || '' };
      }
      if (u.nickname) nameToUid[u.nickname] = u.id;
      if (u.user_name) nameToUid[u.user_name] = u.id;
    });
  }

  // 6. 三路径收集人员 — key = `${uid}_${province}`（省内去重，跨省并存）
  const personMap = {};
  const addPerson = (uid, date, area, project, userName) => {
    if (!uid || !area) return;
    const province = normalizeProvinceName(area);
    if (!province) return;
    const key = `${uid}_${province}`;
    const d = date instanceof Date ? date.toISOString().slice(0,10) : String(date).slice(0,10);
    if (!personMap[key] || d > personMap[key].dateStr) {
      personMap[key] = { uid, province, dateStr: d, projects: new Set([project]), userName: userName || uidToInfo[uid]?.userName || '', area };
    } else if (d === personMap[key].dateStr) {
      personMap[key].projects.add(project);
    }
  };

  reports.forEach(r => addPerson(r.user_id, r.report_date, r.area, r.project, ''));
  subs.forEach(s => addPerson(s.user_id, s.report_date, s.area, s.project, ''));
  reports.forEach(r => {
    if (!r.workers) return;
    const names = r.workers.split(/[、,，\s\/\n]+/).map(s => s.trim()).filter(Boolean);
    names.forEach(name => {
      const uid = nameToUid[name];
      if (uid && uid !== r.user_id) addPerson(uid, r.report_date, r.area, r.project, name);
    });
  });

  // 7. 按省份聚合
  const provMap = {};
  Object.entries(personMap).forEach(([key, p]) => {
    if (!provMap[p.province]) provMap[p.province] = { count: 0, projects: new Set(), workers: [] };
    provMap[p.province].count++;
    p.projects.forEach(pr => provMap[p.province].projects.add(pr));
    provMap[p.province].workers.push({
      userId: p.uid,
      userName: p.userName || uidToInfo[p.uid]?.userName || '',
      workerCode: uidToInfo[p.uid]?.workerCode || '',
      area: p.area || '',
      project: [...p.projects][0] || '',
    });
  });

  const provinces = Object.entries(provMap)
    .map(([name, data]) => ({
      name,
      count: data.count,
      projects: [...data.projects].slice(0, 10),
      workers: data.workers,
    }))
    .sort((a, b) => b.count - a.count);

  return { date: targetDate, provinces };
}

/**
 * 省份下钻 — 该省人员列表
 * @param {string} province - 省份名（如"广东"）
 * @param {string} [month] - 可选月份筛选
 * @returns {Promise<Object>} { province, workers: [...] }
 */
async function getProvinceWorkers(province, date, viewParams) {
  if (!province) throw new BusinessError('province 必填');

  // 归一化省份名（兼容简称/全称/脏数据）
  const provinceFull = normalizeProvinceName(province);
  if (!provinceFull) throw new BusinessError('无法识别的省份');

  // 视图筛选（view=area）+ 数据范围 RLS
  const vf = await buildUserFilter('area', viewParams, 'users');
  const userScopeSql = vf.clauses.length ? ` AND ${vf.clauses.join(' AND ')}` : '';
  const deptParams = vf.params;

  // 与 getAreaDistribution 保持一致，默认北京时间昨日，支持传 date
  const targetDate = (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : getYesterdayCST();
  const dateCondition = 'AND dr.report_date = ?';
  const params = [`${provinceFull}%`, targetDate];

  // 1. 查该省昨日所有报告
  const reports = await db.query(
    `SELECT dr.id, dr.user_id, dr.report_date, dr.area, dr.project, dr.workers
     FROM daily_reports dr
     WHERE dr.status = 'approved'
       AND dr.report_type != 'office'
       AND dr.area LIKE ?
       ${dateCondition}`,
    params
  );

  // 2. 查关联表代填
  const reportIds = reports.map(r => r.id);
  let subs = [];
  if (reportIds.length > 0) {
    subs = await db.query(
      `SELECT DISTINCT drw.worker_uid AS user_id, dr.area, dr.project
       FROM daily_report_workers drw
       JOIN daily_reports dr ON dr.id = drw.report_id
       WHERE drw.report_id IN (${reportIds.map(() => '?').join(',')})`,
      reportIds
    );
  }

  // 3. 收集所有 userId（提交人 + 代填人），构建 uid→info
  const allUids = new Set();
  reports.forEach(r => allUids.add(r.user_id));
  subs.forEach(s => allUids.add(s.user_id));

  const uidToInfo = {};
  if (allUids.size > 0) {
    const uidList = [...allUids];
    const userRows = await db.query(
      `SELECT id, nickname, user_name, worker_code FROM users
       WHERE id IN (${uidList.map(() => '?').join(',')})${userScopeSql}`,
      [...uidList, ...deptParams]
    );
    userRows.forEach(u => {
      uidToInfo[u.id] = { userName: u.nickname || u.user_name || '', workerCode: u.worker_code || '' };
    });
  }

  // 4. 构建 name→uid 映射，预扫描 workers 文本补全未知名字
  const nameToUid = {};
  Object.entries(uidToInfo).forEach(([uid, info]) => {
    if (info.userName) nameToUid[info.userName] = Number(uid);
  });

  const unknownNames = new Set();
  reports.forEach(r => {
    if (!r.workers) return;
    const names = r.workers.split(/[、,，\s\/\n]+/).map(s => s.trim()).filter(Boolean);
    names.forEach(name => {
      if (name && !nameToUid[name]) unknownNames.add(name);
    });
  });

  if (unknownNames.size > 0) {
    const nameList = [...unknownNames];
    const extraRows = await db.query(
      `SELECT id, nickname, user_name, worker_code FROM users
       WHERE (nickname IN (${nameList.map(() => '?').join(',')})
              OR user_name IN (${nameList.map(() => '?').join(',')}))
         AND deleted_at IS NULL${userScopeSql}`,
      [...nameList, ...nameList, ...deptParams]
    );
    extraRows.forEach(u => {
      if (!uidToInfo[u.id]) {
        uidToInfo[u.id] = { userName: u.nickname || u.user_name || '', workerCode: u.worker_code || '' };
      }
      if (u.nickname) nameToUid[u.nickname] = u.id;
      if (u.user_name) nameToUid[u.user_name] = u.id;
    });
  }

  // 5. 三路径收集人员（省内去重）
  const personSet = new Map();
  const addPerson = (uid, area, project) => {
    if (!uid) return;
    if (!personSet.has(uid)) {
      personSet.set(uid, {
        userId: uid,
        userName: uidToInfo[uid]?.userName || '',
        workerCode: uidToInfo[uid]?.workerCode || '',
        area: area || '',
        project: project || '',
      });
    }
  };

  reports.forEach(r => addPerson(r.user_id, r.area, r.project));
  subs.forEach(s => addPerson(s.user_id, s.area, s.project));
  reports.forEach(r => {
    if (!r.workers) return;
    const names = r.workers.split(/[、,，\s\/\n]+/).map(s => s.trim()).filter(Boolean);
    names.forEach(name => {
      const uid = nameToUid[name];
      if (uid && uid !== r.user_id) addPerson(uid, r.area, r.project);
    });
  });

  const workers = [...personSet.values()].sort((a, b) => (a.workerCode || '').localeCompare(b.workerCode || ''));
  return { province: provinceFull, workers };
}

/**
 * 查询指定用户某月公出日志明细
 * @param {number} userId - 用户 ID
 * @param {string} month - 月份，格式 'YYYY-MM'
 * @returns {Promise<{logs: Array}>}
 */
async function getUserMonthlyLogs(userId, month, viewParams) {
  if (!userId) throw new BusinessError('userId 必填');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) throw new BusinessError('month 格式错误，需 YYYY-MM');

  // 获取用户名用于 workers 文本字段 LIKE 匹配
  const userRows = await db.query(
    'SELECT user_name, nickname FROM users WHERE id = ? AND deleted_at IS NULL',
    [userId]
  );
  if (userRows.length === 0) throw new BusinessError('用户不存在');
  const userName = userRows[0].nickname || userRows[0].user_name || '';

  // 范围守卫：按视图筛选 + RLS 校验目标用户可见，范围外返回空
  const vf = await buildUserFilter('workers', viewParams, 'users');
  const inScopeCheck = await db.query(
    `SELECT users.id FROM users WHERE users.id = ?${vf.clauses.length ? ` AND ${vf.clauses.join(' AND ')}` : ''}`,
    [userId, ...vf.params]
  );
  if (inScopeCheck.length === 0) return { userId, month, logs: [] };

  const rows = await db.query(
    `SELECT
       dr.id AS reportId,
       dr.report_date AS reportDate,
       dr.today_work_type AS workType,
       dr.project,
       dr.area,
       dr.related_party AS relatedParty,
       dr.machine_model AS machineModel,
       dr.work_content AS workContent,
       dr.workers,
       dr.status,
       dr.submitted_at AS submittedAt,
       u.nickname AS submitterName
     FROM daily_reports dr
     LEFT JOIN users u ON dr.user_id = u.id
     WHERE DATE_FORMAT(dr.report_date, '%Y-%m') = ?
       AND dr.deleted_at IS NULL
       AND dr.status != 'draft'
       AND (
         dr.user_id = ?
         OR dr.workers LIKE ?
         OR dr.id IN (SELECT drw.report_id FROM daily_report_workers drw WHERE drw.worker_uid = ?)
       )
     ORDER BY dr.report_date DESC`,
    [month, userId, `%${userName}%`, userId]
  );

  return {
    userId,
    month,
    logs: rows.map(r => ({
      reportId: r.reportId,
      reportDate: r.reportDate ? String(r.reportDate).slice(0, 10) : '',
      workType: r.workType || '',
      project: r.project || '',
      area: r.area || '',
      relatedParty: r.relatedParty || '',
      machineModel: r.machineModel || '',
      workContent: r.workContent || '',
      workers: r.workers || '',
      status: r.status || '',
      submittedAt: r.submittedAt ? String(r.submittedAt).slice(0, 16) : '',
      submitterName: r.submitterName || '',
    })),
  };
}

module.exports = { getStats, getUserStats, getAllStats, getProjectStats, getMonthlySummary, getDailyStatus, getTomorrowStatus, getDailyCounts, getProjectProgress, getWorkerWorkTypes, getAreaDistribution, getProvinceWorkers, getUserMonthlyLogs, buildUserFilter };
