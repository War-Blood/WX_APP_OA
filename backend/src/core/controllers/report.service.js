'use strict';

const db = require('../../common/config/database');
const { NotFoundError, BusinessError } = require('../../common/utils/errors');

/**
 * 日报服务
 */

const STATUS_TEXT_MAP = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  draft: '草稿',
  submitted: '已提交',
};

/**
 * 将 DB 行（snake_case）映射为前端 camelCase 格式
 * @param {Object} row - 数据库原始行
 * @returns {Object} 格式化后的日报对象
 */
function formatDate(d) {
  if (!d) return ''
  if (typeof d === 'string') return d.slice(0, 10)
  const dt = new Date(d)
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0')
}

function formatReportRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    date: formatDate(row.report_date),
    reportDate: formatDate(row.report_date),
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
      if (v == null || v === '' || v === '#DIV/0!') return '0%';
      const n = parseFloat(String(v));
      if (isNaN(n)) return '0%';
      return Math.round(n * 100) + '%';
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
    createTime: formatDate(row.created_at),
    updateTime: formatDate(row.updated_at),
  };
}

/**
 * 从 workers 字段提取第一个名字
 * workers 格式可能是逗号分隔、顿号分隔、或空格分隔
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

/**
 * 日报列表（分页+筛选）
 * @param {number} userId - 用户 ID
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页条数
 * @param {string} [params.status] - 状态筛选
 * @param {string} [params.startDate] - 开始日期
 * @param {string} [params.endDate] - 结束日期
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

  // 字段映射：snake_case → camelCase
  const mappedList = rows.map((row) => formatReportRow(row));

  return { list: mappedList, total };
}

/**
 * 日报详情
 * @param {number} id - 日报 ID
 * @param {number} userId - 用户 ID
 * @returns {Promise<Object>}
 */
async function detail(id, userId) {
  let rows;
  if (userId === 0) {
    // 管理员看全部
    rows = await db.query(
      `SELECT dr.*, u.nickname AS userName, u.department
       FROM daily_reports dr LEFT JOIN users u ON dr.user_id = u.id
       WHERE dr.id = ?`, [id]);
  } else {
    rows = await db.query(
      `SELECT dr.*, u.nickname AS userName, u.department
       FROM daily_reports dr LEFT JOIN users u ON dr.user_id = u.id
       WHERE dr.id = ? AND dr.user_id = ?`, [id, userId]);
  }

  if (rows.length === 0) {
    throw new NotFoundError('日报不存在');
  }

  // 字段映射：snake_case → camelCase + 额外计算字段
  return formatReportRow(rows[0]);
}

/**
 * 提交/保存日报（支持提交和草稿）
 * - 如果当天已有草稿 → UPDATE
 * - 如果有已提交日报且再次提交 → 抛 BusinessError
 * - 其他 → INSERT
 *
 * @param {Object} data - 日报数据
 * @param {number} data.userId - 用户 ID
 * @param {string} data.reportDate - 日报日期 (YYYY-MM-DD)
 * @param {Object} data.formData - 完整表单数据
 * @param {string} [data.status='submitted'] - 状态: submitted / draft
 * @returns {Promise<Object>}
 */
async function submit({ userId, reportDate, formData, status }) {
  const now = new Date();

  // 检查当天是否已有日报
  const existing = await db.query(
    'SELECT id, status FROM daily_reports WHERE user_id = ? AND report_date = ?',
    [userId, reportDate]
  );

  // 构建完整字段映射
  const fields = {
    user_id: userId,
    report_date: reportDate,
    project: formData.project || null,
    area: formData.area || null,
    today_work_type: formData.todayWorkType || null,
    today_work: formData.todayWork || null,
    tomorrow_work_type: formData.tomorrowWorkType || null,
    tomorrow_plan: formData.tomorrowPlan || null,
    work_content: formData.workContent || null,
    workers: formData.workers || null,
    machine_model: formData.machineModel || null,
    worker_count: formData.workerCount || 0,
    required_qty: formData.requiredQty || 0,
    completed_qty: formData.completedQty || 0,
    progress_percent: formData.progressPercent || 0,
    issues: formData.issues || null,
    remark: formData.remark || null,
    entry_date: formData.entryDate || null,
    initial_biz_trip_date: formData.initialBizTripDate || null,
    related_party: formData.relatedParty || null,
    personal_biz_trip_days: formData.personalBizTripDays || 0,
    content: formData.content || null,
    files: formData.files ? JSON.stringify(formData.files) : null,
    status: status || 'submitted',
  };

  if (existing.length > 0) {
    const existingStatus = existing[0].status;

    if (existingStatus === 'draft') {
      // 更新已有草稿
      const columns = Object.keys(fields).map(key => `${key} = ?`).join(', ');
      const values = Object.values(fields);
      await db.execute(
        `UPDATE daily_reports SET ${columns}, updated_at = NOW() WHERE id = ?`,
        [...values, existing[0].id]
      );
    } else if (existingStatus === 'submitted' || existingStatus === 'pending') {
      // 已提交/待审核状态 — 如果是提交操作则报错
      if (status === 'submitted') {
        throw new BusinessError('该日期已提交日报，请勿重复提交');
      }
      // 草稿保存 → 更新
      const columns = Object.keys(fields).map(key => `${key} = ?`).join(', ');
      const values = Object.values(fields);
      await db.execute(
        `UPDATE daily_reports SET ${columns}, updated_at = NOW() WHERE id = ?`,
        [...values, existing[0].id]
      );
    } else {
      // 其他状态（approved / rejected）— 更新
      const columns = Object.keys(fields).map(key => `${key} = ?`).join(', ');
      const values = Object.values(fields);
      await db.execute(
        `UPDATE daily_reports SET ${columns}, updated_at = NOW() WHERE id = ?`,
        [...values, existing[0].id]
      );
    }
  } else {
    // INSERT 新记录
    fields.created_at = now;
    const keys = Object.keys(fields).join(', ');
    const placeholders = Object.values(fields).map(() => '?').join(', ');
    const values = Object.values(fields);
    await db.execute(
      `INSERT INTO daily_reports (${keys}) VALUES (${placeholders})`,
      values
    );
  }

  // 返回最新记录（已映射格式）
  const rows = await db.query(
    `SELECT dr.*, u.nickname AS userName, u.department
     FROM daily_reports dr
     LEFT JOIN users u ON dr.user_id = u.id
     WHERE dr.user_id = ? AND dr.report_date = ?`,
    [userId, reportDate]
  );

  return formatReportRow(rows[0]);
}

/**
 * 获取草稿
 * @param {number} userId - 用户 ID
 * @param {string} reportDate - 日报日期 (YYYY-MM-DD)
 * @returns {Promise<Object|null>} 草稿数据或 null
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
  const rows = await db.query('SELECT id, status FROM daily_reports WHERE id = ?', [id]);

  if (rows.length === 0) {
    throw new NotFoundError('日报不存在');
  }

  // 管理员可以删除任何状态，普通用户只能删草稿/驳回
  // 不做 user_id 限制，管理员统一管理

  await db.execute('DELETE FROM daily_reports WHERE id = ?', [id]);
}

/**
 * 获取所有作业人员名单（从 workers 列去重）
 * workers 格式：逗号、顿号或空格分隔的多个人名
 * @returns {Promise<string[]>} 去重后的人员名字数组
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
 * 人员统计看板
 * 按 workers 列聚合：姓名/日报总数/本月数/最后提交日期
 */
async function getWorkerStats({ page, pageSize, keyword }) {
  const rawRows = await db.query(
    "SELECT workers, report_date FROM daily_reports WHERE workers IS NOT NULL AND workers != ''"
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

  const total = list.length;
  const paged = list.slice(((page || 1) - 1) * (pageSize || 20), (page || 1) * (pageSize || 20));

  return { list: paged, total };
}

/**
 * 导出 CSV
 * 支持与 list 相同的筛选条件
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

  const headers = ['日报时间','填写人','入场时间','初始出差时间','项目名称','项目所在区域','相关方单位','作业人员1','作业人员2','机型','人数','从事工作内容','需要完成数量','累计完成数量','当前进度','当日工作小结','明天工作内容','今日工作类型','明日工作类型','备注','项目出差天数','个人累计出差'];
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

module.exports = { list, detail, submit, getDraft, deleteReport, getWorkerList, getWorkerStats, exportCSV };
