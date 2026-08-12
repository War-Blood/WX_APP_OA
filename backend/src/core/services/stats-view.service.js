'use strict';

const db = require('../../common/config/database');
const { NotFoundError, ForbiddenError, ValidationError } = require('../../common/utils/errors');

const VALID_KEYS = ['daily', 'worktypes', 'area', 'calendar', 'workers'];
const VALID_SCOPES = ['all', 'department', 'department_and_children', 'self'];

function isAdmin(role) { return role === 'admin' || role === 'superadmin'; }

function parseJson(str) {
  try { return JSON.parse(str || '{}'); } catch { return {}; }
}

/**
 * 创建视图（含可见角色 + 数据范围规则）
 * @param {Object} data - { name, statKey, filter, isLocked, visibleRoles, scopeRules }
 * @param {number} userId - 创建人
 * @returns {Promise<{id: number}>}
 */
async function createView({ name, statKey, filter, isLocked, visibleRoles, scopeRules }, userId) {
  if (!name || !statKey) throw new ValidationError('视图名称与统计页必填');
  if (!VALID_KEYS.includes(statKey)) throw new ValidationError('无效的统计页标识');

  return db.transaction(async (conn) => {
    const result = await conn.execute(
      'INSERT INTO stats_views (name, stat_key, filter_json, is_locked, created_by) VALUES (?, ?, ?, ?, ?)',
      [name, statKey, JSON.stringify(filter || {}), isLocked ? 1 : 0, userId]
    );
    const viewId = result[0].insertId;

    for (const rc of visibleRoles || []) {
      await conn.execute('INSERT INTO stats_view_roles (view_id, role_code) VALUES (?, ?)', [viewId, rc]);
    }
    for (const s of scopeRules || []) {
      if (VALID_SCOPES.includes(s.scopeType)) {
        await conn.execute('INSERT INTO stats_view_scope (view_id, role_code, scope_type) VALUES (?, ?, ?)', [viewId, s.roleCode, s.scopeType]);
      }
    }
    return { id: viewId };
  });
}

/**
 * 当前角色可见的视图列表
 * @param {string} [statKey] - 按统计页过滤
 * @param {string} role
 * @param {number} userId
 * @returns {Promise<Array>}
 */
async function listViews(statKey, role, userId) {
  const conditions = [];
  const params = [];
  if (statKey) { conditions.push('v.stat_key = ?'); params.push(statKey); }
  if (!isAdmin(role)) {
    conditions.push('(EXISTS (SELECT 1 FROM stats_view_roles vr WHERE vr.view_id = v.id AND vr.role_code = ?) OR v.created_by = ?)');
    params.push(role, userId);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const rows = await db.query(
    `SELECT v.id, v.name, v.stat_key, v.filter_json, v.is_locked FROM stats_views v${where} ORDER BY v.id DESC`,
    params
  );
  return rows.map(r => ({ id: r.id, name: r.name, statKey: r.stat_key, filter: parseJson(r.filter_json), isLocked: !!r.is_locked }));
}

/**
 * 视图详情（含可见角色与数据范围规则）；不可见则抛 403
 * @param {number} id
 * @param {string} role
 * @param {number} userId
 * @returns {Promise<Object>}
 */
async function getView(id, role, userId) {
  const rows = await db.query('SELECT id, name, stat_key, filter_json, is_locked, created_by FROM stats_views WHERE id = ?', [id]);
  if (!rows.length) throw new NotFoundError('视图不存在');
  const view = rows[0];
  if (!isAdmin(role)) {
    const visible = await db.query('SELECT 1 FROM stats_view_roles WHERE view_id = ? AND role_code = ?', [id, role]);
    if (!visible.length && view.created_by !== userId) throw new ForbiddenError('无权查看该视图');
  }
  const roles = await db.query('SELECT role_code FROM stats_view_roles WHERE view_id = ?', [id]);
  const scopes = await db.query('SELECT role_code, scope_type FROM stats_view_scope WHERE view_id = ?', [id]);
  return {
    id: view.id,
    name: view.name,
    statKey: view.stat_key,
    filter: parseJson(view.filter_json),
    isLocked: !!view.is_locked,
    visibleRoles: roles.map(r => r.role_code),
    scopeRules: scopes.map(s => ({ roleCode: s.role_code, scopeType: s.scope_type })),
  };
}

/**
 * 更新视图（仅 admin+；锁定视图需先解锁）
 */
async function updateView(id, { name, filter, isLocked, visibleRoles, scopeRules }, role) {
  if (!isAdmin(role)) throw new ForbiddenError('仅管理员可编辑视图');
  const rows = await db.query('SELECT is_locked FROM stats_views WHERE id = ?', [id]);
  if (!rows.length) throw new NotFoundError('视图不存在');
  if (rows[0].is_locked) throw new ValidationError('视图已锁定，请先解锁再编辑');

  return db.transaction(async (conn) => {
    if (name) await conn.execute('UPDATE stats_views SET name = ? WHERE id = ?', [name, id]);
    if (filter) await conn.execute('UPDATE stats_views SET filter_json = ? WHERE id = ?', [JSON.stringify(filter), id]);
    if (isLocked !== undefined) await conn.execute('UPDATE stats_views SET is_locked = ? WHERE id = ?', [isLocked ? 1 : 0, id]);
    if (visibleRoles) {
      await conn.execute('DELETE FROM stats_view_roles WHERE view_id = ?', [id]);
      for (const rc of visibleRoles) await conn.execute('INSERT INTO stats_view_roles (view_id, role_code) VALUES (?, ?)', [id, rc]);
    }
    if (scopeRules) {
      await conn.execute('DELETE FROM stats_view_scope WHERE view_id = ?', [id]);
      for (const s of scopeRules) {
        if (VALID_SCOPES.includes(s.scopeType)) {
          await conn.execute('INSERT INTO stats_view_scope (view_id, role_code, scope_type) VALUES (?, ?, ?)', [id, s.roleCode, s.scopeType]);
        }
      }
    }
  });
}

/**
 * 锁定/解锁视图（仅 admin+）
 */
async function setLocked(id, locked, role) {
  if (!isAdmin(role)) throw new ForbiddenError('仅管理员可操作');
  const rows = await db.query('SELECT id FROM stats_views WHERE id = ?', [id]);
  if (!rows.length) throw new NotFoundError('视图不存在');
  await db.execute('UPDATE stats_views SET is_locked = ? WHERE id = ?', [locked ? 1 : 0, id]);
}

/**
 * 删除视图（仅 admin+；连带删除角色与范围规则）
 */
async function deleteView(id, role) {
  if (!isAdmin(role)) throw new ForbiddenError('仅管理员可删除');
  const rows = await db.query('SELECT id FROM stats_views WHERE id = ?', [id]);
  if (!rows.length) throw new NotFoundError('视图不存在');
  return db.transaction(async (conn) => {
    await conn.execute('DELETE FROM stats_view_roles WHERE view_id = ?', [id]);
    await conn.execute('DELETE FROM stats_view_scope WHERE view_id = ?', [id]);
    await conn.execute('DELETE FROM stats_views WHERE id = ?', [id]);
  });
}

/**
 * 解析统计请求对应的视图（供统计查询使用）
 * 无 viewId 返回 null；视图不可见抛 403。
 * @param {number|null} viewId
 * @param {string} role
 * @param {number} userId
 * @returns {Promise<null|{filter:Object, scopeType:string, userDeptId:number|null, userId:number}>}
 */
async function resolveViewForRequest(viewId, role, userId) {
  if (!viewId) return null;
  const rows = await db.query('SELECT filter_json FROM stats_views WHERE id = ?', [viewId]);
  if (!rows.length) throw new NotFoundError('视图不存在');
  if (!isAdmin(role)) {
    const visible = await db.query('SELECT 1 FROM stats_view_roles WHERE view_id = ? AND role_code = ?', [viewId, role]);
    if (!visible.length) throw new ForbiddenError('无权查看该视图');
  }
  let scopeType = 'all';
  const scopes = await db.query('SELECT scope_type FROM stats_view_scope WHERE view_id = ? AND role_code = ?', [viewId, role]);
  if (scopes.length) scopeType = scopes[0].scope_type;

  let userDeptId = null;
  if (scopeType === 'department' || scopeType === 'department_and_children') {
    const userRows = await db.query('SELECT department_id FROM users WHERE id = ?', [userId]);
    userDeptId = userRows.length ? userRows[0].department_id : null;
  }
  return { filter: parseJson(rows[0].filter_json), scopeType, userDeptId, userId };
}

module.exports = {
  createView, listViews, getView, updateView, setLocked, deleteView, resolveViewForRequest,
};
