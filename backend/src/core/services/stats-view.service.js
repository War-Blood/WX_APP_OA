'use strict';

const db = require('../../common/config/database');
const { ValidationError } = require('../../common/utils/errors');

// daily: 公出统计-全员当日(小程序)；daily_today/daily_tomorrow: Web 员工当日状态页 今日/明日 独立筛选
const VALID_KEYS = ['daily', 'worktypes', 'area', 'calendar', 'workers', 'daily_today', 'daily_tomorrow'];
const VALID_OPS = ['eq', 'ne', 'in', 'not_in', 'like', 'gte', 'lte', 'between', 'is_null'];
const VALID_SCOPES = ['all', 'department', 'department_and_children', 'self', 'group'];
const ROLE_KEYS = ['employee', 'bm', 'admin', 'superadmin', 'leader'];

/**
 * 可筛选字段注册表（来自真实数据库列，WPS 式动态筛选）
 * table: users/daily_reports；input: dept_tree/switch/select/text/date/number；type: int/bool/string/date
 */
const FILTER_FIELDS = {
  department_id:   { table: 'users',         column: 'department_id',   type: 'int',    input: 'dept_tree', label: '部门' },
  is_field_worker: { table: 'users',         column: 'is_field_worker', type: 'bool',   input: 'switch',    label: '仅现场作业' },
  worker_status:   { table: 'users',         column: 'worker_status',   type: 'string', input: 'select',    label: '在职状态', options: ['active'] },
  role:            { table: 'users',         column: 'role',            type: 'string', input: 'select',    label: '角色', options: ['employee', 'bm', 'admin', 'superadmin'] },
  user_name:       { table: 'users',         column: 'user_name',       type: 'string', input: 'text',      label: '姓名' },
  report_date:     { table: 'daily_reports', column: 'report_date',     type: 'date',   input: 'date',      label: '日期' },
  report_type:     { table: 'daily_reports', column: 'report_type',     type: 'string', input: 'select',    label: '日志类型', options: ['biz_trip', 'biz_trip_supplement', 'office', 'leave'] },
  status:          { table: 'daily_reports', column: 'status',          type: 'string', input: 'select',    label: '状态', options: ['approved', 'pending_review', 'draft', 'submitted'] },
  today_work_type: { table: 'daily_reports', column: 'today_work_type', type: 'string', input: 'select',    label: '工作类型', options: ['工作（陆）', '工作（海）', '待工', '在途'] },
  area:            { table: 'daily_reports', column: 'area',            type: 'string', input: 'text',      label: '区域' },
  project:         { table: 'daily_reports', column: 'project',         type: 'string', input: 'text',      label: '项目' },
  submitter_name:  { table: 'daily_reports', column: 'submitter_name',  type: 'string', input: 'text',      label: '提交人' },
  timeliness:      { table: 'daily_reports', column: 'timeliness',      type: 'string', input: 'select',    label: '及时性', options: ['on_time', 'delayed', 'missing'] },
};

function parseJson(str) {
  if (str == null) return {};
  if (typeof str === 'object') return str; // mysql2 已将 JSON 列自动解析为对象
  try { return JSON.parse(str); } catch { return {}; }
}

/** 校验动态条件列表；非法条件过滤 */
function sanitizeConditions(conditions) {
  if (!Array.isArray(conditions)) return [];
  return conditions
    .filter(c => c && FILTER_FIELDS[c.field] && VALID_OPS.includes(c.op))
    .map(c => ({ field: c.field, op: c.op, value: c.value }));
}

/** 按角色条件（不同角色不同筛选条件）；只保留注册角色键 */
function sanitizeRoleConditions(roleConditions) {
  const out = {};
  if (roleConditions && typeof roleConditions === 'object') {
    for (const key of ROLE_KEYS) {
      if (Array.isArray(roleConditions[key])) out[key] = sanitizeConditions(roleConditions[key]);
    }
  }
  return out;
}

/** 默认可见性策略（上层 RLS 默认值） */
const DEFAULT_VISIBILITY = {
  employee: 'department',
  bm: 'department_and_children',
  admin: 'all',
  superadmin: 'all',
  // 组长（users.position='组长'）：默认看到对应组员（本部门成员）
  leader: 'group',
};

/** 校验视图可见性（角色 → 数据范围）；缺省角色补默认 */
function sanitizeVisibility(visibility) {
  const v = { ...DEFAULT_VISIBILITY };
  if (visibility && typeof visibility === 'object') {
    for (const [role, scope] of Object.entries(visibility)) {
      if (VALID_SCOPES.includes(scope)) v[role] = scope;
    }
  }
  return v;
}

/**
 * 保存某统计页的唯一视图（每 stat_key 仅一条，UPSERT 覆盖）
 * filter_json: { visibility: {角色→范围}, conditions: [...], roleConditions: {角色→[...]} }
 * @param {{statKey: string, conditions: Array, roleConditions: Object, visibility: Object}} data
 * @param {number} userId
 */
async function upsertView({ statKey, conditions, roleConditions, visibility }, userId) {
  if (!statKey) throw new ValidationError('statKey 必填');
  if (!VALID_KEYS.includes(statKey)) throw new ValidationError('无效的统计页标识');
  const safe = {
    conditions: sanitizeConditions(conditions),
    roleConditions: sanitizeRoleConditions(roleConditions),
    visibility: sanitizeVisibility(visibility),
  };
  await db.execute(
    `INSERT INTO stats_views (stat_key, filter_json, created_by) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE filter_json = VALUES(filter_json), updated_at = NOW()`,
    [statKey, JSON.stringify(safe), userId]
  );
  // 操作审计：记录本次保存及实际写入的内容（即 stats_views.filter_json）
  await logViewOp({ statKey, action: 'save', payload: safe, userId });
}

/**
 * 记录统计视图操作审计（筛选弹窗保存/读取）
 * @param {string} statKey - 统计页标识
 * @param {'save'|'read'} action - save=保存 / read=打开弹窗读取
 * @param {Object} payload - 实际写入/返回的 { conditions, visibility, filter? }
 * @param {number} userId - 操作人
 */
async function logViewOp({ statKey, action, payload, userId }) {
  if (!statKey || !action) return;
  try {
    await db.execute(
      'INSERT INTO stats_view_ops (stat_key, action, payload_json, created_by) VALUES (?, ?, ?, ?)',
      [statKey, action, JSON.stringify(payload || {}), userId]
    );
  } catch (err) {
    // 审计失败不影响主流程（例如表尚未迁移）
  }
}

/**
 * 查询统计视图操作记录（按统计页，倒序）
 * @param {string} [statKey] - 统计页标识，缺省查全部
 * @param {number} [limit] - 条数上限
 * @returns {Promise<Array>}
 */
async function listViewOps({ statKey, limit = 50 } = {}) {
  const rows = await db.query(
    `SELECT id, stat_key, action, payload_json, created_by, created_at
     FROM stats_view_ops
     ${statKey ? 'WHERE stat_key = ?' : ''}
     ORDER BY id DESC LIMIT ?`,
    statKey ? [statKey, limit] : [limit]
  );
  return rows.map(r => ({
    id: r.id,
    statKey: r.stat_key,
    action: r.action,
    payload: parseJson(r.payload_json),
    createdBy: r.created_by,
    createdAt: r.created_at ? String(r.created_at) : '',
  }));
}

/**
 * 获取某统计页的唯一视图（无则 null）
 * @param {string} statKey
 * @returns {Promise<null|{id:number, statKey:string, filter:Object, createdBy:number}>}
 */
async function getViewByStatKey(statKey) {
  const rows = await db.query('SELECT id, stat_key, filter_json, created_by FROM stats_views WHERE stat_key = ?', [statKey]);
  if (!rows.length) return null;
  return {
    id: rows[0].id,
    statKey: rows[0].stat_key,
    filter: parseJson(rows[0].filter_json),
    createdBy: rows[0].created_by,
  };
}

/**
 * 固定 RLS 数据范围策略（按角色）
 * admin/superadmin → all；bm → 本部门及下属；employee → 本部门
 * @param {string} role
 * @returns {'all'|'department'|'department_and_children'}
 */
function getRoleScope(role) {
  if (role === 'admin' || role === 'superadmin') return 'all';
  if (role === 'bm') return 'department_and_children';
  return 'department';
}

/**
 * 动态获取可筛选字段（WPS 式，基于数据库列注册表）
 */
function getFilterFields() {
  return Object.entries(FILTER_FIELDS).map(([field, def]) => ({ field, ...def }));
}

module.exports = {
  upsertView, getViewByStatKey, getRoleScope, getFilterFields,
  FILTER_FIELDS, sanitizeConditions, sanitizeRoleConditions, logViewOp, listViewOps,
};
